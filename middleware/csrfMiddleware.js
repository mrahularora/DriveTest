const { randomBytes, timingSafeEqual } = require("node:crypto");

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

module.exports = (req, res, next) => {
  req.session.csrfToken ||= randomBytes(32).toString("hex");
  res.locals.csrfToken = req.session.csrfToken;
  if (!unsafeMethods.has(req.method)) return next();

  const submitted = req.body?._csrf || req.get?.("x-csrf-token");
  const expected = Buffer.from(req.session.csrfToken);
  const received = Buffer.from(typeof submitted === "string" ? submitted : "");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(403).send("Invalid or missing CSRF token.");
  }
  next();
};
