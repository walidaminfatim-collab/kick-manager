'use strict';
/** Accepts "name", "@name" or a kick.com URL and returns a Kick slug (lowercase, "_" -> "-"). */
function parseStreamerInput(input) {
  let s = String(input || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || /^(www\.)?kick\.com\//i.test(s)) {
    try {
      const u = new URL(/^https?:/i.test(s) ? s : `https://${s}`);
      if (!/(^|\.)kick\.com$/i.test(u.hostname)) return null;
      s = u.pathname.split('/').filter(Boolean)[0] || '';
    } catch {
      return null;
    }
  }
  s = s.replace(/^@/, '').toLowerCase().replace(/_/g, '-');
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(s) ? s : null;
}
module.exports = { parseStreamerInput };
