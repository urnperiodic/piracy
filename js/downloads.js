/* ============================================================
   TMDB API CLIENT
   - In-memory cache to avoid repeat requests (perf).
   - AbortController support for search debounce.
   ============================================================ */
const TMDB = (() => {
  const DEFAULT_KEY = '8265bd1679663a7ea12ac168da84d2e8';
  const BASE = 'https://api.themoviedb.org/3';
  const IMG = 'https://image.tmdb.org/t/p';
  const cache = new Map();

  const getKey = () => (localStorage.getItem('sv_tmdb_key') || '').trim() || DEFAULT_KEY;

  function url(path, params = {}) {
    const u = new URL(BASE + path);
    u.searchParams.set('api_key', getKey());
    u.searchParams.set('language', 'en-US');
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
    }
    return u.toString();
  }

  async function get(path, params = {}, { signal } = {}) {
    const key = url(path, params);
    if (cache.has(key)) return cache.get(key);
    const res = await fetch(key, { signal });
    if (!res.ok) throw new Error('TMDB ' + res.status);
    const json = await res.json();
    cache.set(key, json);
    return json;
  }

  const img = (path, size = 'w500') => path ? `${IMG}/${size}${path}` : '';

  return {
    get, img, getKey,
    IMG,
    trending: (window = 'week') => get(`/trending/all/${window}`),
    moviePopular: (page = 1) => get('/movie/popular', { page }),
    tvPopular: (page = 1) => get('/tv/popular', { page }),
    nowPlaying: () => get('/movie/now_playing'),
    topRated: () => get('/movie/top_rated'),
    discover: (type, params = {}) => get(`/discover/${type}`, params),
    details: (type, id) => get(`/${type}/${id}`, { append_to_response: 'credits,recommendations,similar,videos,external_ids' }),
    season: (id, s) => get(`/tv/${id}/season/${s}`),
    search: (query, page = 1, opts) => get('/search/multi', { query, page }, opts),
  };
})();

/* Genre maps */
const GENRES = {
  movie: { 28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western' },
  tv: { 10759:'Action & Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',10765:'Sci-Fi & Fantasy',9648:'Mystery',10764:'Reality',10768:'War & Politics' }
};

/* Streaming embed providers */
const PROVIDERS = [
  { id:'vidsrc', name:'VidSrc', badge:'Subtitles', build:({type,id,s,e})=>
      type==='movie' ? `https://vidsrc.to/embed/movie/${id}` : `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { id:'vidlink', name:'VidLink', badge:'Multi', build:({type,id,s,e,opt})=>{
      let u = type==='movie' ? `https://vidlink.pro/movie/${id}` : `https://vidlink.pro/tv/${id}/${s}/${e}`;
      const p = new URLSearchParams();
      if(opt?.color) p.set('primaryColor', opt.color.replace('#',''));
      p.set('autoplay', opt?.autoplay===false?'false':'true');
      if(type==='tv') p.set('nextbutton','true');
      const q=p.toString(); return q?`${u}?${q}`:u; } },
  { id:'vidsrccc', name:'VidSrc.cc', badge:'HD', build:({type,id,s,e,opt})=>{
      let u = type==='movie' ? `https://vidsrc.cc/v2/embed/movie/${id}` : `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`;
      return u + (opt?.autoplay===false?'?autoPlay=false':'?autoPlay=true'); } },
  { id:'vidking', name:'VidKing', badge:'Fast', build:({type,id,s,e,opt})=>{
      let u = type==='movie' ? `https://www.vidking.net/embed/movie/${id}` : `https://www.vidking.net/embed/tv/${id}/${s}/${e}`;
      const p = new URLSearchParams();
      if(opt?.color) p.set('color', opt.color.replace('#',''));
      p.set('autoPlay', opt?.autoplay===false?'false':'true');
      if(type==='tv'){ p.set('nextEpisode','true'); p.set('episodeSelector','true'); }
      const q=p.toString(); return q?`${u}?${q}`:u; } },
];
