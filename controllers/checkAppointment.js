const Appointment = require("../models/Appointment");

module.exports = async (req, res) => {
  try {
    const selectedDate = req.params.date;
    const dateObject = new Date(selectedDate);

    if (dateObject) {
      const checkDateAvailable = await Appointment.findOne({
        date: dateObject,
      });
      if (checkDateAvailable) {
        res.json({ time: checkDateAvailable.time });
        return;
      }
    }
    res.status(404).json({ error: "Date not found" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
