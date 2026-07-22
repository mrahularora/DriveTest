const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

// ponytail: enable CSP after inline scripts and event handlers move to public JavaScript.
const secureHeaders = helmet({ contentSecurityPolicy: false });

// ponytail: the memory store suits one server; use a shared store before horizontal scaling.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: "Too many login attempts. Try again in 15 minutes.",
});

module.exports = { secureHeaders, loginRateLimit };
