const Appointment = require("../models/Appointment");
const BookedTimeSlot = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");
const { hash } = require("../utils/licenseCrypto");

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(value));

module.exports = async (req, res, next) => {
  try {
    const user = await UserAccount.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");

    if (req.body.action === "car") {
      const year = Number(req.body.year);
      if (!req.body.make?.trim() || !req.body.model?.trim() ||
          !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1 ||
          !req.body.plateNo?.trim()) {
        return res.status(400).send("Enter valid car details.");
      }
      await UserAccount.updateOne(
        { _id: user._id },
        { $set: { carDetails: {
          make: req.body.make.trim(),
          model: req.body.model.trim(),
          year,
          plateNo: req.body.plateNo.trim().toUpperCase(),
        } } },
        { runValidators: true }
      );
      return res.redirect("/g");
    }

    const testType = req.body.testType;
    const date = testType === "G" ? req.body.Gdate : req.body.G2date;
    const time = req.body.timeSlot;

    if (!["G2", "G"].includes(testType) || !validDate(date) || !time) {
      return res.status(400).send("A valid test type, date, and time slot are required.");
    }
    if (!(await Appointment.exists({ date, time }))) {
      return res.status(400).send("That appointment slot is not offered.");
    }
    if (testType === "G" && !["G2", "G"].includes(user.qualified)) {
      return res.status(403).send("Pass the G2 test before booking a G test.");
    }

    const conflict = await BookedTimeSlot.exists({ date, time, userId: { $ne: user._id } });
    if (conflict) return res.status(409).send("That appointment slot was already booked.");

    const update = {
      appointmentDate: date,
      appointmentTime: time,
      testType,
      status: "Pending",
      pass: false,
      comment: "",
    };

    if (testType === "G2") {
      const licenceNo = req.body.licenceNo?.trim().toUpperCase();
      const age = Number(req.body.age);
      const year = Number(req.body.year);
      const currentYear = new Date().getFullYear();
      if (!req.body.firstName?.trim() || !req.body.lastName?.trim() ||
          !/^[A-Z0-9]{8}$/.test(licenceNo || "") || !Number.isInteger(age) || age < 16 || age > 100 ||
          !validDate(req.body.dob) || !req.body.make?.trim() || !req.body.model?.trim() ||
          !Number.isInteger(year) || year < 1900 || year > currentYear + 1 || !req.body.plateNo?.trim()) {
        return res.status(400).send("Enter valid personal, licence, car, and appointment details.");
      }
      const licenceHash = hash(licenceNo);
      if (await UserAccount.exists({ licenceHash, _id: { $ne: user._id } })) {
        return res.status(409).send("Licence number is already registered.");
      }
      Object.assign(update, {
        firstName: req.body.firstName.trim(),
        lastName: req.body.lastName.trim(),
        dob: req.body.dob,
        age,
        licenceNo,
        licenceHash,
        carDetails: {
          make: req.body.make.trim(),
          model: req.body.model.trim(),
          year,
          plateNo: req.body.plateNo.trim().toUpperCase(),
        },
      });
    }

    await BookedTimeSlot.updateOne(
      { userId: user._id },
      { $set: { date, time, testType } },
      { upsert: true, runValidators: true }
    );
    await UserAccount.updateOne({ _id: user._id }, { $set: update }, { runValidators: true });
    res.redirect(testType === "G" ? "/g" : "/g2");
  } catch (error) {
    if (error.code === 11000) return res.status(409).send("That appointment or licence is already taken.");
    next(error);
  }
};
