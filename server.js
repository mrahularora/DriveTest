require("dotenv").config();

for (const name of ["MONGODB_URI", "SESSION_SECRET", "LICENSE_ENCRYPTION_KEY"]) {
  if (!process.env[name]) throw new Error(`${name} is required. Copy .env.example to .env.`);
}

const express = require("express");
const mongoose = require("mongoose");
const expressSession = require("express-session");

const app = express();
app.set("view engine", "ejs");
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);
app.use((req, res, next) => {
  res.locals.loggedIn = Boolean(req.session.userId);
  res.locals.userType = req.session.userType || null;
  next();
});

const auth = require("./middleware/authMiddleware");
const redirectIfAuthenticated = require("./middleware/redirectIfAuthenticatedMiddleware");
const home = require("./controllers/home");
const gTestView = require("./controllers/gtest");
const g2TestView = require("./controllers/g2test");
const loginView = require("./controllers/login");
const signUpView = require("./controllers/signUp");
const appointmentView = require("./controllers/appointmentController");
const pageNotFoundView = require("./controllers/notFound");
const createNewAccount = require("./controllers/createNewAccount");
const loginController = require("./controllers/loginUserAccount");
const modifyUserDetails = require("./controllers/modifyDetail");
const logoutController = require("./controllers/logout");
const addTimeSlot = require("./controllers/appointmentAvailability");
const checkAppointment = require("./controllers/checkAppointment");
const checkTimeSlot = require("./controllers/checkTimeSlot");
const examinerView = require("./controllers/examinerController");
const viewUserAppointment = require("./controllers/viewUserAppointmentDetails");
const examineUserAppointment = require("./controllers/examinUserAppointment");
const adminDriverView = require("./controllers/adminDriverViewController");
const vendorPrinting = require("./controllers/vendorPrintingController");

app.get("/", home);
app.get("/signup", redirectIfAuthenticated, signUpView);
app.get("/login", redirectIfAuthenticated, loginView);
app.get("/g2", auth.driverMiddleware, g2TestView);
app.get("/g", auth.driverMiddleware, gTestView);
app.get("/auth/logout", logoutController);
app.get("/appointment", auth.adminMiddleware, appointmentView);
app.get("/examiner", auth.examinerMiddleware, examinerView);
app.get("/checkAppointment/:date", auth.authUserMiddleware, checkAppointment);
app.get("/checkTimeSlotAvailable/:date", auth.authUserMiddleware, checkTimeSlot);
app.get("/examiner/appointments/:id/:testType", auth.examinerMiddleware, viewUserAppointment);
app.get("/checkDriverStatus", auth.adminMiddleware, adminDriverView);
app.get("/admin/vendor/:id/:testType", auth.adminMiddleware, vendorPrinting);
app.post("/examiner/appointments/:id/:testType", auth.examinerMiddleware, examineUserAppointment);
app.post("/edit", auth.driverMiddleware, modifyUserDetails);
app.post("/admin/appointments", auth.adminMiddleware, addTimeSlot);
app.post("/users/register", redirectIfAuthenticated, createNewAccount);
app.post("/users/login", redirectIfAuthenticated, loginController);
app.use(pageNotFoundView);

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`DriveTest running at http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Startup failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start };
