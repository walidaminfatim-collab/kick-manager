'use strict';
const env = require('./config/env'); // fails fast on missing/invalid configuration
const { connectDb } = require('./config/db');
const { createApp } = require('./app');

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.port, () => console.log(`[server] listening on :${env.port} (${env.nodeEnv})`));
  if (!env.kick.clientId) console.warn('[server] KICK_CLIENT_ID/SECRET not set: Kick OAuth and streamer lookup are disabled.');
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
main().catch((e) => { console.error('[fatal]', e.message); process.exit(1); });
