'use strict';
const { REST, Routes } = require('discord.js');
const config = require('./config');

config.need(['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID']);

(async () => {
  const commands = [require('./commands/license').data.toJSON()];
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
  console.log(`[deploy] registered ${commands.length} command(s) in guild ${config.guildId}`);
})().catch((e) => { console.error('[deploy] failed:', e.message); process.exit(1); });
