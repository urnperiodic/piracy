/* ============================================================
   PLAYER — builds the stage iframe + Cineby-style overlay chrome.
   NOTE: The actual video runs inside a cross-origin iframe (the
   embed provider). Browser security prevents us from controlling
   its internal playback (play/pause/volume) directly. We provide
   the chrome + the controls we CAN drive: provider switch,
   autoplay/color params, fullscreen, theater, PiP request, and
   mini-player. Controls that can't reach into the iframe are
   clearly tagged.
   ============================================================ */
const Player = (() => {
  let state = {
    id: null, type: 'movie', season: 1, episode: 1,
    provider: Store.settings.defaultProvider, theater: false,
    title: '', miniActive: false,
  };
  let chromeTimer;

  const { el, $, toast } = UI;

  function streamUrl() {
    const prov = PROVIDERS.find(p => p.id === state.provider) || PROVIDERS[0];
    return prov.build({
      type: state.type, id: state.id, s: state.season, e: state.episode,
      opt: { color: Store.settings.accent, autoplay: Store.settings.autoplay }
    });
  }

  /* Build the player stage element */
  function buildStage() {
    const stage = el('div', { class: 'player-stage', id: 'playerStage', tabindex: '0' });

    const loading = el('div', { class: 'player-loading' },
      el('div', { class: 'spinner' }),
      el('span', {}, 'Syncing secure feed…'));

    const iframe = el('iframe', {
      id: 'playerFrame', src: streamUrl(), allowfullscreen: true,
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      referrerpolicy: 'origin', title: 'Streaming player'
    });
    iframe.addEventListener('load', () => loading.classList.add('hide'));

    // Top bar
    const topbar = el('div', { class: 'player-topbar' },
      el('a', { class: 'player-back', href: '#/home' }, el('i', { class: 'fa-solid fa-arrow-left' }), 'Back'),
      el('div', { class: 'player-now', id: 'playerNow' }, state.title),
      el('div', { class: 'pchip-row' },
        el('button', { class: 'pchip', title: 'Picture-in-Picture (P)', onclick: requestPiP }, el('i', { class: 'fa-solid fa-clone' }), 'PiP'),
        el('button', { class: 'pchip', title: 'Theater (W)', onclick: toggleTheater }, el('i', { class: 'fa-solid fa-expand' }), 'Theater'),
        el('button', { class: 'pchip', title: 'Fullscreen (F)', onclick: toggleFullscreen }, el('i', { class: 'fa-solid fa-up-right-and-down-left-from-center' })),
        el('button', { class: 'pchip danger theater-only', title: 'Exit', style: 'display:none', onclick: () => setTheater(false) }, el('i', { class: 'fa-solid fa-xmark' }))
      )
    );

    // Skip intro (only if timestamps exist — generally not from TMDB)
    const skip = el('button', { class: 'skip-intro', id: 'skipIntro', onclick: () => toast('Skip intro requires source timestamps (not provided by this source).', '') }, el('i', { class: 'fa-solid fa-forward' }), 'Skip Intro');

    // Bottom cosmetic controls (functional where reachable)
    const controls = el('div', { class: 'player-controls' },
      el('button', { class: 'pctrl-btn', title: 'Reload feed', onclick: reload }, el('i', { class: 'fa-solid fa-rotate-right' })),
      el('div', { class: 'pctrl-vol' },
        el('i', { class: 'fa-solid fa-volume-high' }),
        el('input', { type: 'range', min: '0', max: '100', value: Store.settings.muted ? '0' : '100', oninput: () => toast('Volume is controlled inside the player frame.', '') })
      ),
      el('div', { class: 'pctrl-spacer' }),
      buildSelect('Speed', ['0.5×','1×','1.25×','1.5×','2×'], () => toast('Speed is set inside the player frame.', '')),
      buildSelect('Quality', ['Auto','480p','720p','1080p','4K'], () => toast('Quality auto-adapts inside the player frame.', '')),
      buildSelect('Subtitles', ['Off','English','Spanish','French'], () => toast('Subtitles are selected inside the player frame.', '')),
      el('button', { class: 'pctrl-btn', title: 'Mini-player', onclick: enterMini }, el('i', { class: 'fa-solid fa-window-minimize' })),
      el('button', { class: 'pctrl-btn', title: 'Fullscreen (F)', onclick: toggleFullscreen }, el('i', { class: 'fa-solid fa-expand' }))
    );

    stage.append(iframe, loading, topbar, skip, controls);

    // Auto-hide chrome on idle
    stage.addEventListener('mousemove', showChrome);
    stage.addEventListener('mouseleave', () => { if (state.theater) hideChromeSoon(); });

    return stage;
  }

  function buildSelect(label, opts, onchange) {
    const sel = el('select', { class: 'pctrl-select', onchange, title: label });
    sel.appendChild(el('option', { disabled: true }, label));
    opts.forEach(o => sel.appendChild(el('option', {}, o)));
    sel.selectedIndex = label === 'Speed' ? 2 : 1;
    return sel;
  }

  function showChrome() {
    const stage = $('#playerStage'); if (!stage) return;
    stage.classList.remove('hide-chrome');
    clearTimeout(chromeTimer);
    if (state.theater) hideChromeSoon();
  }
  function hideChromeSoon() {
    clearTimeout(chromeTimer);
    chromeTimer = setTimeout(() => { $('#playerStage')?.classList.add('hide-chrome'); }, 2600);
  }

  function reload() {
    const f = $('#playerFrame'); if (!f) return;
    $('.player-loading')?.classList.remove('hide');
    f.src = f.src;
  }

  /* Switch provider without rebuilding entire view */
  function setProvider(id) {
    state.provider = id;
    const f = $('#playerFrame');
    if (f) { $('.player-loading')?.classList.remove('hide'); f.src = streamUrl(); }
    UI.$$('.server-chip').forEach(c => c.classList.toggle('active', c.dataset.id === id));
  }

  function setEpisode(s, e) {
    state.season = s; state.episode = e;
    const f = $('#playerFrame');
    if (f) { $('.player-loading')?.classList.remove('hide'); f.src = streamUrl(); }
    const now = $('#playerNow');
    if (now) now.textContent = `${state.title} · S${s} E${e}`;
    Store.recordHistory({ id: state.id, type: 'tv', title: state.title, poster: state._poster, season: s, episode: e, year: state._year });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* Theater mode */
  function toggleTheater() { setTheater(!state.theater); }
  function setTheater(on) {
    state.theater = on;
    const stage = $('#playerStage'); if (!stage) return;
    stage.classList.toggle('theater', on);
    document.body.style.overflow = on ? 'hidden' : '';
    stage.querySelector('.theater-only').style.display = on ? 'inline-flex' : 'none';
    if (on) hideChromeSoon(); else { clearTimeout(chromeTimer); stage.classList.remove('hide-chrome'); }
  }

  /* Native fullscreen on the stage */
  function toggleFullscreen() {
    const stage = $('#playerStage'); if (!stage) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) {
      (stage.requestFullscreen || stage.webkitRequestFullscreen)?.call(stage);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  }

  /* Picture-in-Picture: only works if provider exposes a same-origin <video>.
     Cross-origin iframes block this; we attempt & inform on failure. */
  async function requestPiP() {
    try {
      const f = $('#playerFrame');
      const v = f?.contentDocument?.querySelector('video');
      if (v && v.requestPictureInPicture) { await v.requestPictureInPicture(); return; }
      throw new Error('cross-origin');
    } catch {
      toast('PiP is blocked by the cross-origin player. Use the PiP button inside the video instead.', 'err');
    }
  }

  /* Mini-player: clones current stream into the floating mount */
  function enterMini() {
    const mini = $('#miniPlayer');
    mini.innerHTML = '';
    const bar = el('div', { class: 'mini-bar' },
      el('button', { title: 'Back to player', onclick: () => { exitMini(); location.hash = `#/watch/${state.type}/${state.id}`; } }, el('i', { class: 'fa-solid fa-up-right-from-square' })),
      el('button', { title: 'Close', onclick: exitMini }, el('i', { class: 'fa-solid fa-xmark' }))
    );
    const f = el('iframe', { src: streamUrl(), allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: true });
    mini.append(bar, f);
    mini.classList.add('show');
    state.miniActive = true;
    toast('Mini-player active. Browse freely while it plays.', 'ok');
  }
  function exitMini() {
    const mini = $('#miniPlayer');
    mini.classList.remove('show');
    setTimeout(() => { mini.innerHTML = ''; }, 400);
    state.miniActive = false;
  }

  /* Keyboard shortcuts */
  function handleKeys(e) {
    if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
    if (!$('#playerStage')) return;
    const k = e.key.toLowerCase();
    if (k === 'w') { e.preventDefault(); toggleTheater(); }
    else if (k === 'f') { e.preventDefault(); toggleFullscreen(); }
    else if (k === 'p') { e.preventDefault(); requestPiP(); }
    else if (k === 'escape') setTheater(false);
    else {
      const n = parseInt(k);
      if (n >= 1 && n <= PROVIDERS.length) { e.preventDefault(); setProvider(PROVIDERS[n-1].id); }
    }
  }
  document.addEventListener('keydown', handleKeys);

  function init(opts) {
    Object.assign(state, opts);
    state.provider = Store.settings.defaultProvider;
    state.theater = false;
    return buildStage();
  }

  return { init, setProvider, setEpisode, get state(){ return state; }, exitMini, reload };
})();
