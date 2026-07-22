const crypto = require("crypto");

const key = () => crypto.createHash("sha256").update(process.env.LICENSE_ENCRYPTION_KEY || "").digest();

function encrypt(value) {
  if (!value || value === "default" || value.startsWith("v1:")) return value;
  if (!process.env.LICENSE_ENCRYPTION_KEY) throw new Error("LICENSE_ENCRYPTION_KEY is required");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(value) {
  if (!value || !value.startsWith("v1:")) return value;
  const [, iv, tag, encrypted] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString("utf8");
}

function hash(value) {
  return crypto.createHmac("sha256", key()).update(value.toUpperCase()).digest("hex");
}

module.exports = { encrypt, decrypt, hash };
