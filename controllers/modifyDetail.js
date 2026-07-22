const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const BookedTimeSlot = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");
const { hash } = require("../utils/licenseCrypto");
const isBookableDate = require("../utils/appointmentDate");
const getDriverJourney = require("../utils/driverJourney");

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(value));
const hasRealValue = (value) => typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "default";
const formError = (res, user, testType, status, error) =>
  res.status(status).render(testType === "G" ? "gtest" : "g2test", {
    user,
    error,
    success: "",
    journey: getDriverJourney(user, testType === "G" ? "G" : "G2"),
  });

module.exports = async (req, res, next) => {
  let user;
  try {
    user = await UserAccount.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");

    if (req.body.action === "car") {
      const year = Number(req.body.year);
      if (!hasRealValue(req.body.make) || !hasRealValue(req.body.model) ||
          !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1 ||
          !hasRealValue(req.body.plateNo)) {
        return formError(res, user, "G", 400, "Enter valid car details.");
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

    if (req.body.action === "profile") {
      const licenceNo = req.body.licenceNo?.trim().toUpperCase();
      const age = Number(req.body.age);
      const year = Number(req.body.year);
      const currentYear = new Date().getFullYear();
      if (!hasRealValue(req.body.firstName) || !hasRealValue(req.body.lastName) ||
          !/^[A-Z0-9]{8}$/.test(licenceNo || "") || !Number.isInteger(age) || age < 16 || age > 100 ||
          !validDate(req.body.dob) || !hasRealValue(req.body.make) || !hasRealValue(req.body.model) ||
          !Number.isInteger(year) || year < 1900 || year > currentYear + 1 || !hasRealValue(req.body.plateNo)) {
        return formError(res, user, "G2", 400, "Enter valid personal, licence, and vehicle details.");
      }
      const licenceHash = hash(licenceNo);
      if (await UserAccount.exists({ licenceHash, _id: { $ne: user._id } })) {
        return formError(res, user, "G2", 409, "Licence number is already registered.");
      }
      await UserAccount.updateOne(
        { _id: user._id },
        { $set: {
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
        } },
        { runValidators: true }
      );
      return res.redirect("/g2?profile=saved");
    }

    const testType = req.body.testType;
    const date = testType === "G" ? req.body.Gdate : req.body.G2date;
    const time = req.body.timeSlot;

    if (!["G2", "G"].includes(testType) || !isBookableDate(date) || !time) {
      return formError(res, user, testType, 400, "Select a valid test type, current or future date, and time slot.");
    }
    if (testType === "G2" && !getDriverJourney(user, "G2").profile.complete) {
      return formError(res, user, testType, 403, "Save a complete profile before booking a G2 test.");
    }
    if (!(await Appointment.exists({ date, time }))) {
      return formError(res, user, testType, 400, "That appointment slot is not offered.");
    }
    if (testType === "G" && !["G2", "G"].includes(user.qualified)) {
      return formError(res, user, testType, 403, "Pass the G2 test before booking a G test.");
    }

    const conflict = await BookedTimeSlot.exists({ date, time, userId: { $ne: user._id } });
    if (conflict) return formError(res, user, testType, 409, "That appointment slot was already booked.");

    const update = {
      appointmentDate: date,
      appointmentTime: time,
      testType,
      status: "Pending",
      pass: false,
      comment: "",
    };

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await BookedTimeSlot.updateOne(
          { userId: user._id },
          { $set: { date, time, testType } },
          { upsert: true, runValidators: true, session }
        );
        await UserAccount.updateOne(
          { _id: user._id },
          { $set: update },
          { runValidators: true, session }
        );
      });
    } finally {
      await session.endSession();
    }
    res.redirect(testType === "G" ? "/g?booked=1" : "/g2?booked=1");
  } catch (error) {
    if (error.code === 11000 && user) {
      return formError(res, user, req.body.testType, 409, "That appointment or licence is already taken.");
    }
    next(error);
  }
};
