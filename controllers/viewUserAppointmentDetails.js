const BookedTimeSlot = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");

module.exports = async (req, res, next) => {
  try {
    const booking = await BookedTimeSlot.findOne({ userId: req.params.id, testType: req.params.testType });
    if (!booking) return res.status(404).render("pageNotFound");
    const driverDetails = await UserAccount.findById(req.params.id);
    if (!driverDetails) return res.status(404).render("pageNotFound");
    res.render("viewUserAppointment", { driverDetails, error: "" });
  } catch (error) {
    next(error);
  }
};
