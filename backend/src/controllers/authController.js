'use strict';
const asyncHandler = require('../utils/asyncHandler');
const licenses = require('../services/licenseService');
const audit = require('../services/auditService');
const { signToken } = require('../middleware/auth');

exports.activate = asyncHandler(async (req, res) => {
  const { code, deviceId } = req.body;
  try {
    const { user, license, firstActivation } = await licenses.activate(code, deviceId);
    await audit.log({ actorType: 'user', actorId: user._id, action: firstActivation ? 'license.activated' : 'license.relogin', meta: { license: license.publicId }, ip: req.ip });
    res.json({ token: signToken(user, license), license: licenses.serialize(license), language: user.language });
  } catch (e) {
    await audit.log({ actorType: 'system', action: 'license.activation_failed', meta: { reason: e.code || e.message }, ip: req.ip });
    throw e;
  }
});

exports.me = asyncHandler(async (req, res) => {
  req.user.lastSeenAt = new Date();
  await req.user.save();
  res.json({ license: licenses.serialize(req.license), language: req.user.language });
});

exports.setLanguage = asyncHandler(async (req, res) => {
  req.user.language = req.body.language;
  await req.user.save();
  res.json({ language: req.user.language });
});
