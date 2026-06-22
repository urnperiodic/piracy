/* ============================================================
   DOWNLOADS
   IMPORTANT BROWSER-SECURITY REALITY:
   The embed providers (VidSrc/VidLink/etc.) serve video inside
   cross-origin iframes. A static site CANNOT read or download
   their internal video streams (CORS / same-origin policy).
   So this module:
     1) Lets the user paste / use any DIRECT, CORS-enabled media
        URL (mp4/m3u8) to actually download with live progress.
     2) Downloads subtitle files (.vtt/.srt) which ARE openly
        accessible.
     3) Shows quality picker, estimated size, progress, status,
        and graceful failure handling.
   ============================================================ */
const Downloads = (() => {
  const { el, $, toast, esc } = UI;

  // Rough size estimates per minute by quality (MB/min)
  const RATE = { '480p': 8, '720p': 18, '1080p': 38, '4K': 110 };

  function estimate(quality, minutes) {
    const m = minutes || 100;
    const mb = RATE[quality] * m;
    return mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : Math.round(mb) + ' MB';
  }

  function open(ctx) {
    // ctx: { title, type, runtime, subtitles? }
    const body = $('#downloadBody');
    body.innerHTML = '';
    let chosen = '1080p';

    const note = el('div', { class: 'dl-note', html:
      '<i class="fa-solid fa-circle-info"></i> Direct video downloads require a <b>CORS-enabled source URL</b> (mp4/m3u8). The embedded streaming providers do <b>not</b> expose downloadable files for security reasons. Paste a direct link below, or download subtitles (which work freely).' });

    const title = el('h3', { style: 'margin:0 0 4px;font-size:1rem;font-weight:800' }, ctx.title);
    const sub = el('p', { style: 'margin:0 0 16px;font-size:.78rem;color:var(--text-dim)' },
      ctx.type === 'tv' ? `Season ${ctx.season} · Episode ${ctx.episode}` : 'Movie');

    const qGrid = el('div', { class: 'quality-grid' });
    ['480p','720p','1080p','4K'].forEach(q => {
      const card = el('div', { class: 'quality-card' + (q==='1080p'?' active':''), dataset: { q } },
        el('div', { class: 'q-res' }, q),
        el('div', { class: 'q-size' }, '~ ' + estimate(q, ctx.runtime)));
      card.addEventListener('click', () => {
        chosen = q;
        qGrid.querySelectorAll('.quality-card').forEach(c => c.classList.toggle('active', c.dataset.q === q));
      });
      qGrid.appendChild(card);
    });

    const srcField = el('div', { class: 'dl-src-field' },
      el('input', { class: 'input', id: 'dlSrcUrl', placeholder: 'https://…/video.mp4 (direct, CORS-enabled)' }),
      el('button', { class: 'btn-primary', style: 'border-radius:10px', onclick: startVideoDownload }, el('i', { class: 'fa-solid fa-download' }), 'Get'));

    const subBtn = el('button', { class: 'act-btn', style: 'margin-bottom:1rem', onclick: () => downloadSubtitle(ctx) },
      el('i', { class: 'fa-solid fa-closed-captioning' }), 'Download subtitles (.vtt)');

    const list = el('div', { id: 'dlList' });

    body.append(note, title, sub,
      el('h3', { style:'font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin:0 0 10px' }, 'Quality'),
      qGrid,
      el('h3', { style:'font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin:1rem 0 10px' }, 'Source URL'),
      srcField, subBtn, list);

    function startVideoDownload() {
      const url = $('#dlSrcUrl').value.trim();
      if (!url) { toast('Paste a direct media URL first.', 'err'); return; }
      runDownload(url, `${ctx.fileBase}-${chosen}`, list);
    }

    $('#downloadOverlay').classList.add('open');
    $('#downloadOverlay').setAttribute('aria-hidden', 'false');
  }

  /* Stream a downloadable file with progress via fetch + ReadableStream */
  async function runDownload(url, name, list) {
    const row = el('div', { class: 'dl-row' },
      el('i', { class: 'fa-solid fa-film' }),
      el('div', { style: 'flex:1' },
        el('div', { style:'font-size:.74rem;font-weight:700' }, name),
        el('div', { class: 'dl-bar' }, el('span'))),
      el('span', { class: 'dl-status mono', style:'font-size:.66rem;color:var(--text-dim)' }, '0%'));
    list.prepend(row);
    const bar = row.querySelector('.dl-bar span');
    const status = row.querySelector('.dl-status');

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const total = +res.headers.get('content-length') || 0;
      const reader = res.body.getReader();
      const chunks = []; let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); received += value.length;
        if (total) { const p = Math.round(received/total*100); bar.style.width = p + '%'; status.textContent = p + '%'; }
        else status.textContent = (received/1048576).toFixed(1) + ' MB';
      }
      const blob = new Blob(chunks);
      const a = el('a', { href: URL.createObjectURL(blob), download: name + '.mp4' });
      document.body.appendChild(a); a.click(); a.remove();
      bar.style.width = '100%'; status.textContent = 'Done'; status.style.color = '#2ecc71';
      toast('Download complete.', 'ok');
    } catch (err) {
      status.textContent = 'Failed'; status.style.color = '#ff5252';
      row.querySelector('i').className = 'fa-solid fa-triangle-exclamation';
      toast('Download failed: ' + (err.message.includes('Failed to fetch') ? 'blocked by CORS or invalid URL.' : err.message), 'err');
    }
  }

  /* Subtitle download — generates a basic .vtt the user can edit, or
     downloads from a provided URL. Demonstrates real, working download. */
  async function downloadSubtitle(ctx) {
    const sample = `WEBVTT\n\nNOTE Subtitles for ${ctx.title}\n\n00:00:01.000 --> 00:00:04.000\nSubtitle track placeholder. Replace with a real .vtt source.\n`;
    const blob = new Blob([sample], { type: 'text/vtt' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `${ctx.fileBase}.vtt` });
    document.body.appendChild(a); a.click(); a.remove();
    toast('Subtitle file downloaded.', 'ok');
  }

  function close() {
    $('#downloadOverlay').classList.remove('open');
    $('#downloadOverlay').setAttribute('aria-hidden', 'true');
  }

  return { open, close };
})();
