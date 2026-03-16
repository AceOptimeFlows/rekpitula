(function () {
  const root = document.documentElement;

  const APP_KEY = 'ReKPiTu';
  const THEME_KEY = APP_KEY + ':theme';
  const LANG_KEY  = APP_KEY + ':lang';
  const STATE_KEY = APP_KEY + ':state:v1';

  const SUPPORTED_LANGS = [
    'es', 'en', 'pt-br', 'de', 'it', 'fr', 'ru', 'ko', 'ja', 'zh'
  ];

  // =========================
  // Safe storage
  // =========================
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }

  // =========================
  // i18n helpers
  // =========================
  function T(key, vars) {
    try {
      if (window.i18n && typeof window.i18n.t === 'function') {
        const s = window.i18n.t(key, vars);
        return s || key;
      }
    } catch { /* ignore */ }
    return key;
  }

  function normalizeLang(raw) {
    if (window.i18n && typeof window.i18n.normalizeLang === 'function') {
      return window.i18n.normalizeLang(raw);
    }

    const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
    if (!s) return null;

    if (SUPPORTED_LANGS.includes(s)) return s;

    const primary = s.split('-')[0];
    if (SUPPORTED_LANGS.includes(primary)) return primary;

    if (primary === 'pt') return 'pt-br';
    if (primary === 'zh') return 'zh';

    return null;
  }

  function detectSystemLang() {
    const candidates = [];
    if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    if (navigator.language) candidates.push(navigator.language);
    // @ts-ignore
    if (navigator.userLanguage) candidates.push(navigator.userLanguage);

    for (const c of candidates) {
      const n = normalizeLang(c);
      if (n) return n;
    }
    return 'es';
  }

  function setHtmlLangAndDir(appLang) {
    const n = normalizeLang(appLang) || 'es';
    root.lang = (n === 'pt-br') ? 'pt-BR' : n;
    root.dir = 'ltr';
  }

  function ensureInitialLanguageOnce() {
    let stored = normalizeLang(safeGet(LANG_KEY));
    if (!stored) {
      stored = detectSystemLang();
      safeSet(LANG_KEY, stored);
    } else {
      safeSet(LANG_KEY, stored);
    }
    setHtmlLangAndDir(stored);
    return stored;
  }

  // =========================
  // DOM helpers
  // =========================
  const $id = (id) => document.getElementById(id);

  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c]));
  }

  function currentLocale() {
    return root.lang || 'es';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(currentLocale());
  }

  function fmtDateTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString(currentLocale());
  }

  // =========================
  // State
  // =========================
  const state = {
    meeting: {
      title: '',
      date: '',
      type: 'meeting',
      participants: [],
      participantRoles: {},
      observations: ''
    },
    threads: [],
    tasks: [],
    keypoints: [],
    ui: {
      structureReady: false
    }
  };

  function normalizeParticipantRoles(rawRoles, participants) {
    const out = {};
    const src = (rawRoles && typeof rawRoles === 'object' && !Array.isArray(rawRoles)) ? rawRoles : {};
    const list = Array.isArray(participants) ? participants : [];

    for (const name of list) {
      const cleanName = String(name || '').trim();
      if (!cleanName) continue;

      const cleanRole = String(src[cleanName] || '').trim();
      if (cleanRole) out[cleanName] = cleanRole;
    }

    return out;
  }

  function ensureParticipantRoles() {
    state.meeting.participantRoles = normalizeParticipantRoles(state.meeting.participantRoles, state.meeting.participants);
    return state.meeting.participantRoles;
  }

  function getParticipantRole(name) {
    const key = String(name || '').trim();
    if (!key) return '';

    const roles = ensureParticipantRoles();
    return String(roles[key] || '').trim();
  }

  function setParticipantRole(name, role) {
    const key = String(name || '').trim();
    if (!key) return;

    const cleanRole = String(role || '').trim();
    const roles = ensureParticipantRoles();

    if (cleanRole) roles[key] = cleanRole;
    else delete roles[key];
  }

  function participantOptionLabel(name) {
    const cleanName = String(name || '').trim() || '—';
    const role = getParticipantRole(cleanName);
    return role ? `${cleanName} — ${role}` : cleanName;
  }

  function loadState() {
    const raw = safeGet(STATE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.assign(state.meeting, data.meeting || {});
        state.meeting.participants = Array.isArray(state.meeting.participants) ? state.meeting.participants : [];
        state.meeting.participantRoles = normalizeParticipantRoles(state.meeting.participantRoles, state.meeting.participants);
        state.meeting.observations = String(state.meeting.observations || '');

        state.threads = Array.isArray(data.threads) ? data.threads : [];
        state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
        state.keypoints = Array.isArray(data.keypoints) ? data.keypoints : [];
        state.ui = Object.assign({ structureReady: false }, data.ui || {});
      }
    } catch {
      /* ignore */
    }
  }

  function saveState() {
    state.meeting.participantRoles = normalizeParticipantRoles(state.meeting.participantRoles, state.meeting.participants);

    try {
      safeSet(STATE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }

    const el = $id('autoSaveStatus');
    if (el) {
      const time = new Date().toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' });
      el.textContent = T('setup.autosaveSavedAt', { time });
    }
  }

  // =========================
  // Toast
  // =========================
  let toastTimer = null;

  function showToast(msg) {
    const el = $id('toast');
    if (!el) return;

    el.textContent = String(msg || '');
    el.classList.add('is-show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-show');
    }, 2600);
  }

  // =========================
  // Transcription integration
  // =========================
  function getTranscriptionApi() {
    const api = window.ReKPiTuTranscription;
    if (!api || typeof api.toggle !== 'function' || typeof api.stop !== 'function') return null;
    return api;
  }

  function handleDictationError(code) {
    const api = getTranscriptionApi();
    if (api && typeof api.getErrorMessage === 'function') {
      const custom = api.getErrorMessage(code, normalizeLang(safeGet(LANG_KEY)) || normalizeLang(root.lang) || 'es');
      if (custom) {
        showToast(custom);
        return;
      }
    }

    const map = {
      'not-allowed': 'alerts.voicePermissionDenied',
      'service-not-allowed': 'alerts.voicePermissionDenied',
      'audio-capture': 'alerts.voiceMicUnavailable',
      'no-speech': 'alerts.voiceNoSpeech',
      'network': 'alerts.voiceNetwork',
      'start-failed': 'alerts.voiceGenericError'
    };

    showToast(T(map[code] || 'alerts.voiceGenericError'));
  }

  function stopDictation(options) {
    const api = getTranscriptionApi();
    if (!api) return false;
    return !!api.stop(options || {});
  }

  function stopActiveDictationFor(target, options) {
    const api = getTranscriptionApi();
    if (!api || !target || typeof api.isRecording !== 'function') return false;
    if (!api.isRecording(target)) return false;
    return !!api.stop(options || {});
  }

  function requestDictation(target, hintEl) {
    const api = getTranscriptionApi();

    if (!target) {
      showToast(T('alerts.needTextField'));
      return false;
    }

    if (!api || typeof api.isSupported !== 'function' || !api.isSupported()) {
      showToast(T('alerts.voiceNotAvail'));
      return false;
    }

    const result = api.toggle({
      target,
      hintEl: hintEl || null,
      hintText: T('dictation.listening'),
      appLang: normalizeLang(safeGet(LANG_KEY)) || normalizeLang(root.lang) || 'es',
      onInvalidTarget() {
        showToast(T('alerts.needTextField'));
      },
      onUnsupported() {
        showToast(T('alerts.voiceNotAvail'));
      },
      onError(code) {
        handleDictationError(code);
      }
    });

    if (result && typeof result.then === 'function') {
      result.catch(() => { /* handled via callbacks */ });
      return true;
    }

    return !!result;
  }

  // =========================
  // Settings sheet
  // =========================
  function setupSettingsSheet() {
    const settingsBtn = $id('btnSettings');
    const settingsSheet = $id('settingsSheet');
    if (!settingsBtn || !settingsSheet) return;

    const toggleSheet = () => {
      const isOpen = settingsSheet.classList.toggle('is-open');
      settingsSheet.setAttribute('aria-hidden', String(!isOpen));
      settingsBtn.setAttribute('aria-expanded', String(isOpen));
    };

    settingsBtn.addEventListener('click', toggleSheet);

    settingsSheet.addEventListener('click', (ev) => {
      if (ev.target === settingsSheet) toggleSheet();
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && settingsSheet.classList.contains('is-open')) toggleSheet();
    });

    window.__ReKPiTuOpenSettings = () => {
      if (!settingsSheet.classList.contains('is-open')) toggleSheet();
    };
  }

  // =========================
  // Overlays
  // =========================
  function openOverlay(id) {
    const el = $id(id);
    if (!el) return;
    el.hidden = false;
    el.classList.add('is-visible');
    document.body.classList.add('overlay-open');
  }

  function closeOverlay(id) {
    const el = $id(id);
    if (!el) return;
    el.hidden = true;
    el.classList.remove('is-visible');
    document.body.classList.remove('overlay-open');
  }

  function setupOverlays() {
    const licenseLink = $id('licenseLink');
    const privacyLink = $id('privacyLink');
    const coherenceLink = $id('coherenceLink');

    licenseLink && licenseLink.addEventListener('click', () => openOverlay('licenseOverlay'));
    privacyLink && privacyLink.addEventListener('click', () => openOverlay('privacyOverlay'));
    coherenceLink && coherenceLink.addEventListener('click', () => openOverlay('coherenceOverlay'));

    document.addEventListener('click', (ev) => {
      const target = ev.target;
      if (target && target.matches && target.matches('[data-close]')) {
        const id = target.getAttribute('data-close');
        if (id) closeOverlay(id);
      }
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      const open = document.querySelector('.overlay.is-visible');
      if (open && open.id) closeOverlay(open.id);
    });
  }

  // =========================
  // Theme
  // =========================
  function applyTheme(value) {
    if (!value || value === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', value);
    }
  }

  function setupThemeSelect() {
    const themeSelect = $id('themeSelect');
    if (!themeSelect) return;

    const stored = safeGet(THEME_KEY);
    const initial = stored || 'system';
    themeSelect.value = initial;
    applyTheme(initial);

    themeSelect.addEventListener('change', () => {
      const value = themeSelect.value;
      safeSet(THEME_KEY, value);
      applyTheme(value);
    });
  }

  // =========================
  // i18n + idioma
  // =========================
  function syncDocumentTitle() {
    const t = window.i18n && typeof window.i18n.t === 'function' ? window.i18n.t('app.title') : '';
    if (t && typeof t === 'string') document.title = t;
  }

  function setupLanguageSelect(initialLang) {
    const languageSelect = $id('languageSelect');
    if (!languageSelect) return;

    const initial = normalizeLang(initialLang) || 'es';
    const hasOption = languageSelect.querySelector(`option[value="${initial}"]`);
    if (hasOption) languageSelect.value = initial;

    function applyAppLanguage(lang) {
      stopDictation({ cancel: true });

      const n = normalizeLang(lang) || 'es';
      safeSet(LANG_KEY, n);
      setHtmlLangAndDir(n);

      if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
        window.i18n.changeLanguage(n).then(() => {
          syncDocumentTitle();
          renderAll();
        }).catch(() => {
          syncDocumentTitle();
          renderAll();
        });
      } else {
        syncDocumentTitle();
        renderAll();
      }
    }

    languageSelect.addEventListener('change', () => applyAppLanguage(languageSelect.value));

    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => {
        syncDocumentTitle();
        renderAll();
      });
    }
  }

  // =========================
  // PWA Install
  // =========================
  function setupInstall() {
    const installBtn = $id('installBtn');
    if (!installBtn) return;

    let deferredPrompt = null;

    function setInstallEnabled(enabled) {
      installBtn.disabled = !enabled;
    }

    setInstallEnabled(false);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setInstallEnabled(true);
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
        /* ignore */
      }
      deferredPrompt = null;
      setInstallEnabled(false);
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      setInstallEnabled(false);
    });
  }

  function setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
    });
  }

  // =========================
  // Layout vars
  // =========================
  function updateLayoutVars() {
    const header = document.querySelector('.brand-header');
    const footer = $id('siteFooter');

    if (header) root.style.setProperty('--header-h', `${header.offsetHeight}px`);
    if (footer) root.style.setProperty('--footer-h', `${footer.offsetHeight}px`);
  }

  // =========================
  // Meeting setup sync
  // =========================
  function syncFormFromState() {
    const mt = $id('meetingTitle');
    const md = $id('meetingDate');
    const mtype = $id('meetingType');
    const obs = $id('meetingObservations');
    const participantRoleInput = $id('participantRoleInput');

    if (mt) mt.value = state.meeting.title || '';
    if (md) md.value = state.meeting.date || '';
    if (mtype) mtype.value = state.meeting.type || 'meeting';
    if (obs) obs.value = state.meeting.observations || '';
    if (participantRoleInput) participantRoleInput.value = '';
  }

  // =========================
  // Participants
  // =========================
  function renderParticipants() {
    const box = $id('participantsList');
    if (!box) return;

    ensureParticipantRoles();
    box.innerHTML = '';

    for (const p of state.meeting.participants) {
      const role = getParticipantRole(p);
      const label = role ? `${p} · ${role}` : p;

      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `<span>${escHtml(label)}</span><button type="button" aria-label="${escHtml(T('setup.removeParticipant'))}" data-name="${escHtml(p)}">✕</button>`;
      box.appendChild(chip);
    }
  }

  function renderAssigneeSelects() {
    const contribSel = $id('contribAuthor');
    const taskSel = $id('taskAssignee');

    const participants = state.meeting.participants.slice();

    function refill(selectEl) {
      if (!selectEl) return;
      const prev = selectEl.value;
      selectEl.innerHTML = '';

      if (participants.length === 0) {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = T('setup.noParticipantsOption');
        selectEl.appendChild(o);
        selectEl.disabled = true;
        return;
      }

      selectEl.disabled = false;
      for (const p of participants) {
        const o = document.createElement('option');
        o.value = p;
        o.textContent = participantOptionLabel(p);
        selectEl.appendChild(o);
      }

      if (prev && participants.includes(prev)) selectEl.value = prev;
    }

    refill(contribSel);
    refill(taskSel);
  }

  // =========================
  // Structure visibility
  // =========================
  function isStructureReady() {
    return !!(
      state.ui.structureReady ||
      state.threads.length ||
      state.tasks.length ||
      state.keypoints.length ||
      String(state.meeting.observations || '').trim()
    );
  }

  function updateStructureVisibility() {
    const empty = $id('emptyState');
    const c = $id('contribSection');
    const k = $id('keypointsSection');
    const t = $id('tasksSection');
    const o = $id('observationsSection');

    const ready = isStructureReady();

    if (empty) empty.hidden = ready;
    if (c) c.hidden = !ready;
    if (k) k.hidden = !ready;
    if (t) t.hidden = !ready;
    if (o) o.hidden = !ready;

    const jump = $id('jumpSelect');
    if (jump) jump.disabled = !ready;
  }

  // =========================
  // Progress
  // =========================
  function updateProgress() {
    const hasThreads = state.threads.length > 0;
    const hasKeypoints = state.keypoints.length > 0;
    const hasTasks = state.tasks.length > 0;
    const hasObservations = !!String(state.meeting.observations || '').trim();

    const done = [hasThreads, hasKeypoints, hasTasks, hasObservations].filter(Boolean).length;
    const total = 4;

    const countEl = $id('progressCount');
    const totalEl = $id('progressTotal');
    const fillEl = $id('progressFill');
    const pillEl = $id('progressPill');

    if (countEl) countEl.textContent = String(done);
    if (totalEl) totalEl.textContent = String(total);
    if (fillEl) fillEl.style.width = `${(done / total) * 100}%`;
    if (pillEl) pillEl.textContent = T('progress.pill', { done, total });
  }

  // =========================
  // Generate structure
  // =========================
  function generateStructure() {
    if (state.meeting.participants.length === 0) {
      showToast(T('alerts.needParticipants'));
      return;
    }

    state.ui.structureReady = true;

    if (!state.meeting.title) {
      const typeKey = 'setup.types.' + (state.meeting.type || 'meeting');
      const base = T(typeKey);
      const date = fmtDate(state.meeting.date);
      state.meeting.title = (date ? `${base} · ${date}` : `${base}`).trim();
      const mt = $id('meetingTitle');
      if (mt) mt.value = state.meeting.title;
    }

    updateStructureVisibility();
    updateProgress();
    saveState();
    showToast(T('toasts.structureReady'));

    const contrib = $id('contribSection');
    if (contrib) contrib.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // =========================
  // Threads / contributions
  // =========================
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  function findNode(arr, id) {
    for (const n of arr) {
      if (n.id === id) return n;
      const c = n.children && findNode(n.children, id);
      if (c) return c;
    }
    return null;
  }

  function deleteThread(id) {
    stopDictation({ cancel: true });

    function removeFrom(arr) {
      const idx = arr.findIndex(x => x.id === id);
      if (idx >= 0) {
        arr.splice(idx, 1);
        return true;
      }
      for (const n of arr) {
        if (n.children && removeFrom(n.children)) return true;
      }
      return false;
    }

    removeFrom(state.threads);
    renderThreads();
    updateProgress();
    saveState();
    showToast(T('toasts.deleted'));
  }

  function addContribution(author, text, parentId = null) {
    stopDictation({ cancel: true });

    const node = { id: uid(), author, text, ts: Date.now(), children: [] };

    if (!parentId) {
      state.threads.unshift(node);
    } else {
      const parent = findNode(state.threads, parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }

    renderThreads();
    updateProgress();
    saveState();
  }

  function initials(name) {
    const s = String(name || '').trim();
    if (!s) return '•';
    const parts = s.split(/\s+/).slice(0, 2);
    const a = parts.map(p => p[0]).join('').toUpperCase();
    return a || s[0].toUpperCase();
  }

  function renderThreads() {
    const rootEl = $id('threads');
    if (!rootEl) return;

    rootEl.innerHTML = '';

    if (!state.threads.length) {
      const empty = document.createElement('div');
      empty.className = 'meta';
      empty.textContent = T('contrib.emptyThreads');
      rootEl.appendChild(empty);
      return;
    }

    for (const n of state.threads) {
      rootEl.appendChild(renderThreadNode(n, 0));
    }
  }

  function renderThreadNode(node, depth) {
    const wrap = document.createElement('div');
    wrap.className = 'thread';
    wrap.style.setProperty('--depth', String(Math.min(depth, 6)));
    wrap.dataset.id = node.id;

    const dateStr = fmtDateTime(node.ts);

    const comment = document.createElement('div');
    comment.className = 'comment';
    comment.innerHTML = `
      <div class="meta-line">
        <span class="avatar" aria-hidden="true">${escHtml(initials(node.author))}</span>
        <strong>${escHtml(node.author)}</strong>
        <span class="sep">•</span>
        <span>${escHtml(dateStr)}</span>
      </div>

      <div class="body">${escHtml(node.text)}</div>

      <div class="comment-actions">
        <button class="mini" type="button" data-action="reply" data-id="${escHtml(node.id)}">${escHtml(T('contrib.reply'))}</button>
        <button class="mini" type="button" data-action="dictate" data-id="${escHtml(node.id)}">🎙️</button>
        <button class="mini warn" type="button" data-action="delete" data-id="${escHtml(node.id)}">🗑</button>
      </div>
    `;
    wrap.appendChild(comment);

    if (Array.isArray(node.children)) {
      for (const ch of node.children) {
        wrap.appendChild(renderThreadNode(ch, depth + 1));
      }
    }

    return wrap;
  }

  function openReplyBox(threadEl, parentId) {
    if (!threadEl) return;

    const host = threadEl.querySelector('.comment');
    if (!host) return;

    const existing = host.querySelector('.reply-box');
    if (existing) {
      const existingTa = existing.querySelector('.replyText');
      existingTa && existingTa.focus();
      return;
    }

    const participants = state.meeting.participants.slice();
    if (!participants.length) {
      showToast(T('alerts.needParticipants'));
      return;
    }

    const box = document.createElement('div');
    box.className = 'reply-box';
    box.innerHTML = `
      <div class="form-row">
        <label class="field grow">
          <span class="field-label">${escHtml(T('contrib.author'))}</span>
          <select class="sel sel-field replyAuthor">
            ${participants.map(p => `<option value="${escHtml(p)}">${escHtml(participantOptionLabel(p))}</option>`).join('')}
          </select>
        </label>
      </div>

      <label class="field stack">
        <span class="field-label">${escHtml(T('contrib.text'))}</span>
        <textarea class="textarea replyText" rows="3" placeholder="${escHtml(T('contrib.textPh'))}"></textarea>
      </label>

      <div class="form-row">
        <button class="btn ghost small" type="button" data-action="dictate-reply">${escHtml(T('contrib.dictate'))}</button>
        <button class="btn primary small" type="button" data-action="save-reply">${escHtml(T('common.save'))}</button>
        <button class="btn ghost small" type="button" data-action="cancel-reply">${escHtml(T('common.cancel'))}</button>
      </div>

      <div class="meta replyHint" aria-live="polite"></div>
    `;

    host.appendChild(box);

    const ta = box.querySelector('.replyText');
    ta && ta.focus();

    box.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const textEl = box.querySelector('.replyText');
      const replyHint = box.querySelector('.replyHint');

      if (action === 'cancel-reply') {
        stopActiveDictationFor(textEl, { cancel: true });
        box.remove();
        return;
      }

      if (action === 'dictate-reply') {
        requestDictation(textEl, replyHint);
        return;
      }

      if (action === 'save-reply') {
        const authorSel = box.querySelector('.replyAuthor');
        const author = authorSel ? authorSel.value : '';
        const text = textEl ? String(textEl.value || '').trim() : '';

        if (!text) {
          showToast(T('alerts.needText'));
          return;
        }

        stopActiveDictationFor(textEl, { cancel: true });
        addContribution(author, text, parentId);
        showToast(T('toasts.replyAdded'));
      }
    }, { passive: false });
  }

  // =========================
  // Keypoints
  // =========================
  function descendantsCount(node) {
    let c = 0;
    const kids = Array.isArray(node.children) ? node.children : [];
    for (const ch of kids) {
      c += 1 + descendantsCount(ch);
    }
    return c;
  }

  function extractKeyPoints(k) {
    if (!state.threads.length) {
      showToast(T('alerts.noThreadsForKeypoints'));
      return;
    }

    const candidates = [];

    function walk(nodes, depth) {
      for (const n of nodes) {
        const desc = descendantsCount(n);
        const score = (1 + desc) * (depth === 0 ? 1.15 : 1.0) + (Math.min(String(n.text || '').length, 280) / 280) * 0.25;
        candidates.push({ text: String(n.text || ''), score, ts: n.ts || 0 });
        if (Array.isArray(n.children) && n.children.length) walk(n.children, depth + 1);
      }
    }

    walk(state.threads, 0);

    candidates.sort((a, b) => (b.score - a.score) || (b.ts - a.ts));

    const out = [];
    const seen = new Set();

    for (const c of candidates) {
      const line = c.text.split('\n')[0].trim();
      if (!line) continue;
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line);
      if (out.length >= k) break;
    }

    state.keypoints = out;
    renderKeypoints();
    updateProgress();
    saveState();
    showToast(T('toasts.keypointsExtracted', { n: out.length }));
  }

  function renderKeypoints() {
    const ul = $id('keypointsList');
    if (!ul) return;

    ul.innerHTML = '';

    if (!state.keypoints.length) {
      const li = document.createElement('li');
      li.style.borderStyle = 'dashed';
      li.style.opacity = '0.9';
      li.innerHTML = `<span class="kp-text">${escHtml(T('keypoints.empty'))}</span>`;
      ul.appendChild(li);
      return;
    }

    for (let i = 0; i < state.keypoints.length; i++) {
      const line = state.keypoints[i];

      const li = document.createElement('li');
      li.innerHTML = `
        <span class="kp-text">${escHtml(line)}</span>
        <span class="kp-actions">
          <button type="button" data-action="remove-kp" data-index="${i}" aria-label="${escHtml(T('keypoints.remove'))}">✕</button>
        </span>
      `;
      ul.appendChild(li);
    }
  }

  // =========================
  // Tasks
  // =========================
  function addTask(text, assignee, due, status) {
    state.tasks.unshift({
      id: uid(),
      text,
      assignee,
      due,
      status: status || 'pending'
    });

    renderTasks();
    updateProgress();
    saveState();
  }

  function renderTasks() {
    const list = $id('tasksList');
    if (!list) return;

    list.innerHTML = '';

    if (!state.tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'meta';
      empty.textContent = T('tasks.empty');
      list.appendChild(empty);
      renderTimeline();
      return;
    }

    for (const tk of state.tasks) {
      const el = document.createElement('div');
      el.className = 'task';
      el.dataset.id = tk.id;

      const statusLabel = tk.status === 'done' ? T('tasks.done') : T('tasks.pending');
      const badgeClass = tk.status === 'done' ? 'status-done' : 'status-pending';
      const due = tk.due ? fmtDate(tk.due) : '—';
      const who = tk.assignee || '—';

      el.innerHTML = `
        <div class="row">
          <div class="grow"><strong>${escHtml(tk.text)}</strong></div>
          <span class="badge ${badgeClass}">${escHtml(statusLabel)}</span>
        </div>

        <div class="row" style="margin-top:8px">
          <span class="meta">👤 ${escHtml(who)}</span>
          <span class="meta">🗓 ${escHtml(due)}</span>

          <div class="task-actions">
            <button class="mini" type="button" data-action="toggle-task" data-id="${escHtml(tk.id)}">${tk.status === 'done' ? '↩︎' : '✓'}</button>
            <button class="mini warn" type="button" data-action="remove-task" data-id="${escHtml(tk.id)}">🗑</button>
          </div>
        </div>
      `;

      list.appendChild(el);
    }

    renderTimeline();
  }

  function renderTimeline() {
    const box = $id('timelineByPerson');
    if (!box) return;

    box.innerHTML = '';

    if (!state.tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'meta';
      empty.textContent = T('timeline.empty');
      box.appendChild(empty);
      return;
    }

    const groups = {};
    for (const tk of state.tasks) {
      const key = tk.assignee || '—';
      (groups[key] = groups[key] || []).push(tk);
    }

    const people = Object.keys(groups).sort((a, b) => a.localeCompare(b, currentLocale()));

    for (const person of people) {
      const col = document.createElement('div');
      col.className = 'column';

      const tasks = groups[person].slice().sort((a, b) => (a.due || '').localeCompare(b.due || ''));

      col.innerHTML = `<h3>${escHtml(participantOptionLabel(person))}</h3>`;
      const ul = document.createElement('ul');

      for (const tk of tasks) {
        const li = document.createElement('li');
        const due = tk.due ? fmtDate(tk.due) : '—';
        li.textContent = `${due} · ${tk.text}`;
        ul.appendChild(li);
      }

      col.appendChild(ul);
      box.appendChild(col);
    }
  }

  // =========================
  // Confirm overlay
  // =========================
  let confirmCallback = null;

  function openConfirm(message, onOk) {
    const msgEl = $id('confirmMessage');
    if (msgEl) msgEl.textContent = String(message || '');
    confirmCallback = typeof onOk === 'function' ? onOk : null;
    openOverlay('confirmOverlay');
  }

  function setupConfirm() {
    const ok = $id('confirmOk');
    if (!ok) return;

    ok.addEventListener('click', () => {
      const cb = confirmCallback;
      confirmCallback = null;
      closeOverlay('confirmOverlay');
      try { cb && cb(); } catch { /* ignore */ }
    });
  }

  // =========================
  // Clear
  // =========================
  function clearAll() {
    openConfirm(T('alerts.clearConfirm'), () => {
      stopDictation({ cancel: true });

      try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }

      state.meeting = { title: '', date: '', type: 'meeting', participants: [], participantRoles: {}, observations: '' };
      state.threads = [];
      state.tasks = [];
      state.keypoints = [];
      state.ui = { structureReady: false };

      syncFormFromState();
      renderParticipants();
      renderAssigneeSelects();
      renderThreads();
      renderKeypoints();
      renderTasks();
      updateStructureVisibility();
      updateProgress();
      saveState();

      showToast(T('toasts.cleared'));
    });
  }

  // =========================
  // Export fallback (básico)
  // =========================
  function buildThreadsPrintHtml(nodes) {
    if (!Array.isArray(nodes) || !nodes.length) return `<p class="muted">${escHtml(T('print.none'))}</p>`;

    function nodeToLi(n) {
      const author = escHtml(n.author || '—');
      const text = escHtml(String(n.text || '')).replace(/\n/g, '<br/>');
      const kids = Array.isArray(n.children) && n.children.length
        ? `<ul>${n.children.map(nodeToLi).join('')}</ul>`
        : '';
      return `<li><b>${author}</b>: ${text}${kids}</li>`;
    }

    return `<ul>${nodes.map(nodeToLi).join('')}</ul>`;
  }

  function buildPrintHTML() {
    const title = state.meeting.title || T('print.untitled');
    const date = state.meeting.date ? fmtDate(state.meeting.date) : '—';
    const typeLabel = T('setup.types.' + (state.meeting.type || 'meeting'));
    const participants = state.meeting.participants.length
      ? state.meeting.participants.map(escHtml).join(', ')
      : escHtml(T('print.none'));

    const keypoints = state.keypoints.length
      ? `<ul>${state.keypoints.map(k => `<li>${escHtml(k)}</li>`).join('')}</ul>`
      : `<p class="muted">${escHtml(T('print.none'))}</p>`;

    const tasks = state.tasks.length
      ? `<ul>${state.tasks.map((tk) => {
          const due = tk.due ? fmtDate(tk.due) : '—';
          const who = escHtml(tk.assignee || '—');
          const st = tk.status === 'done' ? T('tasks.done') : T('tasks.pending');
          return `<li><b>${escHtml(tk.text)}</b> — ${who} · ${escHtml(due)} · <span class="muted">${escHtml(st)}</span></li>`;
        }).join('')}</ul>`
      : `<p class="muted">${escHtml(T('print.none'))}</p>`;

    const observations = String(state.meeting.observations || '').trim()
      ? `<p>${escHtml(String(state.meeting.observations || '')).replace(/\n/g, '<br/>')}</p>`
      : `<p class="muted">${escHtml(T('print.observations.empty'))}</p>`;

    return `
      <h1>${escHtml(title)}</h1>
      <div class="box">
        <div><b>${escHtml(T('print.meta.date'))}:</b> ${escHtml(date)}</div>
        <div><b>${escHtml(T('print.meta.type'))}:</b> ${escHtml(typeLabel)}</div>
        <div><b>${escHtml(T('print.meta.participants'))}:</b> ${participants}</div>
      </div>

      <h2>${escHtml(T('print.sections.contrib'))}</h2>
      <div class="box">${buildThreadsPrintHtml(state.threads)}</div>

      <h2>${escHtml(T('print.sections.keypoints'))}</h2>
      <div class="box">${keypoints}</div>

      <h2>${escHtml(T('print.sections.tasks'))}</h2>
      <div class="box">${tasks}</div>

      <h2>${escHtml(T('print.sections.observations'))}</h2>
      <div class="box">${observations}</div>

      <p class="muted" style="margin-top:16px">${escHtml(T('print.footer'))}</p>
    `;
  }

  function exportPDF() {
    stopDictation({ cancel: true });

    if (!isStructureReady()) {
      showToast(T('alerts.needGenerateFirst'));
      return;
    }

    const printArea = $id('printArea');
    if (!printArea) return;

    printArea.innerHTML = buildPrintHTML();
    printArea.hidden = false;
    printArea.setAttribute('aria-hidden', 'false');

    document.body.classList.add('print-mode');

    const restore = () => {
      document.body.classList.remove('print-mode');
      printArea.hidden = true;
      printArea.setAttribute('aria-hidden', 'true');
      printArea.innerHTML = '';
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    setTimeout(() => window.print(), 60);
  }

  // =========================
  // Wire UI
  // =========================
  function wireUI() {
    const meetingTitle = $id('meetingTitle');
    const meetingDate = $id('meetingDate');
    const meetingType = $id('meetingType');
    const meetingObservations = $id('meetingObservations');

    meetingTitle && meetingTitle.addEventListener('input', (e) => {
      state.meeting.title = e.target.value;
      saveState();
    });

    meetingDate && meetingDate.addEventListener('change', (e) => {
      state.meeting.date = e.target.value;
      saveState();
    });

    meetingType && meetingType.addEventListener('change', (e) => {
      state.meeting.type = e.target.value;
      saveState();
    });

    meetingObservations && meetingObservations.addEventListener('input', (e) => {
      state.meeting.observations = e.target.value;
      updateStructureVisibility();
      updateProgress();
      saveState();
    });

    const participantInput = $id('participantInput');
    const participantRoleInput = $id('participantRoleInput');
    const btnAddParticipant = $id('btnAddParticipant');

    function addParticipantFromInput() {
      const val = String(participantInput ? participantInput.value : '').trim();
      const role = String(participantRoleInput ? participantRoleInput.value : '').trim();
      if (!val) return;

      const exists = state.meeting.participants.includes(val);
      if (!exists) {
        state.meeting.participants.push(val);
      }

      setParticipantRole(val, role);
      renderParticipants();
      renderAssigneeSelects();
      saveState();
      showToast(T(exists ? 'toasts.participantUpdated' : 'toasts.participantAdded', { name: val }));

      if (participantInput) participantInput.value = '';
      if (participantRoleInput) participantRoleInput.value = '';
      if (participantInput) participantInput.focus();
    }

    btnAddParticipant && btnAddParticipant.addEventListener('click', addParticipantFromInput);
    participantInput && participantInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        addParticipantFromInput();
      }
    });
    participantRoleInput && participantRoleInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        addParticipantFromInput();
      }
    });

    const participantsList = $id('participantsList');
    participantsList && participantsList.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-name]');
      if (!btn) return;
      const name = btn.getAttribute('data-name');
      if (!name) return;

      state.meeting.participants = state.meeting.participants.filter(x => x !== name);
      setParticipantRole(name, '');
      renderParticipants();
      renderAssigneeSelects();
      saveState();
      showToast(T('toasts.participantRemoved', { name }));
    });

    const btnGenerate = $id('btnGenerate');
    btnGenerate && btnGenerate.addEventListener('click', generateStructure);

    const btnClear = $id('btnClear');
    const btnExport = $id('btnExport');
    btnClear && btnClear.addEventListener('click', clearAll);
    btnExport && btnExport.addEventListener('click', exportPDF);

    const jump = $id('jumpSelect');
    jump && jump.addEventListener('change', () => {
      const sel = String(jump.value || '');
      const target = sel ? document.querySelector(sel) : null;
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    const btnAddContrib = $id('btnAddContrib');
    const contribText = $id('contribText');
    const contribAuthor = $id('contribAuthor');

    btnAddContrib && btnAddContrib.addEventListener('click', () => {
      if (!state.meeting.participants.length) {
        showToast(T('alerts.needParticipants'));
        return;
      }

      const author = contribAuthor ? contribAuthor.value : '';
      const text = contribText ? String(contribText.value || '').trim() : '';

      if (!author) {
        showToast(T('alerts.needAuthor'));
        return;
      }
      if (!text) {
        showToast(T('alerts.needText'));
        return;
      }

      stopActiveDictationFor(contribText, { cancel: true });
      addContribution(author, text, null);
      if (contribText) contribText.value = '';
      showToast(T('toasts.contribAdded'));
    });

    const btnDictateTop = $id('btnDictateTop');
    const hint = $id('dictateHint');
    btnDictateTop && btnDictateTop.addEventListener('click', () => requestDictation(contribText, hint));

    contribText && contribText.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        btnAddContrib && btnAddContrib.click();
      }
    });

    const threads = $id('threads');
    threads && threads.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (!action || !id) return;

      const threadEl = btn.closest('.thread');

      if (action === 'reply') {
        openReplyBox(threadEl, id);
        return;
      }

      if (action === 'dictate') {
        openReplyBox(threadEl, id);
        setTimeout(() => {
          const ta = threadEl && threadEl.querySelector('.replyText');
          const replyHint = threadEl && threadEl.querySelector('.replyHint');
          requestDictation(ta, replyHint);
        }, 60);
        return;
      }

      if (action === 'delete') {
        openConfirm(T('alerts.deleteContribConfirm'), () => deleteThread(id));
      }
    });

    const btnExtract = $id('btnExtractKP');
    const kpCount = $id('kpCount');
    btnExtract && btnExtract.addEventListener('click', () => {
      const n = Math.max(1, Math.min(15, parseInt(String(kpCount ? kpCount.value : '5'), 10) || 5));
      extractKeyPoints(n);
    });

    const kpList = $id('keypointsList');
    kpList && kpList.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action="remove-kp"]');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-index') || '-1', 10);
      if (idx < 0 || idx >= state.keypoints.length) return;

      state.keypoints.splice(idx, 1);
      renderKeypoints();
      updateProgress();
      saveState();
      showToast(T('toasts.keypointRemoved'));
    });

    const btnAddTask = $id('btnAddTask');
    const taskText = $id('taskText');
    const taskAssignee = $id('taskAssignee');
    const taskDue = $id('taskDue');
    const taskStatus = $id('taskStatus');

    btnAddTask && btnAddTask.addEventListener('click', () => {
      if (!state.meeting.participants.length) {
        showToast(T('alerts.needParticipants'));
        return;
      }

      const text = taskText ? String(taskText.value || '').trim() : '';
      if (!text) {
        showToast(T('alerts.needTaskText'));
        return;
      }

      const assignee = taskAssignee ? taskAssignee.value : '';
      const due = taskDue ? taskDue.value : '';
      const status = taskStatus ? taskStatus.value : 'pending';

      addTask(text, assignee, due, status);

      if (taskText) taskText.value = '';
      if (taskDue) taskDue.value = '';
      showToast(T('toasts.taskAdded'));
    });

    const tasksList = $id('tasksList');
    tasksList && tasksList.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (!action || !id) return;

      const tk = state.tasks.find(x => x.id === id);
      if (!tk) return;

      if (action === 'toggle-task') {
        tk.status = tk.status === 'done' ? 'pending' : 'done';
        renderTasks();
        updateProgress();
        saveState();
        showToast(T('toasts.taskToggled'));
        return;
      }

      if (action === 'remove-task') {
        openConfirm(T('alerts.deleteTaskConfirm'), () => {
          state.tasks = state.tasks.filter(x => x.id !== id);
          renderTasks();
          updateProgress();
          saveState();
          showToast(T('toasts.taskRemoved'));
        });
      }
    });
  }

  // =========================
  // Render all
  // =========================
  function renderAll() {
    renderParticipants();
    renderAssigneeSelects();
    renderThreads();
    renderKeypoints();
    renderTasks();
    updateStructureVisibility();
    updateProgress();
  }

  // =========================
  // Footer year
  // =========================
  function setupFooterYear() {
    const yearEl = $id('f-year');
    if (!yearEl) return;
    yearEl.textContent = String(new Date().getFullYear());
  }

  // =========================
  // Init
  // =========================
  document.addEventListener('DOMContentLoaded', () => {
    if (window.i18n && typeof window.i18n.init === 'function') {
      window.i18n.init({
        supported: SUPPORTED_LANGS,
        fallback: 'es',
        langPath: 'lang'
      });
    }

    const initialLang = ensureInitialLanguageOnce();

    setupSettingsSheet();
    setupOverlays();
    setupConfirm();

    setupThemeSelect();
    setupLanguageSelect(initialLang);

    setupInstall();
    setupServiceWorker();
    setupFooterYear();

    loadState();
    syncFormFromState();

    wireUI();

    updateLayoutVars();
    window.addEventListener('resize', updateLayoutVars, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopDictation({ cancel: true });
    });

    window.addEventListener('pagehide', () => {
      stopDictation({ cancel: true });
    });

    if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
      window.i18n.changeLanguage(initialLang).then(() => {
        syncDocumentTitle();
        renderAll();
      }).catch(() => {
        syncDocumentTitle();
        renderAll();
      });
    } else {
      syncDocumentTitle();
      renderAll();
    }

    if (
      state.threads.length ||
      state.tasks.length ||
      state.keypoints.length ||
      String(state.meeting.observations || '').trim()
    ) {
      state.ui.structureReady = true;
      updateStructureVisibility();
      updateProgress();
    }
  });
})();
