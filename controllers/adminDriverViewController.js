const BookedTimeSlotModel = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");

module.exports = async (req, res) => {
  try {
    const appointments = await BookedTimeSlotModel.find();

    const userIds = appointments.map((appointment) => appointment.userId);

    const userDetails = await UserAccount.find({ _id: { $in: userIds } });

    const userDetailsMap = new Map(
      userDetails.map((user) => [user._id.toString(), user])
    );

    const mergedAppointments = appointments.map((appointment) => ({
      ...appointment.toObject(),
      userDetails: userDetailsMap.get(appointment.userId.toString()) || {},
    }));
    res.render("adminDriverView", {
      appointments: mergedAppointments,
      error: "",
      message: "",
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).render("adminDriverView", { appointments: [], error: "Error fetching data", message: "" });
  }
};
