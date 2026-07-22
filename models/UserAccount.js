const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/licenseCrypto");

const UserAccountSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "default", trim: true },
    lastName: { type: String, default: "default", trim: true },
    dob: Date,
    licenceNo: { type: String, default: "default", set: encrypt, get: decrypt },
    licenceHash: { type: String, unique: true, sparse: true, select: false },
    age: { type: Number, default: 0 },
    userType: { type: String, required: true, enum: ["driver", "examiner", "admin"] },
    userName: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    recoveryCodeHash: { type: String, select: false },
    carDetails: {
      make: { type: String, default: "default" },
      model: { type: String, default: "default" },
      year: { type: Number, default: 0 },
      plateNo: { type: String, default: "default" },
    },
    appointmentDate: String,
    appointmentTime: String,
    comment: String,
    pass: { type: Boolean, default: false },
    status: { type: String, enum: ["Pending", "Passed", "Failed"], default: "Pending" },
    testType: { type: String, enum: ["G2", "G"] },
    qualified: { type: String, enum: ["G2", "G"] },
    appointmentHistory: [{
      _id: false,
      testType: { type: String, required: true, enum: ["G2", "G"] },
      date: { type: String, required: true },
      time: { type: String, required: true },
      status: { type: String, required: true, enum: ["Passed", "Failed"] },
      comment: { type: String, default: "" },
      completedAt: { type: Date, default: Date.now },
    }],
  },
  { toJSON: { getters: true }, toObject: { getters: true } }
);

module.exports = mongoose.model("UserAccount", UserAccountSchema);
