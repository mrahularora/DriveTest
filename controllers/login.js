module.exports = (req, res) => {
  const success = req.query.changed === "1"
    ? "Password changed. Sign in with your new password."
    : req.query.reset === "1"
      ? "Password reset. Sign in and create a new recovery code under Account."
      : "";
  res.render("login", { error: "", success });
};
