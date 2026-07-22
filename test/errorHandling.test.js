const test = require("node:test");
const assert = require("node:assert/strict");
const notFound = require("../controllers/notFound");
const applicationError = require("../controllers/applicationError");

const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  render(view, locals = {}) {
    this.view = view;
    this.locals = locals;
  },
});

test("central error handlers return safe pages", () => {
  const missing = response();
  notFound({}, missing);
  assert.deepEqual([missing.statusCode, missing.view], [404, "pageNotFound"]);

  const failed = response();
  const originalError = console.error;
  console.error = () => {};
  try {
    applicationError(new Error("database password leaked"), {}, failed, () => {});
  } finally {
    console.error = originalError;
  }
  assert.deepEqual([failed.statusCode, failed.view], [500, "pageNotFound"]);
  assert.doesNotMatch(JSON.stringify(failed.locals), /database password leaked/);
});
