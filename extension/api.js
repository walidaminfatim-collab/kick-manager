// Backend client + tiny DOM helpers. Works in pages and in the service worker.
(function (g) {
  const KM = (g.KM = g.KM || {});

  class ApiError extends Error {
    constructor(status, message, code) { super(message); this.status = status; this.code = code; }
  }
  KM.ApiError = ApiError;

  KM.getDeviceId = async () => {
    const { deviceId } = await chrome.storage.local.get('deviceId');
    if (deviceId) return deviceId;
    const id = crypto.randomUUID() + '-' + crypto.randomUUID().slice(0, 8);
    await chrome.storage.local.set({ deviceId: id });
    return id;
  };

  KM.clearSession = () => chrome.storage.local.remove(['token', 'license']);

  KM.request = async (path, { method = 'GET', body, auth = true } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const { token } = await chrome.storage.local.get('token');
      if (!token) throw new ApiError(401, KM.t('session_expired'), 'NO_TOKEN');
      headers.Authorization = `Bearer ${token}`;
    }
    let res;
    try {
      res = await fetch(KM.CONFIG.BACKEND_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError(0, KM.t('error_network'), 'NETWORK');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (auth && ['BAD_TOKEN', 'LICENSE_REVOKED', 'LICENSE_EXPIRED', 'NO_TOKEN'].includes(data.code)) await KM.clearSession();
      throw new ApiError(res.status, data.error || KM.t('error_generic'), data.code);
    }
    return data;
  };

  KM.api = {
    activate: async (code) => KM.request('/api/auth/activate', { method: 'POST', auth: false, body: { code, deviceId: await KM.getDeviceId() } }),
    me: () => KM.request('/api/auth/me'),
    health: () => KM.request('/api/health', { auth: false }),
    accounts: () => KM.request('/api/accounts'),
    checkAccount: (id) => KM.request(`/api/accounts/${id}/check`, { method: 'POST' }),
    removeAccount: (id) => KM.request(`/api/accounts/${id}`, { method: 'DELETE' }),
    oauthStart: (accountId) => KM.request('/api/kick/oauth/start' + (accountId ? `?accountId=${accountId}` : '')),
    streamers: () => KM.request('/api/streamers'),
    addStreamer: (input) => KM.request('/api/streamers', { method: 'POST', body: { input } }),
    patchStreamer: (id, monitoring) => KM.request(`/api/streamers/${id}`, { method: 'PATCH', body: { monitoring } }),
    removeStreamer: (id) => KM.request(`/api/streamers/${id}`, { method: 'DELETE' }),
    refreshStreamers: () => KM.request('/api/streamers/refresh', { method: 'POST' }),
    templates: () => KM.request('/api/templates'),
    createTemplate: (b) => KM.request('/api/templates', { method: 'POST', body: b }),
    updateTemplate: (id, b) => KM.request(`/api/templates/${id}`, { method: 'PUT', body: b }),
    removeTemplate: (id) => KM.request(`/api/templates/${id}`, { method: 'DELETE' }),
    prepare: (id, b) => KM.request(`/api/templates/${id}/prepare`, { method: 'POST', body: b }),
    setLanguage: (language) => KM.request('/api/auth/language', { method: 'PATCH', body: { language } }),
  };

  // ---- DOM helpers (textContent only: no innerHTML, no XSS) ----
  KM.h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  KM.fmtDate = (d) => (d ? new Date(d).toLocaleString(KM.lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' }) : KM.t('never'));
})(globalThis);
