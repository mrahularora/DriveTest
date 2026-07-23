const Appointment = require("../models/Appointment");
const isBookableDate = require("../utils/appointmentDate");
const slots = require("../utils/appointmentSlots");

const offeredTimes = new Set(slots.map((slot) => slot.value));

module.exports = async (req, res, next) => {
  const times = Array.isArray(req.body.time) ? req.body.time : [req.body.time].filter(Boolean);
  if (!isBookableDate(req.body.date) || !times.length || times.some((time) => !offeredTimes.has(time))) {
    return res.status(400).render("appointment", { error: "Select today or a future date and valid times.", message: "", slots });
  }

  try {
    await Appointment.updateOne(
      { date: req.body.date },
      { $addToSet: { time: { $each: times } } },
      { upsert: true, runValidators: true }
    );
    res.render("appointment", { error: "", message: "Appointment slots added.", slots });
  } catch (error) {
    next(error);
  }
};
