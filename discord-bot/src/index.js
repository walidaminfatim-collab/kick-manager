'use strict';
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, MessageFlags } = require('discord.js');
const config = require('./config');
const { ApiError } = require('./services/api');

config.need(['DISCORD_BOT_TOKEN', 'BOT_INTERNAL_SECRET', 'ADMIN_IDS']);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(__dirname, 'commands', file));
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', (c) => console.log(`[bot] logged in as ${c.user.tag}; ${config.adminIds.size} admin(s) allowed`));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  // All replies are ephemeral: generated codes are visible only to the invoking admin.
  if (!config.adminIds.has(interaction.user.id)) {
    return interaction.reply({ content: '⛔ You are not authorized to use this command.', flags: MessageFlags.Ephemeral });
  }
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await cmd.execute(interaction);
  } catch (e) {
    const msg = e instanceof ApiError ? `❌ ${e.message}` : '❌ Unexpected error. Check the bot logs.';
    if (!(e instanceof ApiError)) console.error('[bot] command error:', e);
    const payload = { content: msg, embeds: [] };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
    else await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

client.login(config.token);
