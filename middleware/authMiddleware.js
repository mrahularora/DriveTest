const UserAccount = require("../models/UserAccount");

const requireRole = (role) => async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect("/login");
    const user = await UserAccount.findById(req.session.userId).select("userType");
    if (!user || (role && user.userType !== role)) return res.redirect("/");
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authUserMiddleware: requireRole(),
  driverMiddleware: requireRole("driver"),
  adminMiddleware: requireRole("admin"),
  examinerMiddleware: requireRole("examiner"),
};
