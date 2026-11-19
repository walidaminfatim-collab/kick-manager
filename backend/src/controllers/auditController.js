'use strict';
const asyncHandler = require('../utils/asyncHandler');
const AuditLog = require('../models/AuditLog');

exports.mine = asyncHandler(async (req, res) => {
  const rows = await AuditLog.find({ actorType: 'user', actorId: String(req.user._id) }).sort({ createdAt: -1 }).limit(50);
  res.json({ logs: rows.map((r) => ({ action: r.action, meta: r.meta, at: r.createdAt })) });
});
