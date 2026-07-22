const BookedTimeSlotModel = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");

module.exports = async (req, res) => {
  try {
    const testType = ["G2", "G"].includes(req.query.testType) ? req.query.testType : "all";
    const status = req.query.status === "all" ? "all" : "pending";
    const appointments = await BookedTimeSlotModel.find(testType === "all" ? {} : { testType });

    const userIds = appointments.map((appointment) => appointment.userId);

    const userDetails = await UserAccount.find({ _id: { $in: userIds } });

    const userDetailsMap = new Map(
      userDetails.map((user) => [user._id.toString(), user])
    );

    const mergedAppointments = appointments
      .map((appointment) => ({
        ...appointment.toObject(),
        userDetails: userDetailsMap.get(appointment.userId.toString()),
      }))
      .filter((appointment) => appointment.userDetails &&
        (status === "all" || appointment.userDetails.status === "Pending"));

    res.render("examiner", {
      appointments: mergedAppointments,
      error: "",
      message: mergedAppointments.length ? "" : status === "pending" ? "No pending appointments." : "No appointments found.",
      filters: { testType, status },
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).render("examiner", {
      appointments: [],
      error: "Unable to load appointments.",
      message: "",
      filters: { testType: "all", status: "pending" },
    });
  }
};
