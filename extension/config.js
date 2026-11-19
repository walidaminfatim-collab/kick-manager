// Kick Manager extension configuration.
// IMPORTANT: when you deploy the backend, change BACKEND_URL here AND add the same origin to
// "host_permissions" in manifest.json (e.g. "https://api.yourdomain.com/*").
(function (g) {
  g.KM = g.KM || {};
  g.KM.CONFIG = {
    BACKEND_URL: 'http://localhost:3000',
    MAX_MESSAGE_LENGTH: 500,
    MONITOR_PERIOD_MINUTES: 1,
  };
})(globalThis);
