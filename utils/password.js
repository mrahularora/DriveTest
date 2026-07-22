const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, salt, expectedHex] = (stored || "").split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashRecoveryCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function createRecoveryCode() {
  const code = crypto.randomBytes(16).toString("base64url");
  return { code, hash: hashRecoveryCode(code) };
}

function verifyRecoveryCode(code, storedHash) {
  const expected = Buffer.from(storedHash || "", "hex");
  const actual = Buffer.from(hashRecoveryCode(code || ""), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword, createRecoveryCode, verifyRecoveryCode };
