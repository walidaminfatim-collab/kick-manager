'use strict';
const Streamer = require('../models/Streamer');
const KickAccount = require('../models/KickAccount');
const kick = require('./kickService');

/** Prefer the app token (public data); fall back to any healthy connected account token. */
async function pickToken(userId) {
  try {
    return await kick.getAppToken();
  } catch (e) {
    const accounts = await KickAccount.find({ user: userId, status: 'connected' });
    for (const a of accounts) {
      try { return await kick.ensureAccessToken(a); } catch { /* try next */ }
    }
    throw e;
  }
}

async function refreshStreamers(userId, streamers) {
  if (!streamers.length) return streamers;
  const token = await pickToken(userId);
  const channels = await kick.getChannels(streamers.map((s) => s.slug), token);
  const now = new Date();
  await Promise.all(streamers.map(async (s) => {
    const c = channels.get(s.slug);
    if (!c) return;
    Object.assign(s, kick.mapChannel(c), { displayName: c.slug, lastCheckedAt: now });
    await s.save();
  }));
  return streamers;
}

async function lookup(userId, slug) {
  const token = await pickToken(userId);
  const channels = await kick.getChannels([slug], token);
  return channels.get(slug) || null;
}

module.exports = { refreshStreamers, lookup, Streamer };
