'use strict';
const mongoose = require('mongoose');
const { LANGS } = require('../../../shared/constants');

const schema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  license: { type: mongoose.Schema.Types.ObjectId, ref: 'License', required: true, unique: true },
  language: { type: String, enum: LANGS, default: 'en' },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('User', schema);
