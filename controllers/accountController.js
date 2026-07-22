const UserAccount = require("../models/UserAccount");
const { hashPassword, verifyPassword, createRecoveryCode, verifyRecoveryCode } = require("../utils/password");

const renderAccount = (res, status = 200, locals = {}) => res.status(status).render("account", {
  error: "",
  success: "",
  recoveryCode: "",
  ...locals,
});

exports.view = (req, res) => renderAccount(res);

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return renderAccount(res, 400, { error: "Complete all password fields." });
    }
    if (newPassword.length < 8) {
      return renderAccount(res, 400, { error: "New password must have at least 8 characters." });
    }
    if (newPassword !== confirmPassword) {
      return renderAccount(res, 400, { error: "New passwords do not match." });
    }

    const user = await UserAccount.findById(req.session.userId);
    if (!user || !(await verifyPassword(currentPassword, user.password))) {
      return renderAccount(res, 401, { error: "Current password is incorrect." });
    }
    user.password = await hashPassword(newPassword);
    await user.save();
    req.session.destroy((error) => error ? next(error) : res.redirect("/login?changed=1"));
  } catch (error) {
    next(error);
  }
};

exports.generateRecoveryCode = async (req, res, next) => {
  try {
    const recovery = createRecoveryCode();
    await UserAccount.updateOne(
      { _id: req.session.userId },
      { $set: { recoveryCodeHash: recovery.hash } }
    );
    renderAccount(res, 200, {
      success: "Your previous recovery code has been replaced.",
      recoveryCode: recovery.code,
    });
  } catch (error) {
    next(error);
  }
};

exports.recoverView = (req, res) => res.render("recover", { error: "" });

exports.recover = async (req, res, next) => {
  try {
    const userName = req.body.userName?.trim();
    const recoveryCode = req.body.recoveryCode?.trim();
    const { newPassword, confirmPassword } = req.body;
    if (!userName || !recoveryCode || !newPassword || !confirmPassword) {
      return res.status(400).render("recover", { error: "Complete all fields." });
    }
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      return res.status(400).render("recover", { error: "Passwords must match and have at least 8 characters." });
    }

    const user = await UserAccount.findOne({ userName }).select("+recoveryCodeHash");
    if (!user || !verifyRecoveryCode(recoveryCode, user.recoveryCodeHash)) {
      return res.status(401).render("recover", { error: "Invalid username or recovery code." });
    }
    user.password = await hashPassword(newPassword);
    user.recoveryCodeHash = undefined;
    await user.save();
    res.redirect("/login?reset=1");
  } catch (error) {
    next(error);
  }
};
