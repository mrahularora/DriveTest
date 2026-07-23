const slots = require("../utils/appointmentSlots");

module.exports = async (req, res) => {
  res.render("appointment", { error: "", message: "", slots });
};
