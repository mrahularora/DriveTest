const BookedTimeSlot = require("../models/BookedTimeSlot");
const isBookableDate = require("../utils/appointmentDate");

module.exports = async (req, res) => {
  try {
    const selectedDate = req.params.date;
    if (!isBookableDate(selectedDate)) {
      return res.status(400).json({ error: "Select today or a future date" });
    }
    const fetchBookedTimeSlot = await BookedTimeSlot.find({
      date: selectedDate,
    });
    res.json(fetchBookedTimeSlot);
  } catch (err) {
    res.status(404).send("Server Errors");
  }
};
