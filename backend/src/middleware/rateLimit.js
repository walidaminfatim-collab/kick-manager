'use strict';
const rateLimit = require('express-rate-limit');

const base = { standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, slow down.' } };
module.exports = {
  globalLimiter: rateLimit({ ...base, windowMs: 60_000, limit: 120 }),
  activationLimiter: rateLimit({ ...base, windowMs: 15 * 60_000, limit: 10, message: { error: 'Too many activation attempts. Try again later.' } }),
  oauthLimiter: rateLimit({ ...base, windowMs: 60_000, limit: 20 }),
  internalLimiter: rateLimit({ ...base, windowMs: 60_000, limit: 60 }),
};
