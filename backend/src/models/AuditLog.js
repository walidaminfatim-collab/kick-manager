'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  actorType: { type: String, enum: ['user', 'admin', 'system'], required: true },
  actorId: { type: String, default: '' },
  action: { type: String, required: true, index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});
schema.index({ actorType: 1, actorId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', schema);
