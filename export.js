/* export.js — Exportación PDF formal (A4) + Copiar para Gmail
   - Intercepta el click en #btnExport (captura) para evitar el export básico de app.js
   - Lee el estado desde localStorage (ReKPiTu:state:v1)
   - Genera HTML + CSS formal tipo acta corporativa en #printArea y ejecuta window.print()
   - Configura encabezado: imagen + nombre de empresa / entidad
   - Pie de página persistente
   - Inserta un botón "Copiar para Gmail" que copia HTML + texto al portapapeles
*/
(function () {
  'use strict';

  const APP_KEY = 'ReKPiTu';
  const LANG_KEY = APP_KEY + ':lang';
  const STATE_KEY = APP_KEY + ':state:v1';
  const EXPORT_KEY = APP_KEY + ':export:v1';

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
  // i18n
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

  // =========================
  // Locale helpers
  // =========================
  function normalizeLang(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
    if (!s) return null;
    if (s === 'pt') return 'pt-br';
    return s;
  }

  function currentLocale() {
    const root = document.documentElement;
    const fromHtml = root && root.lang ? root.lang : '';
    if (fromHtml) return fromHtml;

    const stored = normalizeLang(safeGet(LANG_KEY));
    if (!stored) return 'es';
    return stored === 'pt-br' ? 'pt-BR' : stored;
  }

  function currentDir() {
    const root = document.documentElement;
    return (root && root.dir) ? root.dir : 'ltr';
  }

  function currentLangAttr() {
    const root = document.documentElement;
    if (root && root.lang) return root.lang;
    const stored = normalizeLang(safeGet(LANG_KEY)) || 'es';
    return stored === 'pt-br' ? 'pt-BR' : stored;
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
  // Load state
  // =========================
  function loadState() {
    const empty = {
      meeting: { title: '', date: '', type: 'meeting', participants: [], observations: '' },
      threads: [],
      tasks: [],
      keypoints: [],
      ui: { structureReady: false }
    };

    const raw = safeGet(STATE_KEY);
    if (!raw) return empty;

    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return empty;

      const out = {
        meeting: Object.assign({}, empty.meeting, data.meeting || {}),
        threads: Array.isArray(data.threads) ? data.threads : [],
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        keypoints: Array.isArray(data.keypoints) ? data.keypoints : [],
        ui: Object.assign({}, empty.ui, data.ui || {})
      };

      if (!Array.isArray(out.meeting.participants)) out.meeting.participants = [];
      out.meeting.observations = String(out.meeting.observations || '');

      return out;
    } catch {
      return empty;
    }
  }

  function isStructureReady(state) {
    return !!(
      (state.ui && state.ui.structureReady) ||
      (Array.isArray(state.threads) && state.threads.length) ||
      (Array.isArray(state.tasks) && state.tasks.length) ||
      (Array.isArray(state.keypoints) && state.keypoints.length) ||
      String(state.meeting && state.meeting.observations ? state.meeting.observations : '').trim()
    );
  }

  // =========================
  // Export settings
  // =========================
  function defaultExportCfg() {
    return {
      headerName: '',
      headerLogoDataUrl: '',
      footerText: ''
    };
  }

  function loadExportCfg() {
    const raw = safeGet(EXPORT_KEY);
    if (!raw) return defaultExportCfg();

    try {
      const data = JSON.parse(raw);
      const base = defaultExportCfg();
      if (!data || typeof data !== 'object') return base;

      const legacyLogo = (typeof data.logoDataUrl === 'string') ? data.logoDataUrl : '';
      const legacyInclude = (typeof data.includeLogo === 'boolean') ? data.includeLogo : true;

      const headerName =
        (typeof data.headerName === 'string') ? data.headerName :
        (typeof data.companyName === 'string') ? data.companyName :
        base.headerName;

      const headerLogoDataUrl =
        (typeof data.headerLogoDataUrl === 'string') ? data.headerLogoDataUrl :
        ((legacyInclude !== false ? legacyLogo : '') || base.headerLogoDataUrl);

      const footerText =
        (typeof data.footerText === 'string') ? data.footerText : base.footerText;

      return {
        headerName,
        headerLogoDataUrl,
        footerText
      };
    } catch {
      return defaultExportCfg();
    }
  }

  function saveExportCfg(cfg) {
    try { safeSet(EXPORT_KEY, JSON.stringify(cfg || defaultExportCfg())); } catch { /* ignore */ }
  }

  function getHeaderName(cfg) {
    return String(cfg && cfg.headerName ? cfg.headerName : '').trim();
  }

  function getHeaderLogo(cfg) {
    return String(cfg && cfg.headerLogoDataUrl ? cfg.headerLogoDataUrl : '').trim();
  }

  function looksAbsoluteUrl(s) {
    const v = String(s || '').trim();
    return /^https?:\/\//i.test(v);
  }

  function looksDataUrl(s) {
    const v = String(s || '').trim();
    return /^data:/i.test(v);
  }

  function resolveHeaderLogoForPrint(cfg) {
    const src = getHeaderLogo(cfg);
    return src || '';
  }

  async function resolveHeaderLogoForEmail(cfg) {
    const src = getHeaderLogo(cfg);
    if (!src) return '';
    if (looksDataUrl(src) || looksAbsoluteUrl(src)) return src;
    return '';
  }

  // =========================
  // Utils
  // =========================
  function sanitizeFilename(name) {
    const base = String(name || '').trim() || 'Acta';
    const cleaned = base
      .replace(/[\u0000-\u001F]/g, '')
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    const max = 90;
    const short = cleaned.length > max ? cleaned.slice(0, max).trim() : cleaned;
    return short || 'Acta';
  }

  function padN(n, len) {
    return String(n).padStart(len, '0');
  }

  function countThreadNodes(nodes) {
    if (!Array.isArray(nodes)) return 0;
    let c = 0;
    for (const n of nodes) {
      c += 1;
      if (Array.isArray(n.children) && n.children.length) c += countThreadNodes(n.children);
    }
    return c;
  }

  function normalizeText(raw) {
    return String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  function textToParagraphsHtml(text) {
    const raw = normalizeText(text).trim();
    if (!raw) return `<p class="muted">${escHtml(T('print.none'))}</p>`;

    const blocks = raw.split(/\n{2,}/g);
    return blocks.map((b) => {
      const lines = b.split('\n').map((ln) => escHtml(ln));
      const joined = lines.join('<br/>');
      return `<p class="para">${joined}</p>`;
    }).join('');
  }

  function participantsToLine(participants) {
    const list = Array.isArray(participants) ? participants : [];
    const clean = list.map(x => String(x || '').trim()).filter(Boolean);
    if (!clean.length) return T('print.none');
    return clean.join(', ');
  }

  function buildDocReference(state) {
    const meetingDate = state && state.meeting && state.meeting.date ? String(state.meeting.date) : '';
    const datePart = meetingDate ? meetingDate.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const total = Math.max(1, countThreadNodes(state && state.threads ? state.threads : []));
    return `RK-${datePart}-${padN(total, 3)}`;
  }

  // =========================
  // Renderers (PRINT)
  // =========================
  function renderSummary(state) {
    const totalThreads = Array.isArray(state.threads) ? state.threads.length : 0;
    const totalContrib = countThreadNodes(state.threads);
    const kp = Array.isArray(state.keypoints) ? state.keypoints : [];
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const done = tasks.filter(t => String(t.status || '') === 'done').length;
    const pending = Math.max(0, tasks.length - done);

    const bullets = [
      T('print.summary.bullets.contrib', { total: totalContrib, threads: totalThreads }),
      T('print.summary.bullets.keypoints', { n: kp.length }),
      T('print.summary.bullets.tasks', { total: tasks.length, done, pending })
    ];

    const lis = bullets.map(s => `<li>${escHtml(String(s || ''))}</li>`).join('');

    const highlights = kp.slice(0, 3).map(k => `<li>${escHtml(String(k || '').trim())}</li>`).join('');

    return `
      <div class="section-body">
        <ul class="formal-list">
          ${lis}
        </ul>
        ${
          kp.length
            ? `
              <div class="subcaption">${escHtml(T('print.summary.highlights'))}</div>
              <ul class="formal-list compact">
                ${highlights}
              </ul>
            `
            : ''
        }
      </div>
    `;
  }

  function renderThreads(state) {
    const nodes = Array.isArray(state.threads) ? state.threads : [];
    if (!nodes.length) {
      return `<div class="section-body"><p class="muted">${escHtml(T('print.none'))}</p></div>`;
    }

    let rootNo = 0;

    function renderNode(n, depth, rootNum) {
      const author = escHtml(n && n.author ? n.author : '—');
      const ts = n && n.ts ? fmtDateTime(n.ts) : '';
      const body = textToParagraphsHtml(n && n.text ? n.text : '');
      const kind = depth === 0 ? T('print.contrib.kind.root') : T('print.contrib.kind.reply');
      const label = depth === 0 ? `${rootNum}.` : '—';
      const replyTo = depth > 0 ? T('print.contrib.replyTo', { n: rootNum }) : '';

      return `
        <div class="entry ${depth === 0 ? 'root' : 'reply'}" style="--d:${depth}">
          <div class="entry-head">
            <span class="entry-num">${escHtml(label)}</span>
            <span class="entry-kind">${escHtml(kind)}</span>
            <span class="entry-sep">•</span>
            <span class="entry-author">${author}</span>
            ${ts ? `<span class="entry-sep">•</span><span class="entry-time">${escHtml(ts)}</span>` : ''}
            ${replyTo ? `<span class="entry-sep">•</span><span class="entry-ref">${escHtml(replyTo)}</span>` : ''}
          </div>
          <div class="entry-body">
            ${body}
          </div>
        </div>
      `;
    }

    function walk(arr, depth, currentRootNum) {
      let out = '';
      for (const n of arr) {
        let rootNum = currentRootNum;
        if (depth === 0) {
          rootNo += 1;
          rootNum = rootNo;
        }
        out += renderNode(n, depth, rootNum);
        if (Array.isArray(n.children) && n.children.length) {
          out += walk(n.children, depth + 1, rootNum);
        }
      }
      return out;
    }

    return `<div class="section-body">${walk(nodes, 0, 0)}</div>`;
  }

  function renderKeypoints(state) {
    const kp = Array.isArray(state.keypoints) ? state.keypoints : [];
    if (!kp.length) {
      return `<div class="section-body"><p class="muted">${escHtml(T('print.none'))}</p></div>`;
    }

    return `
      <div class="section-body">
        <ol class="formal-ol">
          ${kp.map((k) => `<li>${escHtml(String(k || '').trim())}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  function renderTasks(state) {
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const thId = escHtml(T('print.tasksTable.id'));
    const thTask = escHtml(T('print.tasksTable.task'));
    const thAssignee = escHtml(T('print.tasksTable.assignee'));
    const thDue = escHtml(T('print.tasksTable.due'));
    const thStatus = escHtml(T('print.tasksTable.status'));

    const rows = tasks.length
      ? tasks.map((tk, i) => {
          const id = `A-${padN(i + 1, 2)}`;
          const taskText = escHtml(String(tk && tk.text ? tk.text : '').trim() || '—');
          const who = escHtml(tk && tk.assignee ? tk.assignee : '—');
          const due = tk && tk.due ? escHtml(fmtDate(tk.due)) : escHtml(T('print.none'));
          const isDone = String(tk && tk.status ? tk.status : '') === 'done';
          const label = isDone ? escHtml(T('tasks.done')) : escHtml(T('tasks.pending'));

          return `
            <tr>
              <td class="nowrap">${escHtml(id)}</td>
              <td>${taskText}</td>
              <td>${who}</td>
              <td class="nowrap">${due}</td>
              <td class="nowrap">${label}</td>
            </tr>
          `;
        }).join('')
      : `
        <tr>
          <td class="empty-cell" colspan="5">${escHtml(T('print.none'))}</td>
        </tr>
      `;

    return `
      <div class="section-body">
        <table class="formal-table">
          <thead>
            <tr>
              <th class="nowrap">${thId}</th>
              <th>${thTask}</th>
              <th>${thAssignee}</th>
              <th class="nowrap">${thDue}</th>
              <th class="nowrap">${thStatus}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderObservations(state) {
    const text = String(state && state.meeting && state.meeting.observations ? state.meeting.observations : '').trim();
    if (!text) {
      return `<div class="section-body"><p class="muted">${escHtml(T('print.observations.empty'))}</p></div>`;
    }

    return `
      <div class="section-body">
        <div class="text-block">
          ${textToParagraphsHtml(text)}
        </div>
      </div>
    `;
  }

  function renderParticipantsTable(state, cfg) {
    const participants = Array.isArray(state && state.meeting && state.meeting.participants)
      ? state.meeting.participants
      : [];

    const thN = escHtml(T('print.participantsTable.number'));
    const thName = escHtml(T('print.participantsTable.name'));
    const thRole = escHtml(T('print.participantsTable.role'));
    const thCompany = escHtml(T('print.participantsTable.company'));
    const thSignature = escHtml(T('print.participantsTable.signature'));

    const defaultCompany = escHtml(getHeaderName(cfg) || T('print.none'));

    const rows = participants.length
      ? participants.map((name, i) => `
          <tr>
            <td class="nowrap">${escHtml(String(i + 1))}</td>
            <td>${escHtml(String(name || '').trim() || '—')}</td>
            <td>&nbsp;</td>
            <td>${defaultCompany}</td>
            <td>&nbsp;</td>
          </tr>
        `).join('')
      : `
        <tr>
          <td class="nowrap">1</td>
          <td>${escHtml(T('print.none'))}</td>
          <td>&nbsp;</td>
          <td>${defaultCompany}</td>
          <td>&nbsp;</td>
        </tr>
      `;

    return `
      <div class="section-body">
        <table class="formal-table participants-table">
          <thead>
            <tr>
              <th class="nowrap">${thN}</th>
              <th>${thName}</th>
              <th>${thRole}</th>
              <th>${thCompany}</th>
              <th>${thSignature}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // =========================
  // Print CSS
  // =========================
  function buildFormalPrintCSS() {
    return `
@page {
  size: A4;
  margin: 14mm 12mm 14mm 12mm;
}

@media print {
  html, body {
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

body.print-mode {
  background: #dbe2ea !important;
}

#printArea {
  padding: 0 !important;
  margin: 0 !important;
  max-width: none !important;
}

body.print-mode #printArea {
  padding: 10mm !important;
}

#printArea .formal-sheet {
  background: #fff;
  color: #111;
  font: 11.2pt/1.45 Georgia, "Times New Roman", Times, serif;
}

body.print-mode #printArea .formal-sheet {
  max-width: 210mm;
  margin: 0 auto;
  padding: 12mm;
  box-shadow: 0 18px 50px rgba(0,0,0,.22);
}

@media print {
  #printArea .formal-sheet {
    padding: 0 !important;
    box-shadow: none !important;
  }
}

#printArea .sheet-top {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0 0 10px 0;
  border: 1.2px solid #222;
}

#printArea .sheet-top > tbody > tr > td {
  border: 1.2px solid #222;
  vertical-align: middle;
  padding: 0;
}

#printArea .sheet-top .brand-cell {
  width: 25%;
  padding: 10px 8px;
  text-align: center;
}

#printArea .sheet-top .title-cell {
  width: 47%;
  text-align: center;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 18pt;
  font-weight: 800;
  letter-spacing: .2px;
  padding: 10px 12px;
}

#printArea .sheet-top .right-cell {
  width: 28%;
  padding: 0;
}

#printArea .logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

#printArea .logo-img {
  display: block;
  max-width: 100%;
  max-height: 18mm;
  width: auto;
  height: auto;
  object-fit: contain;
}

#printArea .brand-name {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10.5pt;
  font-weight: 700;
  text-align: center;
  word-break: break-word;
}

#printArea .mini-head {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

#printArea .mini-head td {
  border: 1.2px solid #222;
  padding: 4px 6px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9.5pt;
  text-align: center;
  vertical-align: middle;
}

#printArea .mini-head .mini-k {
  background: #efefef;
  font-weight: 800;
  text-transform: uppercase;
}

#printArea .mini-head .mini-v {
  font-weight: 700;
}

#printArea .meta-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0 0 10px 0;
  border: 1.2px solid #222;
}

#printArea .meta-table th,
#printArea .meta-table td {
  border: 1.2px solid #222;
  padding: 5px 7px;
  vertical-align: top;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
}

#printArea .meta-table th {
  background: #efefef;
  font-weight: 800;
  text-align: left;
}

#printArea .section-band {
  margin: 12px 0 0 0;
  border: 1.2px solid #222;
  background: #efefef;
  text-align: center;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11.2pt;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 6px;
}

#printArea .section-body {
  border: 1.2px solid #222;
  border-top: none;
  padding: 9px 10px;
}

#printArea .subcaption {
  margin: 10px 0 4px 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  font-weight: 800;
  text-transform: uppercase;
}

#printArea .formal-list,
#printArea .formal-ol {
  margin: 0;
  padding-left: 18px;
}

#printArea .formal-list li,
#printArea .formal-ol li {
  margin: 4px 0;
  text-align: justify;
  text-justify: inter-word;
}

#printArea .formal-list.compact li {
  margin: 2px 0;
}

#printArea .entry {
  margin: 0 0 10px 0;
  break-inside: avoid;
  page-break-inside: avoid;
}

#printArea .entry:last-child {
  margin-bottom: 0;
}

#printArea .entry.reply {
  margin-left: calc(var(--d) * 8mm);
  padding-left: 8px;
  border-left: 2px solid #bbb;
}

#printArea .entry-head {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9.6pt;
  color: #222;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 4px;
}

#printArea .entry-num,
#printArea .entry-kind,
#printArea .entry-author {
  font-weight: 800;
}

#printArea .entry-sep {
  color: #777;
}

#printArea .entry-ref,
#printArea .entry-time {
  color: #444;
}

#printArea .entry-body .para {
  margin: 0 0 7px 0;
  text-align: justify;
  text-justify: inter-word;
}

#printArea .entry-body .para:last-child {
  margin-bottom: 0;
}

#printArea .text-block .para {
  margin: 0 0 8px 0;
  text-align: justify;
  text-justify: inter-word;
}

#printArea .text-block .para:last-child {
  margin-bottom: 0;
}

#printArea .formal-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1.2px solid #222;
}

#printArea .formal-table th,
#printArea .formal-table td {
  border: 1.2px solid #222;
  padding: 6px 7px;
  vertical-align: top;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9.7pt;
}

#printArea .formal-table th {
  background: #efefef;
  font-weight: 800;
  text-align: center;
}

#printArea .formal-table td {
  text-align: left;
}

#printArea .formal-table tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

#printArea .participants-table td:last-child {
  height: 18px;
}

#printArea .empty-cell {
  text-align: center !important;
  color: #666;
}

#printArea .nowrap {
  white-space: nowrap;
}

#printArea .muted {
  color: #666;
}

#printArea .doc-footer {
  margin-top: 10px;
  border-top: 1.2px solid #222;
  padding-top: 6px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #333;
}
`;
  }

  // =========================
  // Build PRINT HTML
  // =========================
  function buildFormalPrintHTML(state, cfg) {
    const meetingTitle = (state.meeting && state.meeting.title) ? String(state.meeting.title) : '';
    const safeTitle = meetingTitle.trim() ? meetingTitle.trim() : T('print.untitled');
    const date = (state.meeting && state.meeting.date) ? fmtDate(state.meeting.date) : '';
    const type = (state.meeting && state.meeting.type) ? String(state.meeting.type) : 'meeting';
    const typeLabel = T('setup.types.' + type);

    const participants = (state.meeting && Array.isArray(state.meeting.participants)) ? state.meeting.participants : [];
    const participantsLine = participantsToLine(participants);
    const participantsCount = participants.length ? String(participants.length) : T('print.none');

    const createdAtLabel = T('print.meta.createdAt');
    const createdAt = fmtDateTime(Date.now());
    const issueDate = fmtDate(new Date().toISOString().slice(0, 10));
    const ref = buildDocReference(state);
    const version = 'v1';

    const footerText = String((cfg && cfg.footerText) ? cfg.footerText : '').trim() || T('print.footer');
    const headerName = getHeaderName(cfg);
    const logoSrc = resolveHeaderLogoForPrint(cfg);
    const logoAlt = headerName || T('export.logoAlt') || 'Logo';

    const entityLabel = headerName || T('print.none');

    const css = buildFormalPrintCSS();
    const docLang = currentLangAttr();
    const docDir = currentDir();

    return `
      <style>${css}</style>

      <article class="formal-sheet" lang="${escHtml(docLang)}" dir="${escHtml(docDir)}">
        <table class="sheet-top" role="presentation">
          <tr>
            <td class="brand-cell">
              <div class="logo-wrap">
                ${logoSrc ? `<img class="logo-img" src="${escHtml(logoSrc)}" alt="${escHtml(logoAlt)}">` : ''}
                ${headerName ? `<div class="brand-name">${escHtml(headerName)}</div>` : ''}
              </div>
            </td>

            <td class="title-cell">
              ${escHtml(T('print.doc.title'))}
            </td>

            <td class="right-cell">
              <table class="mini-head" role="presentation">
                <tr>
                  <td class="mini-k">${escHtml(T('print.header.reference'))}</td>
                  <td class="mini-v">${escHtml(ref)}</td>
                </tr>
                <tr>
                  <td class="mini-k">${escHtml(T('print.header.version'))}</td>
                  <td class="mini-v">${escHtml(version)}</td>
                </tr>
                <tr>
                  <td class="mini-k">${escHtml(T('print.header.issueDate'))}</td>
                  <td class="mini-v">${escHtml(issueDate || T('print.none'))}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table class="meta-table" role="presentation">
          <tr>
            <th>${escHtml(T('print.details.meeting'))}</th>
            <td>${escHtml(safeTitle)}</td>
            <th>${escHtml(T('print.meta.date'))}</th>
            <td>${escHtml(date || T('print.none'))}</td>
          </tr>
          <tr>
            <th>${escHtml(T('print.meta.type'))}</th>
            <td>${escHtml(typeLabel || T('print.none'))}</td>
            <th>${escHtml(T('print.details.participantsCount'))}</th>
            <td>${escHtml(participantsCount)}</td>
          </tr>
          <tr>
            <th>${escHtml(T('print.details.entity'))}</th>
            <td>${escHtml(entityLabel)}</td>
            <th>${escHtml(createdAtLabel)}</th>
            <td>${escHtml(createdAt || T('print.none'))}</td>
          </tr>
          <tr>
            <th>${escHtml(T('print.meta.participants'))}</th>
            <td colspan="3">${escHtml(participantsLine || T('print.none'))}</td>
          </tr>
        </table>

        <div class="section-band">1. ${escHtml(T('print.sections.summary'))}</div>
        ${renderSummary(state)}

        <div class="section-band">2. ${escHtml(T('print.sections.contrib'))}</div>
        ${renderThreads(state)}

        <div class="section-band">3. ${escHtml(T('print.sections.keypoints'))}</div>
        ${renderKeypoints(state)}

        <div class="section-band">4. ${escHtml(T('print.sections.tasks'))}</div>
        ${renderTasks(state)}

        <div class="section-band">5. ${escHtml(T('print.sections.observations'))}</div>
        ${renderObservations(state)}

        <div class="section-band">6. ${escHtml(T('print.sections.participants'))}</div>
        ${renderParticipantsTable(state, cfg)}

        <footer class="doc-footer">
          <div>${escHtml(footerText)}</div>
          <div>${escHtml(createdAtLabel)}: ${escHtml(createdAt || T('print.none'))}</div>
        </footer>
      </article>
    `;
  }

  // =========================
  // Email text
  // =========================
  function buildEmailText(state, cfg) {
    const meetingTitle = (state.meeting && state.meeting.title) ? String(state.meeting.title) : '';
    const safeTitle = meetingTitle.trim() ? meetingTitle.trim() : T('print.untitled');

    const date = (state.meeting && state.meeting.date) ? fmtDate(state.meeting.date) : '';
    const type = (state.meeting && state.meeting.type) ? String(state.meeting.type) : 'meeting';
    const typeLabel = T('setup.types.' + type);

    const participants = (state.meeting && Array.isArray(state.meeting.participants)) ? state.meeting.participants : [];
    const participantsLine = participantsToLine(participants);
    const participantsCount = participants.length ? String(participants.length) : T('print.none');

    const createdAtLabel = T('print.meta.createdAt');
    const createdAt = fmtDateTime(Date.now());
    const issueDateLabel = T('print.header.issueDate');
    const issueDate = fmtDate(new Date().toISOString().slice(0, 10));
    const ref = buildDocReference(state);

    const footerText = String((cfg && cfg.footerText) ? cfg.footerText : '').trim() || T('print.footer');
    const headerName = getHeaderName(cfg);

    const kp = Array.isArray(state.keypoints) ? state.keypoints : [];
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const done = tasks.filter(t => String(t.status || '') === 'done').length;
    const pending = Math.max(0, tasks.length - done);

    let out = '';

    if (headerName) out += `${headerName}\n`;

    out += `${T('print.doc.title')}\n`;
    out += `${T('print.header.reference')}: ${ref}\n`;
    out += `${issueDateLabel}: ${issueDate || T('print.none')}\n`;
    out += `\n${T('print.details.meeting')}: ${safeTitle}\n`;
    out += `${T('print.meta.date')}: ${date || T('print.none')}\n`;
    out += `${T('print.meta.type')}: ${typeLabel || T('print.none')}\n`;
    out += `${T('print.details.entity')}: ${headerName || T('print.none')}\n`;
    out += `${T('print.details.participantsCount')}: ${participantsCount}\n`;
    out += `${T('print.meta.participants')}: ${participantsLine || T('print.none')}\n`;
    out += `${createdAtLabel}: ${createdAt || T('print.none')}\n`;

    out += `\n1) ${T('print.sections.summary')}\n`;
    out += `- ${T('print.summary.bullets.contrib', { total: countThreadNodes(state.threads), threads: (state.threads || []).length })}\n`;
    out += `- ${T('print.summary.bullets.keypoints', { n: kp.length })}\n`;
    out += `- ${T('print.summary.bullets.tasks', { total: tasks.length, done, pending })}\n`;

    if (kp.length) {
      out += `\n${T('print.summary.highlights')}:\n`;
      kp.slice(0, 3).forEach((x) => { out += `• ${String(x || '').trim()}\n`; });
    }

    out += `\n2) ${T('print.sections.contrib')}\n`;

    function walkPlain(nodes, depth, rootNumRef) {
      let s = '';
      let rootNo = rootNumRef.value;

      for (const n of nodes || []) {
        let curRoot = rootNo;
        if (depth === 0) {
          rootNo += 1;
          curRoot = rootNo;
        }

        const prefix = depth === 0 ? `${curRoot}. ` : `${'  '.repeat(Math.min(depth, 6))}- `;
        const author = String(n && n.author ? n.author : '—');
        const text = normalizeText(n && n.text ? n.text : '').trim();

        s += `${prefix}${author}: ${text}\n`;

        if (Array.isArray(n.children) && n.children.length) {
          s += walkPlain(n.children, depth + 1, { value: curRoot });
        }
      }

      rootNumRef.value = rootNo;
      return s;
    }

    out += walkPlain(state.threads || [], 0, { value: 0 }) || `${T('print.none')}\n`;

    out += `\n3) ${T('print.sections.keypoints')}\n`;
    if (!kp.length) out += `${T('print.none')}\n`;
    else kp.forEach((x, i) => { out += `${i + 1}. ${String(x || '').trim()}\n`; });

    out += `\n4) ${T('print.sections.tasks')}\n`;
    if (!tasks.length) out += `${T('print.none')}\n`;
    else tasks.forEach((t, i) => {
      const id = `A-${padN(i + 1, 2)}`;
      const tx = String(t && t.text ? t.text : '').trim() || '—';
      const who = String(t && t.assignee ? t.assignee : '—');
      const due = t && t.due ? fmtDate(t.due) : T('print.none');
      const st = String(t && t.status ? t.status : '') === 'done' ? T('tasks.done') : T('tasks.pending');
      out += `${id} — ${tx} — ${who} — ${due} — ${st}\n`;
    });

    out += `\n5) ${T('print.sections.observations')}\n`;
    const observations = String(state.meeting && state.meeting.observations ? state.meeting.observations : '').trim();
    out += observations ? `${observations}\n` : `${T('print.observations.empty')}\n`;

    out += `\n6) ${T('print.sections.participants')}\n`;
    if (!participants.length) {
      out += `1. ${T('print.none')}\n`;
    } else {
      participants.forEach((name, i) => {
        out += `${i + 1}. ${String(name || '').trim() || '—'}\n`;
      });
    }

    out += `\n${footerText}\n`;
    return out;
  }

  // =========================
  // Email HTML
  // =========================
  function renderThreadsEmailHTML(state) {
    const nodes = Array.isArray(state.threads) ? state.threads : [];
    if (!nodes.length) {
      return `<div style="padding:8px 10px; border:1px solid #222; border-top:none; color:#666;">${escHtml(T('print.none'))}</div>`;
    }

    let rootNo = 0;

    function nodeHtml(n, depth, rootNum) {
      const author = escHtml(n && n.author ? n.author : '—');
      const ts = n && n.ts ? fmtDateTime(n.ts) : '';
      const body = textToParagraphsHtml(n && n.text ? n.text : '')
        .replace(/class="para"/g, 'style="margin:0 0 7px 0; text-align:justify;"')
        .replace(/class="muted"/g, 'style="color:#666;"');

      const kind = depth === 0 ? T('print.contrib.kind.root') : T('print.contrib.kind.reply');
      const label = depth === 0 ? `${rootNum}.` : '—';
      const replyTo = depth > 0 ? T('print.contrib.replyTo', { n: rootNum }) : '';
      const indent = Math.min(depth, 6) * 24;

      return `
        <div style="margin:0 0 10px 0; padding-left:${indent}px;">
          <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; margin-bottom:4px;">
            <b>${escHtml(label)}</b>
            <span style="margin-left:6px;"><b>${escHtml(kind)}</b></span>
            <span style="margin:0 6px;">•</span>
            <b>${author}</b>
            ${ts ? `<span style="margin:0 6px;">•</span><span>${escHtml(ts)}</span>` : ''}
            ${replyTo ? `<span style="margin:0 6px;">•</span><span>${escHtml(replyTo)}</span>` : ''}
          </div>
          <div style="font-family:Georgia,'Times New Roman',Times,serif; font-size:14px; line-height:1.5;">
            ${body}
          </div>
        </div>
      `;
    }

    function walk(arr, depth, currentRootNum) {
      let out = '';
      for (const n of arr) {
        let rootNum = currentRootNum;
        if (depth === 0) {
          rootNo += 1;
          rootNum = rootNo;
        }
        out += nodeHtml(n, depth, rootNum);
        if (Array.isArray(n.children) && n.children.length) {
          out += walk(n.children, depth + 1, rootNum);
        }
      }
      return out;
    }

    return `<div style="padding:10px; border:1px solid #222; border-top:none;">${walk(nodes, 0, 0)}</div>`;
  }

  function renderTasksEmailHTML(state) {
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const thId = escHtml(T('print.tasksTable.id'));
    const thTask = escHtml(T('print.tasksTable.task'));
    const thAssignee = escHtml(T('print.tasksTable.assignee'));
    const thDue = escHtml(T('print.tasksTable.due'));
    const thStatus = escHtml(T('print.tasksTable.status'));

    const rows = tasks.length
      ? tasks.map((tk, i) => {
          const id = `A-${padN(i + 1, 2)}`;
          const taskText = escHtml(String(tk && tk.text ? tk.text : '').trim() || '—');
          const who = escHtml(tk && tk.assignee ? tk.assignee : '—');
          const due = tk && tk.due ? escHtml(fmtDate(tk.due)) : escHtml(T('print.none'));
          const isDone = String(tk && tk.status ? tk.status : '') === 'done';
          const label = isDone ? escHtml(T('tasks.done')) : escHtml(T('tasks.pending'));

          return `
            <tr>
              <td style="border:1px solid #222;padding:6px 7px;white-space:nowrap;">${escHtml(id)}</td>
              <td style="border:1px solid #222;padding:6px 7px;">${taskText}</td>
              <td style="border:1px solid #222;padding:6px 7px;">${who}</td>
              <td style="border:1px solid #222;padding:6px 7px;white-space:nowrap;">${due}</td>
              <td style="border:1px solid #222;padding:6px 7px;white-space:nowrap;">${label}</td>
            </tr>
          `;
        }).join('')
      : `
        <tr>
          <td colspan="5" style="border:1px solid #222;padding:6px 7px;text-align:center;color:#666;">${escHtml(T('print.none'))}</td>
        </tr>
      `;

    return `
      <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #222;border-top:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
        <thead>
          <tr>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thId}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thTask}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thAssignee}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thDue}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thStatus}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function renderParticipantsEmailHTML(state, cfg) {
    const participants = Array.isArray(state && state.meeting && state.meeting.participants)
      ? state.meeting.participants
      : [];

    const thN = escHtml(T('print.participantsTable.number'));
    const thName = escHtml(T('print.participantsTable.name'));
    const thRole = escHtml(T('print.participantsTable.role'));
    const thCompany = escHtml(T('print.participantsTable.company'));
    const thSignature = escHtml(T('print.participantsTable.signature'));

    const defaultCompany = escHtml(getHeaderName(cfg) || T('print.none'));

    const rows = participants.length
      ? participants.map((name, i) => `
          <tr>
            <td style="border:1px solid #222;padding:6px 7px;white-space:nowrap;">${escHtml(String(i + 1))}</td>
            <td style="border:1px solid #222;padding:6px 7px;">${escHtml(String(name || '').trim() || '—')}</td>
            <td style="border:1px solid #222;padding:6px 7px;">&nbsp;</td>
            <td style="border:1px solid #222;padding:6px 7px;">${defaultCompany}</td>
            <td style="border:1px solid #222;padding:6px 7px;">&nbsp;</td>
          </tr>
        `).join('')
      : `
        <tr>
          <td style="border:1px solid #222;padding:6px 7px;">1</td>
          <td style="border:1px solid #222;padding:6px 7px;">${escHtml(T('print.none'))}</td>
          <td style="border:1px solid #222;padding:6px 7px;">&nbsp;</td>
          <td style="border:1px solid #222;padding:6px 7px;">${defaultCompany}</td>
          <td style="border:1px solid #222;padding:6px 7px;">&nbsp;</td>
        </tr>
      `;

    return `
      <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #222;border-top:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
        <thead>
          <tr>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thN}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thName}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thRole}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thCompany}</th>
            <th style="border:1px solid #222;background:#efefef;padding:6px 7px;text-align:center;">${thSignature}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  async function buildEmailHTML(state, cfg) {
    const headerName = getHeaderName(cfg);
    const logoDataUrl = await resolveHeaderLogoForEmail(cfg);
    const logoAlt = headerName || T('export.logoAlt') || 'Logo';

    const meetingTitle = (state.meeting && state.meeting.title) ? String(state.meeting.title) : '';
    const safeTitle = meetingTitle.trim() ? meetingTitle.trim() : T('print.untitled');

    const date = (state.meeting && state.meeting.date) ? fmtDate(state.meeting.date) : '';
    const type = (state.meeting && state.meeting.type) ? String(state.meeting.type) : 'meeting';
    const typeLabel = T('setup.types.' + type);

    const participants = (state.meeting && Array.isArray(state.meeting.participants)) ? state.meeting.participants : [];
    const participantsLine = participantsToLine(participants);
    const participantsCount = participants.length ? String(participants.length) : T('print.none');

    const createdAtLabel = T('print.meta.createdAt');
    const createdAt = fmtDateTime(Date.now());
    const issueDate = fmtDate(new Date().toISOString().slice(0, 10));
    const ref = buildDocReference(state);

    const footerText = String((cfg && cfg.footerText) ? cfg.footerText : '').trim() || T('print.footer');
    const kp = Array.isArray(state.keypoints) ? state.keypoints : [];
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const done = tasks.filter(t => String(t.status || '') === 'done').length;
    const pending = Math.max(0, tasks.length - done);

    const observations = String(state.meeting && state.meeting.observations ? state.meeting.observations : '').trim();

    const summaryBullets = `
      <ul style="margin:0;padding-left:18px;">
        <li style="margin:4px 0;text-align:justify;">${escHtml(T('print.summary.bullets.contrib', { total: countThreadNodes(state.threads), threads: (state.threads || []).length }))}</li>
        <li style="margin:4px 0;text-align:justify;">${escHtml(T('print.summary.bullets.keypoints', { n: kp.length }))}</li>
        <li style="margin:4px 0;text-align:justify;">${escHtml(T('print.summary.bullets.tasks', { total: tasks.length, done, pending }))}</li>
      </ul>
    `;

    const highlights = kp.slice(0, 3).map(x => `<li style="margin:4px 0;text-align:justify;">${escHtml(String(x || '').trim())}</li>`).join('');
    const highlightsBlock = kp.length
      ? `
        <div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;">
          ${escHtml(T('print.summary.highlights'))}
        </div>
        <ul style="margin:6px 0 0 0;padding-left:18px;">
          ${highlights}
        </ul>
      `
      : '';

    const keypointsBlock = kp.length
      ? `<ol style="margin:0;padding-left:18px;">${kp.map(x => `<li style="margin:4px 0;text-align:justify;">${escHtml(String(x || '').trim())}</li>`).join('')}</ol>`
      : `<div style="padding:8px 10px;border:1px solid #222;border-top:none;color:#666;">${escHtml(T('print.none'))}</div>`;

    const observationsBlock = observations
      ? `<div style="padding:10px;border:1px solid #222;border-top:none;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.5;">${textToParagraphsHtml(observations).replace(/class="para"/g, 'style="margin:0 0 7px 0;text-align:justify;"').replace(/class="muted"/g, 'style="color:#666;"')}</div>`
      : `<div style="padding:8px 10px;border:1px solid #222;border-top:none;color:#666;">${escHtml(T('print.observations.empty'))}</div>`;

    return `
<div lang="${escHtml(currentLangAttr())}" dir="${escHtml(currentDir())}" style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.45;">
  <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #222;">
    <tr>
      <td style="width:25%;border:1px solid #222;padding:8px;vertical-align:middle;text-align:center;">
        ${logoDataUrl ? `<img src="${escHtml(logoDataUrl)}" alt="${escHtml(logoAlt)}" style="display:block;margin:0 auto 6px auto;max-height:48px;max-width:100%;height:auto;width:auto;">` : ''}
        ${headerName ? `<div style="font-weight:700;font-size:13px;word-break:break-word;">${escHtml(headerName)}</div>` : ''}
      </td>
      <td style="width:47%;border:1px solid #222;padding:10px 12px;vertical-align:middle;text-align:center;font-size:24px;font-weight:800;">
        ${escHtml(T('print.doc.title'))}
      </td>
      <td style="width:28%;border:1px solid #222;padding:0;vertical-align:middle;">
        <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <tr>
            <td style="border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:700;text-transform:uppercase;font-size:12px;">${escHtml(T('print.header.reference'))}</td>
            <td style="border:1px solid #222;padding:4px 6px;text-align:center;font-weight:700;font-size:12px;">${escHtml(ref)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:700;text-transform:uppercase;font-size:12px;">${escHtml(T('print.header.version'))}</td>
            <td style="border:1px solid #222;padding:4px 6px;text-align:center;font-weight:700;font-size:12px;">v1</td>
          </tr>
          <tr>
            <td style="border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:700;text-transform:uppercase;font-size:12px;">${escHtml(T('print.header.issueDate'))}</td>
            <td style="border:1px solid #222;padding:4px 6px;text-align:center;font-weight:700;font-size:12px;">${escHtml(issueDate || T('print.none'))}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #222;margin-top:10px;">
    <tr>
      <th style="border:1px solid #222;background:#efefef;padding:5px 7px;text-align:left;font-size:13px;">${escHtml(T('print.details.meeting'))}</th>
      <td style="border:1px solid #222;padding:5px 7px;font-size:13px;">${escHtml(safeTitle)}</td>
      <th style="border:1px solid #222;background:#efefef;padding:5px 7px;text-align:left;font-size:13px;">${escHtml(T('print.meta.date'))}</th>
      <td style="border:1px solid #222;padding:5px 7px;font-size:13px;">${escHtml(date || T('print.none'))}</td>
    </tr>
    <tr>
      <th style="border:1px solid #222;background:#efefef;padding:5px 7px;text-align:left;font-size:13px;">${escHtml(T('print.meta.type'))}</th>
      <td style="border:1px solid #222;padding:5px 7px;font-size:13px;">${escHtml(typeLabel || T('print.none'))}</td>
      <th style="border:1px solid #222;background:#efefef;padding:5px 7px;text-align:left;font-size:13px;">${escHtml(T('print.details.participantsCount'))}</th>
      <td style="border:1px solid #222;padding:5px 7px;font-size:13px;">${escHtml(participantsCount)}</td>
    </tr>
    <tr>
      <th style="border:1px solid #222;background:#efefef;padding:5px 7px;text-align:left;font-size:13px;">${escHtml(T('print.details.entity'))}</th>
      <td style="border:1px solid #222;padding:5px 7px;font-size:13px;">${escHtml(headerName || T('print.none'))}</td>
      <th style="border:1px solid #222;background:#efefef;padding:5px 7px;text-align:left;font-size:13px;">${escHtml(createdAtLabel)}</th>
      <td style="border:1px solid #222;padding:5px 7px;font-size:13px;">${escHtml(createdAt || T('print.none'))}</td>
    </tr>
    <tr>
      <th style="border:1px solid #222;background:#efefef;padding:5px 7px;text-align:left;font-size:13px;">${escHtml(T('print.meta.participants'))}</th>
      <td colspan="3" style="border:1px solid #222;padding:5px 7px;font-size:13px;">${escHtml(participantsLine || T('print.none'))}</td>
    </tr>
  </table>

  <div style="margin-top:12px;border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:800;text-transform:uppercase;">1. ${escHtml(T('print.sections.summary'))}</div>
  <div style="border:1px solid #222;border-top:none;padding:9px 10px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;">
    ${summaryBullets}
    ${highlightsBlock}
  </div>

  <div style="margin-top:12px;border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:800;text-transform:uppercase;">2. ${escHtml(T('print.sections.contrib'))}</div>
  ${renderThreadsEmailHTML(state)}

  <div style="margin-top:12px;border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:800;text-transform:uppercase;">3. ${escHtml(T('print.sections.keypoints'))}</div>
  ${keypointsBlock}

  <div style="margin-top:12px;border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:800;text-transform:uppercase;">4. ${escHtml(T('print.sections.tasks'))}</div>
  ${renderTasksEmailHTML(state)}

  <div style="margin-top:12px;border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:800;text-transform:uppercase;">5. ${escHtml(T('print.sections.observations'))}</div>
  ${observationsBlock}

  <div style="margin-top:12px;border:1px solid #222;background:#efefef;padding:4px 6px;text-align:center;font-weight:800;text-transform:uppercase;">6. ${escHtml(T('print.sections.participants'))}</div>
  ${renderParticipantsEmailHTML(state, cfg)}

  <div style="margin-top:10px;border-top:1px solid #222;padding-top:6px;font-size:12px;color:#333;">
    ${escHtml(footerText)}
  </div>
</div>
    `.trim();
  }

  // =========================
  // Clipboard
  // =========================
  function legacyCopyText(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = String(text || '');
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch {
      return false;
    }
  }

  async function copyToClipboard(html, text) {
    const plain = String(text || '').trim();

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new window.ClipboardItem({
          'text/html': new Blob([String(html || '')], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
        return true;
      }
    } catch {
      /* ignore */
    }

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(plain);
        return true;
      }
    } catch {
      /* ignore */
    }

    return legacyCopyText(plain);
  }

  // =========================
  // Wait images
  // =========================
  async function waitForImages(container, timeoutMs) {
    const host = container || document;
    const imgs = Array.from(host.querySelectorAll('img'));
    if (!imgs.length) return;

    const timeout = Math.max(300, parseInt(String(timeoutMs || 1600), 10) || 1600);

    const promises = imgs.map((img) => {
      try {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      } catch { /* ignore */ }

      return new Promise((resolve) => {
        const done = () => {
          try { img.removeEventListener('load', done); } catch { /* ignore */ }
          try { img.removeEventListener('error', done); } catch { /* ignore */ }
          resolve();
        };

        try { img.addEventListener('load', done, { once: true }); } catch { /* ignore */ }
        try { img.addEventListener('error', done, { once: true }); } catch { /* ignore */ }
        setTimeout(done, timeout);
      });
    });

    await Promise.race([
      Promise.all(promises),
      new Promise((resolve) => setTimeout(resolve, timeout))
    ]);
  }


  function shouldUseIsolatedPrintTarget() {
    try {
      const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      const standalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      const ua = String((navigator && navigator.userAgent) || '');
      const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua);
      const smallViewport = Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 980;
      return coarse || standalone || mobileUA || smallViewport;
    } catch {
      return false;
    }
  }

  function buildStandalonePrintDocument(state, cfg, fileTitle) {
    const docLang = currentLangAttr();
    const docDir = currentDir();
    const title = sanitizeFilename(fileTitle || T('print.untitled'));
    const content = buildFormalPrintHTML(state, cfg);

    return `<!doctype html>
<html lang="${escHtml(docLang)}" dir="${escHtml(docDir)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1, viewport-fit=cover" />
  <title>${escHtml(title)}</title>
</head>
<body class="print-mode">
  <section id="printArea" aria-hidden="false">${content}</section>
</body>
</html>`;
  }

  function openPrintPopupShell() {
    try {
      const win = window.open('', '_blank');
      if (!win) return null;
      win.document.open();
      win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Preparing print document</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:16px;background:#fff;color:#111;">Preparing document…</body></html>');
      win.document.close();
      return win;
    } catch {
      return null;
    }
  }

  async function waitForDocumentReady(doc, timeoutMs) {
    const targetDoc = doc || document;
    const timeout = Math.max(300, parseInt(String(timeoutMs || 2000), 10) || 2000);

    if (targetDoc.readyState === 'interactive' || targetDoc.readyState === 'complete') return;

    await new Promise((resolve) => {
      let timer = null;

      const done = () => {
        if (timer) clearTimeout(timer);
        try { targetDoc.removeEventListener('readystatechange', onChange); } catch { /* ignore */ }
        resolve();
      };

      const onChange = () => {
        if (targetDoc.readyState === 'interactive' || targetDoc.readyState === 'complete') done();
      };

      timer = setTimeout(done, timeout);
      try { targetDoc.addEventListener('readystatechange', onChange); } catch { setTimeout(done, timeout); }
    });
  }

  async function printUsingPopup(printWin, docHtml) {
    if (!printWin) return false;

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try { printWin.close(); } catch { /* ignore */ }
    };

    try {
      printWin.document.open();
      printWin.document.write(docHtml);
      printWin.document.close();

      await waitForDocumentReady(printWin.document, 2600);
      await waitForImages(printWin.document, 2400);

      try { printWin.addEventListener('afterprint', cleanup, { once: true }); } catch { /* ignore */ }
      setTimeout(cleanup, 60000);

      setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch {
          cleanup();
        }
      }, 120);

      return true;
    } catch (err) {
      cleanup();
      throw err;
    }
  }

  async function printUsingIframe(docHtml) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try { iframe.remove(); } catch { /* ignore */ }
    };

    try {
      const frameWindow = iframe.contentWindow;
      const frameDoc = frameWindow ? frameWindow.document : iframe.contentDocument;
      if (!frameDoc) throw new Error('Print iframe unavailable');

      frameDoc.open();
      frameDoc.write(docHtml);
      frameDoc.close();

      await waitForDocumentReady(frameDoc, 2600);
      await waitForImages(frameDoc, 2400);

      try { if (frameWindow) frameWindow.addEventListener('afterprint', cleanup, { once: true }); } catch { /* ignore */ }
      setTimeout(cleanup, 60000);

      setTimeout(() => {
        try {
          if (frameWindow) {
            frameWindow.focus();
            frameWindow.print();
          } else {
            cleanup();
          }
        } catch {
          cleanup();
        }
      }, 120);

      return true;
    } catch (err) {
      cleanup();
      throw err;
    }
  }

  // =========================
  // Export PDF
  // =========================
  async function exportPDFPro() {
    const state = loadState();
    const cfg = loadExportCfg();

    if (!isStructureReady(state)) {
      showToast(T('alerts.needGenerateFirst'));
      return;
    }

    const printArea = $id('printArea');
    if (!printArea) {
      showToast(T('alerts.printAreaMissing'));
      return;
    }

    showToast(T('toasts.exportPreparing'));

    const oldTitle = document.title;
    const meetingTitle = (state.meeting && state.meeting.title) ? String(state.meeting.title) : '';
    const safeMeeting = meetingTitle.trim() ? meetingTitle.trim() : T('print.untitled');
    const date = (state.meeting && state.meeting.date) ? fmtDate(state.meeting.date) : '';
    const fileTitle = sanitizeFilename(`${safeMeeting}${date ? ' · ' + date : ''}`);
    const useIsolatedTarget = shouldUseIsolatedPrintTarget();
    const popupShell = useIsolatedTarget ? openPrintPopupShell() : null;

    try { document.title = fileTitle; } catch { /* ignore */ }

    if (useIsolatedTarget) {
      const standaloneDoc = buildStandalonePrintDocument(state, cfg, fileTitle);

      try {
        if (popupShell) {
          await printUsingPopup(popupShell, standaloneDoc);
          try { document.title = oldTitle; } catch { /* ignore */ }
          return;
        }
      } catch (err) {
        console.error('[ReKPiTu][export][popup]', err);
      }

      try {
        await printUsingIframe(standaloneDoc);
        try { document.title = oldTitle; } catch { /* ignore */ }
        return;
      } catch (err) {
        console.error('[ReKPiTu][export][iframe]', err);
      }
    }

    printArea.innerHTML = buildFormalPrintHTML(state, cfg);
    printArea.hidden = false;
    printArea.setAttribute('aria-hidden', 'false');

    document.body.classList.add('print-mode');

    await waitForImages(printArea, 1800);

    let restored = false;
    const mql = (typeof window.matchMedia === 'function') ? window.matchMedia('print') : null;

    const restore = () => {
      if (restored) return;
      restored = true;

      document.body.classList.remove('print-mode');
      printArea.hidden = true;
      printArea.setAttribute('aria-hidden', 'true');
      printArea.innerHTML = '';

      try { document.title = oldTitle; } catch { /* ignore */ }

      window.removeEventListener('afterprint', restore);

      if (mql) {
        try {
          if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onMqlChange);
          else if (typeof mql.removeListener === 'function') mql.removeListener(onMqlChange);
        } catch { /* ignore */ }
      }
    };

    const onMqlChange = (e) => {
      if (e && e.matches === false) restore();
    };

    window.addEventListener('afterprint', restore);

    if (mql) {
      try {
        if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onMqlChange);
        else if (typeof mql.addListener === 'function') mql.addListener(onMqlChange);
      } catch { /* ignore */ }
    }

    setTimeout(() => {
      try { window.print(); } catch { restore(); }
    }, 60);
  }

  // =========================
  // Copy for Gmail
  // =========================
  async function copyExportForGmail() {
    const state = loadState();
    const cfg = loadExportCfg();

    if (!isStructureReady(state)) {
      showToast(T('alerts.needGenerateFirst'));
      return;
    }

    showToast(T('toasts.copyPreparing'));

    const html = await buildEmailHTML(state, cfg);
    const text = buildEmailText(state, cfg);

    const ok = await copyToClipboard(html, text);

    if (ok) showToast(T('toasts.exportCopied'));
    else showToast(T('alerts.copyNotSupported'));
  }

  // =========================
  // UI injection
  // =========================
  let _logoFileInput = null;

  function getHiddenLogoFileInput() {
    if (_logoFileInput) return _logoFileInput;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.id = 'exportHeaderLogoFileInput';

    document.body.appendChild(input);
    _logoFileInput = input;
    return input;
  }

  function setLogoStatus(cfg) {
    const el = $id('exportLogoStatus');
    if (!el) return;

    const custom = getHeaderLogo(cfg);
    el.textContent = custom ? T('export.logoStatusSet') : T('export.logoStatusNone');
  }

  function injectCopyButton() {
    const left = document.querySelector('.command-bar .command-left');
    if (!left) return;
    if ($id('btnCopyExport')) return;

    const btn = document.createElement('button');
    btn.id = 'btnCopyExport';
    btn.className = 'btn ghost small';
    btn.type = 'button';
    btn.setAttribute('data-i18n', 'actions.copy');
    btn.textContent = T('actions.copy');

    const exportBtn = $id('btnExport');
    if (exportBtn && exportBtn.parentElement === left) {
      left.insertBefore(btn, exportBtn.nextSibling);
    } else {
      left.appendChild(btn);
    }
  }

  function injectExportSettingsUI() {
    const card = document.querySelector('#settingsSheet .settings-card');
    if (!card) return;
    if ($id('exportSettingsBlock')) return;

    const wrap = document.createElement('div');
    wrap.id = 'exportSettingsBlock';

    wrap.innerHTML = `
      <div class="hr"></div>

      <div class="settings-row" style="justify-content:flex-start;">
        <strong data-i18n="export.settingsTitle">${escHtml(T('export.settingsTitle'))}</strong>
      </div>

      <div class="meta" data-i18n="export.headerHint" style="margin-top:2px;">
        ${escHtml(T('export.headerHint'))}
      </div>

      <div class="settings-row" style="margin-top:10px;">
        <label for="exportHeaderNameInput" data-i18n="export.headerNameLabel">${escHtml(T('export.headerNameLabel'))}</label>
      </div>

      <div class="settings-row">
        <input
          id="exportHeaderNameInput"
          class="text"
          type="text"
          maxlength="80"
          data-i18n-placeholder="export.headerNamePh"
          placeholder="${escHtml(T('export.headerNamePh'))}"
        />
      </div>

      <div class="settings-row" style="margin-top:10px;">
        <label data-i18n="export.logoLabel">${escHtml(T('export.logoLabel'))}</label>
        <button id="btnPickLogo" class="btn ghost small" type="button" data-i18n="export.logoPick">${escHtml(T('export.logoPick'))}</button>
        <button id="btnResetLogo" class="btn ghost small" type="button" data-i18n="export.logoReset">${escHtml(T('export.logoReset'))}</button>
      </div>

      <div class="meta" id="exportLogoStatus" aria-live="polite" style="margin-top:2px;"></div>

      <div class="settings-row" style="margin-top:10px;">
        <label for="exportFooterInput" data-i18n="export.footerLabel">${escHtml(T('export.footerLabel'))}</label>
      </div>

      <div class="settings-row">
        <input
          id="exportFooterInput"
          class="text"
          type="text"
          maxlength="140"
          data-i18n-placeholder="export.footerPh"
          placeholder="${escHtml(T('export.footerPh'))}"
        />
      </div>

      <div class="meta" id="exportFooterHint" data-i18n="export.footerHint" style="margin-top:4px;">
        ${escHtml(T('export.footerHint'))}
      </div>
    `;

    card.appendChild(wrap);
  }

  function wireExportSettingsUI() {
    const nameEl = $id('exportHeaderNameInput');
    const pickBtn = $id('btnPickLogo');
    const resetBtn = $id('btnResetLogo');
    const footerEl = $id('exportFooterInput');

    if (!nameEl && !pickBtn && !resetBtn && !footerEl) return;

    const cfg = loadExportCfg();

    if (nameEl) nameEl.value = String(cfg.headerName || '');
    if (footerEl) footerEl.value = String(cfg.footerText || '');

    setLogoStatus(cfg);

    const fileInput = getHiddenLogoFileInput();

    nameEl && nameEl.addEventListener('input', () => {
      const next = loadExportCfg();
      next.headerName = String(nameEl.value || '').slice(0, 80);
      saveExportCfg(next);
    });

    nameEl && nameEl.addEventListener('change', () => {
      showToast(T('toasts.exportSettingsSaved'));
    });

    pickBtn && pickBtn.addEventListener('click', () => {
      try { fileInput.value = ''; } catch { /* ignore */ }
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      const f = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      if (!f) return;

      const maxBytes = 900 * 1024;
      if (f.size > maxBytes) {
        showToast(T('alerts.logoTooBig'));
        return;
      }

      const dataUrl = await (async () => {
        try {
          return await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ''));
            r.onerror = () => resolve('');
            r.readAsDataURL(f);
          });
        } catch {
          return '';
        }
      })();

      if (!dataUrl) {
        showToast(T('alerts.logoReadFail'));
        return;
      }

      const next = loadExportCfg();
      next.headerLogoDataUrl = dataUrl;

      saveExportCfg(next);
      setLogoStatus(next);
      showToast(T('toasts.logoUpdated'));
    });

    resetBtn && resetBtn.addEventListener('click', () => {
      const next = loadExportCfg();
      next.headerLogoDataUrl = '';
      saveExportCfg(next);

      setLogoStatus(next);
      showToast(T('toasts.logoReset'));
    });

    footerEl && footerEl.addEventListener('input', () => {
      const next = loadExportCfg();
      next.footerText = String(footerEl.value || '').slice(0, 140);
      saveExportCfg(next);
    });

    footerEl && footerEl.addEventListener('change', () => {
      showToast(T('toasts.exportSettingsSaved'));
    });
  }

  // =========================
  // Interceptors
  // =========================
  function setupExportInterceptor() {
    document.addEventListener('click', (ev) => {
      const target = ev.target;
      const btn = target && target.closest ? target.closest('#btnExport') : null;
      if (!btn) return;

      ev.preventDefault();
      ev.stopImmediatePropagation();
      exportPDFPro();
    }, true);
  }

  function setupCopyButtonHandler() {
    document.addEventListener('click', (ev) => {
      const target = ev.target;
      const btn = target && target.closest ? target.closest('#btnCopyExport') : null;
      if (!btn) return;

      ev.preventDefault();
      copyExportForGmail();
    }, true);
  }

  // =========================
  // Init
  // =========================
  document.addEventListener('DOMContentLoaded', () => {
    injectCopyButton();
    injectExportSettingsUI();

    setupExportInterceptor();
    setupCopyButtonHandler();

    wireExportSettingsUI();

    try {
      if (window.i18n && typeof window.i18n.onChange === 'function') {
        window.i18n.onChange(() => {
          const cfg = loadExportCfg();
          setLogoStatus(cfg);
        });
      }
    } catch { /* ignore */ }
  });

  window.ReKPiTuExport = {
    exportPDF: exportPDFPro,
    copyForGmail: copyExportForGmail
  };
})();