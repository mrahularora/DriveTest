const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");

const user = {
  _id: "507f1f77bcf86cd799439011",
  firstName: "Test",
  lastName: "Driver",
  dob: new Date("2000-01-01"),
  licenceNo: "AB12CD34",
  age: 26,
  carDetails: { make: "Honda", model: "Civic", year: 2020, plateNo: "TEST123" },
  appointmentDate: "",
  appointmentTime: "",
  comment: "",
  pass: false,
  status: "Pending",
  testType: "G2",
};

const cases = {
  "index.ejs": {},
  "login.ejs": { error: "", success: "" },
  "register.ejs": { error: "" },
  "g2test.ejs": { user, error: "" },
  "gtest.ejs": { user: { ...user, qualified: "G2" }, error: "" },
  "appointment.ejs": { error: "", message: "" },
  "examiner.ejs": { appointments: [], error: "", message: "" },
  "adminDriverView.ejs": { appointments: [], error: "", message: "" },
  "viewUserAppointment.ejs": { driverDetails: user, error: "" },
  "vendor.ejs": { allDetails: { ...user, qualified: "G2" }, error: "" },
  "pageNotFound.ejs": {},
  "userNotFound.ejs": {},
};

test("all application views render", async () => {
  for (const [file, locals] of Object.entries(cases)) {
    const html = await ejs.renderFile(path.join(__dirname, "..", "views", file), {
      loggedIn: false,
      userType: null,
      ...locals,
    });
    assert.equal((html.match(/<head>/g) || []).length, 1, `${file} must have one head`);
    assert.match(html, /<title>.+ \| DriveTest<\/title>/, `${file} must have a page title`);
  }
});
