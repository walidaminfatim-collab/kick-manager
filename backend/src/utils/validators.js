'use strict';
const { z } = require('zod');
const { MAX_MESSAGE_LENGTH, LANGS } = require('../../../shared/constants');

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const licenseId = z.string().regex(/^lic_[a-f0-9]{10}$/, 'Invalid license id');

module.exports = {
  objectId, licenseId,
  activate: z.object({
    code: z.string().min(10).max(64),
    deviceId: z.string().min(16).max(128),
  }),
  idParam: z.object({ id: objectId }),
  oauthStartQuery: z.object({ accountId: objectId.optional() }),
  streamerAdd: z.object({ input: z.string().min(1).max(200) }),
  streamerPatch: z.object({ monitoring: z.boolean() }),
  templateBody: z.object({
    name: z.string().trim().min(1).max(60),
    content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  }),
  prepareBody: z.object({ accountId: objectId, streamerId: objectId.optional() }),
  langBody: z.object({ language: z.enum(LANGS) }),
  botGenerate: z.object({ days: z.number().int().min(1).max(3650), note: z.string().max(200).optional(), actor: z.string().max(40) }),
  botPermanent: z.object({ note: z.string().max(200).optional(), actor: z.string().max(40) }),
  botExtend: z.object({ id: licenseId, days: z.number().int().min(1).max(3650), actor: z.string().max(40) }),
  botRevoke: z.object({ id: licenseId, actor: z.string().max(40) }),
  botStatusQuery: z.object({ id: licenseId }),
  botListQuery: z.object({
    filter: z.enum(['all', 'unused', 'active', 'expired', 'revoked']).default('all'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};
