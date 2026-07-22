const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword, createRecoveryCode, verifyRecoveryCode } = require("../utils/password");

test("passwords are salted and verified with scrypt", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong", first), false);
});

test("recovery codes are random and verifiable without storing the code", () => {
  const first = createRecoveryCode();
  const second = createRecoveryCode();
  assert.notEqual(first.code, second.code);
  assert.notEqual(first.code, first.hash);
  assert.equal(verifyRecoveryCode(first.code, first.hash), true);
  assert.equal(verifyRecoveryCode(second.code, first.hash), false);
});
