const UserAccount = require("../models/UserAccount");
const { verifyPassword } = require("../utils/password");

module.exports = async (req, res, next) => {
  try {
    const userName = req.body.userName?.trim();
    const password = req.body.password;
    if (!userName || !password) {
      return res.status(400).render("login", { error: "Username and password are required.", success: "" });
    }

    const user = await UserAccount.findOne({ userName });
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).render("login", { error: "Incorrect username or password.", success: "" });
    }

    await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.userId = user._id;
    req.session.userType = user.userType;
    res.redirect("/");
  } catch (error) {
    next(error);
  }
};
