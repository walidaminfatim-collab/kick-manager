// English + Arabic (RTL) translations and helpers. Works in pages and in the service worker.
(function (g) {
  const KM = (g.KM = g.KM || {});
  const D = {
    en: {
      app_name: 'Kick Manager', loading: 'Loading…', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', add: 'Add',
      remove: 'Remove', refresh: 'Refresh', copy: 'Copy', copied: 'Copied!', none: '—', saved: 'Saved',
      error_generic: 'Something went wrong. Please try again.', error_network: 'Cannot reach the server. Check your connection and backend URL.',
      session_expired: 'Your session ended. Please activate again.',
      activate_title: 'Activate Kick Manager', activate_sub: 'Enter the activation code you received to unlock the dashboard.',
      code_placeholder: 'KM-XXXXX-XXXXX-XXXXX-XXXXX', activate_btn: 'Activate', activating: 'Activating…', activation_ok: 'License activated!',
      license: 'License', license_type: 'Type', type_permanent: 'Permanent', type_temporary: 'Temporary', expires: 'Expires', never: 'Never',
      days_left: 'Days left', status: 'Status',
      nav_dashboard: 'Home', nav_accounts: 'Accounts', nav_streamers: 'Streamers', nav_templates: 'Templates', nav_settings: 'Settings',
      connected_accounts: 'Connected accounts', monitored_streamers: 'Monitored streamers', live_now: 'Live now', quick_actions: 'Quick actions',
      connect_account: 'Connect Kick account', add_streamer: 'Add streamer', new_template: 'New template',
      accounts_title: 'Account Manager', no_accounts: 'No Kick accounts connected yet. Connections use the official Kick login: your password is never shared with this extension.',
      reauthorize: 'Reauthorize', disconnect: 'Disconnect', check: 'Check', confirm_disconnect: 'Disconnect this account?',
      status_connected: 'Connected', status_expired: 'Expired', oauth_opened: 'Finish the login in the new tab, then come back and press Refresh.',
      streamers_title: 'Streamer Manager', streamer_placeholder: 'Username or kick.com link', no_streamers: 'No streamers yet.',
      live: 'LIVE', offline: 'Offline', monitoring: 'Monitoring', viewers: 'viewers', open_channel: 'Open channel',
      templates_title: 'Message Templates', no_templates: 'No templates yet.', tpl_name: 'Template name', tpl_content: 'Message',
      tpl_vars_hint: 'Variables: {streamer} and {account}', prepare: 'Prepare', select_account: 'Kick account', select_streamer: 'Streamer (optional)',
      open_chat: 'Open chat page', review_note: 'Review the text, then send it yourself on Kick. Nothing is sent automatically.', confirm_delete: 'Delete this item?',
      settings_title: 'Settings', language: 'Language', backend_status: 'Backend connection', online: 'Online', offline_backend: 'Unreachable', latency: 'Latency',
      notifications: 'Live notifications', default_account: 'Default account', deactivate: 'Remove license from this browser', open_settings: 'Open settings',
      live_notice: 'is live on Kick', account_prefs: 'Account preferences', warning: 'Warning', chars: 'chars',
    },
    ar: {
      app_name: 'كيك مانجر', loading: 'جارٍ التحميل…', save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف', add: 'إضافة',
      remove: 'إزالة', refresh: 'تحديث', copy: 'نسخ', copied: 'تم النسخ!', none: '—', saved: 'تم الحفظ',
      error_generic: 'حدث خطأ ما. حاول مرة أخرى.', error_network: 'تعذّر الوصول إلى الخادم. تحقق من الاتصال وعنوان الخادم.',
      session_expired: 'انتهت الجلسة. يرجى التفعيل مرة أخرى.',
      activate_title: 'تفعيل كيك مانجر', activate_sub: 'أدخل كود التفعيل الذي استلمته لفتح لوحة التحكم.',
      code_placeholder: 'KM-XXXXX-XXXXX-XXXXX-XXXXX', activate_btn: 'تفعيل', activating: 'جارٍ التفعيل…', activation_ok: 'تم تفعيل الترخيص!',
      license: 'الترخيص', license_type: 'النوع', type_permanent: 'دائم', type_temporary: 'مؤقت', expires: 'ينتهي', never: 'أبداً',
      days_left: 'الأيام المتبقية', status: 'الحالة',
      nav_dashboard: 'الرئيسية', nav_accounts: 'الحسابات', nav_streamers: 'البثّاثون', nav_templates: 'القوالب', nav_settings: 'الإعدادات',
      connected_accounts: 'الحسابات المتصلة', monitored_streamers: 'البثّاثون المراقَبون', live_now: 'مباشر الآن', quick_actions: 'إجراءات سريعة',
      connect_account: 'ربط حساب كيك', add_streamer: 'إضافة بثّاث', new_template: 'قالب جديد',
      accounts_title: 'إدارة الحسابات', no_accounts: 'لا توجد حسابات كيك مرتبطة بعد. يتم الربط عبر تسجيل الدخول الرسمي من كيك، ولا تتم مشاركة كلمة المرور مع هذه الإضافة أبداً.',
      reauthorize: 'إعادة التفويض', disconnect: 'فصل', check: 'فحص', confirm_disconnect: 'هل تريد فصل هذا الحساب؟',
      status_connected: 'متصل', status_expired: 'منتهي', oauth_opened: 'أكمل تسجيل الدخول في التبويب الجديد ثم عد واضغط تحديث.',
      streamers_title: 'إدارة البثّاثين', streamer_placeholder: 'اسم المستخدم أو رابط kick.com', no_streamers: 'لا يوجد بثّاثون بعد.',
      live: 'مباشر', offline: 'غير متصل', monitoring: 'المراقبة', viewers: 'مشاهد', open_channel: 'فتح القناة',
      templates_title: 'قوالب الرسائل', no_templates: 'لا توجد قوالب بعد.', tpl_name: 'اسم القالب', tpl_content: 'الرسالة',
      tpl_vars_hint: 'المتغيرات: {streamer} و {account}', prepare: 'تجهيز', select_account: 'حساب كيك', select_streamer: 'البثّاث (اختياري)',
      open_chat: 'فتح صفحة الدردشة', review_note: 'راجع النص ثم أرسله بنفسك على كيك. لا يتم إرسال أي شيء تلقائياً.', confirm_delete: 'هل تريد حذف هذا العنصر؟',
      settings_title: 'الإعدادات', language: 'اللغة', backend_status: 'الاتصال بالخادم', online: 'متصل', offline_backend: 'غير متاح', latency: 'زمن الاستجابة',
      notifications: 'إشعارات البث المباشر', default_account: 'الحساب الافتراضي', deactivate: 'إزالة الترخيص من هذا المتصفح', open_settings: 'فتح الإعدادات',
      live_notice: 'بدأ البث على كيك', account_prefs: 'تفضيلات الحساب', warning: 'تنبيه', chars: 'حرف',
    },
  };

  KM.lang = 'en';
  KM.t = (k) => (D[KM.lang] && D[KM.lang][k]) || D.en[k] || k;
  KM.dictionaries = D;

  KM.setLang = async (lang) => {
    KM.lang = D[lang] ? lang : 'en';
    await chrome.storage.local.set({ lang: KM.lang });
    KM.applyLang();
  };
  KM.loadLang = async () => {
    const { lang } = await chrome.storage.local.get('lang');
    KM.lang = D[lang] ? lang : 'en';
    KM.applyLang();
  };
  KM.applyLang = () => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = KM.lang;
    document.documentElement.dir = KM.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = KM.t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = KM.t(el.dataset.i18nPlaceholder); });
  };
})(globalThis);
