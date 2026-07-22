const Appointment = require("../models/Appointment");
const isBookableDate = require("../utils/appointmentDate");

const offeredTimes = new Set([
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00",
]);

module.exports = async (req, res, next) => {
  const times = Array.isArray(req.body.time) ? req.body.time : [req.body.time].filter(Boolean);
  if (!isBookableDate(req.body.date) || !times.length || times.some((time) => !offeredTimes.has(time))) {
    return res.status(400).render("appointment", { error: "Select today or a future date and valid times.", message: "" });
  }

  try {
    await Appointment.updateOne(
      { date: req.body.date },
      { $addToSet: { time: { $each: times } } },
      { upsert: true, runValidators: true }
    );
    res.render("appointment", { error: "", message: "Appointment slots added." });
  } catch (error) {
    next(error);
  }
};
