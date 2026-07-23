const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");
const getDriverJourney = require("../utils/driverJourney");
const appointmentSlots = require("../utils/appointmentSlots");
const navbar = path.join(__dirname, "..", "views", "layouts", "navbar.ejs");
const footer = path.join(__dirname, "..", "views", "layouts", "footer.ejs");
const adminView = path.join(__dirname, "..", "views", "adminDriverView.ejs");

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
  appointmentHistory: [],
};

const cases = {
  "index.ejs": { totals: null },
  "login.ejs": { error: "", success: "" },
  "register.ejs": { error: "" },
  "g2test.ejs": { user, error: "", success: "", journey: getDriverJourney(user, "G2") },
  "gtest.ejs": {
    user: { ...user, qualified: "G2" },
    error: "",
    success: "",
    journey: getDriverJourney({ ...user, qualified: "G2" }, "G"),
  },
  "appointment.ejs": { error: "", message: "", slots: appointmentSlots },
  "examiner.ejs": { appointments: [], error: "", message: "", filters: { testType: "all", status: "pending" } },
  "adminDriverView.ejs": { appointments: [], error: "", message: "" },
  "viewUserAppointment.ejs": { driverDetails: user, error: "" },
  "vendor.ejs": { allDetails: { ...user, qualified: "G2" }, error: "" },
  "pageNotFound.ejs": {},
  "userNotFound.ejs": {},
  "account.ejs": { error: "", success: "", recoveryCode: "" },
  "recover.ejs": { error: "" },
};

test("driver journey reports profile progress and G eligibility", () => {
  const complete = getDriverJourney(user, "G2");
  assert.equal(complete.profile.percent, 100);
  assert.equal(complete.canBook, true);

  const incomplete = getDriverJourney({ ...user, firstName: "default", carDetails: {} }, "G2");
  assert.equal(incomplete.profile.complete, false);
  assert.match(incomplete.guidance, /first name/);

  const gLocked = getDriverJourney(user, "G");
  assert.equal(gLocked.canBook, false);
  assert.match(gLocked.guidance, /Pass the G2 test/);

  const g2Passed = getDriverJourney({ ...user, qualified: "G2" }, "G2");
  assert.equal(g2Passed.canBook, false);
  assert.match(g2Passed.guidance, /passed the G2 test/);
});

test("G2 profile and booking fields use separate forms", async () => {
  const html = await ejs.renderFile(path.join(__dirname, "..", "views", "g2test.ejs"), {
    loggedIn: true,
    userType: "driver",
    currentPath: "/g2",
    csrfToken: "test-token",
    user,
    error: "",
    success: "",
    journey: getDriverJourney(user, "G2"),
  });
  const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map((match) => match[0]);
  const profileForm = forms.find((form) => form.includes('value="profile"'));
  const bookingForm = forms.find((form) => form.includes('value="G2"'));
  assert.ok(profileForm);
  assert.ok(bookingForm);
  assert.doesNotMatch(profileForm, /name="G2date"/);
  assert.doesNotMatch(bookingForm, /name="firstName"/);
  assert.match(profileForm, /id="personal-details-heading">Personal and licence details/);
  assert.match(profileForm, /id="vehicle-details-heading">Vehicle details/);
  assert.match(profileForm, /class="row g-3"/);
  assert.match(html, /Recommended next step/);
  assert.match(bookingForm, /Choose a date to load available times\./);
  assert.match(bookingForm, /id="selectSlots" class="row g-2"|class="row g-2" id="selectSlots"/);
  assert.match(bookingForm, /type="submit" disabled/);
});

test("pending appointments offer reschedule and cancellation controls", async () => {
  const pendingUser = { ...user, appointmentDate: "2999-01-01", appointmentTime: "09:00" };
  const html = await ejs.renderFile(path.join(__dirname, "..", "views", "g2test.ejs"), {
    loggedIn: true,
    userType: "driver",
    currentPath: "/g2",
    csrfToken: "test-token",
    user: pendingUser,
    error: "",
    success: "",
    journey: getDriverJourney(pendingUser, "G2"),
  });
  assert.match(html, /name="action" value="reschedule"/);
  assert.match(html, /name="action" value="cancel"/);
  assert.match(html, /Current appointment/);
  assert.match(html, /class="badge fs-6 px-3 py-2/);
  assert.match(html, /Manage appointment/);
  assert.match(html, /current appointment stays booked until the new time is saved/);
  assert.match(html, /data-confirm="Cancel your G2 appointment on 2999-01-01 at 09:00\?/);
  assert.match(html, /Cancel this appointment/);
  assert.doesNotMatch(html, /onsubmit=/);
});

test("G appointments use the shared booking and management layout", async () => {
  const pendingUser = {
    ...user,
    qualified: "G2",
    testType: "G",
    appointmentDate: "2999-01-01",
    appointmentTime: "09:00",
  };
  const pending = await ejs.renderFile(path.join(__dirname, "..", "views", "gtest.ejs"), {
    loggedIn: true,
    userType: "driver",
    currentPath: "/g",
    csrfToken: "test-token",
    user: pendingUser,
    error: "",
    success: "",
    journey: getDriverJourney(pendingUser, "G"),
  });
  assert.match(pending, /id="g-booking-heading">G appointment/);
  assert.match(pending, /id="driver-details-heading">Personal and licence details/);
  assert.match(pending, /id="g-vehicle-details-heading">Vehicle details/);
  assert.match(pending, /name="action" value="reschedule"/);
  assert.match(pending, /name="action" value="cancel"/);

  const bookableUser = { ...user, qualified: "G2", status: "Failed" };
  const bookable = await ejs.renderFile(path.join(__dirname, "..", "views", "gtest.ejs"), {
    loggedIn: true,
    userType: "driver",
    currentPath: "/g",
    csrfToken: "test-token",
    user: bookableUser,
    error: "",
    success: "",
    journey: getDriverJourney(bookableUser, "G"),
  });
  assert.match(bookable, /name="Gdate"/);
  assert.match(bookable, /Recommended action/);
  assert.match(bookable, /Book G test/);
});

test("drivers see completed appointments and results", async () => {
  const completedUser = {
    ...user,
    qualified: "G2",
    status: "Passed",
    pass: true,
    appointmentHistory: [{
      testType: "G2",
      date: "2026-07-20",
      time: "09:00",
      status: "Passed",
      comment: "Safe drive",
    }],
  };
  const html = await ejs.renderFile(path.join(__dirname, "..", "views", "g2test.ejs"), {
    loggedIn: true,
    userType: "driver",
    currentPath: "/g2",
    csrfToken: "test-token",
    user: completedUser,
    error: "",
    success: "",
    journey: getDriverJourney(completedUser, "G2"),
  });
  assert.match(html, /Test history/);
  assert.match(html, /G2 test · 2026-07-20 at 09:00/);
  assert.match(html, /class="badge bg-success">Passed<\/span>/);
  assert.match(html, /Safe drive/);
});

test("staff appointment tables are searchable, sortable, and responsive", async () => {
  for (const file of ["examiner.ejs", "adminDriverView.ejs"]) {
    const html = await ejs.renderFile(path.join(__dirname, "..", "views", file), {
      loggedIn: true,
      userType: file === "examiner.ejs" ? "examiner" : "admin",
      currentPath: file === "examiner.ejs" ? "/examiner" : "/checkDriverStatus",
      csrfToken: "test-token",
      appointments: [],
      error: "",
      message: "",
      filters: { testType: "all", status: "pending" },
    });
    assert.match(html, /class="table-responsive"/);
    assert.match(html, /type="search"[^>]+data-table-search=/);
    assert.match(html, /data-sort-column="0"/);
    assert.match(html, /aria-sort="none"/);
    assert.match(html, /new Intl\.Collator/);
  }
});

test("admin availability groups shared slots with clear states", async () => {
  const html = await ejs.renderFile(path.join(__dirname, "..", "views", "appointment.ejs"), {
    loggedIn: true,
    userType: "admin",
    currentPath: "/appointment",
    csrfToken: "test-token",
    error: "",
    message: "",
    slots: appointmentSlots,
  });
  assert.equal((html.match(/class="btn-check appointment-slot"/g) || []).length, appointmentSlots.length);
  assert.match(html, /<legend class="h5">Morning<\/legend>/);
  assert.match(html, /<legend class="h5">Afternoon<\/legend>/);
  assert.match(html, /Already offered/);
  assert.match(html, /Add selected slots/);
  const form = html.match(/<form action="\/admin\/appointments\/"[\s\S]*?<\/form>/)[0];
  assert.doesNotMatch(form, /form-check-inline/);
});

test("staff dashboard shows operational totals", async () => {
  const html = await ejs.renderFile(path.join(__dirname, "..", "views", "index.ejs"), {
    loggedIn: true,
    userType: "admin",
    currentPath: "/",
    csrfToken: "test-token",
    totals: { available: 7, booked: 3, completed: 5, passed: 4, failed: 1 },
  });
  assert.match(html, /Appointment overview/);
  for (const label of ["Available", "Booked", "Completed", "Passed", "Failed"]) {
    assert.match(html, new RegExp(`<span>${label}</span>`));
  }
});

test("all application views render", async () => {
  for (const [file, locals] of Object.entries(cases)) {
    const html = await ejs.renderFile(path.join(__dirname, "..", "views", file), {
      loggedIn: false,
      userType: null,
      currentPath: "/",
      csrfToken: "test-token",
      ...locals,
    });
    assert.equal((html.match(/<head>/g) || []).length, 1, `${file} must have one head`);
    assert.match(html, /<title>.+ \| DriveTest<\/title>/, `${file} must have a page title`);
    if (file !== "index.ejs") {
      assert.match(html, /<header class="page-header">/, `${file} must use the shared page header`);
    }
    assert.doesNotMatch(html, /class="(?:masthead|modifiedMasthead)"/, `${file} must not use a legacy masthead`);
    assert.doesNotMatch(html, /\sstyle="/, `${file} must not use inline presentation styles`);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
    for (const match of html.matchAll(/<label[^>]+for="([^"]+)"/g)) {
      assert.equal(ids.has(match[1]), true, `${file} label must target #${match[1]}`);
    }
    for (const match of html.matchAll(/<form\b[^>]*method="post"[^>]*>[\s\S]*?<\/form>/gi)) {
      assert.match(match[0], /name="_csrf"/, `${file} POST forms must include a CSRF token`);
    }
  }
});

test("navigation shows role links and marks the current page", async () => {
  const driver = await ejs.renderFile(navbar, {
    loggedIn: true,
    userType: "driver",
    currentPath: "/g2",
    csrfToken: "test-token",
  });
  assert.match(driver, /aria-current="page">G2 Test<\/a>/);
  assert.match(driver, />G Test<\/a>/);
  assert.match(driver, />Account<\/a>/);
  assert.doesNotMatch(driver, />Availability<\/a>/);

  const guest = await ejs.renderFile(navbar, {
    loggedIn: false,
    userType: null,
    currentPath: "/login",
    csrfToken: "test-token",
  });
  assert.match(guest, /aria-current="page">Log in<\/a>/);
  assert.match(driver, /action="\/auth\/logout" method="post"/);
  assert.match(driver, /name="_csrf" value="test-token"/);
  assert.match(driver, /class="nav-link nav-logout/);
  assert.match(guest, /class="navbar-toggler"[^>]+aria-expanded="false"/);
  assert.doesNotMatch(guest, /action="\/auth\/logout"/);

  const scripts = await ejs.renderFile(path.join(__dirname, "..", "views", "layouts", "scripts.ejs"));
  assert.match(scripts, /navMenu\.classList\.toggle\("show", !expanded\)/);
  assert.doesNotMatch(scripts, /bootstrap\.bundle/);
  assert.doesNotMatch(scripts, /jquery/i);
  assert.match(scripts, /Unavailable/);
  assert.match(scripts, /selected\. Continue to confirm your appointment\./);
  assert.match(scripts, /window\.confirm\(form\.dataset\.confirm\)/);
});

test("footer has current product copy without placeholder links", async () => {
  const html = await ejs.renderFile(footer);
  assert.match(html, new RegExp(`${new Date().getFullYear()} DriveTest Booking Portal`));
  assert.doesNotMatch(html, /href="#!"/);
});

test("forms use alerts and driver results use status badges", async () => {
  const login = await ejs.renderFile(path.join(__dirname, "..", "views", "login.ejs"), {
    loggedIn: false,
    userType: null,
    currentPath: "/login",
    error: "Incorrect username or password.",
    success: "",
    csrfToken: "test-token",
  });
  assert.match(login, /class="alert alert-danger"/);
  assert.match(login, /class="form-actions"/);
  assert.doesNotMatch(login, /class="c-account"/);

  const admin = await ejs.renderFile(adminView, {
    loggedIn: true,
    userType: "admin",
    currentPath: "/checkDriverStatus",
    error: "",
    message: "",
    csrfToken: "test-token",
    appointments: [{
      testType: "G2",
      userDetails: { ...user, status: "Passed", pass: true },
    }],
  });
  assert.match(admin, /class="badge bg-success">Passed<\/span>/);
  assert.match(admin, />Issue licence<\/a>/);
});

test("public signup does not expose staff roles", async () => {
  const html = await ejs.renderFile(path.join(__dirname, "..", "views", "register.ejs"), {
    loggedIn: false,
    userType: null,
    currentPath: "/signup",
    error: "",
    csrfToken: "test-token",
  });
  assert.doesNotMatch(html, /name="userType"/);
  assert.match(html, /New accounts are created for drivers\./);
  assert.match(html, /class="form-actions"/);
});
