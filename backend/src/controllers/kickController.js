'use strict';
const asyncHandler = require('../utils/asyncHandler');
const OAuthTransaction = require('../models/OAuthTransaction');
const KickAccount = require('../models/KickAccount');
const kick = require('../services/kickService');
const audit = require('../services/auditService');
const { HttpError } = require('../utils/errors');
const { pkcePair, randomState, encrypt, decrypt } = require('../utils/crypto');
const { KICK } = require('../../../shared/constants');

exports.start = asyncHandler(async (req, res) => {
  kick.requireConfig();
  let reauthAccount = null;
  if (req.query.accountId) {
    const acc = await KickAccount.findOne({ _id: req.query.accountId, user: req.user._id });
    if (!acc) throw new HttpError(404, 'Account not found', 'NOT_FOUND');
    reauthAccount = acc._id;
  }
  const { verifier, challenge } = pkcePair();
  const state = randomState();
  await OAuthTransaction.create({ state, codeVerifierEnc: encrypt(verifier), user: req.user._id, reauthAccount });
  res.json({ authUrl: kick.buildAuthUrl({ state, challenge }) });
});

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = (ok, msg) => `<!doctype html><meta charset="utf-8"><title>Kick Manager</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#eee;font-family:system-ui,sans-serif">
<div style="text-align:center;padding:40px;border:1px solid #2a2a2a;border-radius:16px;background:#161616;max-width:420px">
<h1 style="color:${ok ? '#f5b301' : '#ff5a4d'};margin:0 0 12px">${ok ? 'Account connected' : 'Connection failed'}</h1>
<p style="color:#aaa;line-height:1.5">${esc(msg)}</p></div></body>`;

/** Public endpoint hit by Kick's redirect. Authenticity comes from the single-use `state` + PKCE verifier. */
exports.callback = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { code, state, error } = req.query;
  if (typeof state !== 'string' || state.length > 200) return res.status(400).send(page(false, 'Invalid request.'));
  const tx = await OAuthTransaction.findOneAndDelete({ state }); // single use
  if (!tx) return res.status(400).send(page(false, 'This link expired or was already used. Start again from the extension.'));
  if (error || typeof code !== 'string') {
    await audit.log({ actorType: 'user', actorId: tx.user, action: 'kick.oauth_denied', meta: { error: String(error || 'no_code') }, ip: req.ip });
    return res.status(400).send(page(false, 'Authorization was cancelled or denied.'));
  }
  try {
    const t = await kick.exchangeCode(code, decrypt(tx.codeVerifierEnc));
    const ku = await kick.getCurrentUser(t.access_token);

    if (tx.reauthAccount) {
      const target = await KickAccount.findOne({ _id: tx.reauthAccount, user: tx.user });
      if (target && target.kickUserId !== ku.id) {
        return res.status(400).send(page(false, 'You authorized a different Kick account than the one being reauthorized.'));
      }
    }
    await KickAccount.findOneAndUpdate(
      { user: tx.user, kickUserId: ku.id },
      {
        $set: {
          username: ku.name, profilePicture: ku.picture, status: 'connected', lastCheckedAt: new Date(),
          accessTokenEnc: encrypt(t.access_token),
          refreshTokenEnc: t.refresh_token ? encrypt(t.refresh_token) : '',
          tokenExpiresAt: new Date(Date.now() + (t.expires_in || 3600) * 1000),
          scopes: String(t.scope || KICK.SCOPES.join(' ')).split(/[ ,]+/).filter(Boolean),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await audit.log({ actorType: 'user', actorId: tx.user, action: 'kick.account_connected', meta: { kickUserId: ku.id, username: ku.name }, ip: req.ip });
    res.send(page(true, `${ku.name} is now linked. You can close this tab and return to the extension.`));
  } catch (e) {
    console.error('[kick] callback failed:', e.message);
    res.status(502).send(page(false, 'Could not complete the connection with Kick. Please try again.'));
  }
});
