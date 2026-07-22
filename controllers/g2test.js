const UserAccount = require("../models/UserAccount");
const getDriverJourney = require("../utils/driverJourney");

module.exports = async (req, res, next) => {
  try {
    const user = await UserAccount.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("g2test", { user, error: "", journey: getDriverJourney(user, "G2") });
  } catch (error) {
    next(error);
  }
};
