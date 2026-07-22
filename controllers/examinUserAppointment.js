const BookedTimeSlot = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");

module.exports = async (req, res, next) => {
  try {
    const testType = req.params.testType;
    const passed = req.body.result === "pass";
    if (!["pass", "fail"].includes(req.body.result) || !["G2", "G"].includes(testType)) {
      const driverDetails = await UserAccount.findById(req.params.id);
      if (!driverDetails) return res.status(404).render("pageNotFound");
      return res.status(400).render("viewUserAppointment", { driverDetails, error: "Select pass or fail." });
    }
    const booking = await BookedTimeSlot.findOne({ userId: req.params.id, testType });
    if (!booking) {
      return res.status(404).render("pageNotFound");
    }
    const comment = req.body.comment?.trim() || "";
    const status = passed ? "Passed" : "Failed";
    const result = await UserAccount.updateOne(
      { _id: req.params.id, status: "Pending", testType },
      {
        $set: {
          comment,
          pass: passed,
          status,
          ...(passed && { qualified: testType }),
        },
        $push: { appointmentHistory: {
          testType,
          date: booking.date,
          time: booking.time,
          status,
          comment,
          completedAt: new Date(),
        } },
      },
      { runValidators: true }
    );
    if (!result.matchedCount) {
      const driverDetails = await UserAccount.findById(req.params.id);
      if (!driverDetails) return res.status(404).render("pageNotFound");
      return res.status(409).render("viewUserAppointment", {
        driverDetails,
        error: "A result has already been submitted for this appointment.",
      });
    }
    res.redirect("/examiner");
  } catch (error) {
    next(error);
  }
};
