const UserAccount = require("../models/UserAccount");
const getDriverJourney = require("../utils/driverJourney");

module.exports = async (req, res, next) => {
  try {
    const user = await UserAccount.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    const success = req.query.canceled === "1" ? "Your G appointment was cancelled."
      : req.query.rescheduled === "1" ? "Your G appointment was rescheduled."
      : req.query.booked === "1" ? "Your G appointment is confirmed." : "";
    res.render("gtest", {
      user,
      error: "",
      success,
      journey: getDriverJourney(user, "G"),
    });
  } catch (error) {
    next(error);
  }
};
