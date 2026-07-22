const test = require("node:test");
const assert = require("node:assert/strict");
const isBookableDate = require("../utils/appointmentDate");

test("appointment dates are real and not in the past", () => {
  const now = new Date(2026, 6, 22, 12);
  assert.equal(isBookableDate("2026-07-21", now), false);
  assert.equal(isBookableDate("2026-07-22", now), true);
  assert.equal(isBookableDate("2026-07-23", now), true);
  assert.equal(isBookableDate("2026-02-30", now), false);
  assert.equal(isBookableDate("not-a-date", now), false);
});
