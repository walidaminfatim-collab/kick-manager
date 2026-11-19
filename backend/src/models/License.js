'use strict';
const mongoose = require('mongoose');
const { LICENSE_TYPE } = require('../../../shared/constants');

const schema = new mongoose.Schema({
  publicId: { type: String, required: true, unique: true },        // lic_xxxxxxxxxx (safe to display)
  codeHash: { type: String, required: true, unique: true },        // HMAC-SHA256, never the code itself
  codeHint: { type: String, required: true },                      // last 4 chars for admin reference
  type: { type: String, enum: Object.values(LICENSE_TYPE), required: true },
  durationDays: { type: Number, default: null },                   // temporary licenses, counted from activation
  status: { type: String, enum: ['unused', 'active', 'revoked'], default: 'unused', index: true },
  expiresAt: { type: Date, default: null, index: true },           // null = permanent (or not yet activated)
  activatedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: String, required: true },                     // Discord user id
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('License', schema);
