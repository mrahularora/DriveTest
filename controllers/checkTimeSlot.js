const BookedTimeSlot = require("../models/BookedTimeSlot");

module.exports = async (req, res) => {
  try {
    const selectedDate = req.params.date;
    const fetchBookedTimeSlot = await BookedTimeSlot.find({
      date: selectedDate,
    });
    res.json(fetchBookedTimeSlot);
  } catch (err) {
    res.status(404).send("Server Errors");
  }
};
