'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

const COLOR = 0xf5b301;
const DURATIONS = [['1 day', 1], ['7 days', 7], ['30 days', 30], ['90 days', 90], ['1 year', 365]];
const STATE_ICON = { unused: '🟡', active: '🟢', expired: '⚪', revoked: '🔴' };
const fmtDate = (d) => (d ? `<t:${Math.floor(new Date(d).getTime() / 1000)}:f>` : '—');

const data = new SlashCommandBuilder()
  .setName('license')
  .setDescription('Manage Kick Manager licenses (admins only)')
  .setDMPermission(false)
  .addSubcommand((s) => s.setName('generate').setDescription('Generate a temporary license')
    .addIntegerOption((o) => {
      o.setName('duration').setDescription('Preset duration').setRequired(true);
      DURATIONS.forEach(([name, value]) => o.addChoices({ name, value }));
      return o;
    })
    .addStringOption((o) => o.setName('note').setDescription('Internal note (customer, order...)').setMaxLength(200)))
  .addSubcommand((s) => s.setName('permanent').setDescription('Generate a permanent license')
    .addStringOption((o) => o.setName('note').setDescription('Internal note').setMaxLength(200)))
  .addSubcommand((s) => s.setName('extend').setDescription('Extend a temporary license')
    .addStringOption((o) => o.setName('id').setDescription('License ID (lic_...)').setRequired(true))
    .addIntegerOption((o) => o.setName('days').setDescription('Days to add').setRequired(true).setMinValue(1).setMaxValue(3650)))
  .addSubcommand((s) => s.setName('revoke').setDescription('Revoke a license')
    .addStringOption((o) => o.setName('id').setDescription('License ID (lic_...)').setRequired(true)))
  .addSubcommand((s) => s.setName('status').setDescription('Show a license status')
    .addStringOption((o) => o.setName('id').setDescription('License ID (lic_...)').setRequired(true)))
  .addSubcommand((s) => s.setName('list').setDescription('List licenses')
    .addStringOption((o) => o.setName('filter').setDescription('Filter')
      .addChoices(...['all', 'unused', 'active', 'expired', 'revoked'].map((v) => ({ name: v, value: v })))));

function licenseFields(l) {
  return [
    { name: 'ID', value: `\`${l.id}\``, inline: true },
    { name: 'Type', value: l.type, inline: true },
    { name: 'State', value: `${STATE_ICON[l.state] || ''} ${l.state}`, inline: true },
    { name: 'Expires', value: l.type === 'permanent' ? 'Never' : l.expiresAt ? fmtDate(l.expiresAt) : `${l.durationDays} days after activation`, inline: true },
    { name: 'Activated', value: fmtDate(l.activatedAt), inline: true },
    { name: 'Created by', value: `<@${l.createdBy}>`, inline: true },
    ...(l.note ? [{ name: 'Note', value: l.note }] : []),
  ];
}

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const actor = interaction.user.id;
  const note = interaction.options.getString('note') || '';

  if (sub === 'generate' || sub === 'permanent') {
    const r = sub === 'generate'
      ? await api.generate(interaction.options.getInteger('duration', true), note, actor)
      : await api.permanent(note, actor);
    const embed = new EmbedBuilder().setColor(COLOR).setTitle('🔑 License generated')
      .setDescription(`**Activation code** (shown once, store it safely):\n\`\`\`${r.code}\`\`\``)
      .addFields(licenseFields(r.license));
    return interaction.editReply({ embeds: [embed] });
  }
  if (sub === 'extend') {
    const r = await api.extend(interaction.options.getString('id', true).trim(), interaction.options.getInteger('days', true), actor);
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('⏳ License extended').addFields(licenseFields(r.license))] });
  }
  if (sub === 'revoke') {
    const r = await api.revoke(interaction.options.getString('id', true).trim(), actor);
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe5484d).setTitle('⛔ License revoked').addFields(licenseFields(r.license))] });
  }
  if (sub === 'status') {
    const r = await api.status(interaction.options.getString('id', true).trim());
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('📄 License status').addFields(licenseFields(r.license))] });
  }
  if (sub === 'list') {
    const filter = interaction.options.getString('filter') || 'all';
    const r = await api.list(filter, 20);
    const lines = r.licenses.map((l) => `${STATE_ICON[l.state] || ''} \`${l.id}\` · ${l.type} · ${l.type === 'permanent' ? '∞' : l.expiresAt ? fmtDate(l.expiresAt) : `${l.durationDays}d (unused)`} · …${l.hint}`);
    const embed = new EmbedBuilder().setColor(COLOR).setTitle(`📋 Licenses (${filter})`)
      .setDescription(lines.length ? lines.join('\n').slice(0, 4000) : 'No licenses found.');
    return interaction.editReply({ embeds: [embed] });
  }
}

module.exports = { data, execute };
