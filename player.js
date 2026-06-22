/* ============================================================
   APP — router, search, settings panel, stealth mode, mode toggle
   ============================================================ */
(() => {
  const { $, $$, el, toast, applyAppearance, debounce } = UI;

  /* ---------- ROUTER ---------- */
  function setActiveNav(key) {
    $$('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.nav === key));
    $$('.mobile-drawer a').forEach(n => n.classList.toggle('active', n.dataset.nav === key));
  }

  function route() {
    Player.exitMini();
    const hash = location.hash.replace(/^#\/?/, '') || 'home';
    const parts = hash.split('/');

    // close mobile drawer
    $('#mobileDrawer').classList.remove('open');

    if (parts[0] === 'watch') {
      const [, type, id, season, episode] = parts;
      setActiveNav(null);
      Views.watch({ type, id, season, episode });
    } else if (parts[0] === 'movie') { setActiveNav('movie'); Views.browse({ type:'movie' }); }
    else if (parts[0] === 'tv') { setActiveNav('tv'); Views.browse({ type:'tv' }); }
    else if (parts[0] === 'trending') { setActiveNav('trending'); Views.browse({ trending:true }); }
    else if (parts[0] === 'search') { setActiveNav(null); Views.browse({ query: decodeURIComponent(parts[1]||'') }); }
    else { setActiveNav('home'); Views.home(); }

    $('#app').focus({ preventScroll: true });
    if (!Store.settings.reduceMotion) window.scrollTo({ top: 0, behavior: 'auto' });
  }
  window.addEventListener('hashchange', route);

  /* ---------- SEARCH ---------- */
  const searchInput = $('#searchInput');
  const dropdown = $('#searchDropdown');
  let activeIdx = -1, sugItems = [];

  const doSuggest = debounce(async (q) => {
    if (!q || q.length < 2) { dropdown.classList.remove('open'); return; }
    try {
      const data = await TMDB.search(q, 1);
      sugItems = (data.results||[]).filter(x => (x.media_type==='movie'||x.media_type==='tv') && x.poster_path).slice(0,7);
      renderSuggestions(q);
    } catch {}
  }, 220);

  function renderSuggestions(q) {
    dropdown.replaceChildren();
    if (!sugItems.length) { dropdown.classList.remove('open'); return; }
    sugItems.forEach((it,i) => {
      const item = el('div', { class:'sd-item', dataset:{ i } },
        it.poster_path ? UI.lazyImg(TMDB.img(it.poster_path,'w92'), '') : el('div',{style:'width:38px;height:56px;background:var(--bg-elev-2);border-radius:6px'}),
        el('div', { class:'sd-meta' },
          el('div', { class:'sd-title' }, it.title || it.name),
          el('div', { class:'sd-sub' }, `${it.media_type==='tv'?'TV':'Movie'} · ${(it.release_date||it.first_air_date||'').slice(0,4)||'—'}`)));
      item.addEventListener('click', () => { go(it); });
      dropdown.appendChild(item);
    });
    dropdown.appendChild(el('div', { class:'sd-item', style:'justify-content:center;color:var(--accent);font-weight:700;font-size:.78rem', onclick:()=>submitSearch(q) }, `See all results for “${q}”`));
    dropdown.classList.add('open');
    activeIdx = -1;
  }

  function go(it) {
    dropdown.classList.remove('open'); searchInput.value = '';
    location.hash = `#/watch/${it.media_type}/${it.id}`;
  }
  function submitSearch(q) {
    dropdown.classList.remove('open');
    if (q.trim()) location.hash = `#/search/${encodeURIComponent(q.trim())}`;
  }

  searchInput.addEventListener('input', e => doSuggest(e.target.value));
  searchInput.addEventListener('keydown', e => {
    const items = $$('.sd-item', dropdown);
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx+1, items.length-1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx-1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx>=0 && sugItems[activeIdx]) go(sugItems[activeIdx]); else submitSearch(searchInput.value); return; }
    else if (e.key === 'Escape') { dropdown.classList.remove('open'); }
    items.forEach((it,i)=>it.classList.toggle('active', i===activeIdx));
  });
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); submitSearch(searchInput.value); });
  document.addEventListener('click', e => { if (!$('#searchForm').contains(e.target)) dropdown.classList.remove('open'); });

  /* ---------- MODE TOGGLE (quick light/dark) ---------- */
  $('#modeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-mode');
    const next = cur === 'light' ? 'dark' : 'light';
    Store.setSetting('mode', next);
    applyAppearance();
    syncSettingsUI();
  });

  /* ---------- SETTINGS PANEL ---------- */
  const settingsOverlay = $('#settingsOverlay');
  function openSettings() { buildSettingsUI(); settingsOverlay.classList.add('open'); settingsOverlay.setAttribute('aria-hidden','false'); }
  function closeSettings() { settingsOverlay.classList.remove('open'); settingsOverlay.setAttribute('aria-hidden','true'); }
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#settingsClose').addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) closeSettings(); });

  function buildSettingsUI() {
    // themes
    const grid = $('#themeGrid'); grid.replaceChildren();
    Store.THEMES.forEach(t => {
      const card = el('div', { class:'theme-card'+(Store.settings.theme===t.id?' active':'') },
        el('div', { class:'theme-swatch' }, ...t.colors.map(c=>el('span',{style:`background:${c}`}))),
        el('div', { class:'theme-name' }, t.name));
      card.addEventListener('click', () => {
        Store.setSetting('theme', t.id);
        // adopt theme's signature accent
        const map = { modern:'e50914', netflix:'e50914', disney:'00b4ff', glass:'9146ff' };
        Store.setSetting('accent', map[t.id] || Store.settings.accent);
        applyAppearance(); buildSettingsUI();
      });
      grid.appendChild(card);
    });

    // swatches
    const sw = $('#swatches'); sw.replaceChildren();
    Store.SWATCHES.forEach(c => {
      const b = el('button', { class:'swatch'+(Store.settings.accent===c?' active':''), style:`background:#${c}`, 'aria-label':'Accent '+c });
      b.addEventListener('click', () => { Store.setSetting('accent', c); applyAppearance(); buildSettingsUI(); });
      sw.appendChild(b);
    });

    // mode segmented
    $$('#modeControl button').forEach(b => b.classList.toggle('active', b.dataset.mode === Store.settings.mode));

    // providers
    const provSel = $('#defaultProvider'); provSel.replaceChildren();
    PROVIDERS.forEach(p => provSel.appendChild(el('option', { value:p.id, selected:Store.settings.defaultProvider===p.id }, `${p.name} — ${p.badge}`)));

    // toggles + fields
    $('#optAutoplay').checked = Store.settings.autoplay;
    $('#optReduceMotion').checked = Store.settings.reduceMotion;
    $('#optAutoNext').checked = Store.settings.autoNext;
    $('#stealthTitle').value = Store.settings.stealthTitle;
    $('#stealthFavicon').value = Store.settings.stealthFavicon;
    $('#stealthClose').checked = Store.settings.stealthClose;
    $('#tmdbKey').value = localStorage.getItem('sv_tmdb_key') || '';
  }
  function syncSettingsUI() { if (settingsOverlay.classList.contains('open')) buildSettingsUI(); }

  $$('#modeControl button').forEach(b => b.addEventListener('click', () => {
    Store.setSetting('mode', b.dataset.mode); applyAppearance(); buildSettingsUI();
  }));
  $('#defaultProvider').addEventListener('change', e => Store.setSetting('defaultProvider', e.target.value));
  $('#optAutoplay').addEventListener('change', e => Store.setSetting('autoplay', e.target.checked));
  $('#optReduceMotion').addEventListener('change', e => { Store.setSetting('reduceMotion', e.target.checked); applyAppearance(); });
  $('#optAutoNext').addEventListener('change', e => Store.setSetting('autoNext', e.target.checked));
  $('#stealthTitle').addEventListener('input', e => Store.setSetting('stealthTitle', e.target.value));
  $('#stealthFavicon').addEventListener('input', e => Store.setSetting('stealthFavicon', e.target.value));
  $('#stealthClose').addEventListener('change', e => Store.setSetting('stealthClose', e.target.checked));
  $('#tmdbKey').addEventListener('input', e => {
    const v = e.target.value.trim();
    if (v) localStorage.setItem('sv_tmdb_key', v); else localStorage.removeItem('sv_tmdb_key');
  });
  $('#clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Clear all watch history?')) { Store.clearHistory(); toast('History cleared', 'ok'); if (!location.hash || location.hash.includes('home')) route(); }
  });

  /* ---------- DOWNLOAD MODAL ---------- */
  $('#downloadClose').addEventListener('click', Downloads.close);
  $('#downloadOverlay').addEventListener('click', e => { if (e.target === $('#downloadOverlay')) Downloads.close(); });

  /* ---------- STEALTH / about:blank ---------- */
  function openStealth() {
    const title = Store.settings.stealthTitle || 'about:blank';
    const favicon = Store.settings.stealthFavicon;
    const win = window.open('about:blank', '_blank');
    if (!win) { toast('Popup blocked. Allow popups to use stealth mode.', 'err'); return; }
    const url = location.href;
    win.document.write(`<!DOCTYPE html><html><head><title>${title.replace(/</g,'')}</title>` +
      (favicon ? `<link rel="icon" href="${favicon.replace(/"/g,'')}">` : '') +
      `<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%}</style></head>` +
      `<body><iframe src="${url}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`);
    win.document.close();
    toast('Opened in about:blank tab.', 'ok');
    if (Store.settings.stealthClose) setTimeout(() => { window.location.replace('https://www.google.com'); }, 500);
  }
  $('#stealthBtn').addEventListener('click', openStealth);
  $('#stealthBtnMobile')?.addEventListener('click', openStealth);

  /* ---------- MOBILE MENU ---------- */
  $('#mobileMenuBtn').addEventListener('click', () => $('#mobileDrawer').classList.toggle('open'));

  /* ---------- HEADER hide on scroll down (perf-friendly via rAF) ---------- */
  let lastY = 0, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const header = $('#appHeader');
      if (y > 120 && y > lastY) header.classList.add('hide'); else header.classList.remove('hide');
      lastY = y; ticking = false;
    });
  }, { passive: true });

  /* ---------- React to OS mode changes when in system mode ---------- */
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (Store.settings.mode === 'system') applyAppearance();
  });

  /* ---------- INIT ---------- */
  // detect OS preference on first visit if no explicit choice stored
  if (!localStorage.getItem('sv_settings')) {
    Store.setSetting('mode', 'system');
  }
  applyAppearance();
  route();
})();
