'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET', 'ENCRYPTION_KEY', 'LICENSE_HASH_SECRET', 'BOT_INTERNAL_SECRET'];

function load() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. See .env.example`);
  }
  if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  }
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  if (process.env.LICENSE_HASH_SECRET.length < 16) throw new Error('LICENSE_HASH_SECRET is too short.');
  if (process.env.BOT_INTERNAL_SECRET.length < 24) throw new Error('BOT_INTERNAL_SECRET must be at least 24 characters.');

  const nodeEnv = process.env.NODE_ENV || 'development';
  const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  if (nodeEnv === 'production' && !backendUrl.startsWith('https://')) {
    throw new Error('BACKEND_URL must use https in production.');
  }
  const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (process.env.EXTENSION_ID) origins.push(`chrome-extension://${process.env.EXTENSION_ID.trim()}`);

  return Object.freeze({
    nodeEnv,
    isProd: nodeEnv === 'production',
    port: Number(process.env.PORT) || 3000,
    backendUrl,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    licenseHashSecret: process.env.LICENSE_HASH_SECRET,
    botSecret: process.env.BOT_INTERNAL_SECRET,
    corsOrigins: origins,
    kick: {
      clientId: process.env.KICK_CLIENT_ID || '',
      clientSecret: process.env.KICK_CLIENT_SECRET || '',
      redirectUri: process.env.KICK_REDIRECT_URI || `${backendUrl}/api/kick/oauth/callback`,
    },
  });
}

module.exports = load();
