/* ============================================================
   STORE — settings, history, bookmarks, persisted via localStorage
   ============================================================ */
const Store = (() => {
  const SWATCHES = ['e50914','ff6b00','f5a623','46d369','00b4d8','4361ee','9146ff','e91e63','00b4ff','ffffff'];
  const THEMES = [
    { id:'modern', name:'Modern', colors:['#0a0a0f','#14141c','#e50914'] },
    { id:'netflix', name:'Netflix', colors:['#0b0b0b','#181818','#e50914'] },
    { id:'disney', name:'Disney+', colors:['#0a0e1a','#121a2e','#00b4ff'] },
    { id:'glass', name:'Glass', colors:['#0c0a16','#2a1f4a','#9146ff'] },
  ];

  const defaults = {
    theme: 'modern',
    mode: 'system',          // light | dark | system
    accent: 'e50914',
    autoplay: true,
    reduceMotion: false,
    autoNext: true,
    defaultProvider: 'vidsrc',
    stealthTitle: 'Google',
    stealthFavicon: 'https://www.google.com/favicon.ico',
    stealthClose: false,
  };

  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  let settings = { ...defaults, ...load('sv_settings', {}) };
  let history = load('sv_history', []);
  let bookmarks = load('sv_bookmarks', []);

  function persistSettings() { save('sv_settings', settings); }

  return {
    SWATCHES, THEMES, PROVIDERS_DEFAULT: 'vidsrc',
    get settings() { return settings; },
    setSetting(k, v) { settings[k] = v; persistSettings(); },
    get history() { return history; },
    get bookmarks() { return bookmarks; },

    recordHistory(entry) {
      history = history.filter(h => !(h.id == entry.id && h.type === entry.type));
      history.unshift({ ...entry, updated: Date.now() });
      history = history.slice(0, 50);
      save('sv_history', history);
    },
    clearHistory() { history = []; save('sv_history', history); },

    isBookmarked(id, type) { return bookmarks.some(b => b.id == id && b.type === type); },
    toggleBookmark(item) {
      const type = item.type || item.media_type || (item.first_air_date ? 'tv':'movie');
      if (this.isBookmarked(item.id, type)) {
        bookmarks = bookmarks.filter(b => !(b.id == item.id && b.type === type));
      } else {
        bookmarks.unshift({
          id: item.id, type,
          title: item.title || item.name,
          poster_path: item.poster_path || item.poster,
          vote_average: item.vote_average || 0,
          year: (item.release_date || item.first_air_date || item.year || '').toString().slice(0,4),
        });
      }
      save('sv_bookmarks', bookmarks);
      return this.isBookmarked(item.id, type);
    },
    lastSession(id) { return history.find(h => h.id == id && h.type === 'tv'); },
  };
})();
