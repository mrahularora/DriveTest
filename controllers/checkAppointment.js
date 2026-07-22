const Appointment = require("../models/Appointment");
const isBookableDate = require("../utils/appointmentDate");

module.exports = async (req, res) => {
  try {
    const selectedDate = req.params.date;
    if (!isBookableDate(selectedDate)) {
      return res.status(400).json({ error: "Select today or a future date" });
    }

    const checkDateAvailable = await Appointment.findOne({
      date: selectedDate,
    });
    if (checkDateAvailable) {
      return res.json({ time: checkDateAvailable.time });
    }
    res.status(404).json({ error: "Date not found" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
