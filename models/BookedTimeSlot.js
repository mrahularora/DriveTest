const mongoose = require("mongoose");

const BookedTimeSlotSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, unique: true },
  testType: { type: String, required: true, enum: ["G2", "G"] },
});

BookedTimeSlotSchema.index({ date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model("BookedTimeSlot", BookedTimeSlotSchema);
