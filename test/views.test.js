const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");
const navbar = path.join(__dirname, "..", "views", "layouts", "navbar.ejs");

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
      currentPath: "/",
      ...locals,
    });
    assert.equal((html.match(/<head>/g) || []).length, 1, `${file} must have one head`);
    assert.match(html, /<title>.+ \| DriveTest<\/title>/, `${file} must have a page title`);
  }
});

test("navigation shows role links and marks the current page", async () => {
  const driver = await ejs.renderFile(navbar, {
    loggedIn: true,
    userType: "driver",
    currentPath: "/g2",
  });
  assert.match(driver, /aria-current="page">G2 Test<\/a>/);
  assert.match(driver, />G Test<\/a>/);
  assert.doesNotMatch(driver, />Availability<\/a>/);

  const guest = await ejs.renderFile(navbar, {
    loggedIn: false,
    userType: null,
    currentPath: "/login",
  });
  assert.match(guest, /aria-current="page">Log in<\/a>/);
  assert.doesNotMatch(guest, />Log out<\/a>/);
});
