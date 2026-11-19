'use strict';
const asyncHandler = require('../utils/asyncHandler');
const licenses = require('../services/licenseService');
const audit = require('../services/auditService');
const { LICENSE_TYPE } = require('../../../shared/constants');

const adminLog = (req, action, meta) => audit.log({ actorType: 'admin', actorId: req.body?.actor || req.query?.actor || 'bot', action, meta, ip: req.ip });

exports.generate = asyncHandler(async (req, res) => {
  const { days, note, actor } = req.body;
  const { license, code } = await licenses.createLicense({ type: LICENSE_TYPE.TEMPORARY, days, createdBy: actor, note });
  await adminLog(req, 'license.generated', { id: license.publicId, days });
  res.status(201).json({ code, license: licenses.serialize(license) });
});

exports.permanent = asyncHandler(async (req, res) => {
  const { note, actor } = req.body;
  const { license, code } = await licenses.createLicense({ type: LICENSE_TYPE.PERMANENT, createdBy: actor, note });
  await adminLog(req, 'license.generated_permanent', { id: license.publicId });
  res.status(201).json({ code, license: licenses.serialize(license) });
});

exports.extend = asyncHandler(async (req, res) => {
  const lic = await licenses.extend(req.body.id, req.body.days);
  await adminLog(req, 'license.extended', { id: lic.publicId, days: req.body.days });
  res.json({ license: licenses.serialize(lic) });
});

exports.revoke = asyncHandler(async (req, res) => {
  const lic = await licenses.revoke(req.body.id);
  await adminLog(req, 'license.revoked', { id: lic.publicId });
  res.json({ license: licenses.serialize(lic) });
});

exports.status = asyncHandler(async (req, res) => {
  res.json({ license: licenses.serialize(await licenses.getByPublicId(req.query.id)) });
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await licenses.list(req.query.filter, req.query.limit);
  res.json({ licenses: rows.map(licenses.serialize) });
});
