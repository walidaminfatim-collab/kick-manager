'use strict';
// Dependency-free unit tests (node:test). Run with: npm test
process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.JWT_SECRET = 'j'.repeat(48);
process.env.ENCRYPTION_KEY = 'ab'.repeat(32);
process.env.LICENSE_HASH_SECRET = 'h'.repeat(32);
process.env.BOT_INTERNAL_SECRET = 'b'.repeat(32);

// Sandbox has no network, so dotenv may be missing: stub it (env vars are set above anyway).
const Module = require('module');
const origLoad = Module._load;
Module._load = function (req, ...a) {
  if (req === 'dotenv') return { config() {} };
  return origLoad.call(this, req, ...a);
};

const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../src/utils/crypto');
const { parseStreamerInput } = require('../src/utils/streamerInput');

test('AES-GCM round trip + tamper detection', () => {
  const enc = c.encrypt('secret-token');
  assert.notEqual(enc, 'secret-token');
  assert.equal(c.decrypt(enc), 'secret-token');
  assert.notEqual(c.encrypt('secret-token'), enc, 'random IV per call');
  const parts = enc.split(':'); parts[3] = Buffer.from('tampered!!').toString('base64');
  assert.throws(() => c.decrypt(parts.join(':')));
});

test('license codes: format, uniqueness, hashing', () => {
  const raw = c.generateRawCode();
  assert.match(raw, /^[0-9A-HJKMNP-TV-Z]{20}$/);
  const code = c.formatCode(raw);
  assert.match(code, /^KM(-[0-9A-Z]{5}){4}$/);
  assert.equal(new Set(Array.from({ length: 500 }, c.generateRawCode)).size, 500);
  assert.equal(c.hashCode(code), c.hashCode(code.toLowerCase().replace(/-/g, ' ')), 'normalization');
  assert.match(c.hashCode(code), /^[0-9a-f]{64}$/);
  assert.notEqual(c.hashCode(code), c.hashCode(c.formatCode(c.generateRawCode())));
  assert.ok(!c.hashCode(code).includes(raw), 'hash does not contain the code');
});

test('PKCE challenge matches verifier (S256)', () => {
  const { verifier, challenge } = c.pkcePair();
  assert.equal(require('crypto').createHash('sha256').update(verifier).digest('base64url'), challenge);
  assert.ok(verifier.length >= 43 && verifier.length <= 128);
  assert.notEqual(c.randomState(), c.randomState());
});

test('safeEqual', () => {
  assert.ok(c.safeEqual('abc', 'abc'));
  assert.ok(!c.safeEqual('abc', 'abd'));
  assert.ok(!c.safeEqual('abc', 'abcd'));
});

test('streamer input parsing', () => {
  assert.equal(parseStreamerInput('https://kick.com/Some_Streamer'), 'some-streamer');
  assert.equal(parseStreamerInput('kick.com/xqc/clips'), 'xqc');
  assert.equal(parseStreamerInput('@Trainwreckstv'), 'trainwreckstv');
  assert.equal(parseStreamerInput('https://evil.com/xqc'), null);
  assert.equal(parseStreamerInput('bad name!'), null);
  assert.equal(parseStreamerInput(''), null);
});

test('license state machine (pure logic, no DB)', () => {
  // licenseService requires mongoose models; stub them so the pure function can be tested without dependencies.
  const orig = Module._load;
  Module._load = function (req, ...a) {
    if (req === 'mongoose') { class Schema { index() {} } Schema.Types = { ObjectId: 'ObjectId', Mixed: 'Mixed' }; return { Schema, model: () => ({}), set() {} }; }
    if (req === 'zod') return {};
    return orig.call(this, req, ...a);
  };
  Module._load.__patched = true;
  try {
    Object.assign(require.cache, {});
    const { licenseState } = require('../src/services/licenseService');
    const now = Date.now();
    assert.equal(licenseState({ status: 'unused', type: 'temporary' }), 'unused');
    assert.equal(licenseState({ status: 'revoked', type: 'permanent' }), 'revoked');
    assert.equal(licenseState({ status: 'active', type: 'permanent', expiresAt: null }), 'active');
    assert.equal(licenseState({ status: 'active', type: 'temporary', expiresAt: new Date(now + 1000) }), 'active');
    assert.equal(licenseState({ status: 'active', type: 'temporary', expiresAt: new Date(now - 1000) }), 'expired');
  } finally { Module._load = orig; }
});
