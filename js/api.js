/* ============================================================
   THEME SYSTEM
   Architecture: every theme defines a full set of CSS custom
   properties for BOTH light & dark via [data-theme][data-mode].
   Add a new theme by copying a block and changing the name.
   Accent is overridable at runtime via --accent-user.
   ============================================================ */

:root {
  --accent-user: #e50914;
  --accent: var(--accent-user);
  --accent-rgb: 229, 9, 20;

  --radius-sm: 8px;
  --radius: 14px;
  --radius-lg: 22px;
  --header-h: 64px;

  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: .18s;
  --dur: .32s;
  --dur-slow: .55s;

  --shadow-card: 0 8px 24px rgba(0,0,0,.45);
  --shadow-pop: 0 24px 60px rgba(0,0,0,.55);
}

/* ---------- MODERN / MINIMAL ---------- */
[data-theme="modern"][data-mode="dark"] {
  --bg: #0a0a0f;
  --bg-elev: #14141c;
  --bg-elev-2: #1c1c26;
  --surface: rgba(255,255,255,.04);
  --surface-hover: rgba(255,255,255,.08);
  --border: rgba(255,255,255,.07);
  --text: #f5f5f7;
  --text-dim: #a0a0ad;
  --text-faint: #6a6a78;
  --header-bg: rgba(10,10,15,.82);
  --aurora-1: rgba(var(--accent-rgb), .14);
  --aurora-2: rgba(80, 80, 200, .10);
  --blur: 16px;
}
[data-theme="modern"][data-mode="light"] {
  --bg: #f4f5f8;
  --bg-elev: #ffffff;
  --bg-elev-2: #eef0f4;
  --surface: rgba(0,0,0,.03);
  --surface-hover: rgba(0,0,0,.06);
  --border: rgba(0,0,0,.09);
  --text: #14141c;
  --text-dim: #565663;
  --text-faint: #8a8a96;
  --header-bg: rgba(244,245,248,.85);
  --aurora-1: rgba(var(--accent-rgb), .10);
  --aurora-2: rgba(80, 80, 200, .07);
  --blur: 16px;
  --shadow-card: 0 8px 24px rgba(20,20,40,.10);
  --shadow-pop: 0 24px 60px rgba(20,20,40,.18);
}

/* ---------- NETFLIX-INSPIRED ---------- */
[data-theme="netflix"] { --accent-user: #e50914; --accent-rgb: 229,9,20; }
[data-theme="netflix"][data-mode="dark"] {
  --bg: #0b0b0b;
  --bg-elev: #181818;
  --bg-elev-2: #232323;
  --surface: rgba(255,255,255,.05);
  --surface-hover: rgba(255,255,255,.10);
  --border: rgba(255,255,255,.08);
  --text: #ffffff;
  --text-dim: #b3b3b3;
  --text-faint: #7a7a7a;
  --header-bg: linear-gradient(180deg, rgba(0,0,0,.92), rgba(0,0,0,.6));
  --aurora-1: rgba(229,9,20,.16);
  --aurora-2: rgba(60,0,0,.20);
  --blur: 12px;
}
[data-theme="netflix"][data-mode="light"] {
  --bg: #f3f3f3;
  --bg-elev: #ffffff;
  --bg-elev-2: #e9e9e9;
  --surface: rgba(0,0,0,.03);
  --surface-hover: rgba(0,0,0,.07);
  --border: rgba(0,0,0,.10);
  --text: #141414;
  --text-dim: #555;
  --text-faint: #888;
  --header-bg: rgba(255,255,255,.9);
  --aurora-1: rgba(229,9,20,.10);
  --aurora-2: rgba(229,9,20,.05);
  --blur: 12px;
  --shadow-card: 0 8px 24px rgba(0,0,0,.12);
}

/* ---------- DISNEY+-INSPIRED ---------- */
[data-theme="disney"] { --accent-user: #00b4ff; --accent-rgb: 0,180,255; }
[data-theme="disney"][data-mode="dark"] {
  --bg: #0a0e1a;
  --bg-elev: #121a2e;
  --bg-elev-2: #1a2540;
  --surface: rgba(255,255,255,.05);
  --surface-hover: rgba(255,255,255,.10);
  --border: rgba(120,160,255,.14);
  --text: #f0f4ff;
  --text-dim: #9fb0d0;
  --text-faint: #6878a0;
  --header-bg: rgba(10,14,26,.85);
  --aurora-1: rgba(0,180,255,.18);
  --aurora-2: rgba(60,40,180,.18);
  --blur: 18px;
}
[data-theme="disney"][data-mode="light"] {
  --bg: #eef3fc;
  --bg-elev: #ffffff;
  --bg-elev-2: #e3ebfa;
  --surface: rgba(0,40,120,.03);
  --surface-hover: rgba(0,40,120,.07);
  --border: rgba(0,60,160,.12);
  --text: #0a1a3a;
  --text-dim: #45567a;
  --text-faint: #7888aa;
  --header-bg: rgba(238,243,252,.88);
  --aurora-1: rgba(0,180,255,.12);
  --aurora-2: rgba(60,40,180,.08);
  --blur: 18px;
  --shadow-card: 0 8px 24px rgba(0,40,120,.12);
}

/* ---------- GLASSMORPHISM ---------- */
[data-theme="glass"] { --accent-user: #9146ff; --accent-rgb: 145,70,255; }
[data-theme="glass"][data-mode="dark"] {
  --bg: #0c0a16;
  --bg-elev: rgba(255,255,255,.06);
  --bg-elev-2: rgba(255,255,255,.10);
  --surface: rgba(255,255,255,.07);
  --surface-hover: rgba(255,255,255,.13);
  --border: rgba(255,255,255,.14);
  --text: #f6f3ff;
  --text-dim: #b8aed8;
  --text-faint: #7e74a0;
  --header-bg: rgba(20,12,40,.5);
  --aurora-1: rgba(145,70,255,.22);
  --aurora-2: rgba(0,200,255,.16);
  --blur: 26px;
  --glass: 1;
}
[data-theme="glass"][data-mode="light"] {
  --bg: #eae6f6;
  --bg-elev: rgba(255,255,255,.55);
  --bg-elev-2: rgba(255,255,255,.72);
  --surface: rgba(255,255,255,.45);
  --surface-hover: rgba(255,255,255,.7);
  --border: rgba(255,255,255,.6);
  --text: #1a1230;
  --text-dim: #574a78;
  --text-faint: #8a7ea8;
  --header-bg: rgba(255,255,255,.45);
  --aurora-1: rgba(145,70,255,.16);
  --aurora-2: rgba(0,200,255,.12);
  --blur: 26px;
  --glass: 1;
  --shadow-card: 0 8px 30px rgba(80,40,140,.15);
}

/* Glass theme: frosted cards */
[data-theme="glass"] .card-surface,
[data-theme="glass"] .app-header,
[data-theme="glass"] .settings-panel,
[data-theme="glass"] .modal {
  backdrop-filter: blur(var(--blur)) saturate(1.3);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(1.3);
}

/* Theme transition: smoothly cross-fade colors */
html.theme-transition,
html.theme-transition *,
html.theme-transition *::before,
html.theme-transition *::after {
  transition: background-color var(--dur) var(--ease),
              color var(--dur) var(--ease),
              border-color var(--dur) var(--ease) !important;
}
