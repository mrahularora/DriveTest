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

test("booking and driver writes share one transaction", async () => {
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
  UserAccount.findById = async () => ({ _id: "driver", qualified: "G2" });
  UserAccount.updateOne = async (filter, update, options) => { userSession = options.session; };
  Appointment.exists = async () => true;
  BookedTimeSlot.exists = async () => false;
  BookedTimeSlot.updateOne = async (filter, update, options) => { bookingSession = options.session; };
  const res = { redirect(path) { this.path = path; } };

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
  assert.equal(res.path, "/g");
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
