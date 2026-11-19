'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const License = require('../models/License');
const { HttpError } = require('../utils/errors');
const { licenseState } = require('../services/licenseService');

function signToken(user, license) {
  return jwt.sign({ sub: String(user._id), lic: String(license._id) }, env.jwtSecret, {
    algorithm: 'HS256', expiresIn: '7d', issuer: 'kick-manager',
  });
}

/** Verifies JWT, then re-validates the license in the database on EVERY request. */
async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Missing token', 'NO_TOKEN');
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'], issuer: 'kick-manager' });
    } catch {
      throw new HttpError(401, 'Invalid or expired session', 'BAD_TOKEN');
    }
    const [user, license] = await Promise.all([User.findById(payload.sub), License.findById(payload.lic)]);
    if (!user || !license || String(license.user) !== String(user._id)) throw new HttpError(401, 'Session no longer valid', 'BAD_TOKEN');
    const state = licenseState(license);
    if (state === 'revoked') throw new HttpError(403, 'License revoked', 'LICENSE_REVOKED');
    if (state === 'expired') throw new HttpError(403, 'License expired', 'LICENSE_EXPIRED');
    req.user = user;
    req.license = license;
    req.ip_ = req.ip;
    next();
  } catch (e) { next(e); }
}

module.exports = { requireAuth, signToken };
