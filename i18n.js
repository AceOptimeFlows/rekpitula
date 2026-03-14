(function () {
  const state = {
    supported: ['es'],
    fallback: 'es',
    langPath: 'lang',
    lang: 'es',
    dict: {},
    listeners: []
  };

  function safeLower(s) {
    return String(s || '').trim().toLowerCase().replace(/_/g, '-');
  }

  function normalizeLang(raw) {
    const s = safeLower(raw);
    if (!s) return null;

    if (state.supported.indexOf(s) >= 0) return s;

    const primary = s.split('-')[0];
    if (state.supported.indexOf(primary) >= 0) return primary;

    if (primary === 'pt' && state.supported.indexOf('pt-br') >= 0) return 'pt-br';
    if (primary === 'zh' && state.supported.indexOf('zh') >= 0) return 'zh';

    return null;
  }

  function getByPath(obj, path) {
    const parts = String(path || '').split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        return undefined;
      }
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (_, key) {
      const v = vars[key];
      if (v === undefined || v === null) return '';
      return String(v);
    });
  }

  function t(key, vars) {
    const v = getByPath(state.dict, key);
    if (typeof v === 'string') return interpolate(v, vars);
    return '';
  }

  function apply(root) {
    const scope = root || document;

    const nodes = scope.querySelectorAll(
      '[data-i18n],' +
      '[data-i18n-html],' +
      '[data-i18n-alt],' +
      '[data-i18n-aria-label],' +
      '[data-i18n-title],' +
      '[data-i18n-placeholder]'
    );

    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];

      const kText = el.getAttribute('data-i18n');
      if (kText) {
        const val = t(kText);
        if (val) el.textContent = val;
      }

      const kHtml = el.getAttribute('data-i18n-html');
      if (kHtml) {
        const val = t(kHtml);
        if (val) el.innerHTML = val;
      }

      const kAlt = el.getAttribute('data-i18n-alt');
      if (kAlt) {
        const val = t(kAlt);
        if (val) el.setAttribute('alt', val);
      }

      const kAria = el.getAttribute('data-i18n-aria-label');
      if (kAria) {
        const val = t(kAria);
        if (val) el.setAttribute('aria-label', val);
      }

      const kTitle = el.getAttribute('data-i18n-title');
      if (kTitle) {
        const val = t(kTitle);
        if (val) el.setAttribute('title', val);
      }

      const kPh = el.getAttribute('data-i18n-placeholder');
      if (kPh) {
        const val = t(kPh);
        if (val) el.setAttribute('placeholder', val);
      }
    }
  }

  async function loadLangDict(lang) {
    const n = normalizeLang(lang) || state.fallback;
    const url = state.langPath.replace(/\/$/, '') + '/' + n + '.json';

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('i18n: cannot load ' + url);
    }
    return await res.json();
  }

  async function changeLanguage(lang) {
    const n = normalizeLang(lang) || state.fallback;

    let dict = null;
    try {
      dict = await loadLangDict(n);
    } catch (e) {
      if (n !== state.fallback) {
        try {
          dict = await loadLangDict(state.fallback);
        } catch (e2) {
          dict = {};
        }
      } else {
        dict = {};
      }
    }

    state.lang = n;
    state.dict = dict || {};

    apply(document);

    for (let i = 0; i < state.listeners.length; i++) {
      try { state.listeners[i](state.lang); } catch (_) { /* ignore */ }
    }

    return state.lang;
  }

  function onChange(fn) {
    if (typeof fn === 'function') state.listeners.push(fn);
  }

  function init(cfg) {
    state.supported = (cfg && Array.isArray(cfg.supported)) ? cfg.supported : state.supported;
    state.fallback = (cfg && cfg.fallback) ? cfg.fallback : state.fallback;
    state.langPath = (cfg && cfg.langPath) ? cfg.langPath : state.langPath;
  }

  window.i18n = {
    init,
    changeLanguage,
    onChange,
    t,
    apply,
    normalizeLang,
    get lang() { return state.lang; }
  };
})();
