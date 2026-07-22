const test = require("node:test");
const assert = require("node:assert/strict");

process.env.LICENSE_ENCRYPTION_KEY = "test-only-secret";
const { decrypt, encrypt, hash } = require("../utils/licenseCrypto");
const UserAccount = require("../models/UserAccount");

test("licence numbers encrypt, decrypt, and hash consistently", () => {
  const encrypted = encrypt("AB12CD34");
  assert.notEqual(encrypted, "AB12CD34");
  assert.equal(decrypt(encrypted), "AB12CD34");
  assert.equal(hash("ab12cd34"), hash("AB12CD34"));

  const user = new UserAccount({
    userName: "driver1",
    password: "stored-hash",
    userType: "driver",
    licenceNo: "AB12CD34",
  });
  assert.equal(user.licenceNo, "AB12CD34");
  assert.match(user.get("licenceNo", null, { getters: false }), /^v1:/);
});
