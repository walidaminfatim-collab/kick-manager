'use strict';
const config = require('../config');

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function call(method, path, { body, query } = {}) {
  const url = new URL(`${config.backendUrl}/internal${path}`);
  if (query) Object.entries(query).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)));
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-bot-secret': config.botSecret },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ApiError(0, 'Backend is unreachable.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Backend error (HTTP ${res.status})`);
  return data;
}

module.exports = {
  ApiError,
  generate: (days, note, actor) => call('POST', '/licenses/generate', { body: { days, note, actor } }),
  permanent: (note, actor) => call('POST', '/licenses/permanent', { body: { note, actor } }),
  extend: (id, days, actor) => call('POST', '/licenses/extend', { body: { id, days, actor } }),
  revoke: (id, actor) => call('POST', '/licenses/revoke', { body: { id, actor } }),
  status: (id) => call('GET', '/licenses/status', { query: { id } }),
  list: (filter, limit) => call('GET', '/licenses', { query: { filter, limit } }),
};
