(() => {
  const { h, t, api } = KM;
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const langSel = document.getElementById('lang');
  const toastEl = document.getElementById('toast');
  const state = { view: 'dashboard', license: null };
  let toastTimer;

  const toast = (msg) => {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  // Runs an API call; on session loss returns to the activation page.
  async function guard(fn) {
    try { return await fn(); } catch (e) {
      if (['BAD_TOKEN', 'LICENSE_REVOKED', 'LICENSE_EXPIRED', 'NO_TOKEN'].includes(e.code)) { await showActivation(e.message); return null; }
      toast(e.message || t('error_generic')); return null;
    }
  }
  const loading = () => app.replaceChildren(h('div', { class: 'center muted' }, t('loading')));
  const confirmAsk = (key) => window.confirm(t(key));

  // ---------------- Activation ----------------
  async function showActivation(message) {
    nav.hidden = true;
    const input = h('input', { type: 'text', placeholder: t('code_placeholder'), autocomplete: 'off', spellcheck: false, dir: 'ltr', maxLength: 40 });
    const msg = h('div');
    const btn = h('button', { class: 'btn full', type: 'button' }, t('activate_btn'));
    const submit = async () => {
      if (!input.value.trim()) return;
      btn.disabled = true; btn.textContent = t('activating'); msg.replaceChildren();
      try {
        const r = await api.activate(input.value.trim());
        await chrome.storage.local.set({ token: r.token, license: r.license });
        state.license = r.license;
        msg.replaceChildren(h('div', { class: 'msg ok' }, `${t('activation_ok')} ${r.license.type === 'permanent' ? t('type_permanent') : `${t('expires')}: ${KM.fmtDate(r.license.expiresAt)}`}`));
        setTimeout(() => show('dashboard'), 700);
      } catch (e) {
        msg.replaceChildren(h('div', { class: 'msg err' }, e.message)); btn.disabled = false; btn.textContent = t('activate_btn');
      }
    };
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    app.replaceChildren(h('div', { class: 'hero' },
      h('img', { class: 'logo', src: '../assets/icons/icon128.png', alt: '' }),
      h('h1', {}, t('activate_title')), h('p', { class: 'muted' }, t('activate_sub')),
      h('div', { class: 'stack', style: 'margin-top:16px;text-align:start' }, input, btn, message ? h('div', { class: 'msg err' }, message) : null, msg)));
  }

  // ---------------- Dashboard ----------------
  async function showDashboard() {
    loading();
    const [me, acc, str] = await Promise.all([guard(api.me), guard(api.accounts), guard(api.streamers)]);
    if (!me) return;
    state.license = me.license;
    const l = me.license;
    const streamers = str ? str.streamers : [];
    app.replaceChildren(
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', {}, acc ? acc.accounts.length : '—'), h('span', {}, t('connected_accounts'))),
        h('div', { class: 'stat' }, h('b', {}, streamers.filter((s) => s.monitoring).length), h('span', {}, t('monitored_streamers'))),
        h('div', { class: 'stat' }, h('b', {}, streamers.filter((s) => s.isLive).length), h('span', {}, t('live_now')))),
      h('div', { class: 'card' },
        h('div', { class: 'row between' }, h('b', {}, t('license')), h('span', { class: 'badge ok' }, t('status_connected'))),
        h('div', { class: 'sub', style: 'margin-top:6px' }, `${t('license_type')}: ${l.type === 'permanent' ? t('type_permanent') : t('type_temporary')}`),
        h('div', { class: 'sub' }, `${t('expires')}: ${l.type === 'permanent' ? t('never') : KM.fmtDate(l.expiresAt)}`),
        l.type === 'permanent' ? null : h('div', { class: 'sub' }, `${t('days_left')}: ${l.daysLeft}`)),
      h('div', { class: 'card stack' }, h('b', {}, t('quick_actions')),
        h('button', { class: 'btn full', onclick: () => { show('accounts'); setTimeout(connectAccount, 50); } }, '＋ ' + t('connect_account')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost grow', onclick: () => show('streamers') }, t('add_streamer')),
          h('button', { class: 'btn ghost grow', onclick: () => { show('templates'); } }, t('new_template')))));
  }

  // ---------------- Accounts ----------------
  async function connectAccount(accountId) {
    const r = await guard(() => api.oauthStart(accountId));
    if (!r) return;
    chrome.tabs.create({ url: r.authUrl });
    toast(t('oauth_opened'));
  }
  async function showAccounts() {
    loading();
    const r = await guard(api.accounts); if (!r) return;
    const rows = r.accounts.map((a) => h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('div', { class: 'avatar' }, a.username.slice(0, 1).toUpperCase()),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, a.username), h('div', { class: 'sub' }, `${t('check')}: ${KM.fmtDate(a.lastCheckedAt)}`)),
        h('span', { class: 'badge ' + (a.status === 'connected' ? 'ok' : 'bad') }, a.status === 'connected' ? t('status_connected') : t('status_expired'))),
      h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { class: 'btn ghost sm', onclick: async () => { await guard(() => api.checkAccount(a.id)); showAccounts(); } }, t('check')),
        h('button', { class: 'btn ghost sm', onclick: () => connectAccount(a.id) }, t('reauthorize')),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn danger sm', onclick: async () => { if (confirmAsk('confirm_disconnect')) { await guard(() => api.removeAccount(a.id)); showAccounts(); } } }, t('disconnect')))));
    app.replaceChildren(
      h('div', { class: 'row between' }, h('h2', {}, t('accounts_title')), h('button', { class: 'btn ghost sm', onclick: showAccounts }, '⟳ ' + t('refresh'))),
      h('button', { class: 'btn full', style: 'margin-bottom:10px', onclick: () => connectAccount() }, '＋ ' + t('connect_account')),
      rows.length ? rows : h('div', { class: 'muted' }, t('no_accounts')));
  }

  // ---------------- Streamers ----------------
  async function showStreamers(refresh = true) {
    loading();
    const r = await guard(refresh ? api.refreshStreamers : api.streamers); if (!r) return;
    const input = h('input', { type: 'text', placeholder: t('streamer_placeholder'), dir: 'ltr', maxLength: 200 });
    const add = async () => {
      if (!input.value.trim()) return;
      const res = await guard(() => api.addStreamer(input.value.trim()));
      if (res) showStreamers(false);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    const rows = r.streamers.map((s) => h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('div', { class: 'avatar' }, s.displayName.slice(0, 1).toUpperCase()),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, s.displayName),
          h('div', { class: 'sub' }, s.isLive ? `${s.viewers} ${t('viewers')}${s.category ? ' · ' + s.category : ''}` : t('offline')),
          s.isLive && s.streamTitle ? h('div', { class: 'sub' }, s.streamTitle) : null),
        s.isLive ? h('span', { class: 'badge live' }, t('live')) : h('span', { class: 'badge' }, t('offline'))),
      h('div', { class: 'row', style: 'margin-top:10px' },
        h('label', { class: 'row sub' }, h('span', { class: 'switch' },
          h('input', { type: 'checkbox', checked: s.monitoring, onchange: async (e) => { await guard(() => api.patchStreamer(s.id, e.target.checked)); } }), h('span')), t('monitoring')),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn ghost sm', onclick: () => chrome.tabs.create({ url: s.url }) }, t('open_channel')),
        h('button', { class: 'btn danger sm', onclick: async () => { if (confirmAsk('confirm_delete')) { await guard(() => api.removeStreamer(s.id)); showStreamers(false); } } }, t('remove')))));
    app.replaceChildren(
      h('div', { class: 'row between' }, h('h2', {}, t('streamers_title')), h('button', { class: 'btn ghost sm', onclick: () => showStreamers(true) }, '⟳ ' + t('refresh'))),
      h('div', { class: 'row', style: 'margin-bottom:10px' }, input, h('button', { class: 'btn', onclick: add }, t('add'))),
      r.warning ? h('div', { class: 'msg warn' }, `${t('warning')}: ${r.warning}`) : null,
      rows.length ? rows : h('div', { class: 'muted' }, t('no_streamers')));
  }

  // ---------------- Templates ----------------
  async function showTemplates(editing) {
    loading();
    const r = await guard(api.templates); if (!r) return;
    const max = KM.CONFIG.MAX_MESSAGE_LENGTH;
    const name = h('input', { type: 'text', maxLength: 60, value: editing ? editing.name : '', placeholder: t('tpl_name') });
    const content = h('textarea', { maxLength: max, placeholder: t('tpl_content') }); content.value = editing ? editing.content : '';
    const counter = h('div', { class: 'counter' }, `${content.value.length}/${max} ${t('chars')}`);
    content.addEventListener('input', () => { counter.textContent = `${content.value.length}/${max} ${t('chars')}`; });
    const save = async () => {
      if (!name.value.trim() || !content.value.trim()) return;
      const body = { name: name.value.trim(), content: content.value.trim() };
      const res = await guard(() => (editing ? api.updateTemplate(editing.id, body) : api.createTemplate(body)));
      if (res) { toast(t('saved')); showTemplates(); }
    };
    const form = h('div', { class: 'card stack' }, name, content, h('div', { class: 'sub' }, t('tpl_vars_hint')), counter,
      h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: save }, t('save')), editing ? h('button', { class: 'btn ghost', onclick: () => showTemplates() }, t('cancel')) : null));
    const rows = r.templates.map((tp) => h('div', { class: 'card' },
      h('div', { class: 'name' }, tp.name), h('div', { class: 'sub', style: 'white-space:normal;margin:4px 0 8px' }, tp.content),
      h('div', { class: 'row' },
        h('button', { class: 'btn sm', onclick: () => showPrepare(tp) }, t('prepare')),
        h('button', { class: 'btn ghost sm', onclick: () => showTemplates(tp) }, t('edit')),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn danger sm', onclick: async () => { if (confirmAsk('confirm_delete')) { await guard(() => api.removeTemplate(tp.id)); showTemplates(); } } }, t('delete')))));
    app.replaceChildren(h('h2', {}, t('templates_title')), form, rows.length ? rows : h('div', { class: 'muted' }, t('no_templates')));
    if (editing) app.scrollTo({ top: 0 });
  }

  // Prepare = pick account (+ streamer), render variables, let the user review/copy and send manually.
  async function showPrepare(tp) {
    loading();
    const [a, s] = await Promise.all([guard(api.accounts), guard(api.streamers)]);
    if (!a) return;
    const { defaultAccount } = await chrome.storage.local.get('defaultAccount');
    const accSel = h('select', {}, a.accounts.map((x) => h('option', { value: x.id, selected: x.id === defaultAccount }, x.username)));
    const strSel = h('select', {}, h('option', { value: '' }, t('none')), (s ? s.streamers : []).map((x) => h('option', { value: x.id }, x.displayName)));
    const out = h('textarea', { maxLength: KM.CONFIG.MAX_MESSAGE_LENGTH });
    const actions = h('div', { class: 'row' });
    let chatUrl = null;
    const render = async () => {
      if (!accSel.value) return;
      const r = await guard(() => api.prepare(tp.id, { accountId: accSel.value, ...(strSel.value ? { streamerId: strSel.value } : {}) }));
      if (!r) return;
      out.value = r.content; chatUrl = r.chatUrl;
      openBtn.disabled = !chatUrl;
    };
    const openBtn = h('button', { class: 'btn ghost grow', disabled: true, onclick: () => chatUrl && chrome.tabs.create({ url: chatUrl }) }, t('open_chat'));
    const copyBtn = h('button', { class: 'btn grow', onclick: async () => { await navigator.clipboard.writeText(out.value); toast(t('copied')); } }, t('copy'));
    accSel.addEventListener('change', render); strSel.addEventListener('change', render);
    actions.append(copyBtn, openBtn);
    app.replaceChildren(
      h('div', { class: 'row between' }, h('h2', {}, `${t('prepare')}: ${tp.name}`), h('button', { class: 'btn ghost sm', onclick: () => showTemplates() }, '←')),
      a.accounts.length
        ? h('div', { class: 'card stack' },
          h('div', { class: 'field' }, h('label', {}, t('select_account')), accSel),
          h('div', { class: 'field' }, h('label', {}, t('select_streamer')), strSel), out, actions,
          h('div', { class: 'msg warn' }, t('review_note')))
        : h('div', { class: 'muted' }, t('no_accounts')));
    if (a.accounts.length) render();
  }

  // ---------------- Navigation ----------------
  const views = { dashboard: showDashboard, accounts: showAccounts, streamers: () => showStreamers(true), templates: () => showTemplates() };
  function show(view) {
    if (view === 'settings') { chrome.runtime.openOptionsPage(); return; }
    state.view = view; nav.hidden = false;
    nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    views[view]();
  }
  nav.addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b) show(b.dataset.view); });

  langSel.addEventListener('change', async () => {
    await KM.setLang(langSel.value);
    api.setLanguage(KM.lang).catch(() => {});
    const { token } = await chrome.storage.local.get('token');
    token ? show(state.view) : showActivation();
  });

  (async function init() {
    await KM.loadLang();
    langSel.value = KM.lang;
    const { token } = await chrome.storage.local.get('token');
    if (!token) return showActivation();
    show('dashboard');
  })();
})();
