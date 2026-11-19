'use strict';
const License = require('../models/License');
const User = require('../models/User');
const { LICENSE_TYPE } = require('../../../shared/constants');
const { HttpError } = require('../utils/errors');
const { generateRawCode, formatCode, hashCode, randomId } = require('../utils/crypto');

const DAY = 86_400_000;

function licenseState(l) {
  if (l.status === 'revoked') return 'revoked';
  if (l.status === 'unused') return 'unused';
  if (l.type === LICENSE_TYPE.TEMPORARY && l.expiresAt && l.expiresAt.getTime() <= Date.now()) return 'expired';
  return 'active';
}

function serialize(l) {
  return {
    id: l.publicId,
    type: l.type,
    state: licenseState(l),
    hint: l.codeHint,
    durationDays: l.durationDays,
    expiresAt: l.expiresAt,
    activatedAt: l.activatedAt,
    createdBy: l.createdBy,
    note: l.note,
    createdAt: l.createdAt,
    daysLeft: l.type === LICENSE_TYPE.PERMANENT ? null
      : l.expiresAt ? Math.max(0, Math.ceil((l.expiresAt.getTime() - Date.now()) / DAY)) : l.durationDays,
  };
}

async function createLicense({ type, days, createdBy, note = '' }) {
  const raw = generateRawCode();
  const code = formatCode(raw);
  const lic = await License.create({
    publicId: `lic_${randomId(5)}`,
    codeHash: hashCode(code),
    codeHint: raw.slice(-4),
    type,
    durationDays: type === LICENSE_TYPE.TEMPORARY ? days : null,
    createdBy,
    note,
  });
  return { license: lic, code }; // `code` is returned ONCE to the admin and never stored
}

async function findByCode(code) {
  return License.findOne({ codeHash: hashCode(code) });
}

/** Activate (first use) or re-login (same code, e.g. new browser). Returns { user, license }. */
async function activate(code, deviceId) {
  let lic = await findByCode(code);
  if (!lic) throw new HttpError(401, 'Invalid activation code', 'INVALID_CODE');
  if (lic.status === 'revoked') throw new HttpError(403, 'This license has been revoked', 'LICENSE_REVOKED');

  if (lic.status === 'unused') {
    const now = new Date();
    const expiresAt = lic.type === LICENSE_TYPE.PERMANENT ? null : new Date(now.getTime() + lic.durationDays * DAY);
    // Atomic claim: only one concurrent activation can flip unused -> active.
    const claimed = await License.findOneAndUpdate(
      { _id: lic._id, status: 'unused' },
      { $set: { status: 'active', activatedAt: now, expiresAt } },
      { new: true },
    );
    if (claimed) {
      const user = await User.create({ deviceId, license: claimed._id });
      claimed.user = user._id;
      await claimed.save();
      return { user, license: claimed, firstActivation: true };
    }
    lic = await License.findById(lic._id); // lost the race: fall through to re-login path
  }

  if (licenseState(lic) === 'expired') throw new HttpError(403, 'This license has expired', 'LICENSE_EXPIRED');
  const user = await User.findById(lic.user);
  if (!user) throw new HttpError(500, 'License is not linked to a user', 'ORPHAN_LICENSE');
  user.deviceId = deviceId;
  user.lastSeenAt = new Date();
  await user.save();
  return { user, license: lic, firstActivation: false };
}

async function getByPublicId(publicId) {
  const lic = await License.findOne({ publicId });
  if (!lic) throw new HttpError(404, 'License not found', 'NOT_FOUND');
  return lic;
}

async function extend(publicId, days) {
  const lic = await getByPublicId(publicId);
  if (lic.status === 'revoked') throw new HttpError(409, 'License is revoked', 'LICENSE_REVOKED');
  if (lic.type === LICENSE_TYPE.PERMANENT) throw new HttpError(409, 'Permanent licenses cannot be extended', 'PERMANENT');
  if (lic.status === 'unused') {
    lic.durationDays += days;
  } else {
    const base = Math.max(Date.now(), lic.expiresAt ? lic.expiresAt.getTime() : 0);
    lic.expiresAt = new Date(base + days * DAY);
  }
  await lic.save();
  return lic;
}

async function revoke(publicId) {
  const lic = await getByPublicId(publicId);
  if (lic.status === 'revoked') throw new HttpError(409, 'License already revoked', 'ALREADY_REVOKED');
  lic.status = 'revoked';
  lic.revokedAt = new Date();
  await lic.save();
  return lic;
}

async function list(filter = 'all', limit = 20) {
  const now = new Date();
  const q = {};
  if (filter === 'unused') q.status = 'unused';
  else if (filter === 'revoked') q.status = 'revoked';
  else if (filter === 'active') Object.assign(q, { status: 'active', $or: [{ type: 'permanent' }, { expiresAt: { $gt: now } }] });
  else if (filter === 'expired') Object.assign(q, { status: 'active', type: 'temporary', expiresAt: { $lte: now } });
  const rows = await License.find(q).sort({ createdAt: -1 }).limit(limit);
  return rows;
}

module.exports = { licenseState, serialize, createLicense, activate, extend, revoke, list, getByPublicId };
