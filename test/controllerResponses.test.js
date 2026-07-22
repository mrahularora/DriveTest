const test = require("node:test");
const assert = require("node:assert/strict");
const BookedTimeSlot = require("../models/BookedTimeSlot");
const UserAccount = require("../models/UserAccount");
const checkTimeSlot = require("../controllers/checkTimeSlot");
const modifyDetail = require("../controllers/modifyDetail");
const examineAppointment = require("../controllers/examinUserAppointment");

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
