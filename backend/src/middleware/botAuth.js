'use strict';
const env = require('../config/env');
const { safeEqual } = require('../utils/crypto');
const { HttpError } = require('../utils/errors');

module.exports = (req, _res, next) => {
  const secret = req.get('x-bot-secret') || '';
  if (!secret || !safeEqual(secret, env.botSecret)) return next(new HttpError(401, 'Unauthorized', 'BAD_BOT_SECRET'));
  next();
};
