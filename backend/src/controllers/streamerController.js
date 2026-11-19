'use strict';
const asyncHandler = require('../utils/asyncHandler');
const Streamer = require('../models/Streamer');
const svc = require('../services/streamerService');
const kick = require('../services/kickService');
const audit = require('../services/auditService');
const { HttpError } = require('../utils/errors');
const { parseStreamerInput } = require('../utils/streamerInput');

const pub = (s) => ({
  id: s._id, slug: s.slug, displayName: s.displayName || s.slug, description: s.description, isLive: s.isLive,
  viewers: s.viewers, streamTitle: s.streamTitle, category: s.category, monitoring: s.monitoring,
  lastCheckedAt: s.lastCheckedAt, url: `https://kick.com/${s.slug}`,
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await Streamer.find({ user: req.user._id }).sort({ createdAt: 1 });
  res.json({ streamers: rows.map(pub) });
});

exports.add = asyncHandler(async (req, res) => {
  const slug = parseStreamerInput(req.body.input);
  if (!slug) throw new HttpError(400, 'Enter a valid Kick username or channel URL', 'BAD_STREAMER');
  if (await Streamer.exists({ user: req.user._id, slug })) throw new HttpError(409, 'Streamer already added', 'DUPLICATE');
  const channel = await svc.lookup(req.user._id, slug);
  if (!channel) throw new HttpError(404, 'Channel not found on Kick', 'CHANNEL_NOT_FOUND');
  const s = await Streamer.create({ user: req.user._id, slug, displayName: channel.slug, ...kick.mapChannel(channel), lastCheckedAt: new Date() });
  await audit.log({ actorType: 'user', actorId: req.user._id, action: 'streamer.added', meta: { slug }, ip: req.ip });
  res.status(201).json({ streamer: pub(s) });
});

exports.patch = asyncHandler(async (req, res) => {
  const s = await Streamer.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { monitoring: req.body.monitoring }, { new: true });
  if (!s) throw new HttpError(404, 'Streamer not found', 'NOT_FOUND');
  res.json({ streamer: pub(s) });
});

exports.remove = asyncHandler(async (req, res) => {
  const s = await Streamer.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!s) throw new HttpError(404, 'Streamer not found', 'NOT_FOUND');
  await audit.log({ actorType: 'user', actorId: req.user._id, action: 'streamer.removed', meta: { slug: s.slug }, ip: req.ip });
  res.json({ ok: true });
});

/** Refreshes live/offline status for streamers with monitoring enabled. */
exports.refresh = asyncHandler(async (req, res) => {
  const all = await Streamer.find({ user: req.user._id }).sort({ createdAt: 1 });
  let warning = null;
  try {
    await svc.refreshStreamers(req.user._id, all.filter((s) => s.monitoring));
  } catch (e) {
    if (!(e instanceof HttpError)) throw e;
    warning = e.message; // return cached data plus a warning instead of failing the whole view
  }
  res.json({ streamers: all.map(pub), warning });
});
