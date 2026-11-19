'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kickUserId: { type: String, required: true },
  username: { type: String, required: true },
  profilePicture: { type: String, default: '' },
  accessTokenEnc: { type: String, required: true },   // AES-256-GCM
  refreshTokenEnc: { type: String, default: '' },     // AES-256-GCM
  tokenExpiresAt: { type: Date, default: null },
  scopes: { type: [String], default: [] },
  status: { type: String, enum: ['connected', 'expired'], default: 'connected' },
  lastCheckedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ user: 1, kickUserId: 1 }, { unique: true });

module.exports = mongoose.model('KickAccount', schema);
