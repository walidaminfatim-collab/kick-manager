// Polls streamer status once a minute and shows a notification when a monitored streamer goes live.
importScripts('../config.js', '../i18n.js', '../api.js');

const ALARM = 'km-monitor';

function ensureAlarm() {
  chrome.alarms.create(ALARM, { periodInMinutes: KM.CONFIG.MONITOR_PERIOD_MINUTES });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);

async function poll() {
  const { token, notifications, liveMap = {} } = await chrome.storage.local.get(['token', 'notifications', 'liveMap']);
  if (!token) return;
  await KM.loadLang();
  let res;
  try { res = await KM.api.refreshStreamers(); } catch { return; }
  const next = {};
  for (const s of res.streamers) {
    if (!s.monitoring) continue;
    next[s.id] = s.isLive;
    if (s.isLive && liveMap[s.id] === false && notifications !== false) {
      chrome.notifications.create(`live-${s.id}`, {
        type: 'basic', iconUrl: '../assets/icons/icon128.png',
        title: 'Kick Manager', message: `${s.displayName} ${KM.t('live_notice')}${s.streamTitle ? ' · ' + s.streamTitle : ''}`,
      });
    }
  }
  await chrome.storage.local.set({ liveMap: next });
}

chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) poll().catch(() => {}); });
chrome.notifications.onClicked.addListener((id) => {
  chrome.notifications.clear(id);
});
