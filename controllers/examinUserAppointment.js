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
    if (!(await BookedTimeSlot.exists({ userId: req.params.id, testType }))) {
      return res.status(404).render("pageNotFound");
    }

    await UserAccount.updateOne(
      { _id: req.params.id },
      {
        $set: {
          comment: req.body.comment?.trim() || "",
          pass: passed,
          status: passed ? "Passed" : "Failed",
          ...(passed && { qualified: testType }),
        },
      },
      { runValidators: true }
    );
    res.redirect("/examiner");
  } catch (error) {
    next(error);
  }
};
