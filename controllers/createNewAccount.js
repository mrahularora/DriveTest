const UserAccount = require("../models/UserAccount");
const { hashPassword, createRecoveryCode } = require("../utils/password");

module.exports = async (req, res) => {
  const userName = req.body.userName?.trim();
  const { password, confirmPassword } = req.body;

  if (!userName || !password || !confirmPassword) {
    return res.status(400).render("register", { error: "All fields are mandatory." });
  }
  if (userName.length < 4 || password.length < 8) {
    return res.status(400).render("register", { error: "Username needs 4 characters and password needs 8." });
  }
  if (password !== confirmPassword) {
    return res.status(400).render("register", { error: "Passwords do not match." });
  }

  try {
    const recovery = createRecoveryCode();
    await UserAccount.create({
      userName,
      password: await hashPassword(password),
      recoveryCodeHash: recovery.hash,
      userType: "driver",
    });
    res.render("login", {
      error: "",
      success: `Account created. Save this one-time recovery code: ${recovery.code}`,
    });
  } catch (error) {
    const message = error.code === 11000 ? "Username already exists." : "Account could not be created.";
    res.status(error.code === 11000 ? 409 : 500).render("register", { error: message });
  }
};
