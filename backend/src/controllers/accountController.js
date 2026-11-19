'use strict';
const asyncHandler = require('../utils/asyncHandler');
const KickAccount = require('../models/KickAccount');
const kick = require('../services/kickService');
const audit = require('../services/auditService');
const { HttpError } = require('../utils/errors');
const { decrypt } = require('../utils/crypto');

const pub = (a) => ({
  id: a._id, kickUserId: a.kickUserId, username: a.username, profilePicture: a.profilePicture,
  status: a.status, scopes: a.scopes, tokenExpiresAt: a.tokenExpiresAt, lastCheckedAt: a.lastCheckedAt, connectedAt: a.createdAt,
});
const own = async (req) => {
  const a = await KickAccount.findOne({ _id: req.params.id, user: req.user._id });
  if (!a) throw new HttpError(404, 'Account not found', 'NOT_FOUND');
  return a;
};

exports.list = asyncHandler(async (req, res) => {
  const rows = await KickAccount.find({ user: req.user._id }).sort({ createdAt: 1 });
  res.json({ accounts: rows.map(pub) }); // no account limit
});

/** Verifies the stored token against Kick (refreshing if needed) and updates the status. */
exports.check = asyncHandler(async (req, res) => {
  const acc = await own(req);
  try {
    const token = await kick.ensureAccessToken(acc);
    const u = await kick.getCurrentUser(token);
    acc.username = u.name; acc.profilePicture = u.picture; acc.status = 'connected';
  } catch (e) {
    if (e.status === 401) acc.status = 'expired'; else throw e;
  }
  acc.lastCheckedAt = new Date();
  await acc.save();
  res.json({ account: pub(acc) });
});

exports.remove = asyncHandler(async (req, res) => {
  const acc = await own(req);
  try { await kick.revoke(decrypt(acc.accessTokenEnc)); } catch { /* best effort */ }
  await acc.deleteOne();
  await audit.log({ actorType: 'user', actorId: req.user._id, action: 'kick.account_disconnected', meta: { username: acc.username }, ip: req.ip });
  res.json({ ok: true });
});
