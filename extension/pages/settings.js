(async () => {
  const { t, api, h } = KM;
  const $ = (id) => document.getElementById(id);
  const toast = (m) => { $('toast').textContent = m; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 1800); };

  await KM.loadLang();
  $('lang').value = KM.lang;
  $('backend-url').textContent = KM.CONFIG.BACKEND_URL;

  $('lang').addEventListener('change', async (e) => {
    await KM.setLang(e.target.value);
    api.setLanguage(KM.lang).catch(() => {});
    renderLicense(); checkBackend();
  });

  async function checkBackend() {
    const badge = $('backend-badge'); badge.className = 'badge'; badge.textContent = t('loading');
    const t0 = performance.now();
    try {
      const r = await api.health();
      badge.className = 'badge ' + (r.ok && r.db ? 'ok' : 'bad'); badge.textContent = r.ok ? t('online') : t('offline_backend');
      $('backend-detail').textContent = `${t('latency')}: ${Math.round(performance.now() - t0)} ms`;
    } catch {
      badge.className = 'badge bad'; badge.textContent = t('offline_backend'); $('backend-detail').textContent = '';
    }
  }
  $('recheck').addEventListener('click', checkBackend);

  async function renderLicense() {
    const box = $('license-info');
    try {
      const { license: l } = await api.me();
      box.replaceChildren(
        h('div', {}, `${t('license_type')}: ${l.type === 'permanent' ? t('type_permanent') : t('type_temporary')}`),
        h('div', {}, `${t('expires')}: ${l.type === 'permanent' ? t('never') : KM.fmtDate(l.expiresAt)}`),
        l.type === 'permanent' ? null : h('div', {}, `${t('days_left')}: ${l.daysLeft}`));
    } catch (e) { box.textContent = e.message; }
  }
  $('deactivate').addEventListener('click', async () => {
    await KM.clearSession(); await chrome.storage.local.remove(['liveMap']);
    $('license-info').textContent = t('session_expired');
  });

  const { notifications, defaultAccount } = await chrome.storage.local.get(['notifications', 'defaultAccount']);
  $('notif').checked = notifications !== false;
  $('notif').addEventListener('change', async (e) => { await chrome.storage.local.set({ notifications: e.target.checked }); toast(t('saved')); });
  try {
    const { accounts } = await api.accounts();
    $('default-account').replaceChildren(h('option', { value: '' }, t('none')), accounts.map((a) => h('option', { value: a.id, selected: a.id === defaultAccount }, a.username)));
  } catch { /* not activated yet */ }
  $('default-account').addEventListener('change', async (e) => { await chrome.storage.local.set({ defaultAccount: e.target.value }); toast(t('saved')); });

  renderLicense(); checkBackend();
})();
