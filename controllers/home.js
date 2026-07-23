const Appointment = require("../models/Appointment");
const BookedTimeSlot = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");

module.exports = async (req, res, next) => {
  try {
    let totals = null;
    if (["admin", "examiner"].includes(req.session.userType)) {
      const now = new Date();
      const futureDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const futureDateText = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
        .map((part, index) => index ? String(part).padStart(2, "0") : part)
        .join("-");
      const [offered, booked, results] = await Promise.all([
        Appointment.aggregate([
          { $match: { date: { $gte: futureDate } } },
          { $group: { _id: null, total: { $sum: { $size: "$time" } } } },
        ]),
        BookedTimeSlot.countDocuments({ date: { $gte: futureDateText } }),
        UserAccount.aggregate([
          { $unwind: "$appointmentHistory" },
          { $group: { _id: "$appointmentHistory.status", total: { $sum: 1 } } },
        ]),
      ]);
      const resultTotals = Object.fromEntries(results.map((item) => [item._id, item.total]));
      const passed = resultTotals.Passed || 0;
      const failed = resultTotals.Failed || 0;
      totals = {
        available: Math.max((offered[0]?.total || 0) - booked, 0),
        booked,
        completed: passed + failed,
        passed,
        failed,
      };
    }
    res.render("index", { reqSession: req.session, totals });
  } catch (error) {
    next(error);
  }
};
