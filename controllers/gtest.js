const UserAccount = require("../models/UserAccount");

module.exports = async (req, res, next) => {
  try {
    const user = await UserAccount.findById(req.session.userId);
    if (!user) return res.redirect("/auth/logout");
    res.render("gtest", { user, error: "" });
  } catch (error) {
    next(error);
  }
};
