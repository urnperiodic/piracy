/* ============================================================
   VIEWS — render Home, Browse, Watch
   ============================================================ */
const Views = (() => {
  const { el, $, $$, esc, lazyImg, observeReveals, toast } = UI;
  const app = () => $('#app');

  /* ---------- shared poster card ---------- */
  function posterCard(item, i = 0, extras = {}) {
    const type = extras.type || item.media_type || (item.first_air_date || item.type === 'tv' ? 'tv' : 'movie');
    const id = item.id;
    const title = item.title || item.name;
    const poster = item.poster_path || item.poster;
    const year = (item.release_date || item.first_air_date || item.year || '').toString().slice(0,4);
    const rate = item.vote_average;

    const wrap = el('div', { class: 'poster-wrap' },
      poster ? lazyImg(TMDB.img(poster, 'w342'), title, 'poster-img')
             : el('div', { class: 'poster-img', style:'display:grid;place-items:center;color:var(--text-faint)' }, el('i', { class:'fa-solid fa-film' })),
      el('span', { class: 'badge-type' }, type === 'tv' ? 'TV' : 'Movie'),
      rate ? el('span', { class: 'badge-rate' }, el('i', { class:'fa-solid fa-star' }), rate.toFixed(1)) : null,
      el('div', { class: 'poster-overlay' }, el('div', { class:'poster-play' }, el('i', { class:'fa-solid fa-play' }))),
      extras.episodeLabel ? el('div', { class:'poster-ep' }, extras.episodeLabel) : null,
      extras.removable ? el('button', { class:'card-remove', title:'Remove', onclick:(e)=>{ e.stopPropagation(); extras.onRemove?.(); } }, el('i', { class:'fa-solid fa-xmark' })) : null
    );

    const card = el('div', { class: 'poster-card reveal', style: `--i:${i}` },
      wrap,
      el('div', { class: 'poster-cap' },
        el('div', { class: 'poster-name' }, title || 'Untitled'),
        el('div', { class: 'poster-year' }, year || '—')));

    card.addEventListener('click', () => {
      if (extras.season) location.hash = `#/watch/${type}/${id}/${extras.season}/${extras.episode || 1}`;
      else location.hash = `#/watch/${type}/${id}`;
    });
    return card;
  }

  function rowScroller(items, type) {
    const sc = el('div', { class: 'row-scroller no-scrollbar' });
    items.forEach((it, i) => sc.appendChild(posterCard(it, i, { type })));
    return sc;
  }

  function skelRow() {
    const sc = el('div', { class: 'row-scroller no-scrollbar' });
    for (let i=0;i<8;i++){ const c=el('div',{class:'poster-card'}); c.appendChild(UI.skelCard()); sc.appendChild(c); }
    return sc;
  }

  /* ---------- HOME ---------- */
  async function home() {
    const view = el('div', { class: 'view' });
    const heroMount = el('section', { class: 'hero' }, el('div', { class:'hero-bg skeleton' }));
    const rows = el('div', {});
    view.append(heroMount, rows);
    app().replaceChildren(view);

    // Continue watching + bookmarks
    if (Store.history.length) rows.appendChild(historyRow());
    if (Store.bookmarks.length) rows.appendChild(bookmarkRow());

    // Hero
    try {
      const t = await TMDB.trending();
      const list = (t.results || []).filter(x => x.backdrop_path && (x.title || x.name));
      if (list.length) renderHero(heroMount, list[Math.floor(Math.random()*Math.min(6,list.length))]);
    } catch { heroMount.remove(); }

    // Rows (lazy, parallel)
    const defs = [
      ['Trending This Week', () => TMDB.trending(), null],
      ['Popular Movies', () => TMDB.moviePopular(), 'movie'],
      ['Popular TV Shows', () => TMDB.tvPopular(), 'tv'],
      ['Now Playing', () => TMDB.nowPlaying(), 'movie'],
      ['Top Rated', () => TMDB.topRated(), 'movie'],
      ['Action & Adventure', () => TMDB.discover('movie',{with_genres:28}), 'movie'],
      ['Comedies', () => TMDB.discover('movie',{with_genres:35}), 'movie'],
      ['Horror', () => TMDB.discover('movie',{with_genres:27}), 'movie'],
      ['Sci-Fi', () => TMDB.discover('movie',{with_genres:878}), 'movie'],
    ];
    defs.forEach(([title, fetcher, type], idx) => {
      const row = el('section', { class: 'row reveal', style:`--i:${idx}` },
        el('div', { class:'row-head' }, el('h2', { class:'row-title' }, title)),
        skelRow());
      rows.appendChild(row);
      fetcher().then(data => {
        const items = (data.results || []).filter(x => x.poster_path);
        row.replaceChildren(el('div', { class:'row-head' }, el('h2', { class:'row-title' }, title)), rowScroller(items, type));
        observeReveals(row);
      }).catch(() => row.remove());
    });

    observeReveals(view);
  }

  function renderHero(mount, item) {
    const type = item.media_type || (item.first_air_date ? 'tv':'movie');
    const year = (item.release_date || item.first_air_date || '').slice(0,4);
    mount.replaceChildren(
      el('div', { class:'hero-bg', style:`background-image:url(${TMDB.img(item.backdrop_path,'original')})` }),
      el('div', { class:'hero-content' },
        el('span', { class:'hero-badge' }, el('i', { class:'fa-solid fa-fire' }), 'Trending Spotlight'),
        el('h1', { class:'hero-title' }, item.title || item.name),
        el('div', { class:'hero-meta' },
          el('span', { class:'star' }, el('i', { class:'fa-solid fa-star' }), ' ' + (item.vote_average||0).toFixed(1)),
          el('span', {}, year || '—'),
          el('span', { class:'pill' }, type==='tv'?'TV Show':'Movie')),
        el('p', { class:'hero-overview' }, item.overview || ''),
        el('div', { class:'hero-actions' },
          el('a', { class:'btn btn-primary', href:`#/watch/${type}/${item.id}` }, el('i', { class:'fa-solid fa-play' }), 'Watch Now'),
          el('a', { class:'btn btn-ghost', href:`#/watch/${type}/${item.id}` }, el('i', { class:'fa-solid fa-circle-info' }), 'Details')))
    );
    // subtle parallax
    if (!Store.settings.reduceMotion) {
      const bg = mount.querySelector('.hero-bg');
      const onScroll = () => { const y = mount.getBoundingClientRect().top; bg.style.transform = `scale(1.06) translateY(${y*-0.04}px)`; };
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  function historyRow() {
    const sc = el('div', { class:'row-scroller no-scrollbar' });
    Store.history.forEach((it,i) => sc.appendChild(posterCard(it, i, {
      type: it.type, season: it.type==='tv'?it.season:undefined, episode: it.episode,
      episodeLabel: it.type==='tv' && it.season ? `S${it.season} · E${it.episode}` : null
    })));
    return el('section', { class:'row reveal' },
      el('div', { class:'row-head' },
        el('h2', { class:'row-title' }, 'Continue Watching'),
        el('button', { class:'row-action', onclick:()=>{ if(confirm('Clear all watch history?')){ Store.clearHistory(); home(); } } }, el('i', { class:'fa-solid fa-trash' }), 'Clear')),
      sc);
  }

  function bookmarkRow() {
    const sc = el('div', { class:'row-scroller no-scrollbar' });
    Store.bookmarks.forEach((it,i) => sc.appendChild(posterCard(it, i, {
      type: it.type, removable: true, onRemove: () => { Store.toggleBookmark(it); home(); }
    })));
    return el('section', { class:'row reveal' },
      el('div', { class:'row-head' }, el('h2', { class:'row-title' }, 'My Watchlist')), sc);
  }

  /* ---------- BROWSE ---------- */
  let browseState = {};
  async function browse({ type='movie', genre='', trending=false, query='' } = {}) {
    browseState = { type, genre, trending, query, page: 1, done: false, items: [] };

    const view = el('div', { class:'view section-pad' });
    const head = el('div', { class:'browse-head' });
    const heading = query ? `Results for “${query}”` : trending ? 'Trending Now' : type==='tv' ? 'TV Shows' : 'Movies';
    head.appendChild(el('div', {}, el('h1', {}, heading),
      el('p', {}, query ? 'Matches from TMDB' : 'Browse and filter the catalog')));

    if (!query && !trending) {
      const seg = el('div', { class:'seg-control' },
        el('button', { class: type==='movie'?'active':'', onclick:()=>nav('movie') }, 'Movies'),
        el('button', { class: type==='tv'?'active':'', onclick:()=>nav('tv') }, 'TV Shows'));
      head.appendChild(seg);
    }
    view.appendChild(head);

    if (!query && !trending) {
      const chips = el('div', { class:'chips' });
      chips.appendChild(el('button', { class:'chip'+(!genre?' active':''), onclick:()=>{ browseState.genre=''; refresh(); } }, 'All Genres'));
      Object.entries(GENRES[type]).forEach(([gid,gn]) =>
        chips.appendChild(el('button', { class:'chip'+(genre==gid?' active':''), onclick:()=>{ browseState.genre=gid; refresh(); } }, gn)));
      view.appendChild(chips);
    }

    const grid = el('div', { class:'grid', id:'browseGrid' });
    view.appendChild(grid);
    const more = el('div', { class:'load-more-wrap' });
    view.appendChild(more);
    app().replaceChildren(view);

    function nav(t) { location.hash = `#/${t}`; }
    function refresh() {
      browseState.page = 1; browseState.done = false; browseState.items = [];
      browse(browseState); // re-render with new genre selection
    }

    // initial skeletons
    for (let i=0;i<14;i++){ const c=el('div',{class:'poster-card'}); c.appendChild(UI.skelCard()); grid.appendChild(c); }

    await loadPage(grid, more);
    observeReveals(view);
  }

  async function loadPage(grid, more) {
    const s = browseState;
    let data;
    try {
      if (s.query) data = await TMDB.search(s.query, s.page);
      else if (s.trending) data = await TMDB.trending();
      else if (s.genre) data = await TMDB.discover(s.type, { with_genres:s.genre, sort_by:'popularity.desc', page:s.page });
      else data = s.type==='tv' ? await TMDB.tvPopular(s.page) : await TMDB.moviePopular(s.page);
    } catch { s.done = true; }

    let items = (data?.results || []).filter(x => x.poster_path);
    if (s.query) items = items.filter(x => x.media_type==='movie'||x.media_type==='tv');

    if (s.page === 1) {
      grid.replaceChildren();
      if (!items.length) {
        grid.parentElement.querySelector('.empty-state')?.remove();
        grid.replaceChildren(el('div', { class:'empty-state', style:'grid-column:1/-1' },
          el('i', { class:'fa-solid fa-clapperboard' }),
          el('h3', {}, 'Nothing found'),
          el('p', {}, 'Try a different search or genre.')));
        more.replaceChildren(); return;
      }
    }
    s.items.push(...items);
    items.forEach((it,i) => grid.appendChild(posterCard(it, i % 14, { type: s.type })));
    observeReveals(grid);

    if (!items.length || s.page >= (data?.total_pages||1)) { s.done = true; more.replaceChildren(); }
    else {
      more.replaceChildren(el('button', { class:'btn btn-ghost', onclick:async(e)=>{
        e.target.disabled = true; e.target.innerHTML = '<span class="spinner sm"></span> Loading…';
        s.page++; await loadPage(grid, more);
      } }, 'Load More'));
    }
  }

  /* ---------- WATCH ---------- */
  let watchData = null;
  let watchType = 'movie';
  let watchId = null;
  let curSeason = 1, curEpisode = 1;

  async function watch({ type, id, season, episode }) {
    watchType = type; watchId = id;
    curSeason = season ? +season : 1;
    curEpisode = episode ? +episode : 1;

    // restore tv session
    if (type === 'tv' && !season) {
      const last = Store.lastSession(id);
      if (last) { curSeason = last.season || 1; curEpisode = last.episode || 1; }
    }

    const view = el('div', { class:'view watch-view' });
    app().replaceChildren(view);

    // Player stage
    const stage = Player.init({ id, type, season: curSeason, episode: curEpisode, title: '…' });
    view.appendChild(stage);

    // Toolbar (servers + actions)
    view.appendChild(buildToolbar());

    // Info section placeholder (skeleton)
    const info = el('section', { class:'info-section', id:'infoSection' },
      el('div', { class:'info-hero' },
        el('div', { class:'skeleton', style:'width:180px;aspect-ratio:2/3;border-radius:var(--radius)' }),
        el('div', { style:'flex:1' },
          el('div', { class:'skeleton skel-line', style:'width:50%;height:28px' }),
          el('div', { class:'skeleton skel-line' }),
          el('div', { class:'skeleton skel-line' }),
          el('div', { class:'skeleton skel-line short' }))));
    view.appendChild(info);

    window.scrollTo({ top: 0 });

    // Fetch details
    try {
      watchData = await TMDB.details(type, id);
    } catch { info.replaceChildren(el('div', { class:'empty-state' }, el('i',{class:'fa-solid fa-triangle-exclamation'}), el('h3',{},'Failed to load details'))); return; }

    // store helpers on player
    Player.state.title = watchData.title || watchData.name;
    Player.state._poster = watchData.poster_path;
    Player.state._year = (watchData.release_date || watchData.first_air_date || '').slice(0,4);
    const nowEl = $('#playerNow');
    if (nowEl) nowEl.textContent = type==='tv' ? `${Player.state.title} · S${curSeason} E${curEpisode}` : Player.state.title;

    // record history
    Store.recordHistory({ id, type, title: Player.state.title, poster: watchData.poster_path,
      season: type==='tv'?curSeason:undefined, episode: type==='tv'?curEpisode:undefined, year: Player.state._year });

    renderInfo(info);
    observeReveals(view);
  }

  function buildToolbar() {
    const slots = el('div', { class:'server-slots' });
    PROVIDERS.forEach((p,i) => {
      const chip = el('button', { class:'server-chip'+(p.id===Player.state.provider?' active':''), dataset:{ id:p.id }, onclick:()=>Player.setProvider(p.id) },
        el('div', {}, el('span', { class:'s-name' }, p.name), el('span', { class:'s-badge' }, p.badge)),
        el('span', { class:'s-key' }, i+1));
      slots.appendChild(chip);
    });

    const saved = Store.isBookmarked(watchId, watchType);
    const bookmarkBtn = el('button', { class:'act-btn'+(saved?' saved':''), onclick:(e)=>{
      const on = Store.toggleBookmark({ id:watchId, type:watchType, title:Player.state.title, poster_path:watchData?.poster_path, vote_average:watchData?.vote_average, year:Player.state._year });
      e.currentTarget.classList.toggle('saved', on);
      e.currentTarget.querySelector('i').className = on?'fa-solid fa-bookmark':'fa-regular fa-bookmark';
      toast(on?'Added to watchlist':'Removed from watchlist', 'ok');
    } }, el('i', { class: saved?'fa-solid fa-bookmark':'fa-regular fa-bookmark' }), 'Save');

    const dlBtn = el('button', { class:'act-btn', onclick:openDownload }, el('i', { class:'fa-solid fa-download' }), 'Download');

    return el('div', { class:'watch-toolbar reveal' },
      el('div', {},
        el('div', { style:'font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-faint);margin-bottom:8px;font-weight:800' }, 'Servers · press 1–4 to switch'),
        slots),
      el('div', { class:'watch-actions' }, bookmarkBtn, dlBtn));
  }

  function openDownload() {
    Downloads.open({
      title: Player.state.title || watchData?.title || watchData?.name,
      type: watchType,
      season: curSeason, episode: curEpisode,
      runtime: watchData?.runtime || (watchData?.episode_run_time?.[0]) || 45,
      fileBase: ((Player.state.title||'video').replace(/[^a-z0-9]+/gi,'-')) + (watchType==='tv'?`-S${curSeason}E${curEpisode}`:'')
    });
  }

  function renderInfo(mount) {
    const d = watchData;
    const year = (d.release_date || d.first_air_date || '').slice(0,4);
    const runtime = d.runtime || d.episode_run_time?.[0];

    const heroBlock = el('div', { class:'info-hero' },
      el('div', { class:'info-poster' }, d.poster_path ? lazyImg(TMDB.img(d.poster_path,'w342'), d.title||d.name) : el('div',{style:'display:grid;place-items:center;height:100%'},el('i',{class:'fa-solid fa-film'}))),
      el('div', { class:'info-main' },
        el('h1', { class:'info-title' }, d.title || d.name),
        d.tagline ? el('p', { class:'info-tagline' }, '“'+d.tagline+'”') : null,
        el('div', { class:'info-meta' },
          el('span', { class:'star' }, el('i',{class:'fa-solid fa-star'}), ' '+(d.vote_average||0).toFixed(1)),
          year ? el('span', {}, year) : null,
          runtime ? el('span', {}, runtime+' min') : null,
          el('span', { class:'pill' }, watchType==='tv'?'TV Series':'Movie'),
          watchType==='tv' ? el('span', { class:'pill' }, `S${curSeason} · E${curEpisode}`) : null),
        d.genres ? el('div', { class:'genre-tags' }, d.genres.map(g => el('span', { class:'genre-tag' }, g.name))) : null,
        el('p', { class:'info-overview' }, d.overview || 'No overview available.')));

    // Tabs
    const tabNames = [];
    if (watchType === 'tv') tabNames.push(['episodes','Episodes']);
    tabNames.push(['cast','Cast & Crew'], ['details','Details'], ['similar','More Like This'], ['trailers','Trailers']);

    const tabs = el('div', { class:'tabs' });
    const panels = el('div', {});
    tabNames.forEach(([key,label], i) => {
      const t = el('button', { class:'tab'+(i===0?' active':''), dataset:{tab:key} }, label);
      t.addEventListener('click', () => {
        tabs.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
        panels.querySelectorAll('.tab-panel').forEach(p=>p.hidden = p.dataset.panel!==key);
      });
      tabs.appendChild(t);
    });

    tabNames.forEach(([key], i) => {
      const panel = el('div', { class:'tab-panel', dataset:{panel:key}, hidden: i!==0 });
      if (key==='episodes') buildEpisodesPanel(panel);
      else if (key==='cast') buildCastPanel(panel);
      else if (key==='details') buildDetailsPanel(panel);
      else if (key==='similar') buildSimilarPanel(panel);
      else if (key==='trailers') buildTrailersPanel(panel);
      panels.appendChild(panel);
    });

    mount.replaceChildren(heroBlock, tabs, panels);
  }

  /* Episodes */
  async function buildEpisodesPanel(panel) {
    const seasons = (watchData.seasons||[]).filter(s=>s.season_number>0);
    const bar = el('div', { class:'season-bar' });
    const sel = el('select', { class:'select', style:'max-width:220px' });
    seasons.forEach(s => sel.appendChild(el('option', { value:s.season_number, selected:s.season_number===curSeason }, s.name||`Season ${s.season_number}`)));
    sel.addEventListener('change', () => { curSeason = +sel.value; loadEps(); });
    bar.append(el('h3', { style:'margin:0;font-size:.9rem;font-weight:800' }, 'Episodes'), sel);
    const list = el('div', { class:'ep-list' });
    panel.append(bar, list);

    async function loadEps() {
      list.replaceChildren(el('div', { style:'grid-column:1/-1;display:grid;place-items:center;padding:2rem' }, el('div',{class:'spinner'})));
      let eps = [];
      try { eps = (await TMDB.season(watchId, curSeason)).episodes || []; } catch {}
      if (!eps.length) { list.replaceChildren(el('p', { style:'color:var(--text-dim)' }, 'No episodes found.')); return; }
      list.replaceChildren();
      eps.forEach(ep => {
        const card = el('div', { class:'ep-card'+(ep.episode_number===curEpisode && curSeason===Player.state.season?' playing':''), dataset:{ep:ep.episode_number} },
          el('div', { class:'ep-thumb' },
            ep.still_path ? lazyImg(TMDB.img(ep.still_path,'w300'),'') : el('div',{style:'display:grid;place-items:center;height:100%;color:var(--text-faint)'},el('i',{class:'fa-solid fa-film'})),
            el('span', { class:'ep-num' }, 'E'+ep.episode_number),
            el('div', { class:'ep-play' }, el('i',{class:'fa-solid fa-play'}))),
          el('div', { class:'ep-info' },
            el('div', { class:'ep-name' }, ep.name || 'Episode '+ep.episode_number),
            el('div', { class:'ep-ov' }, ep.overview || 'No synopsis.')),
          el('button', { class:'icon-btn ep-dl', title:'Download episode', onclick:(e)=>{ e.stopPropagation(); curEpisode=ep.episode_number; openDownload(); } }, el('i',{class:'fa-solid fa-download'})));
        card.addEventListener('click', (e) => {
          if (e.target.closest('.ep-dl')) return;
          curEpisode = ep.episode_number;
          Player.setEpisode(curSeason, ep.episode_number);
          list.querySelectorAll('.ep-card').forEach(c=>c.classList.remove('playing'));
          card.classList.add('playing');
        });
        list.appendChild(card);
      });
    }
    loadEps();
  }

  function buildCastPanel(panel) {
    const cast = watchData.credits?.cast || [];
    const crew = (watchData.credits?.crew || []).filter(c=>['Director','Writer','Producer','Creator','Screenplay'].includes(c.job)).slice(0,6);
    if (cast.length) {
      panel.appendChild(el('h3', { style:'font-size:.74rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin:0 0 12px' }, 'Cast'));
      const grid = el('div', { class:'people-grid' });
      cast.slice(0,18).forEach(p => grid.appendChild(person(p, p.character)));
      panel.appendChild(grid);
    }
    if (crew.length) {
      panel.appendChild(el('h3', { style:'font-size:.74rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin:1.4rem 0 12px' }, 'Crew'));
      const grid = el('div', { class:'people-grid' });
      crew.forEach(p => grid.appendChild(person(p, p.job)));
      panel.appendChild(grid);
    }
    if (!cast.length && !crew.length) panel.appendChild(el('p',{style:'color:var(--text-dim)'},'No cast information.'));
  }
  function person(p, role) {
    return el('div', { class:'person' },
      p.profile_path ? lazyImg(TMDB.img(p.profile_path,'w185'), p.name) : el('div',{class:'ph'},el('i',{class:'fa-solid fa-user'})),
      el('div', { style:'min-width:0' }, el('div', { class:'p-name' }, p.name), el('div', { class:'p-role' }, role||'')));
  }

  function buildDetailsPanel(panel) {
    const d = watchData;
    const items = [];
    const add = (label, val) => { if (val) items.push([label, val]); };
    add('Status', d.status);
    add('Original Language', (d.original_language||'').toUpperCase());
    add('Release Date', d.release_date || d.first_air_date);
    add('Runtime', d.runtime ? d.runtime+' min' : (d.episode_run_time?.[0] ? d.episode_run_time[0]+' min/ep' : null));
    add('Budget', d.budget ? '$'+d.budget.toLocaleString() : null);
    add('Revenue', d.revenue ? '$'+d.revenue.toLocaleString() : null);
    add('Seasons', d.number_of_seasons);
    add('Episodes', d.number_of_episodes);
    add('Rating', (d.vote_average||0).toFixed(1)+' / 10 ('+(d.vote_count||0)+' votes)');
    add('Production', (d.production_companies||[]).map(c=>c.name).slice(0,3).join(', '));
    add('Country', (d.production_countries||[]).map(c=>c.name).join(', '));

    const list = el('div', { class:'detail-list' });
    items.forEach(([l,v]) => list.appendChild(el('div', { class:'detail-item' },
      el('div', { class:'dl-label' }, l), el('div', { class:'dl-val' }, String(v)))));
    panel.appendChild(list);

    // external links
    const ext = d.external_ids || {};
    const links = el('div', { class:'ext-links' });
    if (d.homepage) links.appendChild(el('a', { class:'act-btn', href:d.homepage, target:'_blank', rel:'noopener' }, el('i',{class:'fa-solid fa-globe'}),'Website'));
    if (ext.imdb_id) links.appendChild(el('a', { class:'act-btn', href:`https://www.imdb.com/title/${ext.imdb_id}`, target:'_blank', rel:'noopener' }, el('i',{class:'fa-brands fa-imdb'}),'IMDb'));
    links.appendChild(el('a', { class:'act-btn', href:`https://www.themoviedb.org/${watchType}/${watchId}`, target:'_blank', rel:'noopener' }, el('i',{class:'fa-solid fa-database'}),'TMDB'));
    if (links.children.length) panel.appendChild(el('div', { style:'margin-top:1.2rem' }, links));
  }

  function buildSimilarPanel(panel) {
    const recs = (watchData.recommendations?.results || watchData.similar?.results || []).filter(x=>x.poster_path);
    if (!recs.length) { panel.appendChild(el('p',{style:'color:var(--text-dim)'},'No recommendations.')); return; }
    const grid = el('div', { class:'grid' });
    recs.slice(0,18).forEach((it,i) => grid.appendChild(posterCard(it, i%12, { type: watchType })));
    panel.appendChild(grid);
  }

  function buildTrailersPanel(panel) {
    const vids = (watchData.videos?.results || []).filter(v=>v.site==='YouTube' && (v.type==='Trailer'||v.type==='Teaser'));
    if (!vids.length) { panel.appendChild(el('p',{style:'color:var(--text-dim)'},'No trailers available.')); return; }
    const grid = el('div', { style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px' });
    vids.slice(0,6).forEach(v => {
      grid.appendChild(el('div', {},
        el('div', { style:'aspect-ratio:16/9;border-radius:12px;overflow:hidden;border:1px solid var(--border)' },
          el('iframe', { src:`https://www.youtube.com/embed/${v.key}`, style:'width:100%;height:100%;border:0', allowfullscreen:true, loading:'lazy' })),
        el('div', { style:'font-size:.76rem;font-weight:700;margin-top:8px' }, v.name)));
    });
    panel.appendChild(grid);
  }

  return { home, browse, watch, posterCard };
})();
