'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function need(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}. See .env.example`);
}

module.exports = {
  need,
  get token() { return process.env.DISCORD_BOT_TOKEN; },
  get clientId() { return process.env.DISCORD_CLIENT_ID; },
  get guildId() { return process.env.DISCORD_GUILD_ID; },
  get backendUrl() { return (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, ''); },
  get botSecret() { return process.env.BOT_INTERNAL_SECRET; },
  get adminIds() { return new Set((process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)); },
};
