const UserAccount = require("../models/UserAccount");
const { hashPassword } = require("../utils/password");

module.exports = async (req, res) => {
  const userName = req.body.userName?.trim();
  const { password, confirmPassword } = req.body;

  if (!userName || !password || !confirmPassword) {
    return res.status(400).render("register", { error: "All fields are mandatory." });
  }
  if (userName.length < 4 || password.length < 4) {
    return res.status(400).render("register", { error: "Username and password need at least 4 characters." });
  }
  if (password !== confirmPassword) {
    return res.status(400).render("register", { error: "Passwords do not match." });
  }

  try {
    await UserAccount.create({
      userName,
      password: await hashPassword(password),
      userType: "driver",
    });
    res.render("login", { error: "", success: "Account created successfully." });
  } catch (error) {
    const message = error.code === 11000 ? "Username already exists." : "Account could not be created.";
    res.status(error.code === 11000 ? 409 : 500).render("register", { error: message });
  }
};
