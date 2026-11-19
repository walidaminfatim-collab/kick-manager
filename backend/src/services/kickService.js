'use strict';
const env = require('../config/env');
const { KICK } = require('../../../shared/constants');
const { HttpError } = require('../utils/errors');
const { encrypt, decrypt } = require('../utils/crypto');

const UA = 'KickManager/1.0 (+server)';
let appToken = null; // { token, exp }

function requireConfig() {
  if (!env.kick.clientId || !env.kick.clientSecret) {
    throw new HttpError(503, 'Kick OAuth is not configured on the server', 'KICK_NOT_CONFIGURED');
  }
}

async function tokenRequest(params) {
  requireConfig();
  const res = await fetch(KICK.TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, Accept: 'application/json' },
    body: new URLSearchParams({ client_id: env.kick.clientId, client_secret: env.kick.clientSecret, ...params }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error('[kick] token request failed', res.status, data.error || '');
    throw new HttpError(502, `Kick token endpoint rejected the request (HTTP ${res.status})`, 'KICK_TOKEN_ERROR');
  }
  return data;
}

function buildAuthUrl({ state, challenge }) {
  requireConfig();
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: env.kick.clientId,
    redirect_uri: env.kick.redirectUri,
    scope: KICK.SCOPES.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${KICK.AUTH_URL}?${p.toString()}`;
}

const exchangeCode = (code, verifier) =>
  tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: env.kick.redirectUri, code_verifier: verifier });

const refresh = (refreshToken) => tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });

async function getAppToken() {
  if (appToken && appToken.exp > Date.now() + 60_000) return appToken.token;
  const d = await tokenRequest({ grant_type: 'client_credentials' });
  appToken = { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
  return appToken.token;
}

async function revoke(token, hint = 'access_token') {
  try {
    requireConfig();
    const q = new URLSearchParams({ token, token_hint_type: hint });
    await fetch(`${KICK.REVOKE_URL}?${q}`, { method: 'POST', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
  } catch (e) {
    console.warn('[kick] revoke failed (continuing):', e.message);
  }
}

async function api(path, token) {
  const res = await fetch(`${KICK.API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) throw new HttpError(401, 'Kick token rejected', 'KICK_UNAUTHORIZED');
  if (!res.ok) throw new HttpError(502, `Kick API error (HTTP ${res.status})`, 'KICK_API_ERROR');
  return res.json();
}

async function getCurrentUser(token) {
  const body = await api('/users', token);
  const u = Array.isArray(body.data) ? body.data[0] : null;
  if (!u) throw new HttpError(502, 'Kick returned no user data', 'KICK_API_ERROR');
  return { id: String(u.user_id), name: u.name, picture: u.profile_picture || '' };
}

/** Looks up channels by slug (batched, max 50 per request). Returns Map(slug -> channel). */
async function getChannels(slugs, token) {
  const out = new Map();
  for (let i = 0; i < slugs.length; i += 50) {
    const q = new URLSearchParams();
    slugs.slice(i, i + 50).forEach((s) => q.append('slug', s));
    const body = await api(`/channels?${q}`, token);
    (body.data || []).forEach((c) => out.set(String(c.slug).toLowerCase(), c));
  }
  return out;
}

function mapChannel(c) {
  return {
    broadcasterId: String(c.broadcaster_user_id ?? ''),
    description: c.channel_description || '',
    isLive: !!(c.stream && c.stream.is_live),
    viewers: Number(c.stream && c.stream.viewer_count) || 0,
    streamTitle: c.stream_title || '',
    category: (c.category && c.category.name) || '',
  };
}

/** Decrypts/refreshes an account's access token. Marks the account "expired" if refresh fails. */
async function ensureAccessToken(account) {
  const soon = Date.now() + 60_000;
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() > soon) return decrypt(account.accessTokenEnc);
  if (!account.refreshTokenEnc) {
    account.status = 'expired';
    await account.save();
    throw new HttpError(401, 'Account needs to be reauthorized', 'REAUTH_REQUIRED');
  }
  try {
    const d = await refresh(decrypt(account.refreshTokenEnc));
    account.accessTokenEnc = encrypt(d.access_token);
    if (d.refresh_token) account.refreshTokenEnc = encrypt(d.refresh_token);
    account.tokenExpiresAt = new Date(Date.now() + (d.expires_in || 3600) * 1000);
    account.status = 'connected';
    await account.save();
    return d.access_token;
  } catch (e) {
    account.status = 'expired';
    await account.save();
    throw new HttpError(401, 'Account needs to be reauthorized', 'REAUTH_REQUIRED');
  }
}

module.exports = {
  requireConfig, buildAuthUrl, exchangeCode, refresh, getAppToken, revoke,
  getCurrentUser, getChannels, mapChannel, ensureAccessToken,
};
