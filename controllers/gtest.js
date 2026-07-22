const UserAccount = require("../models/UserAccount");
const getDriverJourney = require("../utils/driverJourney");

module.exports = async (req, res, next) => {
  try {
    const user = await UserAccount.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("gtest", {
      user,
      error: "",
      success: req.query.booked === "1" ? "Your G appointment is confirmed." : "",
      journey: getDriverJourney(user, "G"),
    });
  } catch (error) {
    next(error);
  }
};
