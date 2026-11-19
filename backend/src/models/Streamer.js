'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  slug: { type: String, required: true },
  broadcasterId: { type: String, default: '' },
  displayName: { type: String, default: '' },
  description: { type: String, default: '' },
  isLive: { type: Boolean, default: false },
  viewers: { type: Number, default: 0 },
  streamTitle: { type: String, default: '' },
  category: { type: String, default: '' },
  monitoring: { type: Boolean, default: true },
  lastCheckedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ user: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Streamer', schema);
