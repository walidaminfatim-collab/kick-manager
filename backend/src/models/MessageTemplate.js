'use strict';
const mongoose = require('mongoose');
const { MAX_MESSAGE_LENGTH } = require('../../../shared/constants');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  content: { type: String, required: true, maxlength: MAX_MESSAGE_LENGTH },
}, { timestamps: true });

module.exports = mongoose.model('MessageTemplate', schema);
