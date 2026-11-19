'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  state: { type: String, required: true, unique: true },
  codeVerifierEnc: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reauthAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'KickAccount', default: null },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // TTL: 10 minutes
});

module.exports = mongoose.model('OAuthTransaction', schema);
