const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  time: [{ type: String, required: true }],
});

module.exports = mongoose.model("Appointment", AppointmentSchema);
