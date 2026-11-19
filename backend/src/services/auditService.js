'use strict';
const AuditLog = require('../models/AuditLog');

async function log({ actorType, actorId = '', action, meta = {}, ip = '' }) {
  try {
    await AuditLog.create({ actorType, actorId: String(actorId), action, meta, ip });
  } catch (e) {
    console.error('[audit] failed to write log:', e.message); // auditing must never break a request
  }
}
module.exports = { log };
