'use strict';
const asyncHandler = require('../utils/asyncHandler');
const MessageTemplate = require('../models/MessageTemplate');
const KickAccount = require('../models/KickAccount');
const Streamer = require('../models/Streamer');
const audit = require('../services/auditService');
const { HttpError } = require('../utils/errors');

const pub = (t) => ({ id: t._id, name: t.name, content: t.content, updatedAt: t.updatedAt });

exports.list = asyncHandler(async (req, res) => {
  const rows = await MessageTemplate.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ templates: rows.map(pub) });
});

exports.create = asyncHandler(async (req, res) => {
  const t = await MessageTemplate.create({ ...req.body, user: req.user._id });
  await audit.log({ actorType: 'user', actorId: req.user._id, action: 'template.created', meta: { id: t._id }, ip: req.ip });
  res.status(201).json({ template: pub(t) });
});

exports.update = asyncHandler(async (req, res) => {
  const t = await MessageTemplate.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true, runValidators: true });
  if (!t) throw new HttpError(404, 'Template not found', 'NOT_FOUND');
  res.json({ template: pub(t) });
});

exports.remove = asyncHandler(async (req, res) => {
  const t = await MessageTemplate.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!t) throw new HttpError(404, 'Template not found', 'NOT_FOUND');
  await audit.log({ actorType: 'user', actorId: req.user._id, action: 'template.deleted', meta: { id: t._id }, ip: req.ip });
  res.json({ ok: true });
});

/**
 * Renders a template for review. NOTHING is sent to Kick: the user reviews the text and sends it manually.
 * Variables: {streamer} -> channel name, {account} -> chosen Kick account's username.
 */
exports.prepare = asyncHandler(async (req, res) => {
  const [t, acc] = await Promise.all([
    MessageTemplate.findOne({ _id: req.params.id, user: req.user._id }),
    KickAccount.findOne({ _id: req.body.accountId, user: req.user._id }),
  ]);
  if (!t) throw new HttpError(404, 'Template not found', 'NOT_FOUND');
  if (!acc) throw new HttpError(404, 'Account not found', 'NOT_FOUND');
  let streamer = null;
  if (req.body.streamerId) {
    streamer = await Streamer.findOne({ _id: req.body.streamerId, user: req.user._id });
    if (!streamer) throw new HttpError(404, 'Streamer not found', 'NOT_FOUND');
  }
  const content = t.content
    .replace(/\{streamer\}/gi, streamer ? streamer.displayName || streamer.slug : '')
    .replace(/\{account\}/gi, acc.username);
  await audit.log({ actorType: 'user', actorId: req.user._id, action: 'template.prepared', meta: { template: t._id, account: acc._id }, ip: req.ip });
  res.json({ content, account: { id: acc._id, username: acc.username }, chatUrl: streamer ? `https://kick.com/${streamer.slug}` : null });
});
