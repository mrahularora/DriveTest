const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const BookedTimeSlot = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");
const checkTimeSlot = require("../controllers/checkTimeSlot");
const modifyDetail = require("../controllers/modifyDetail");
const examineAppointment = require("../controllers/examinUserAppointment");
const createAccount = require("../controllers/createNewAccount");
const auth = require("../middleware/authMiddleware");
const express = require("express");
const { secureHeaders, loginRateLimit } = require("../middleware/securityMiddleware");
const csrfProtection = require("../middleware/csrfMiddleware");
const accountController = require("../controllers/accountController");
const { hashPassword, verifyPassword, verifyRecoveryCode, createRecoveryCode } = require("../utils/password");

const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
  },
  render(view, locals) {
    this.view = view;
    this.locals = locals;
  },
  redirect(path) {
    this.path = path;
  },
});

test("authentication and role authorization protect staff routes", async () => {
  const guest = response();
  await auth.adminMiddleware({ session: {} }, guest, assert.fail);
  assert.equal(guest.path, "/login");

  const findById = UserAccount.findById;
  try {
    UserAccount.findById = () => ({ select: async () => ({ userType: "driver" }) });
    const forbidden = response();
    await auth.adminMiddleware({ session: { userId: "driver" } }, forbidden, assert.fail);
    assert.equal(forbidden.path, "/");

    UserAccount.findById = () => ({ select: async () => ({ userType: "admin" }) });
    let allowed = false;
    await auth.adminMiddleware({ session: { userId: "admin" } }, response(), () => { allowed = true; });
    assert.equal(allowed, true);
  } finally {
    UserAccount.findById = findById;
  }
});

test("public registration cannot create staff accounts", async () => {
  const create = UserAccount.create;
  let account;
  UserAccount.create = async (details) => { account = details; };
  const res = response();
  try {
    await createAccount({
      body: {
        userName: "driver-test",
        password: "safe-password",
        confirmPassword: "safe-password",
        userType: "admin",
      },
    }, res);
  } finally {
    UserAccount.create = create;
  }
  assert.equal(account.userType, "driver");
  assert.equal(res.view, "login");
  const recoveryCode = res.locals.success.match(/: (\S+)$/)[1];
  assert.equal(verifyRecoveryCode(recoveryCode, account.recoveryCodeHash), true);
});

test("password changes require the current password and end the session", async () => {
  const findById = UserAccount.findById;
  const user = { password: await hashPassword("old-password"), async save() {} };
  UserAccount.findById = async () => user;
  const req = {
    session: {
      userId: "driver",
      destroy(callback) { this.destroyed = true; callback(); },
    },
    body: {
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmPassword: "new-password",
    },
  };
  const res = response();
  try {
    await accountController.changePassword(req, res, assert.fail);
  } finally {
    UserAccount.findById = findById;
  }
  assert.equal(await verifyPassword("new-password", user.password), true);
  assert.equal(req.session.destroyed, true);
  assert.equal(res.path, "/login?changed=1");
});

test("account recovery consumes the recovery code", async () => {
  const findOne = UserAccount.findOne;
  const recovery = createRecoveryCode();
  const user = { recoveryCodeHash: recovery.hash, async save() {} };
  UserAccount.findOne = () => ({ select: async () => user });
  const res = response();
  try {
    await accountController.recover({
      body: {
        userName: "driver-test",
        recoveryCode: recovery.code,
        newPassword: "reset-password",
        confirmPassword: "reset-password",
      },
    }, res, assert.fail);
  } finally {
    UserAccount.findOne = findOne;
  }
  assert.equal(await verifyPassword("reset-password", user.password), true);
  assert.equal(user.recoveryCodeHash, undefined);
  assert.equal(res.path, "/login?reset=1");
});

test("availability database errors return JSON with status 500", async () => {
  const find = BookedTimeSlot.find;
  BookedTimeSlot.find = async () => { throw new Error("database failed"); };
  const res = response();
  try {
    await checkTimeSlot({ params: { date: "2999-01-01" } }, res);
  } finally {
    BookedTimeSlot.find = find;
  }
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "Unable to check booked time slots" });
});

test("driver validation errors render inside the correct form", async () => {
  const findById = UserAccount.findById;
  UserAccount.findById = async () => ({ _id: "driver" });
  const res = response();
  try {
    await modifyDetail(
      { session: { userId: "driver" }, body: { action: "car", make: "" } },
      res,
      assert.fail
    );
  } finally {
    UserAccount.findById = findById;
  }
  assert.equal(res.statusCode, 400);
  assert.equal(res.view, "gtest");
  assert.equal(res.locals.error, "Enter valid car details.");
});

test("profile updates save driver details without booking", async () => {
  const originals = {
    findById: UserAccount.findById,
    exists: UserAccount.exists,
    updateOne: UserAccount.updateOne,
    appointmentExists: Appointment.exists,
  };
  let saved;
  UserAccount.findById = async () => ({ _id: "driver" });
  UserAccount.exists = async () => false;
  UserAccount.updateOne = async (filter, update) => { saved = update.$set; };
  Appointment.exists = assert.fail;
  const res = response();
  try {
    await modifyDetail({
      session: { userId: "driver" },
      body: {
        action: "profile",
        firstName: "Test",
        lastName: "Driver",
        licenceNo: "AB12CD34",
        age: "26",
        dob: "2000-01-01",
        make: "Honda",
        model: "Civic",
        year: "2020",
        plateNo: "test123",
      },
    }, res, assert.fail);
  } finally {
    UserAccount.findById = originals.findById;
    UserAccount.exists = originals.exists;
    UserAccount.updateOne = originals.updateOne;
    Appointment.exists = originals.appointmentExists;
  }
  assert.equal(saved.firstName, "Test");
  assert.equal(saved.carDetails.plateNo, "TEST123");
  assert.equal(saved.appointmentDate, undefined);
  assert.equal(res.path, "/g2?profile=saved");
});

test("G2 booking requires a saved complete profile", async () => {
  const originals = { findById: UserAccount.findById, appointmentExists: Appointment.exists };
  UserAccount.findById = async () => ({ _id: "driver", carDetails: {} });
  Appointment.exists = assert.fail;
  const res = response();
  try {
    await modifyDetail({
      session: { userId: "driver" },
      body: { testType: "G2", G2date: "2999-01-01", timeSlot: "09:00" },
    }, res, assert.fail);
  } finally {
    UserAccount.findById = originals.findById;
    Appointment.exists = originals.appointmentExists;
  }
  assert.equal(res.statusCode, 403);
  assert.equal(res.locals.error, "Save a complete profile before booking a G2 test.");
});

test("examiner validation errors stay on the assessment form", async () => {
  const findById = UserAccount.findById;
  UserAccount.findById = async () => ({ _id: "driver" });
  const res = response();
  try {
    await examineAppointment(
      { params: { id: "driver", testType: "G2" }, body: {} },
      res,
      assert.fail
    );
  } finally {
    UserAccount.findById = findById;
  }
  assert.equal(res.statusCode, 400);
  assert.equal(res.view, "viewUserAppointment");
  assert.equal(res.locals.error, "Select pass or fail.");
});

test("rescheduling and driver writes share one transaction", async () => {
  const originals = {
    startSession: mongoose.startSession,
    findById: UserAccount.findById,
    userUpdate: UserAccount.updateOne,
    appointmentExists: Appointment.exists,
    bookingExists: BookedTimeSlot.exists,
    bookingUpdate: BookedTimeSlot.updateOne,
  };
  const session = {
    withTransaction: async (work) => work(),
    endSession: async () => { session.ended = true; },
  };
  let bookingSession;
  let userSession;
  mongoose.startSession = async () => session;
  UserAccount.findById = async () => ({
    _id: "driver",
    qualified: "G2",
    status: "Pending",
    testType: "G",
    appointmentDate: "2999-01-02",
  });
  UserAccount.updateOne = async (filter, update, options) => { userSession = options.session; };
  Appointment.exists = async () => true;
  BookedTimeSlot.exists = async () => false;
  BookedTimeSlot.updateOne = async (filter, update, options) => { bookingSession = options.session; };
  const res = { redirect(path) { this.path = path; } };

  try {
    await modifyDetail(
      {
        session: { userId: "driver" },
        body: { action: "reschedule", testType: "G", Gdate: "2999-01-01", timeSlot: "09:00" },
      },
      res,
      assert.fail
    );
  } finally {
    mongoose.startSession = originals.startSession;
    UserAccount.findById = originals.findById;
    UserAccount.updateOne = originals.userUpdate;
    Appointment.exists = originals.appointmentExists;
    BookedTimeSlot.exists = originals.bookingExists;
    BookedTimeSlot.updateOne = originals.bookingUpdate;
  }

  assert.equal(bookingSession, session);
  assert.equal(userSession, session);
  assert.equal(session.ended, true);
  assert.equal(res.path, "/g?rescheduled=1");
});

test("cancellation removes the booking and appointment together", async () => {
  const originals = {
    startSession: mongoose.startSession,
    findById: UserAccount.findById,
    userUpdate: UserAccount.updateOne,
    bookingDelete: BookedTimeSlot.deleteOne,
  };
  const session = {
    withTransaction: async (work) => work(),
    endSession: async () => { session.ended = true; },
  };
  let bookingSession;
  let userUpdate;
  mongoose.startSession = async () => session;
  UserAccount.findById = async () => ({
    _id: "driver",
    status: "Pending",
    testType: "G2",
    appointmentDate: "2999-01-01",
  });
  BookedTimeSlot.deleteOne = async (filter, options) => { bookingSession = options.session; };
  UserAccount.updateOne = async (filter, update, options) => {
    userUpdate = update;
    assert.equal(options.session, session);
  };
  const res = response();

  try {
    await modifyDetail({
      session: { userId: "driver" },
      body: { action: "cancel", testType: "G2" },
    }, res, assert.fail);
  } finally {
    mongoose.startSession = originals.startSession;
    UserAccount.findById = originals.findById;
    UserAccount.updateOne = originals.userUpdate;
    BookedTimeSlot.deleteOne = originals.bookingDelete;
  }

  assert.equal(bookingSession, session);
  assert.deepEqual(Object.keys(userUpdate.$unset).sort(), ["appointmentDate", "appointmentTime", "comment", "testType"]);
  assert.equal(session.ended, true);
  assert.equal(res.path, "/g2?canceled=1");
});

test("booking conflicts return status 409 before any write", async () => {
  const originals = {
    findById: UserAccount.findById,
    appointmentExists: Appointment.exists,
    bookingExists: BookedTimeSlot.exists,
    bookingUpdate: BookedTimeSlot.updateOne,
  };
  let wroteBooking = false;
  UserAccount.findById = async () => ({ _id: "driver", qualified: "G2" });
  Appointment.exists = async () => true;
  BookedTimeSlot.exists = async () => true;
  BookedTimeSlot.updateOne = async () => { wroteBooking = true; };
  const res = response();

  try {
    await modifyDetail(
      {
        session: { userId: "driver" },
        body: { testType: "G", Gdate: "2999-01-01", timeSlot: "09:00" },
      },
      res,
      assert.fail
    );
  } finally {
    UserAccount.findById = originals.findById;
    Appointment.exists = originals.appointmentExists;
    BookedTimeSlot.exists = originals.bookingExists;
    BookedTimeSlot.updateOne = originals.bookingUpdate;
  }

  assert.equal(res.statusCode, 409);
  assert.equal(res.view, "gtest");
  assert.equal(wroteBooking, false);
});

test("security headers and login rate limiting protect authentication", async (t) => {
  const app = express();
  app.use(secureHeaders);
  app.post("/login", loginRateLimit, (req, res) => res.sendStatus(401));
  const server = app.listen(0);
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/login`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { method: "POST" });
    assert.equal(response.status, 401);
  }

  const blocked = await fetch(url, { method: "POST" });
  assert.equal(blocked.status, 429);
  assert.match(await blocked.text(), /Too many login attempts/);
  assert.equal(blocked.headers.get("x-content-type-options"), "nosniff");
  assert.equal(blocked.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.ok(blocked.headers.get("ratelimit"));
});

test("CSRF protection rejects missing tokens and accepts the session token", () => {
  const session = {};
  let allowed = false;
  csrfProtection({ method: "GET", session }, { locals: {} }, () => { allowed = true; });
  assert.equal(allowed, true);
  assert.match(session.csrfToken, /^[a-f0-9]{64}$/);

  const rejected = {
    locals: {},
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; },
  };
  csrfProtection({ method: "POST", session, body: {} }, rejected, assert.fail);
  assert.equal(rejected.statusCode, 403);

  allowed = false;
  csrfProtection(
    { method: "POST", session, body: { _csrf: session.csrfToken } },
    { locals: {} },
    () => { allowed = true; }
  );
  assert.equal(allowed, true);
});
