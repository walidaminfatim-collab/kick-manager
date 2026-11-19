'use strict';
module.exports = {
  LICENSE_TYPE: { TEMPORARY: 'temporary', PERMANENT: 'permanent' },
  LICENSE_STATE: { UNUSED: 'unused', ACTIVE: 'active', EXPIRED: 'expired', REVOKED: 'revoked' },
  ACCOUNT_STATUS: { CONNECTED: 'connected', EXPIRED: 'expired' },
  LANGS: ['en', 'ar'],
  MAX_MESSAGE_LENGTH: 500,
  KICK: {
    AUTH_URL: 'https://id.kick.com/oauth/authorize',
    TOKEN_URL: 'https://id.kick.com/oauth/token',
    REVOKE_URL: 'https://id.kick.com/oauth/revoke',
    API_BASE: 'https://api.kick.com/public/v1',
    // Minimal scopes: identify the account + read channel data. No chat:write on purpose:
    // messages are reviewed and sent manually by the user.
    SCOPES: ['user:read', 'channel:read'],
  },
  DURATIONS: [1, 7, 30, 90, 365],
};
