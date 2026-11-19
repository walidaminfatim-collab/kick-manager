'use strict';
const crypto = require('crypto');
const env = require('../config/env');

const KEY = Buffer.from(env.encryptionKey, 'hex');
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)

/** AES-256-GCM. Output: v1:iv:tag:ciphertext (base64 parts) */
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join(':');
}

function decrypt(payload) {
  const [v, iv, tag, ct] = String(payload).split(':');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Invalid ciphertext format');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}

/** 20 chars x 5 bits = 100 bits of entropy (256 % 32 === 0, so no modulo bias). */
function generateRawCode() {
  const bytes = crypto.randomBytes(20);
  let out = '';
  for (const b of bytes) out += ALPHABET[b & 31];
  return out;
}

function formatCode(raw) {
  return 'KM-' + raw.match(/.{1,5}/g).join('-');
}

function normalizeCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** HMAC-SHA256 with a server-side secret: only this hash is stored. */
function hashCode(input) {
  return crypto.createHmac('sha256', env.licenseHashSecret).update(normalizeCode(input)).digest('hex');
}

function randomId(bytes = 5) {
  return crypto.randomBytes(bytes).toString('hex');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function pkcePair() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function randomState() {
  return crypto.randomBytes(24).toString('base64url');
}

module.exports = {
  encrypt, decrypt, generateRawCode, formatCode, normalizeCode, hashCode,
  randomId, safeEqual, pkcePair, randomState,
};
