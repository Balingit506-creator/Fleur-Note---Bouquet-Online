(() => {
  'use strict';

  /* ================================================================
     Data
     ================================================================ */
  const ASSETS = window.BOUQ_ASSETS || { flowers: [], greenery: [], wraps: [], envelopes: [] };
  const MAX_STEMS = 18;
  const MAX_GREEN = 3;
  const GATHER = { x: 300, y: 560 };
  const GREEN_FADE = [320, 372]; // y-range on the stage where foliage outside the wrap fades out
  const DRAFT_KEY = 'petal-post-draft-v1';
  const Music = window.BouqMusic || { TRACKS: [], play() {}, stop() {}, togglePause() {}, current: () => null, isPaused: () => false, onChange() {} };
  const STORAGE = window.BOUQ_CONFIG?.storage;
  // Optional Supabase bucket for photos; without it photos travel inside the link.
  const CLOUD = STORAGE?.provider === 'supabase' && STORAGE.url && STORAGE.anonKey && STORAGE.bucket
    ? { ...STORAGE, url: STORAGE.url.replace(/\/+$/, '') } : null;
  const MAX_PHOTOS = CLOUD ? 5 : 3;
  const MAX_ADDONS = 3;
  const LONG_LINK = 60000; // characters; longer links may be cut off by some chat apps

  const RIBBONS = [
    { id: 'ivory', name: 'Ivory satin', c: '#efe4cf', l: '#fbf6ec', d: '#c9b896' },
    { id: 'blush', name: 'Blush silk', c: '#e7b3ab', l: '#f6d6d0', d: '#c08a82' },
    { id: 'burgundy', name: 'Burgundy velvet', c: '#7a2335', l: '#9c3a4d', d: '#4f1220' },
    { id: 'sage', name: 'Sage chiffon', c: '#9aab8a', l: '#bccab0', d: '#6f8061' },
    { id: 'gold', name: 'Antique gold', c: '#c9a45c', l: '#e6cd92', d: '#94733a' },
    { id: 'noir', name: 'Noir grosgrain', c: '#2b2629', l: '#4a4347', d: '#0f0d0e' },
  ];
  const SEALS = [
    { id: 'burgundy', name: 'Bordeaux', c: '#8a2a3b', h: '#bb5466', d: '#55141f' },
    { id: 'gold', name: 'Gilt', c: '#b8914a', h: '#e3c67f', d: '#7a5c26' },
    { id: 'sage', name: 'Moss', c: '#6f7f5f', h: '#9eae8b', d: '#46523b' },
    { id: 'navy', name: 'Ink', c: '#2c3a5c', h: '#56688f', d: '#18213a' },
    { id: 'blush', name: 'Rosewater', c: '#d39a95', h: '#f0c4bf', d: '#9d6560' },
  ];
  const FONTS = [
    { id: 'script', name: 'Calligraphy', css: 'var(--script)' },
    { id: 'serif', name: 'Classic', css: 'var(--serif)' },
    { id: 'hand', name: 'Handwritten', css: 'var(--hand)' },
  ];
  // Letter papers. Colours are shared by the page (CSS variables) and the video keepsake (canvas).
  const PAPERS = [
    { id: 'lined', name: 'Lined Notepaper', bg: '#fffdf8', ink: '#241e1b', soft: '#3f3531', accent: '#7a2638', rule: 'rgba(180,138,82,.16)', tape: 'rgba(225,205,175,.72)', pattern: 'lines' },
    { id: 'ivory', name: 'Ivory Cotton', bg: '#f9f3e6', ink: '#2b231e', soft: '#4a3f37', accent: '#8a5a2b', rule: 'rgba(168,125,67,.35)', tape: 'rgba(210,190,160,.7)', pattern: 'frame' },
    { id: 'dotted', name: 'Dotted Journal', bg: '#fdfcf7', ink: '#22262b', soft: '#3c434b', accent: '#2f5d7c', rule: 'rgba(60,80,100,.22)', tape: 'rgba(170,200,215,.7)', pattern: 'dots' },
    { id: 'kraft', name: 'Kraft', bg: '#d8b78e', ink: '#2e1f12', soft: '#4a3420', accent: '#6b2a1f', rule: 'rgba(90,60,30,.28)', tape: 'rgba(250,245,232,.75)', pattern: 'fibres' },
    { id: 'blush', name: 'Blush Floral', bg: '#fbe8e4', ink: '#3a2226', soft: '#5a3a3f', accent: '#a83a52', rule: 'rgba(200,120,135,.22)', tape: 'rgba(255,255,255,.7)', pattern: 'floral' },
    { id: 'parchment', name: 'Aged Parchment', bg: '#f2e2c0', ink: '#3b2a17', soft: '#5a4228', accent: '#7a3b1c', rule: 'rgba(120,80,30,.18)', tape: 'rgba(205,180,140,.75)', pattern: 'aged' },
    { id: 'airmail', name: 'Airmail', bg: '#fbfaf6', ink: '#1f2433', soft: '#3a4157', accent: '#b2263a', rule: 'rgba(40,60,110,.12)', tape: 'rgba(225,215,195,.75)', pattern: 'airmail' },
    { id: 'midnight', name: 'Midnight Gold', bg: '#1d2742', ink: '#f2e6c9', soft: '#e0cf9f', accent: '#e8c47a', rule: 'rgba(232,196,122,.18)', tape: 'rgba(232,196,122,.55)', pattern: 'stars' },
  ];
  const paperOf = (id) => byId(PAPERS, id) || PAPERS[0];
  // Photo frames; the look lives in CSS (.pf[data-frame]).
  const FRAMES = [
    { id: 'polaroid', name: 'Polaroid' },
    { id: 'washi', name: 'Washi Tape' },
    { id: 'gold', name: 'Gold' },
    { id: 'vintage', name: 'Vintage' },
    { id: 'film', name: 'Film' },
  ];
  function paintPaper(el, id) {
    const p = paperOf(id);
    el.dataset.paper = p.id;
    for (const [k, v] of [['--ink', p.ink], ['--ink-soft', p.soft], ['--accent', p.accent], ['--lp-bg', p.bg], ['--lp-rule', p.rule], ['--lp-tape', p.tape]]) el.style.setProperty(k, v);
  }

  const STEPS = [
    { id: 'occasion', label: 'Occasion' },
    { id: 'blooms', label: 'Blooms' },
    { id: 'greenery', label: 'Greenery' },
    { id: 'wrap', label: 'Wrap' },
    { id: 'letter', label: 'Letter' },
    { id: 'extras', label: 'Extras' },
    { id: 'send', label: 'Send' },
  ];
  const COLOR_HEX = {
    red: '#9e1b32', pink: '#e08aa3', white: '#f1ece2', yellow: '#efc12f', peach: '#f2b088', orange: '#ec8731',
    purple: '#8b5fb0', blue: '#4b6fb3', burgundy: '#4d1426', bicolor: '#e2563c', black: '#2a1a20', velvety: '#9e1b32', coral: '#ef8a74', lavender: '#b9a3d9', golden: '#f2b630',
  };
  const OCCASIONS = [
    { id: 'romance', name: 'Romance', line: 'Velvet reds and blush, tied in satin.',
      flowers: [['rose', 'red', 5], ['rose', 'pink', 3], ['dahlia', 'peach', 1], ['ranunculus', 'hot', 2], ['tulip', 'pink', 2]], greens: ['eucalyptus_waxflower', 'baby'],
      wrap: 'dusty_rose', ribbon: 'burgundy', envelope: 'blush', seal: 'burgundy', addons: ['teddy', 'fluffy_heart'],
      note: 'Every ordinary day with you still feels like the first bloom of spring.' },
    { id: 'gratitude', name: 'Gratitude', line: 'Sunlit yellows with a sprig of olive.',
      flowers: [['sunflower', 'golden', 2], ['tulip', 'yellow', 3], ['tulip', 'peach', 3], ['ranunculus', 'coral', 2], ['rose', 'white', 2], ['rose', 'yellow', 2]], greens: ['olive', 'collar'],
      wrap: 'champagne', ribbon: 'ivory', envelope: 'kraft', seal: 'gold', addons: ['bunny'],
      note: 'Thank you, for the big things and, most of all, for the small ones.' },
    { id: 'apology', name: 'I’m sorry', line: 'Soft whites that say it gently.',
      flowers: [['lily', 'white', 1], ['rose', 'white', 3], ['tulip', 'white', 3], ['ranunculus', 'pastel', 2], ['tulip', 'pink', 2]], greens: ['bay_leaf', 'baby'],
      wrap: 'ivory', ribbon: 'blush', envelope: 'ivory', seal: 'blush', addons: ['teddy'],
      note: 'I was wrong, and I’m sorry. I hope these say what I couldn’t.' },
    { id: 'celebration', name: 'Celebration', line: 'A bright burst of orange and gold.',
      flowers: [['sunflower', 'golden', 1], ['dahlia', 'flame', 2], ['tulip', 'orange', 2], ['rose', 'orange', 2], ['ranunculus', 'orange', 2], ['tulip', 'bicolor', 3], ['rose', 'yellow', 1], ['tulip', 'purple', 2]], greens: ['woodland_posy', 'lavender'],
      wrap: 'sage', ribbon: 'gold', envelope: 'sage', seal: 'gold', addons: ['satin_bow', 'kitty_charm'],
      note: 'Here’s to you and everything you worked so hard for. Congratulations!' },
    { id: 'sympathy', name: 'Sympathy', line: 'Quiet whites and lilac, softly held.',
      flowers: [['lily', 'white', 2], ['rose', 'white', 3], ['tulip', 'white', 2], ['ranunculus', 'lavender', 2], ['tulip', 'purple', 2], ['rose', 'purple', 1]], greens: ['trailing_eucalyptus', 'lavender', 'fern_waxflower'],
      wrap: 'lilac', ribbon: 'ivory', envelope: 'lilac', seal: 'sage', addons: ['bunny'],
      note: 'Thinking of you, and holding you close through all of this.' },
    { id: 'after-dark', name: 'After dark', line: 'Moody burgundy, violet and blue on noir.',
      flowers: [['tulip', 'burgundy', 3], ['dahlia', 'burgundy', 2], ['ranunculus', 'burgundy', 2], ['rose', 'blue', 2], ['rose', 'purple', 3], ['rose', 'red', 2]], greens: ['ruscus', 'olive'],
      wrap: 'noir', ribbon: 'gold', envelope: 'midnight', seal: 'gold', addons: ['turtle', 'fluffy_heart'],
      note: 'For the one who makes ordinary nights feel like something worth remembering.' },
  ];

  /* ================================================================
     Helpers
     ================================================================ */
  const $ = (s, r = document) => r.querySelector(s);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const byId = (list, id) => list.find((x) => x.id === id);
  const randSeed = () => (Math.random() * 2 ** 31) | 0;
  let uidCounter = 0;
  const uid = () => `u${++uidCounter}`;

  function h(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && e.append(c));
    return e;
  }
  function s(tag, attrs = {}) {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    return e;
  }
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function mulberry32(a) {
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Only our own resized images (data URLs) or files in the configured bucket are accepted.
  const okPhoto = (src) => typeof src === 'string' && (
    (src.length < 400000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(src)) ||
    (!!CLOUD && src.startsWith(`${CLOUD.url}/storage/v1/object/public/${CLOUD.bucket}/`) && !/[\s"'<>()]/.test(src)));

  const findFlower = (kind, color) =>
    ASSETS.flowers
      .filter((f) => f.kind.toLowerCase().startsWith(kind) && f.name.toLowerCase().split(/\s+/).includes(color))
      .sort((a, b) => a.name.length - b.name.length)[0];
  const findGreen = (t) => ASSETS.greenery.find((g) => g.id.toLowerCase().includes(t));
  const findWrap = (t) => ASSETS.wraps.find((w) => w.id.toLowerCase().includes(t));
  const findEnv = (t) => ASSETS.envelopes.find((e) => e.id.toLowerCase().includes(t));
  const findAddon = (t) => (ASSETS.addons || []).find((a) => a.id.toLowerCase().includes(t));
  const flowerLabel = (f) => `${f.name} ${f.kind}`;
  const flowerHex = (f) => {
    const word = f.name.toLowerCase().split(/\s+/).find((w) => COLOR_HEX[w]);
    return COLOR_HEX[word] || '#c9a0a8';
  };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ================================================================
     State
     ================================================================ */
  function freshState() {
    return {
      seed: randSeed(),
      occasion: null,
      stems: [],
      greenery: [],
      wrap: (findWrap('champagne') || ASSETS.wraps[0] || {}).id || null,
      ribbon: 'ivory',
      envelope: (findEnv('ivory') || ASSETS.envelopes[0] || {}).id || null,
      seal: 'burgundy',
      card: { to: '', msg: '', from: '', font: 'script', paper: 'lined' },
      photos: [],
      photoFrame: 'polaroid',
      addons: [],
      addonPos: {},
      music: null,
      yt: null, // { id, start, title } — a YouTube song instead of a built-in piece
    };
  }

  // Accepts anything (a draft, a decoded link) and returns a safe state.
  function sanitize(raw) {
    const base = freshState();
    if (!raw || typeof raw !== 'object') return base;
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    const num = (v) => (Number.isFinite(+v) ? Math.round(+v) : null);
    const stems = Array.isArray(raw.stems) ? raw.stems : [];
    return {
      seed: Number.isFinite(raw.seed) ? raw.seed | 0 : base.seed,
      occasion: OCCASIONS.some((o) => o.id === raw.occasion) ? raw.occasion : null,
      stems: stems
        .filter((x) => x && byId(ASSETS.flowers, x.id))
        .slice(0, MAX_STEMS)
        .map((x) => (x.x != null && num(x.x) != null && num(x.y) != null
          ? { id: x.id, x: clamp(num(x.x), 30, 570), y: clamp(num(x.y), 40, 580), z: num(x.z) || 0 }
          : { id: x.id })),
      greenery: (Array.isArray(raw.greenery) ? raw.greenery : []).filter((id) => byId(ASSETS.greenery, id)).slice(0, MAX_GREEN),
      wrap: byId(ASSETS.wraps, raw.wrap) ? raw.wrap : base.wrap,
      ribbon: byId(RIBBONS, raw.ribbon) ? raw.ribbon : base.ribbon,
      envelope: byId(ASSETS.envelopes, raw.envelope) ? raw.envelope : base.envelope,
      seal: byId(SEALS, raw.seal) ? raw.seal : base.seal,
      card: {
        to: str(raw.card?.to, 40),
        msg: str(raw.card?.msg, 600),
        from: str(raw.card?.from, 40),
        font: byId(FONTS, raw.card?.font) ? raw.card.font : 'script',
        paper: byId(PAPERS, raw.card?.paper) ? raw.card.paper : 'lined',
      },
      photoFrame: byId(FRAMES, raw.photoFrame) ? raw.photoFrame : 'polaroid',
      photos: (Array.isArray(raw.photos) ? raw.photos : [])
        .filter((p) => p && okPhoto(p.src))
        .slice(0, MAX_PHOTOS)
        .map((p) => ({ src: p.src, cap: str(p.cap, 60) })),
      music: Music.TRACKS.some((t) => t.id === raw.music) ? raw.music : null,
      yt: raw.yt && /^[A-Za-z0-9_-]{11}$/.test(raw.yt.id || '')
        ? { id: raw.yt.id, start: clamp(num(raw.yt.start) || 0, 0, 36000), title: str(raw.yt.title, 100) }
        : null,
      addons: (Array.isArray(raw.addons) ? raw.addons : []).filter((id) => byId(ASSETS.addons || [], id)).slice(0, MAX_ADDONS),
      addonPos: Object.fromEntries(Object.entries(raw.addonPos && typeof raw.addonPos === 'object' ? raw.addonPos : {})
        .filter(([id, p]) => Array.isArray(raw.addons) && raw.addons.includes(id) && byId(ASSETS.addons || [], id) && p && num(p.x) != null && num(p.y) != null)
        .map(([id, p]) => [id, { x: clamp(num(p.x), -200, 800), y: clamp(num(p.y), -200, 960) }])),
      sent: Number.isFinite(raw.sent) ? raw.sent : null,
    };
  }

  let state = sanitize(store.get(DRAFT_KEY));
  let saveTimer;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(DRAFT_KEY, state), 250);
  };

  /* ---------- share-link encoding: everything lives in the URL ---------- */
  function encode(st) {
    const ids = [...new Set(st.stems.map((x) => x.id))];
    const payload = {
      v: 1, sd: st.seed, o: st.occasion, f: ids,
      s: st.stems.map((x) => (x.x != null ? [ids.indexOf(x.id), x.x, x.y, x.z || 0] : [ids.indexOf(x.id)])),
      g: st.greenery, w: st.wrap, r: st.ribbon, e: st.envelope, l: st.seal,
      c: [st.card.to, st.card.msg, st.card.from, st.card.font, st.card.paper],
      ph: st.photos.map((p) => (p.cap ? [p.src, p.cap] : [p.src])),
      pf: st.photoFrame,
      m: st.music,
      y: st.yt ? [st.yt.id, st.yt.start || 0, st.yt.title || ''] : null,
      ad: st.addons,
      ap: st.addons.filter((id) => st.addonPos[id]).map((id) => [st.addons.indexOf(id), st.addonPos[id].x, st.addonPos[id].y]),
      t: Math.round(Date.now() / 1000),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(str) {
    try {
      const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
      const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
      if (p.v !== 1) return null;
      const ids = Array.isArray(p.f) ? p.f : [];
      const c = Array.isArray(p.c) ? p.c : [];
      return sanitize({
        seed: p.sd, occasion: p.o,
        stems: (p.s || []).map((a) => ({ id: ids[a[0]], x: a[1], y: a[2], z: a[3] })),
        greenery: p.g, wrap: p.w, ribbon: p.r, envelope: p.e, seal: p.l,
        card: { to: c[0], msg: c[1], from: c[2], font: c[3], paper: c[4] },
        photos: (Array.isArray(p.ph) ? p.ph : []).map((x) => ({ src: x?.[0], cap: x?.[1] })),
        photoFrame: p.pf,
        music: p.m,
        yt: Array.isArray(p.y) ? { id: p.y[0], start: p.y[1], title: p.y[2] } : null,
        addons: p.ad,
        addonPos: Object.fromEntries((Array.isArray(p.ap) ? p.ap : []).filter((x) => Array.isArray(p.ad) && p.ad[x?.[0]])
          .map(([i, x, y]) => [p.ad[i], { x, y }])),
        sent: Number.isFinite(p.t) ? p.t : null,
      });
    } catch {
      return null;
    }
  }

  const shareBase = () => location.href.split('#')[0];
  const shareLink = () => `${shareBase()}#b=${encode(state)}`;

  /* ---------- password lock: AES-GCM with a key derived from the password (PBKDF2) ---------- */
  const lock = { on: false, pw: '', hint: '' }; // kept in memory only, never saved
  const b64u = {
    enc: (bytes) => { let s = ''; bytes.forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    dec: (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
  };
  async function deriveKey(pw, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(text, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(pw, salt), new TextEncoder().encode(text)));
    const out = new Uint8Array(29 + ct.length);
    out[0] = 1; // format version
    out.set(salt, 1);
    out.set(iv, 17);
    out.set(ct, 29);
    return b64u.enc(out);
  }
  async function unseal(str, pw) {
    const d = b64u.dec(str);
    if (d[0] !== 1 || d.length < 30) throw new Error('bad format');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: d.slice(17, 29) }, await deriveKey(pw, d.slice(1, 17)), d.slice(29));
    return new TextDecoder().decode(pt);
  }
  const lockReady = () => !lock.on || lock.pw.length >= 4;
  async function makeLink() {
    if (!lock.on) return shareLink();
    if (!window.crypto?.subtle) throw new Error('Password links need the site to be opened over https or localhost.');
    const hint = lock.hint.trim() ? `&h=${encodeURIComponent(lock.hint.trim())}` : '';
    return `${shareBase()}#e=${await seal(encode(state), lock.pw)}${hint}`;
  }

  /* ================================================================
     Bouquet composition
     ================================================================ */
  function layoutStems(st) {
    const n = st.stems.length;
    const rnd = mulberry32(st.seed);
    const cx = 300, cy = 318;
    const rx = 58 + Math.min(124, n * 10), ry = 40 + Math.min(112, n * 8);
    const base = clamp(170 - n * 3.4, 112, 168);
    return st.stems
      .map((stem, i) => {
        const t = (i + 0.5) / n;
        const r = n === 1 ? 0 : Math.sqrt(t);
        const a = i * 2.39996 + rnd() * 0.35;
        const jitter = 0.88 + rnd() * 0.24;
        const tilt = (rnd() - 0.5) * 26;
        let x = cx + Math.cos(a) * r * rx;
        let y = cy + Math.sin(a) * r * ry - (1 - r) * 16;
        if (stem.x != null) { x = stem.x; y = stem.y; }
        const lean = ((x - cx) / (rx || 1)) * 12;
        return { i, f: byId(ASSETS.flowers, stem.id), x, y, z: stem.z || 0, size: base * jitter, rot: tilt * 0.6 + lean };
      })
      .filter((o) => o.f)
      .sort((a, b) => a.z - b.z || a.y - b.y);
  }

  function layoutGreenery(st) {
    const items = st.greenery.map((id) => byId(ASSETS.greenery, id)).filter(Boolean);
    const rnd = mulberry32(st.seed ^ 0x5bd1e995);
    const isFan = (g) => g.layout === 'fan' || (!g.layout && g.w && g.h && g.w > g.h * 1.15);
    const isCollar = (g) => g.layout === 'collar';
    const fans = items.filter(isFan);
    const collars = items.filter(isCollar);
    const sprigs = items.filter((g) => !isFan(g) && !isCollar(g));
    const out = [];
    const n = sprigs.length ? clamp(sprigs.length * 3, 5, 9) : 0;
    for (let i = 0; i < n; i++) {
      const g = sprigs[i % sprigs.length];
      const t = n === 1 ? 0.5 : i / (n - 1);
      const rot = -50 + 100 * t + (rnd() - 0.5) * 8; // fan upward, not sideways out of the wrap
      const ht = (380 + rnd() * 80) * (1 - Math.abs(rot) / 320);
      const w = (ht * (g.w || 300)) / (g.h || 520);
      out.push({ g, fan: false, x: -w / 2, y: -ht, w, h: ht, rot, k: i });
    }
    // collars sit once, centred on the bloom dome; tall sprigs poke out behind them
    collars.forEach((g, k) => {
      const w = (g.width || 560) - k * 40, ht = (w * (g.h || g.w || 1)) / (g.w || 1);
      const [ax, ay] = g.anchor || [0.5, 0.5];
      out.push({ g, fan: true, x: 300 - w * ax, y: 330 - ht * ay, w, h: ht, rot: k % 2 ? 8 : 0, k: n + k });
    });
    fans.forEach((g, k) => {
      const w = 620 - k * 70, ht = (w * g.h) / g.w;
      out.push({ g, fan: true, x: 300 - w / 2, y: GATHER.y + 30 - ht * 0.8, w, h: ht, rot: k % 2 ? 7 : k ? -7 : 0, k: n + collars.length + k });
    });
    return out;
  }

  const stemPath = (x, y) => {
    const ex = 300 + (x - 300) * 0.1, ey = GATHER.y + 40;
    const qx = (x + 300) / 2 + (x - 300) * 0.15, qy = (y + GATHER.y) / 2 + 20;
    return `M${x.toFixed(1)},${y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${ex.toFixed(1)},${ey}`;
  };
  const sprigTransform = (sp) => (sp.fan ? `rotate(${sp.rot} 300 ${GATHER.y})` : `translate(300 ${GATHER.y}) rotate(${sp.rot.toFixed(1)})`);

  function ribbonMarkup(ribbonId, id, wrap) {
    const r = byId(RIBBONS, ribbonId) || RIBBONS[0];
    const rs = wrap?.ribbon || {};
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${r.l}"/><stop offset="1" stop-color="${r.c}"/></linearGradient></defs>
    <g transform="translate(300 ${rs.y || 606}) scale(${rs.scale || 1})">
      <path d="M-114,-10 Q0,8 114,-10 L112,10 Q0,28 -112,10Z" fill="url(#${id})"/>
      <path d="M-114,-10 Q0,8 114,-10" fill="none" stroke="${r.d}" stroke-width="1" opacity=".5"/>
      <path d="M-4,6 C-14,40 -22,86 -38,128 L-24,122 L-14,136 C-4,94 2,50 6,8Z" fill="${r.c}" stroke="${r.d}" stroke-width="1"/>
      <path d="M4,6 C16,44 30,84 50,120 L36,118 L30,132 C14,96 4,52 -2,8Z" fill="${r.c}" stroke="${r.d}" stroke-width="1"/>
      <path d="M0,0 C-26,-44 -84,-40 -80,-6 C-76,24 -30,16 0,0Z" fill="url(#${id})" stroke="${r.d}" stroke-width="1.2"/>
      <path d="M-8,-2 C-30,-30 -66,-28 -66,-8" fill="none" stroke="${r.d}" opacity=".45" stroke-width="1.2"/>
      <path d="M0,0 C26,-44 84,-40 80,-6 C76,24 30,16 0,0Z" fill="url(#${id})" stroke="${r.d}" stroke-width="1.2"/>
      <path d="M8,-2 C30,-30 66,-28 66,-8" fill="none" stroke="${r.d}" opacity=".45" stroke-width="1.2"/>
      <ellipse cx="0" cy="1" rx="13" ry="11" fill="${r.c}" stroke="${r.d}" stroke-width="1.2"/>
      <ellipse cx="-3" cy="-2" rx="5" ry="3" fill="#fff" opacity=".25"/>
    </g>`;
  }

  function describe(st) {
    if (!st.stems.length) return 'An empty bouquet';
    const counts = {};
    st.stems.forEach((x) => {
      const f = byId(ASSETS.flowers, x.id);
      if (f) counts[flowerLabel(f)] = (counts[flowerLabel(f)] || 0) + 1;
    });
    return Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
  }

  // Renders a bouquet into an <svg viewBox="0 0 600 760">.
  function drawBouquet(root, st, opts = {}) {
    const id = uid();
    const wrap = byId(ASSETS.wraps, st.wrap);
    const blooms = layoutStems(st);
    const sprigs = layoutGreenery(st);
    root.textContent = '';
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', `Bouquet: ${describe(st)}`);
    root.classList.toggle('animate', !!opts.animate);
    root.classList.toggle('is-empty', !blooms.length);

    const defs = s('defs');
    defs.innerHTML = `
      <filter id="${id}-sh" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#3c1e14" flood-opacity=".28"/></filter>
      <radialGradient id="${id}-gr"><stop offset="0" stop-color="#5a3a28" stop-opacity=".22"/><stop offset="1" stop-color="#5a3a28" stop-opacity="0"/></radialGradient>`;
    root.append(defs, s('ellipse', { cx: 300, cy: 748, rx: 170, ry: 16, fill: `url(#${id}-gr)` }));

    const layer = (cls) => root.appendChild(s('g', { class: cls }));
    const img = (src, x, y, w, ht) => s('image', { href: src, x, y, width: w, height: ht, preserveAspectRatio: 'xMidYMid meet' });

    const addons = layoutAddons(st);
    const addonLayer = (cls, which) => {
      const g = layer(cls);
      addons.filter((a) => a.layer === which).forEach((a) => {
        const im = img(a.a.src, a.x, a.y, a.w, a.h);
        im.setAttribute('class', 'addon');
        im.setAttribute('data-aid', a.a.id);
        im.style.setProperty('--d', `${(0.9 + blooms.length * 0.07 + a.k * 0.15).toFixed(2)}s`);
        g.append(im);
      });
    };

    const back = layer('l-back');
    if (wrap?.back) back.append(img(wrap.back, 0, 0, 600, 760));
    addonLayer('l-addon-back', 'back');

    const green = layer('l-green');
    // Keep foliage inside the paper: below the wrap's rim, greenery only shows where the wrap is.
    // Above the rim it may spill over freely, fading out between GREEN_FADE[0] and GREEN_FADE[1].
    if (wrap?.back) {
      const [y0, y1] = wrap.greeneryFade || GREEN_FADE;
      const mask = s('mask', { id: `${id}-gm`, maskUnits: 'userSpaceOnUse', x: -200, y: -200, width: 1000, height: 1160, 'mask-type': 'alpha' });
      mask.innerHTML = `<linearGradient id="${id}-gf" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
        <rect x="-200" y="-200" width="1000" height="1160" fill="url(#${id}-gf)"/>`;
      mask.append(img(wrap.back, 0, 0, 600, 760));
      defs.append(mask);
      green.setAttribute('mask', `url(#${id}-gm)`);
    }
    sprigs.forEach((sp) => {
      const g = s('g', { transform: sprigTransform(sp) });
      const im = img(sp.g.src, sp.x, sp.y, sp.w, sp.h);
      im.setAttribute('class', 'sprig');
      im.style.setProperty('--d', `${(0.15 + sp.k * 0.06).toFixed(2)}s`);
      g.append(im);
      green.append(g);
    });

    const stems = layer('l-stems');
    blooms.forEach((b) => stems.append(s('path', {
      class: 'stem', 'data-i': b.i, d: stemPath(b.x, b.y), fill: 'none', stroke: '#5f7a4a', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.9,
    })));

    // Most wraps sit under the blooms so flower heads overlap the paper edge. Wraps with
    // frontOnTop (e.g. the satin wrap with its own bow) cover the lowest blooms instead.
    const drawFront = () => {
      const front = layer('l-front');
      if (wrap?.front) front.append(img(wrap.front, 0, 0, 600, 760));
    };
    if (!wrap?.frontOnTop) drawFront();

    const flowers = layer('l-flowers');
    flowers.setAttribute('filter', `url(#${id}-sh)`);
    blooms.forEach((b, k) => {
      const pos = s('g', {
        class: 'bloom-pos', 'data-i': b.i, 'data-x': b.x, 'data-y': b.y, 'data-rot': b.rot.toFixed(1),
        transform: `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.rot.toFixed(1)})`
      });
      const inner = s('g', { class: 'bloom' + (opts.fresh === b.i ? ' pop' : '') });
      inner.style.setProperty('--d', `${(0.55 + k * 0.07).toFixed(2)}s`);
      const im = img(b.f.src, -b.size / 2, -b.size / 2, b.size, b.size);
      const title = s('title');
      title.textContent = flowerLabel(b.f);
      inner.append(title, im);
      pos.append(inner);
      flowers.append(pos);
    });

    if (wrap?.frontOnTop) drawFront();

    if (wrap?.ribbon !== false) { // wraps with a bow of their own skip the drawn ribbon
      const ribbon = layer('l-ribbon');
      ribbon.style.setProperty('--d', `${(0.6 + blooms.length * 0.07).toFixed(2)}s`);
      ribbon.innerHTML = ribbonMarkup(st.ribbon, `${id}-rb`, wrap);
    }
    addonLayer('l-addon-top', 'top');
  }

  function layoutAddons(st) {
    return st.addons
      .map((aid, k) => {
        const a = byId(ASSETS.addons || [], aid);
        if (!a) return null;
        const w = a.w, h = a.nw && a.nh ? (w * a.nh) / a.nw : w;
        const c = st.addonPos?.[aid] || a; // dragged position, else the default spot
        return { a, k, layer: a.layer === 'back' ? 'back' : 'top', w, h, x: c.x - w / 2, y: c.y - h / 2 };
      })
      .filter(Boolean);
  }

  function sealSVG(sealId, letter) {
    const sl = byId(SEALS, sealId) || SEALS[0];
    const id = uid();
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 45 + (i % 4 === 0 ? 3.2 : 0) + Math.sin(i * 1.7) * 1.4;
      pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`);
    }
    const L = esc(letter);
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${sl.h}"/><stop offset=".55" stop-color="${sl.c}"/><stop offset="1" stop-color="${sl.d}"/></radialGradient></defs>
      <polygon points="${pts.join(' ')}" fill="url(#${id})" stroke="${sl.d}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="31" fill="none" stroke="${sl.d}" stroke-width="3" opacity=".6"/>
      <circle cx="50.8" cy="50.8" r="31" fill="none" stroke="${sl.h}" stroke-width="1" opacity=".55"/>
      <text x="51" y="63" text-anchor="middle" font-family="Pinyon Script, serif" font-size="38" fill="${sl.h}" opacity=".6">${L}</text>
      <text x="50" y="62" text-anchor="middle" font-family="Pinyon Script, serif" font-size="38" fill="${sl.d}" opacity=".9">${L}</text></svg>`;
  }
  const initial = (name) => (name.trim()[0] || '').toUpperCase() || '♥';

  /* ================================================================
     Views & routing
     ================================================================ */
  function setView(v) {
    document.body.dataset.view = v;
    window.scrollTo(0, 0);
  }

  function route() {
    const hash = location.hash;
    if (!hash.startsWith('#b=') && !hash.startsWith('#e=')) { stopViewerMusic(); window.BouqAmbient?.stop(); }
    if (hash.startsWith('#e=')) {
      const q = new URLSearchParams(hash.slice(1));
      return showLock(q.get('e') || '', q.get('h') || '');
    }
    if (hash.startsWith('#b=')) {
      const st = decode(hash.slice(3));
      if (st && st.stems.length) return showViewer(st);
      toast('That bouquet link looks incomplete. Here’s the studio instead.');
      history.replaceState(null, '', '#studio');
      return showStudio();
    }
    document.title = 'Petal & Post — Digital Bouquets';
    if (hash.startsWith('#studio')) {
      // #studio/blooms → pick flowers yourself; #studio/occasion → start from an arrangement
      const want = hash.split('/')[1];
      const at = STEPS.findIndex((s) => s.id === want);
      if (at >= 0) { step = at; history.replaceState(null, '', '#studio'); }
      return showStudio();
    }
    showHome();
    if (hash === '#support' || hash === '#ideas') requestAnimationFrame(() => $(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function showHome() {
    setView('home');
    const demo = applyOccasionTo(freshState(), OCCASIONS[0], 20240214);
    // no photos on the hero, so the teddy can sit low beside the wrap instead of over the flowers
    const teddy = findAddon('teddy');
    if (teddy) demo.addonPos = { ...demo.addonPos, [teddy.id]: { x: 118, y: 640 } };
    drawBouquet($('#hero-bouquet'), demo, { animate: true });
  }

  /* ================================================================
     Studio
     ================================================================ */
  let step = 0;
  let bloomFilter = 'All';
  let built = false;
  const stageSvg = $('#stage-bouquet');

  function showStudio() {
    setView('studio');
    if (!built) buildStudio();
    renderAll();
  }

  const OCCASION_PAPER = { romance: 'blush', gratitude: 'kraft', apology: 'ivory', celebration: 'airmail', sympathy: 'parchment', 'after-dark': 'midnight' };
  function applyOccasionTo(st, occ, seed = randSeed()) {
    const rnd = mulberry32(seed);
    const stems = [];
    occ.flowers.forEach(([kind, color, n]) => {
      const f = findFlower(kind, color);
      if (f) for (let i = 0; i < n; i++) stems.push({ id: f.id });
    });
    for (let i = stems.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [stems[i], stems[j]] = [stems[j], stems[i]];
    }
    return {
      ...st,
      seed,
      occasion: occ.id,
      stems: stems.slice(0, MAX_STEMS),
      greenery: occ.greens.map(findGreen).filter(Boolean).map((g) => g.id).slice(0, MAX_GREEN),
      wrap: findWrap(occ.wrap)?.id || st.wrap,
      ribbon: occ.ribbon,
      envelope: findEnv(occ.envelope)?.id || st.envelope,
      seal: occ.seal,
      card: { ...st.card, paper: OCCASION_PAPER[occ.id] || st.card.paper },
      addons: (occ.addons || []).map(findAddon).filter(Boolean).map((a) => a.id).slice(0, MAX_ADDONS),
      addonPos: {},
    };
  }

  function update(mut, opts = {}) {
    mut(state);
    save();
    renderAll(opts);
  }

  function goStep(i) {
    step = clamp(i, 0, STEPS.length - 1);
    if (STEPS[step].id !== 'extras') { Music.stop(); try { ytPreview?.pauseVideo(); } catch { /* not ready */ } }
    renderSteps();
    if (window.matchMedia('(max-width: 960px)').matches) $('.panel-col').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- build (once) ---------- */
  function buildStudio() {
    built = true;
    document.querySelectorAll('[data-max-stems]').forEach((e) => (e.textContent = MAX_STEMS));
    document.querySelectorAll('[data-max-green]').forEach((e) => (e.textContent = MAX_GREEN));
    document.querySelectorAll('[data-max-addons]').forEach((e) => (e.textContent = MAX_ADDONS));

    $('#steps').append(...STEPS.map((st, i) =>
      h('button', { class: 'step-tab', type: 'button', 'data-i': i, onclick: () => goStep(i) }, h('b', { text: i + 1 }), h('span', { text: st.label }))));

    // occasions
    const occWrap = $('#occasions');
    OCCASIONS.forEach((o) => {
      const dots = o.flowers.map(([k, c]) => findFlower(k, c)).filter(Boolean).map((f) => h('i', { style: `background:${flowerHex(f)}` }));
      occWrap.append(h('button', {
        class: 'occ', type: 'button', 'data-id': o.id,
        onclick: () => {
          update((st) => Object.assign(st, applyOccasionTo(st, o)));
          toast(`${o.name} arrangement gathered. Now make it yours.`);
          setTimeout(() => goStep(1), 350);
        },
      }, h('h3', { text: o.name }), h('p', { text: o.line }), h('span', { class: 'dots' }, dots)));
    });
    occWrap.append(h('button', {
      class: 'occ occ-blank', type: 'button',
      onclick: () => { update((st) => { st.occasion = null; st.stems = []; st.greenery = []; }); goStep(1); },
    }, h('h3', { text: 'Blank canvas' }), h('p', { text: 'Start with an empty vase and choose every stem yourself.' })));

    // bloom filters + cards
    // one filter per Flowers/ sub-folder (e.g. "Ranunculus", "Others")
    const catchAll = (k) => /^(others?|mixed|misc|more)$/i.test(k);
    const groups = ['All', ...[...new Set(ASSETS.flowers.map((f) => f.kinds || f.kind))].sort((a, b) => catchAll(a) - catchAll(b))];
    $('#bloom-filters').append(...groups.map((k) => h('button', {
      class: 'chip', type: 'button', 'data-kind': k,
      onclick: () => { bloomFilter = k; syncBlooms(); },
    }, k)));

    $('#blooms').append(...ASSETS.flowers.map((f) => h('div', { class: 'pick', 'data-id': f.id, 'data-kind': f.kinds || f.kind },
      h('button', { class: 'pick-main', type: 'button', 'aria-label': `Add a ${flowerLabel(f)}`, onclick: () => addStem(f.id) },
        h('span', { class: 'thumb' }, h('img', { src: f.src, alt: '', loading: 'lazy', decoding: 'async' })),
        h('span', { class: 'name', text: f.name }),
        h('span', { class: 'kind', text: f.kind })),
      h('span', { class: 'badge', hidden: true }),
      h('div', { class: 'stepper' },
        h('button', { type: 'button', class: 'minus', 'aria-label': `Remove a ${flowerLabel(f)}`, onclick: () => removeStem(f.id) }, '−'),
        h('output', { text: '0' }),
        h('button', { type: 'button', class: 'plus', 'aria-label': `Add a ${flowerLabel(f)}`, onclick: () => addStem(f.id) }, '+')))));
    if (!ASSETS.flowers.length) $('#blooms').append(h('p', { class: 'fineprint', text: 'No flowers found. Add images to Flowers/<Kind>/ and run node tools/build-manifest.js.' }));

    // greenery
    $('#greenery').append(...ASSETS.greenery.map((g) => h('button', {
      class: 'pick', type: 'button', 'data-id': g.id, 'aria-pressed': 'false',
      onclick: () => update((st) => {
        if (st.greenery.includes(g.id)) st.greenery = st.greenery.filter((x) => x !== g.id);
        else if (st.greenery.length >= MAX_GREEN) toast(`Up to ${MAX_GREEN} kinds of greenery. Remove one first.`);
        else st.greenery.push(g.id);
      }),
    }, h('span', { class: 'thumb' }, h('img', { src: g.src, alt: '', loading: 'lazy' })), h('span', { class: 'name', text: g.name }), h('span', { class: 'check', text: '✓' }))));

    // wraps
    $('#wraps').append(...ASSETS.wraps.map((w) => h('button', {
      class: 'pick', type: 'button', 'data-id': w.id, 'aria-pressed': 'false',
      onclick: () => update((st) => { st.wrap = w.id; }),
    }, h('span', { class: 'thumb' }, w.back && h('img', { src: w.back, alt: '' }), w.front && h('img', { src: w.front, alt: '' })),
    h('span', { class: 'name', text: w.name }), h('span', { class: 'check', text: '✓' }))));

    $('#addons').append(...(ASSETS.addons || []).map((a) => h('button', {
      class: 'pick', type: 'button', 'data-id': a.id, 'aria-pressed': 'false',
      onclick: () => update((st) => {
        if (st.addons.includes(a.id)) { st.addons = st.addons.filter((x) => x !== a.id); delete st.addonPos[a.id]; }
        else if (st.addons.length >= MAX_ADDONS) toast(`Up to ${MAX_ADDONS} add-ons. Remove one first.`);
        else st.addons.push(a.id);
      }),
    }, h('span', { class: 'thumb' }, h('img', { src: a.src, alt: '' })), h('span', { class: 'name', text: a.name }), h('span', { class: 'check', text: '✓' }))));

    $('#ribbons').append(...RIBBONS.map((r) => h('button', {
      class: 'swatch', type: 'button', 'data-id': r.id,
      onclick: () => update((st) => { st.ribbon = r.id; }),
    }, h('i', { style: `background:linear-gradient(135deg, ${r.l}, ${r.c} 60%, ${r.d})` }), r.name)));

    // letter
    const to = $('#in-to'), msg = $('#in-msg'), from = $('#in-from');
    to.addEventListener('input', () => update((st) => { st.card.to = to.value; }, { light: true }));
    msg.addEventListener('input', () => update((st) => { st.card.msg = msg.value; }, { light: true }));
    from.addEventListener('input', () => update((st) => { st.card.from = from.value; }, { light: true }));
    const suggest = h('button', {
      class: 'linkish', type: 'button',
      onclick: () => {
        const occ = byId(OCCASIONS, state.occasion) || OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)];
        msg.value = occ.note;
        update((st) => { st.card.msg = occ.note; }, { light: true });
      },
    }, 'Need words? Use a suggestion');
    msg.closest('.field').after(suggest);

    $('#fonts').append(...FONTS.map((f) => h('button', {
      type: 'button', 'data-id': f.id, title: f.name, 'aria-label': f.name, style: `font-family:${f.css}`,
      onclick: () => update((st) => { st.card.font = f.id; }),
    }, f.id === 'serif' ? 'Classic' : f.name)));

    $('#papers').append(...PAPERS.map((p) => {
      const face = h('span', { class: 'paper-face paper-mini' }, h('i'), h('i'), h('i'));
      paintPaper(face, p.id);
      return h('button', {
        class: 'paper-pick', type: 'button', 'data-id': p.id, 'aria-pressed': 'false', title: p.name,
        onclick: () => update((st) => { st.card.paper = p.id; }),
      }, face, h('span', { class: 'name', text: p.name }));
    }));

    $('#envelopes').append(...ASSETS.envelopes.map((e) => h('button', {
      class: 'pick', type: 'button', 'data-id': e.id, 'aria-pressed': 'false',
      onclick: () => update((st) => { st.envelope = e.id; }),
    }, h('span', { class: 'thumb', style: `background-image:url("${e.src}")` }), h('span', { class: 'name', text: e.name }), h('span', { class: 'check', text: '✓' }))));

    $('#seals').append(...SEALS.map((sl) => h('button', {
      class: 'swatch', type: 'button', 'data-id': sl.id,
      onclick: () => update((st) => { st.seal = sl.id; }),
    }, h('i', { style: `background:radial-gradient(circle at 35% 30%, ${sl.h}, ${sl.c} 55%, ${sl.d})` }), sl.name)));

    // photos & music
    const fileInput = h('input', {
      type: 'file', accept: 'image/*', multiple: true, hidden: true,
      onchange: (e) => { addPhotos(e.target.files); e.target.value = ''; },
    });
    photoAdd = h('label', { class: 'photo-add' }, fileInput,
      h('span', { class: 'plus-mark', text: '+' }), h('span', { text: 'Add photos' }), h('small', { text: 'or drop them here' }));
    const zone = $('#photos');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag'); addPhotos(e.dataTransfer.files); });

    $('#frames').append(...FRAMES.map((f) => h('button', {
      class: 'frame-pick', type: 'button', 'data-id': f.id, 'aria-pressed': 'false',
      onclick: () => update((st) => { st.photoFrame = f.id; }),
    }, h('span', { class: 'pf frame-mini', 'data-frame': f.id }, h('i', { class: 'pf-deco' }), h('span', { class: 'fm-photo' })), h('span', { class: 'name', text: f.name }))));

    const tracks = [{ id: null, name: 'No music', mood: 'Let the letter speak for itself' }, ...Music.TRACKS];
    $('#tracks').append(...tracks.map((tr) => h('div', { class: 'track', 'data-id': tr.id || '' },
      h('button', {
        class: 'track-main', type: 'button', 'aria-pressed': 'false',
        onclick: () => { setYT(null); update((st) => { st.music = tr.id; }); if (tr.id) Music.play(tr.id); else Music.stop(); },
      }, h('span', { class: 'track-name', text: tr.name }), h('span', { class: 'track-mood', text: tr.mood })),
      tr.id && h('button', {
        class: 'track-play', type: 'button', 'aria-label': `Preview ${tr.name}`,
        onclick: () => (Music.current() === tr.id ? Music.stop() : Music.play(tr.id)),
      }, h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))))));

    // stage tools
    $('#btn-shuffle').onclick = () => update((st) => { st.seed = randSeed(); st.stems = st.stems.map((x) => ({ id: x.id })); });
    $('#btn-reset-layout').onclick = () => update((st) => { st.stems = st.stems.map((x) => ({ id: x.id })); st.addonPos = {}; });
    $('#btn-clear').onclick = () => update((st) => { st.stems = []; });

    // nav
    $('#btn-back').onclick = () => goStep(step - 1);
    $('#btn-next').onclick = () => {
      if (STEPS[step].id === 'blooms' && !state.stems.length) return toast('Add at least one stem to continue.');
      goStep(step + 1);
    };

    // send
    $('#btn-copy').onclick = copyLink;
    $('#btn-preview').onclick = async () => {
      if (!state.stems.length) return toast('Add a few stems first.');
      if (!lockReady()) return toast('Choose a password of at least 4 characters, or switch the lock off.');
      const win = window.open('', '_blank'); // open now so the browser doesn't block it as a pop-up
      try {
        const link = await makeLink();
        if (win) { win.opener = null; win.location.href = link; } else window.open(link, '_blank', 'noopener');
      } catch (err) { win?.close(); toast(err.message); }
    };
    $('#btn-download').onclick = () => exportPNG(state);
    $('#btn-video').onclick = () => recordClip(state);

    // password lock
    const lockOn = $('#lock-on'), lockPw = $('#lock-pw'), lockHint = $('#lock-hint');
    lockOn.addEventListener('change', () => {
      lock.on = lockOn.checked;
      $('#lock-fields').hidden = !lock.on;
      if (lock.on) lockPw.focus();
      renderSummary();
    });
    lockPw.addEventListener('input', () => { lock.pw = lockPw.value; renderSummary(); });
    lockHint.addEventListener('input', () => { lock.hint = lockHint.value; renderSummary(); });
    $('#pw-eye').addEventListener('click', () => {
      const show = lockPw.type === 'password';
      lockPw.type = show ? 'text' : 'password';
      $('#pw-eye').textContent = show ? 'Hide' : 'Show';
    });
    $('#btn-new').onclick = () => {
      if (!confirm('Start over with an empty bouquet? Your current draft will be cleared.')) return;
      state = freshState();
      store.del(DRAFT_KEY);
      renderAll();
      goStep(0);
    };
    $('#file-note').hidden = location.protocol !== 'file:';

    setupDrag();
  }

  /* ---------- stem editing ---------- */
  let freshIndex = null;
  function addStem(id) {
    if (state.stems.length >= MAX_STEMS) return toast(`A hand-tied bouquet holds ${MAX_STEMS} stems at most.`);
    freshIndex = state.stems.length;
    update((st) => st.stems.push({ id }));
    freshIndex = null;
  }
  function removeStem(id) {
    const idx = state.stems.map((x) => x.id).lastIndexOf(id);
    if (idx >= 0) update((st) => st.stems.splice(idx, 1));
  }

  /* ---------- rendering ---------- */
  function renderAll(opts = {}) {
    renderStage();
    if (opts.light) return renderTag();
    renderSteps();
    syncOccasions();
    syncBlooms();
    syncPicks('#greenery', (id) => state.greenery.includes(id));
    syncPicks('#wraps', (id) => state.wrap === id);
    syncPicks('#addons', (id) => state.addons.includes(id));
    // wraps with their own bow don't need the ribbon picker
    $('#ribbon-section').hidden = byId(ASSETS.wraps, state.wrap)?.ribbon === false;
    syncPicks('#envelopes', (id) => state.envelope === id);
    syncPressed('#ribbons', state.ribbon);
    syncPressed('#seals', state.seal);
    syncPressed('#fonts', state.card.font);
    syncPressed('#papers', state.card.paper);
    syncLetterInputs();
    syncPhotos();
    syncTracks();
    syncYTPreview();
    renderSummary();
  }

  function renderStage() {
    drawBouquet(stageSvg, state, { fresh: freshIndex });
    layoutAddons(state).forEach((a) => alphaMap(a.a.src));
    const n = state.stems.length;
    $('#stage-empty').hidden = n > 0;
    $('#stage-count').textContent = `${n} ${n === 1 ? 'stem' : 'stems'}`;
    $('#btn-shuffle').disabled = $('#btn-reset-layout').disabled = n < 2;
    renderTag();
    renderPhotoSlot();
  }

  // Lower-left of the preview: where the photo pile will sit on the recipient's page.
  // Where the photo pile sits on the recipient's page, as a share of the bouquet's box
  // (measured from the final page): left, top, width, height.
  const PILE_BOX = [0.068, 0.815, 0.25, 0.22];
  function placePhotoSlot() {
    const slot = $('#stage-photos'), stage = $('#stage');
    const s = stageSvg.getBoundingClientRect(), st = stage.getBoundingClientRect();
    if (!s.width || !st.width) return;
    const [l, t, w, hh] = PILE_BOX;
    const height = hh * s.height;
    // the pile hangs a little below the bouquet; inside the preview box, lift it just enough to stay whole
    const top = Math.min(s.top - st.top + t * s.height, st.height - height - 14);
    Object.assign(slot.style, {
      left: `${s.left - st.left + l * s.width}px`, top: `${top}px`,
      width: `${w * s.width}px`, height: `${height}px`,
    });
  }
  window.addEventListener('resize', placePhotoSlot);
  // The final page uses the same box, so the studio preview and the result always match.
  function placeViewerPile() {
    const pile = $('#reveal-photos .photo-stack');
    if (!pile) return;
    const s = $('#viewer-bouquet').getBoundingClientRect(), g = $('#reveal-photos').getBoundingClientRect();
    if (!s.width) return;
    const [l, t, w, hh] = PILE_BOX;
    Object.assign(pile.style, {
      left: `${s.left - g.left + l * s.width}px`, top: `${s.top - g.top + t * s.height}px`,
      width: `${w * s.width}px`, height: `${hh * s.height}px`, transform: 'none', aspectRatio: 'auto',
    });
  }
  window.addEventListener('resize', placeViewerPile);
  function renderPhotoSlot() {
    const slot = $('#stage-photos');
    requestAnimationFrame(placePhotoSlot);
    const photos = state.photos;
    slot.classList.toggle('has-photos', photos.length > 0);
    slot.setAttribute('aria-label', photos.length
      ? `${photos.length} photo${photos.length > 1 ? 's' : ''} will sit here. Edit photos`
      : 'Your photos will sit here. Add photos');
    const key = photos.map((p) => p.src.length + (p.cap || '')).join('|') + state.photoFrame;
    if (slot.dataset.key === key) return;
    slot.dataset.key = key;
    if (!photos.length) {
      slot.replaceChildren(
        h('span', { class: 'sp-empty', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>' }),
        h('span', { class: 'sp-label', text: 'Your photos go here' }));
      return;
    }
    const [r0, r1, r2] = [-7, 5, -2];
    slot.replaceChildren(...photos.slice(0, 3).map((p, i) => h('span', {
      class: 'sp-card pf', 'data-frame': state.photoFrame,
      style: `--r:${[r0, r1, r2][i]}deg; --ox:${[0, 7, -5][i]}%; --oy:${[0, -4, -7][i]}%; z-index:${i + 1}`,
    }, h('i', { class: 'pf-deco' }), h('img', { src: p.src, alt: '' }))),
    h('span', { class: 'sp-label sp-count', text: `${photos.length} photo${photos.length > 1 ? 's' : ''}` }));
  }
  $('#stage-photos').addEventListener('click', () => goStep(STEPS.findIndex((s) => s.id === 'extras')));

  function renderTag() {
    const tag = $('#tag-card');
    const { to, msg, font, paper } = state.card;
    tag.hidden = !(to || msg);
    paintPaper(tag, paper);
    $('.tag-to', tag).textContent = to ? `For ${to}` : 'For you';
    const m = $('.tag-msg', tag);
    m.textContent = msg;
    m.style.fontFamily = byId(FONTS, font).css;
    $('#msg-count').textContent = `${msg.length} / 600`;
    if (document.body.dataset.view === 'studio' && STEPS[step].id === 'send') renderSummary();
  }

  function renderSteps() {
    document.querySelectorAll('.step-tab').forEach((t, i) => {
      t.classList.toggle('done', i < step);
      if (i === step) t.setAttribute('aria-current', 'step');
      else t.removeAttribute('aria-current');
    });
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.dataset.step === STEPS[step].id));
    $('#btn-back').style.visibility = step === 0 ? 'hidden' : 'visible';
    $('#btn-next').hidden = step === STEPS.length - 1;
    $('#btn-next').textContent = step === STEPS.length - 2 ? 'Review & send' : 'Continue';
    if (STEPS[step].id === 'send') renderSummary();
  }

  function syncOccasions() {
    document.querySelectorAll('#occasions .occ[data-id]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.occasion)));
  }

  function syncBlooms() {
    const total = state.stems.length;
    document.querySelectorAll('#bloom-filters .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.kind === bloomFilter)));
    document.querySelectorAll('#blooms .pick').forEach((card) => {
      const n = state.stems.filter((x) => x.id === card.dataset.id).length;
      card.hidden = bloomFilter !== 'All' && card.dataset.kind !== bloomFilter;
      card.classList.toggle('on', n > 0);
      const badge = $('.badge', card);
      badge.hidden = n === 0;
      badge.textContent = n;
      $('output', card).textContent = n;
      $('.minus', card).disabled = n === 0;
      $('.plus', card).disabled = total >= MAX_STEMS;
    });
    $('#stem-meter').style.width = `${(total / MAX_STEMS) * 100}%`;
  }

  function syncPicks(sel, isOn) {
    document.querySelectorAll(`${sel} .pick`).forEach((p) => {
      const on = isOn(p.dataset.id);
      p.classList.toggle('on', on);
      p.setAttribute('aria-pressed', String(on));
    });
  }
  function syncPressed(sel, id) {
    document.querySelectorAll(`${sel} [data-id]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
  }
  function syncLetterInputs() {
    const occ = byId(OCCASIONS, state.occasion);
    $('#in-msg').placeholder = occ ? occ.note : 'Write something only you could say…';
    for (const [sel, key] of [['#in-to', 'to'], ['#in-msg', 'msg'], ['#in-from', 'from']]) {
      const input = $(sel);
      if (document.activeElement !== input && input.value !== state.card[key]) input.value = state.card[key];
    }
  }

  function renderSummary() {
    const dl = $('#summary');
    const greens = state.greenery.map((id) => byId(ASSETS.greenery, id)?.name).filter(Boolean);
    const rows = [
      ['For', state.card.to || '—'],
      ['Blooms', state.stems.length ? describe(state) : 'None yet'],
      ['Greenery', greens.join(', ') || 'None'],
      ['Wrap', [byId(ASSETS.wraps, state.wrap)?.name, byId(ASSETS.wraps, state.wrap)?.ribbon === false ? 'satin bow' : `${byId(RIBBONS, state.ribbon).name} ribbon`].filter(Boolean).join(' · ')],
      ['Add-ons', state.addons.map((id) => byId(ASSETS.addons || [], id)?.name).filter(Boolean).join(', ') || 'None'],
      ['Letter', `${state.card.msg ? `${state.card.msg.length} characters, ${byId(FONTS, state.card.font).name.toLowerCase()}` : 'No message yet'} · ${paperOf(state.card.paper).name}`],
      ['Envelope', [byId(ASSETS.envelopes, state.envelope)?.name, `${byId(SEALS, state.seal).name} seal`].filter(Boolean).join(' · ')],
      ['Photos', state.photos.length ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} · ${byId(FRAMES, state.photoFrame).name} frame` : 'None'],
      ['Music', state.yt ? `YouTube · ${state.yt.title || 'your song'}` : Music.TRACKS.find((t) => t.id === state.music)?.name || 'None'],
      ['From', state.card.from || '—'],
      ['Password', lock.on ? (lock.pw.length >= 4 ? `On${lock.hint.trim() ? ` · hint “${lock.hint.trim()}”` : ''}` : 'On, choose a password') : 'Off'],
    ];
    dl.replaceChildren(...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
    const ready = state.stems.length > 0;
    ['#btn-copy', '#btn-preview', '#btn-download'].forEach((sel) => ($(sel).disabled = !ready));
    // sealed links carry the same bouquet encrypted (about a third longer)
    const size = !ready ? 0 : lock.on ? Math.round(shareLink().length * 1.34 + 60 + lock.hint.length * 3) : shareLink().length;
    const note = $('#link-size');
    note.textContent = !ready ? ''
      : size > LONG_LINK
        ? `Link size: ${Math.round(size / 1024)} KB. That is long: it works in browsers and email, but some chat apps may cut it off. Fewer photos keep it short.`
        : `Link size: ${Math.max(1, Math.round(size / 1024))} KB`;
    note.classList.toggle('warn', size > LONG_LINK);
  }

  /* ---------- photos ---------- */
  let photoAdd = null;

  function syncPhotos() {
    const zone = $('#photos');
    if (document.activeElement?.classList.contains('cap')) return; // don't rebuild under the caret
    const tiles = state.photos.map((p, i) => h('figure', { class: 'photo pf', 'data-frame': state.photoFrame },
      h('i', { class: 'pf-deco', 'aria-hidden': 'true' }),
      h('img', { src: p.src, alt: p.cap || `Photo ${i + 1}` }),
      h('input', {
        class: 'cap', maxlength: 60, placeholder: 'Caption (optional)', value: p.cap, 'aria-label': `Caption for photo ${i + 1}`,
        oninput: (e) => update((st) => { st.photos[i].cap = e.target.value; }, { light: true }),
      }),
      h('button', { class: 'photo-x', type: 'button', 'aria-label': `Remove photo ${i + 1}`, onclick: () => update((st) => st.photos.splice(i, 1)) }, '×')));
    if (state.photos.length < MAX_PHOTOS) tiles.push(photoAdd);
    zone.replaceChildren(...tiles);
    syncPressed('#frames', state.photoFrame);
    $('#photo-hint').textContent = CLOUD
      ? `Up to ${MAX_PHOTOS} photos, uploaded to your photo storage at full quality.`
      : `Up to ${MAX_PHOTOS} photos. They travel inside the link itself, so they are resized to keep it short.`;
  }

  async function addPhotos(files) {
    const room = MAX_PHOTOS - state.photos.length;
    if (room <= 0) return toast(`Up to ${MAX_PHOTOS} photos per bouquet.`);
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return toast('Choose an image file (JPG, PNG or WebP).');
    if (list.length > room) toast(`Only ${room} more photo${room > 1 ? 's' : ''} fit, so the rest were skipped.`);
    $('#photos').classList.add('busy');
    for (const file of list.slice(0, room)) {
      try {
        const src = await preparePhoto(file);
        update((st) => { if (st.photos.length < MAX_PHOTOS) st.photos.push({ src, cap: '' }); });
      } catch (err) {
        console.warn(err);
        toast(CLOUD ? `"${file.name}" could not be uploaded.` : `"${file.name}" could not be read. Try a JPG or PNG.`);
      }
    }
    $('#photos').classList.remove('busy');
  }

  async function preparePhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
    const draw = (max) => {
      const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = h('canvas', { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
      const g = c.getContext('2d');
      g.fillStyle = '#fffdf8'; // flatten transparency: alpha costs bytes
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(bmp, 0, 0, c.width, c.height);
      return c;
    };
    if (CLOUD) return uploadPhoto(await new Promise((res) => draw(1600).toBlob(res, 'image/jpeg', 0.85)));
    // Inside the link every byte counts: step size and quality down until the photo fits the budget.
    const BUDGET = 36000; // base64 characters, about 27 KB
    let url = '';
    for (const [max, q] of [[560, 0.62], [520, 0.52], [460, 0.45], [400, 0.4], [340, 0.36]]) {
      const c = draw(max);
      url = c.toDataURL('image/webp', q);
      if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', q + 0.08); // Safari can't encode WebP
      if (url.length <= BUDGET) break;
    }
    return url;
  }

  async function uploadPhoto(blob) {
    const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const res = await fetch(`${CLOUD.url}/storage/v1/object/${CLOUD.bucket}/${name}`, {
      method: 'POST',
      headers: { apikey: CLOUD.anonKey, Authorization: `Bearer ${CLOUD.anonKey}`, 'Content-Type': 'image/jpeg' },
      body: blob,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
    return `${CLOUD.url}/storage/v1/object/public/${CLOUD.bucket}/${name}`;
  }

  /* ---------- music ---------- */
  function syncTracks() {
    document.querySelectorAll('#tracks .track').forEach((t) => {
      const id = t.dataset.id || null;
      $('.track-main', t).setAttribute('aria-pressed', String(id === state.music));
      t.classList.toggle('playing', !!id && Music.current() === id);
    });
  }

  /* ---------- YouTube songs ---------- */
  function parseYouTube(text) {
    let u;
    try { u = new URL(String(text).trim()); } catch { return null; }
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1, 12);
    else if (/^(youtube\.com|youtube-nocookie\.com)$/.test(host)) {
      id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/) || [])[1];
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    const t = u.searchParams.get('t') || u.searchParams.get('start') || '';
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    const start = m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
    return { id, start: Math.min(start, 36000), title: '' };
  }
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  let ytApi = null;
  function loadYT() {
    if (window.YT?.Player) return Promise.resolve();
    if (!ytApi) {
      ytApi = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
        const tag = h('script', { src: 'https://www.youtube.com/iframe_api', async: true });
        tag.onerror = () => { ytApi = null; reject(new Error('YouTube could not be reached.')); };
        document.head.append(tag);
      });
    }
    return ytApi;
  }
  // A fresh element for a player (YT replaces the element it is given with an iframe).
  function ytSlot(id) {
    const old = document.getElementById(id);
    const slot = h('div', { id });
    old.replaceWith(slot);
    return slot;
  }
  /* Mounts a YouTube player and makes sure it either works or fails gracefully:
     tries the privacy-mode player, then the regular one, and calls onFail(reason) if neither
     becomes ready (blocked by an extension or network, embedding disabled, opened from disk). */
  function mountYT(slotId, yt, { onReady, onStateChange, onFail }) {
    const hosts = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];
    let player = null, cur = -1, done = false, timer = 0;
    const api = {
      get player() { return player; },
      destroy() { done = true; clearTimeout(timer); try { player?.destroy(); } catch { /* ignore */ } },
    };
    const fail = (why) => { if (done) return; done = true; clearTimeout(timer); try { player?.destroy(); } catch { /* ignore */ } onFail(why); };
    if (location.protocol === 'file:') { setTimeout(() => fail('file'), 0); return api; }
    const attempt = (i) => {
      if (done) return;
      if (i >= hosts.length) return fail('blocked');
      cur = i;
      try { player?.destroy(); } catch { /* ignore */ }
      player = new YT.Player(ytSlot(slotId), {
        host: hosts[i], videoId: yt.id, width: '100%', height: '100%',
        playerVars: { start: yt.start || 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => { if (done || cur !== i) return; clearTimeout(timer); onReady?.(e); },
          onStateChange: (e) => { if (!done && cur === i) onStateChange?.(e); },
          onError: (e) => {
            if (done || cur !== i) return;
            clearTimeout(timer);
            if ([100, 101, 150].includes(e.data)) fail('owner'); // removed, or embedding turned off by the owner
            else attempt(i + 1);
          },
        },
      });
      timer = setTimeout(() => attempt(i + 1), 7000); // never became ready: probably blocked
    };
    loadYT().then(() => attempt(0)).catch(() => fail('offline'));
    return api;
  }
  const ytWatchUrl = (yt) => `https://www.youtube.com/watch?v=${yt.id}${yt.start ? `&t=${yt.start}s` : ''}`;
  const YT_WHY = {
    owner: 'The song’s owner only allows it to play on YouTube.',
    file: 'Songs play here once the site is opened with npm run dev or hosted online.',
    blocked: 'The player couldn’t load here (a browser extension or network may be blocking it).',
    offline: 'YouTube couldn’t be reached.',
  };
  // Replaces a dead player with the song's cover and a button to listen on YouTube.
  function ytFallback(container, yt, why) {
    const img = h('img', { src: `https://i.ytimg.com/vi/${yt.id}/hqdefault.jpg`, alt: '', loading: 'lazy' });
    img.onerror = () => img.remove();
    container.replaceChildren(h('a', { class: 'yt-fallback', href: ytWatchUrl(yt), target: '_blank', rel: 'noopener' },
      img, h('span', { class: 'yt-fb-text' }, h('b', { text: '▶ Listen on YouTube ↗' }), h('small', { text: YT_WHY[why] || '' }))));
  }

  // studio preview
  let ytPreview = null, ytPreviewId = '';
  function setYT(yt) {
    if (!yt) {
      ytPreview?.destroy();
      ytPreview = null;
      ytPreviewId = '';
      if (state.yt) update((st) => { st.yt = null; });
      return;
    }
    Music.stop();
    update((st) => { st.yt = yt; st.music = null; });
  }
  function syncYTPreview() {
    const box = $('#yt-preview');
    box.hidden = !state.yt;
    if (!state.yt) return;
    $('#yt-title').textContent = state.yt.title || 'Loading…';
    $('#yt-start').textContent = state.yt.start ? `Starts at ${fmtTime(state.yt.start)}` : '';
    if (ytPreviewId === `${state.yt.id}@${state.yt.start}`) return;
    ytPreviewId = `${state.yt.id}@${state.yt.start}`;
    const yt = state.yt;
    ytPreview?.destroy();
    $('.yt-frame').replaceChildren(h('div', { id: 'yt-preview-player' }));
    ytPreview = mountYT('yt-preview-player', yt, {
      onReady: (e) => {
        const title = e.target.getVideoData?.().title || '';
        if (title && state.yt?.id === yt.id) update((st) => { st.yt.title = title.slice(0, 100); }, { light: true });
        $('#yt-title').textContent = title || 'Your song';
      },
      onFail: (why) => {
        if (state.yt?.id !== yt.id) return;
        ytFallback($('.yt-frame'), yt, why);
        if (!state.yt.title) $('#yt-title').textContent = 'Your YouTube song';
        if (why === 'owner') toast('This song can’t play inside the page. The recipient gets a “Listen on YouTube” button instead.');
      },
    });
  }
  $('#yt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const yt = parseYouTube($('#yt-url').value);
    if (!yt) return toast('That doesn’t look like a YouTube link. Copy it from the Share button on YouTube.');
    $('#yt-url').value = '';
    setYT(yt);
    toast('Song added. Press play on the preview to check it.');
  });
  $('#yt-remove').addEventListener('click', () => setYT(null));

  /* ---------- the record card on the recipient's page ---------- */
  let ytViewer = null, ytViewerReady = false, ytWantPlay = false, ytState = -1, ytFailed = false;
  function prepareViewerMusic(st) {
    ytViewer?.destroy();
    ytViewer = null;
    ytViewerReady = false;
    ytWantPlay = false;
    ytState = -1;
    ytFailed = false;
    const card = $('#music-card');
    card.classList.remove('show', 'playing', 'yt-failed');
    card.classList.toggle('is-yt', !!st.yt);
    $('#mc-yt').replaceChildren(h('div', { id: 'mc-yt-player' }));
    if (!st.yt) return;
    ytViewer = mountYT('mc-yt-player', st.yt, {
      onReady: (e) => {
        if (viewing !== st) return;
        ytViewerReady = true;
        if (!st.yt.title) st.yt.title = (e.target.getVideoData?.().title || '').slice(0, 100);
        if (ytWantPlay) e.target.playVideo();
        syncMusicCard();
      },
      onStateChange: (e) => { ytState = e.data; syncMusicCard(); },
      onFail: (why) => {
        if (viewing !== st) return;
        ytFailed = true;
        card.classList.add('yt-failed');
        ytFallback($('#mc-yt'), st.yt, why);
        syncMusicCard();
      },
    });
  }
  function startViewerMusic() {
    if (!viewing) return;
    if (viewing.yt) {
      ytWantPlay = true;
      if (ytViewerReady) ytViewer.player.playVideo();
      $('#music-card').classList.add('show');
    } else if (viewing.music) {
      Music.play(viewing.music);
    }
    syncMusicCard();
  }
  function stopViewerMusic() {
    Music.stop();
    ytWantPlay = false;
    if (ytViewerReady) { try { ytViewer.player.pauseVideo(); ytViewer.player.seekTo(viewing?.yt?.start || 0, true); } catch { /* ignore */ } }
    $('#music-card').classList.remove('show', 'playing');
  }
  function syncMusicCard() {
    const card = $('#music-card');
    const inViewer = document.body.dataset.view === 'viewer' && viewing;
    const yt = inViewer && viewing.yt;
    const builtIn = inViewer && !yt && Music.current();
    const playing = yt ? !ytFailed && (ytState === 1 || ytState === 3) : builtIn && !Music.isPaused();
    if (builtIn) card.classList.add('show');
    if (!inViewer) card.classList.remove('show');
    card.classList.toggle('playing', !!playing);
    const title = yt ? viewing.yt.title || 'A song for you' : Music.TRACKS.find((t) => t.id === (Music.current() || viewing?.music))?.name || '';
    $('#mc-title').textContent = title;
    $('#mc-kicker').textContent = yt && ytFailed ? 'A song for you' : playing ? 'Now playing' : 'Paused · tap the record';
    $('#mc-disk').setAttribute('aria-label', yt && ytFailed ? `Listen to ${title} on YouTube` : `${playing ? 'Pause' : 'Play'} ${title}`);
  }
  $('#mc-disk').addEventListener('click', () => {
    if (!viewing) return;
    if (viewing.yt) {
      if (ytFailed) { window.open(ytWatchUrl(viewing.yt), '_blank', 'noopener'); return; }
      if (!ytViewerReady) return;
      if (ytState === 1 || ytState === 3) ytViewer.player.pauseVideo(); else ytViewer.player.playVideo();
      return;
    }
    if (Music.current()) Music.togglePause(); else if (viewing.music) Music.play(viewing.music);
  });
  Music.onChange(() => { syncTracks(); syncMusicCard(); });

  /* ---------- drag to arrange ---------- */
  /* Add-ons are images with see-through areas (fairy lights span the whole bouquet), so we only
     pick one up when the press lands on a visible pixel. Alpha maps are loaded once per image. */
  const alphaMaps = new Map();
  function alphaMap(src) {
    if (alphaMaps.has(src)) return alphaMaps.get(src);
    const entry = { ready: false, data: null, w: 0, h: 0 };
    alphaMaps.set(src, entry);
    const im = new Image();
    im.onload = () => {
      const w = Math.min(400, im.naturalWidth || 400), hh = Math.round((w * (im.naturalHeight || w)) / (im.naturalWidth || w));
      const c = h('canvas', { width: w, height: hh });
      const g = c.getContext('2d');
      g.drawImage(im, 0, 0, w, hh);
      try { entry.data = g.getImageData(0, 0, w, hh).data; } catch { entry.data = null; } // file:// blocks pixel reads
      Object.assign(entry, { ready: true, w, h: hh });
    };
    im.src = src;
    return entry;
  }
  function hitsAddon(a, p) {
    const u = (p.x - a.x) / a.w, v = (p.y - a.y) / a.h;
    if (u < 0 || v < 0 || u > 1 || v > 1) return false;
    const m = alphaMap(a.a.src);
    if (!m.ready || !m.data) return u > 0.15 && u < 0.85 && v > 0.15 && v < 0.85; // fallback: inner box
    return m.data[(Math.floor(v * (m.h - 1)) * m.w + Math.floor(u * (m.w - 1))) * 4 + 3] > 40;
  }
  function addonAt(p, layer) {
    const list = layoutAddons(state).filter((a) => a.layer === layer);
    for (let i = list.length - 1; i >= 0; i--) if (hitsAddon(list[i], p)) return list[i];
    return null;
  }

  function setupDrag() {
    let drag = null;
    const toSvg = (e) => {
      const p = stageSvg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      return p.matrixTransform(stageSvg.getScreenCTM().inverse());
    };
    stageSvg.addEventListener('pointerdown', (e) => {
      const p = toSvg(e);
      // order matches what you see: front add-ons, then blooms, then add-ons behind the bouquet
      const bloom = e.target.closest('.bloom-pos');
      const a = addonAt(p, 'top') || (!bloom && addonAt(p, 'back'));
      if (a) {
        e.preventDefault();
        const el = stageSvg.querySelector(`.addon[data-aid="${CSS.escape(a.a.id)}"]`);
        drag = { kind: 'addon', a, el, dx: a.x - p.x, dy: a.y - p.y, moved: false };
        stageSvg.setPointerCapture(e.pointerId);
        el?.classList.add('dragging');
        return;
      }
      if (!bloom) return;
      e.preventDefault();
      drag = {
        kind: 'bloom', g: bloom, i: +bloom.dataset.i, rot: +bloom.dataset.rot, dx: +bloom.dataset.x - p.x, dy: +bloom.dataset.y - p.y,
        moved: false, stem: stageSvg.querySelector(`.stem[data-i="${bloom.dataset.i}"]`),
      };
      stageSvg.setPointerCapture(e.pointerId);
      bloom.classList.add('dragging');
      bloom.parentNode.appendChild(bloom);
    });
    stageSvg.addEventListener('pointermove', (e) => {
      const p = toSvg(e);
      if (!drag) { // show a grab cursor over anything that can be moved
        const over = addonAt(p, 'top') || e.target.closest('.bloom-pos') || addonAt(p, 'back');
        stageSvg.style.cursor = over ? 'grab' : '';
        return;
      }
      drag.moved = true;
      if (drag.kind === 'addon') {
        const { a } = drag;
        drag.x = clamp(p.x + drag.dx, -a.w * 0.3, 600 - a.w * 0.7); // may hang off the edge a little
        drag.y = clamp(p.y + drag.dy, -a.h * 0.3, 760 - a.h * 0.7);
        drag.el?.setAttribute('x', drag.x.toFixed(1));
        drag.el?.setAttribute('y', drag.y.toFixed(1));
        return;
      }
      drag.x = clamp(p.x + drag.dx, 40, 560);
      drag.y = clamp(p.y + drag.dy, 50, 560);
      drag.g.setAttribute('transform', `translate(${drag.x.toFixed(1)} ${drag.y.toFixed(1)}) rotate(${drag.rot})`);
      drag.stem?.setAttribute('d', stemPath(drag.x, drag.y));
    });
    const end = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.kind === 'addon') {
        d.el?.classList.remove('dragging');
        if (!d.moved) return;
        update((st) => { st.addonPos[d.a.a.id] = { x: Math.round(d.x + d.a.w / 2), y: Math.round(d.y + d.a.h / 2) }; });
        return;
      }
      d.g.classList.remove('dragging');
      if (!d.moved) return;
      const topZ = Math.max(0, ...state.stems.map((x) => x.z || 0));
      update((st) => { Object.assign(st.stems[d.i], { x: Math.round(d.x), y: Math.round(d.y), z: topZ + 1 }); });
    };
    stageSvg.addEventListener('pointerup', end);
    stageSvg.addEventListener('pointercancel', end);
  }

  /* ---------- share ---------- */
  async function copyLink() {
    if (!state.stems.length) return toast('Add a few stems first.');
    if (!lockReady()) return toast('Choose a password of at least 4 characters, or switch the lock off.');
    let link;
    try { link = await makeLink(); } catch (err) { return toast(err.message); }
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = h('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = link;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Private link copied. Paste it anywhere to send.');
  }

  // Greenery on its own canvas (stage units × scale), masked to the wrap like on screen.
  function greeneryLayer(sprigs, wrap, imgs, scale) {
    const gl = h('canvas', { width: Math.round(600 * scale), height: Math.round(760 * scale) });
    const gx = gl.getContext('2d');
    gx.scale(scale, scale);
    sprigs.forEach((sp) => {
      gx.save();
      gx.translate(300, GATHER.y);
      gx.rotate((sp.rot * Math.PI) / 180);
      if (sp.fan) gx.translate(-300, -GATHER.y);
      gx.drawImage(imgs.get(sp.g.src), sp.x, sp.y, sp.w, sp.h);
      gx.restore();
    });
    if (wrap?.back) {
      const [y0, y1] = wrap.greeneryFade || GREEN_FADE;
      const m = h('canvas', { width: gl.width, height: gl.height });
      const mx = m.getContext('2d');
      mx.scale(scale, scale);
      const fade = mx.createLinearGradient(0, y0, 0, y1);
      fade.addColorStop(0, '#000');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      mx.fillStyle = fade;
      mx.fillRect(0, 0, 600, 760);
      mx.drawImage(imgs.get(wrap.back), 0, 0, 600, 760);
      gx.setTransform(1, 0, 0, 1, 0, 0);
      gx.globalCompositeOperation = 'destination-in';
      gx.drawImage(m, 0, 0);
    }
    return gl;
  }

  const loadImage = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

  async function exportPNG(st) {
    if (!st.stems.length) return toast('Add a few stems first.');
    toast('Preparing your image…');
    try {
      const S = 2;
      const c = h('canvas', { width: 600 * S, height: 760 * S });
      const ctx = c.getContext('2d');
      ctx.scale(S, S);
      const bg = ctx.createRadialGradient(300, 330, 40, 300, 380, 520);
      bg.addColorStop(0, '#fffdfa');
      bg.addColorStop(1, '#efe5d8');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 600, 760);

      const wrap = byId(ASSETS.wraps, st.wrap);
      const blooms = layoutStems(st);
      const sprigs = layoutGreenery(st);
      const addons = layoutAddons(st);
      const srcs = new Set([wrap?.back, wrap?.front, ...sprigs.map((x) => x.g.src), ...blooms.map((b) => b.f.src), ...addons.map((a) => a.a.src)].filter(Boolean));
      const imgs = new Map(await Promise.all([...srcs].map(async (src) => [src, await loadImage(src)])));
      const ribbonSvg = `<svg xmlns="${SVGNS}" viewBox="0 0 600 760" width="600" height="760">${ribbonMarkup(st.ribbon, 'rb', wrap)}</svg>`;
      const ribbonImg = wrap?.ribbon === false ? null : await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ribbonSvg)}`);
      const drawAddons = (which) => addons.filter((a) => a.layer === which).forEach((a) => ctx.drawImage(imgs.get(a.a.src), a.x, a.y, a.w, a.h));
      const drawFront = () => { if (wrap?.front) ctx.drawImage(imgs.get(wrap.front), 0, 0, 600, 760); };

      if (wrap?.back) ctx.drawImage(imgs.get(wrap.back), 0, 0, 600, 760);
      drawAddons('back');
      ctx.drawImage(greeneryLayer(sprigs, wrap, imgs, S), 0, 0, 600, 760);
      ctx.strokeStyle = '#5f7a4a';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      blooms.forEach((b) => ctx.stroke(new Path2D(stemPath(b.x, b.y))));
      if (!wrap?.frontOnTop) drawFront();
      blooms.forEach((b) => {
        ctx.save();
        ctx.shadowColor = 'rgba(60,30,20,.28)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        ctx.translate(b.x, b.y);
        ctx.rotate((b.rot * Math.PI) / 180);
        ctx.drawImage(imgs.get(b.f.src), -b.size / 2, -b.size / 2, b.size, b.size);
        ctx.restore();
      });
      if (wrap?.frontOnTop) drawFront();
      if (ribbonImg) ctx.drawImage(ribbonImg, 0, 0, 600, 760);
      drawAddons('top');

      const blob = await new Promise((res, rej) => {
        try { c.toBlob((b) => (b ? res(b) : rej(new Error('empty'))), 'image/png'); } catch (err) { rej(err); }
      });
      const a = h('a', { href: URL.createObjectURL(blob), download: `bouquet${st.card.to ? '-for-' + st.card.to.trim().replace(/\s+/g, '-').toLowerCase() : ''}.png` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Bouquet image saved.');
    } catch (err) {
      console.warn(err);
      toast(location.protocol === 'file:'
        ? 'Browsers block image export from local files. Run node tools/serve.js and try again.'
        : 'Sorry, the image could not be created.');
    }
  }

  /* ================================================================
     Recipient view
     ================================================================ */
  let viewing = null;

  function showViewer(st) {
    viewing = st;
    setView('viewer');
    prepareViewerMusic(st);
    $('#lock-scene').hidden = true;
    document.title = st.card.to ? `A bouquet for ${st.card.to}` : 'A bouquet for you';
    const env = byId(ASSETS.envelopes, st.envelope);
    const envelope = $('#envelope');
    envelope.style.setProperty('--env', env ? `url("${new URL(env.src, location.href).href}")` : 'linear-gradient(#f3ecdf, #e7dcc8)');
    envelope.style.setProperty('--liner', (byId(SEALS, st.seal) || SEALS[0]).c);
    envelope.classList.toggle('dark', /midnight|noir|navy|dark/i.test(st.envelope || ''));
    $('#seal').innerHTML = sealSVG(st.seal, initial(st.card.from));
    $('#env-address').textContent = st.card.to ? `For ${st.card.to}` : 'For you';
    const envLetter = $('.env-letter');
    paintPaper(envLetter, st.card.paper);
    $('.el-to', envLetter).textContent = st.card.to ? `Dear ${st.card.to},` : 'For you,';
    $('#env-kicker').textContent = st.card.from ? `${st.card.from} sent you flowers` : 'Something arrived for you';
    resetEnvelope();
    // petals in this bouquet's own colours drift behind everything
    const palette = [...new Set(st.stems.map((x) => byId(ASSETS.flowers, x.id)).filter(Boolean).map(flowerHex))];
    window.BouqAmbient?.start(palette);
  }

  function resetEnvelope() {
    if (opening) { opening.cancelled = true; opening.finish?.(); opening = null; }
    const scene = $('#env-scene');
    scene.hidden = false;
    scene.classList.remove('leaving');
    const env = $('#envelope');
    env.querySelectorAll('.seal-half, .wax-crumb').forEach((el) => el.remove());
    [env, ...env.querySelectorAll('*'), $('#env-kicker')].forEach((el) => el.getAnimations?.().forEach((x) => x.cancel()));
    const envLetter = $('.env-letter', env);
    envLetter.style.transform = '';
    envLetter.style.zIndex = '';
    envLetter.classList.remove('pullable');
    $('#seal').style.visibility = '';
    $('.env-hint').textContent = 'Break the seal to open';
    env.classList.remove('open', 'opening');
    $('#reveal').hidden = true;
    $('#viewer').classList.remove('revealed');
    stopViewerMusic();
  }

  /* ---------- opening the envelope, step by step like a real one ---------- */
  let opening = null; // the open in progress: { cancelled, finish }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (el, frames, opts) => el.animate(frames, { fill: 'forwards', ...opts }).finished.catch(() => {});

  // The wax seal splits along a crack; both halves tumble away and a few crumbs scatter.
  function breakSeal(env, seal) {
    const sl = byId(SEALS, viewing.seal) || SEALS[0];
    seal.style.visibility = 'hidden';
    for (const side of ['l', 'r']) {
      // each half gets its own gradient id, so its colour survives the original being hidden
      const half = h('div', { class: `seal-half ${side}`, html: seal.innerHTML.replace(/(id="|url\(#)(u\d+)/g, `$1$2${side}`) });
      env.append(half);
      const dir = side === 'l' ? -1 : 1;
      half.animate([
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dir * 16}px), calc(-50% - 12px)) rotate(${dir * 14}deg)`, opacity: 1, offset: 0.22 },
        { transform: `translate(calc(-50% + ${dir * 52}px), calc(-50% + 150px)) rotate(${dir * 70}deg)`, opacity: 0 },
      ], { duration: 950, easing: 'cubic-bezier(.45,0,.85,.55)', fill: 'forwards' });
    }
    for (let i = 0; i < 9; i++) {
      const crumb = h('span', { class: 'wax-crumb', style: `background:${i % 3 ? sl.c : sl.d}` });
      env.append(crumb);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 30 + Math.random() * 40;
      const dx = Math.cos(ang) * v, up = Math.sin(ang) * v;
      crumb.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${up * 0.6}px)) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${90 + Math.random() * 40}px)) scale(.6) rotate(${Math.random() * 360}deg)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.3,0,.8,.6)', fill: 'forwards' });
    }
  }

  // Waits until the letter is pulled: a tap, a drag upwards, or on its own after a few seconds.
  function waitForPull(letter, peek, run) {
    return new Promise((resolve) => {
      let start = null, done = false, auto;
      const arm = () => { clearTimeout(auto); auto = setTimeout(finish, 4500); };
      const set = (pct) => { letter.getAnimations().forEach((x) => x.cancel()); letter.style.transform = `translateY(${pct}%)`; };
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(auto);
        letter.removeEventListener('pointerdown', down);
        letter.removeEventListener('pointermove', move);
        letter.removeEventListener('pointerup', up);
        letter.removeEventListener('pointercancel', up);
        resolve();
      };
      const down = (ev) => { ev.preventDefault(); start = ev.clientY; clearTimeout(auto); letter.setPointerCapture?.(ev.pointerId); };
      const move = (ev) => { if (start == null) return; set(peek + (Math.min(0, ev.clientY - start) / (letter.offsetHeight || 1)) * 90); };
      const up = (ev) => {
        if (start == null) return;
        const pulled = start - ev.clientY;
        start = null;
        if (pulled < 6 || pulled > (letter.offsetHeight || 100) * 0.16) return finish(); // a tap, or pulled far enough
        anim(letter, [{ transform: letter.style.transform }, { transform: `translateY(${peek}%)` }], { duration: 280, easing: 'cubic-bezier(.3,1.4,.5,1)' });
        arm();
      };
      letter.addEventListener('pointerdown', down);
      letter.addEventListener('pointermove', move);
      letter.addEventListener('pointerup', up);
      letter.addEventListener('pointercancel', up);
      run.finish = finish;
      arm();
    });
  }

  async function openEnvelope() {
    if (!viewing || opening) return;
    const run = (opening = { cancelled: false });
    const env = $('#envelope'), seal = $('#seal'), flap = $('.env-flap', env), letter = $('.env-letter', env);
    const hint = $('.env-hint'), kicker = $('#env-kicker');
    startViewerMusic(); // inside the click, so browsers allow sound
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $('#env-scene').classList.add('leaving');
      await wait(300);
      if (!run.cancelled) showReveal();
      return;
    }
    env.classList.add('opening');
    hint.textContent = '';

    // 1. the seal gives a little under the thumb, then cracks
    await anim(seal, [
      { transform: 'translate(-50%, -50%)' }, { transform: 'translate(-50%, -50%) rotate(-7deg) scale(.95)' },
      { transform: 'translate(-50%, -50%) rotate(5deg) scale(.97)' }, { transform: 'translate(-50%, -50%)' },
    ], { duration: 280, fill: 'none' });
    if (run.cancelled) return;
    breakSeal(env, seal);
    // 2. the envelope is lifted and tilted towards you
    anim(env, [{ transform: 'perspective(1200px) rotateX(0deg) scale(1)' }, { transform: 'perspective(1200px) rotateX(7deg) scale(1.035)' }],
      { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' });
    await wait(300);
    if (run.cancelled) return;

    // 3. the flap lifts on its fold, darkens edge-on, swings back and settles with a small bounce
    anim(kicker, [{ opacity: 1 }, { opacity: 0 }], { duration: 380 }); // the open flap rises where the heading is
    anim($('.flap-out', flap), [{ filter: 'brightness(1.03)' }, { filter: 'brightness(.7)', offset: 0.45 }, { filter: 'brightness(1)' }], { duration: 950 });
    await anim(flap, [
      { transform: 'rotateX(0deg)', zIndex: 4 },
      { transform: 'rotateX(92deg)', zIndex: 4, offset: 0.44 },
      { transform: 'rotateX(96deg)', zIndex: 1, offset: 0.46 },
      { transform: 'rotateX(188deg)', zIndex: 1, offset: 0.76 },
      { transform: 'rotateX(173deg)', zIndex: 1, offset: 0.89 },
      { transform: 'rotateX(180deg)', zIndex: 1 },
    ], { duration: 950, easing: 'cubic-bezier(.35,.05,.35,1)' });
    if (run.cancelled) return;

    // 4. the letter peeks out and waits to be pulled
    const PEEK = -30;
    await anim(letter, [{ transform: 'translateY(0%)' }, { transform: `translateY(${PEEK - 4}%)`, offset: 0.7 }, { transform: `translateY(${PEEK}%)` }],
      { duration: 700, easing: 'cubic-bezier(.3,.7,.3,1)' });
    if (run.cancelled) return;
    hint.textContent = 'Pull out the letter';
    letter.classList.add('pullable');
    await waitForPull(letter, PEEK, run);
    if (run.cancelled) return;
    letter.classList.remove('pullable');
    hint.textContent = '';

    // 5. out it comes, and the envelope is set aside
    await anim(letter, [{ transform: getComputedStyle(letter).transform }, { transform: 'translateY(-118%) rotate(-2deg)' }],
      { duration: 520, easing: 'cubic-bezier(.45,0,.2,1)' });
    if (run.cancelled) return;
    letter.style.zIndex = 8;
    ['.env-back', '.env-pocket', '.env-flap', '.env-address'].forEach((sel) =>
      anim($(sel, env), [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 80px' }], { duration: 620, easing: 'ease-in' }));
    await anim(letter, [{ transform: 'translateY(-118%) rotate(-2deg)' }, { transform: 'translateY(-52%) rotate(1deg) scale(1.2)' }],
      { duration: 720, easing: 'cubic-bezier(.3,.7,.2,1)' });
    if (run.cancelled) return;
    $('#env-scene').classList.add('leaving');
    await wait(420);
    if (!run.cancelled) showReveal();
  }

  function showReveal() {
    opening = null;
    $('#env-scene').hidden = true;
    const reveal = $('#reveal');
    reveal.hidden = false;
    $('#viewer').classList.add('revealed');
    window.BouqAmbient?.burst();
    drawBouquet($('#viewer-bouquet'), viewing, { animate: true });
    const { to, msg, from, font } = viewing.card;
    const letter = $('#letter');
    letter.className = `letter paper-face font-${font}`;
    paintPaper(letter, viewing.card.paper);
    $('#letter-to').textContent = to ? `Dear ${to},` : 'For you,';
    $('#letter-msg').textContent = msg || 'Just because.';
    $('#letter-from').textContent = from ? `— ${from}` : '';
    const gallery = $('#reveal-photos');
    const n = viewing.photos.length;
    gallery.hidden = !n;
    gallery.parentElement.style.setProperty('--space', n ? 0.22 : 0);
    gallery.replaceChildren(n ? buildPhotoStack(viewing) : '');
    requestAnimationFrame(placeViewerPile);
    window.scrollTo({ top: 0 });
  }

  // Photos sit at the foot of the bouquet: beside the narrow base of the wrap and just below it,
  // never over the flowers. x/y are the photo centre as a % of the bouquet (y > 100 is below it);
  // r is the tilt; space is how much room (as a share of the bouquet height) is kept free underneath.
  const TUCK = {
    1: { space: 0.15, at: [{ x: 78, y: 99, r: 7 }] },
    2: { space: 0.15, at: [{ x: 20, y: 98, r: -8 }, { x: 80, y: 100, r: 7 }] },
    3: { space: 0.34, at: [{ x: 18, y: 97, r: -9 }, { x: 82, y: 98, r: 8 }, { x: 50, y: 118, r: -3 }] },
    4: { space: 0.34, at: [{ x: 16, y: 96, r: -10 }, { x: 84, y: 97, r: 9 }, { x: 36, y: 119, r: 4 }, { x: 64, y: 120, r: -5 }] },
    5: { space: 0.44, at: [{ x: 14, y: 95, r: -11 }, { x: 86, y: 96, r: 10 }, { x: 30, y: 119, r: 5 }, { x: 70, y: 120, r: -6 }, { x: 50, y: 128, r: 2 }] },
  };
  // Photos lie in a small pile beside the foot of the bouquet. Hover (or a first tap on touch
  // screens) fans them out; clicking one opens it large.
  const PILE = [[0, 0, -7], [7, -4, 5], [-5, -7, -2], [9, -9, 8], [2, -12, -4]]; // x%, y%, tilt for each layer
  function buildPhotoStack(st) {
    const n = st.photos.length;
    const stack = h('div', { class: 'photo-stack', role: 'group', 'aria-label': `${n} photo${n > 1 ? 's' : ''}` });
    stack.append(...st.photos.map((p, i) => {
      const [ox, oy, r] = PILE[i % PILE.length];
      return h('button', {
        class: 'polaroid pf', type: 'button', 'data-frame': st.photoFrame,
        style: `--ox:${ox}%; --oy:${oy}%; --r:${r}deg; --fx:${(i - (n - 1) / 2) * 62}%; --fy:${-8 - Math.abs(i - (n - 1) / 2) * -6}%; --fr:${(i - (n - 1) / 2) * 7}deg; z-index:${i + 1}; --d:${(2 + i * 0.15).toFixed(2)}s`,
        'aria-label': p.cap ? `Open photo: ${p.cap}` : `Open photo ${i + 1}`,
        onclick: (e) => {
          e.stopPropagation();
          // on touch screens the first tap spreads the pile so every photo can be chosen
          if (n > 1 && !stack.classList.contains('fanned') && !matchMedia('(hover: hover)').matches) { stack.classList.add('fanned'); return; }
          openLightbox(i);
        },
      }, h('i', { class: 'pf-deco', 'aria-hidden': 'true' }), h('img', { src: p.src, alt: p.cap || '' }), p.cap ? h('span', { text: p.cap }) : null);
    }));
    return stack;
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.photo-stack')) $('.photo-stack.fanned')?.classList.remove('fanned'); });

  let lbIndex = 0;
  function showLightbox(i) {
    const list = viewing?.photos || [];
    if (!list.length) return;
    lbIndex = (i + list.length) % list.length;
    const p = list[lbIndex];
    $('#lightbox-img').src = p.src;
    $('#lightbox-img').alt = p.cap || '';
    $('#lightbox-cap').textContent = p.cap || '';
    const many = list.length > 1;
    $('#lb-prev').hidden = $('#lb-next').hidden = !many;
    $('#lb-count').textContent = many ? `${lbIndex + 1} / ${list.length}` : '';
  }
  function openLightbox(i) {
    showLightbox(typeof i === 'number' ? i : 0);
    if (!$('#lightbox').open) $('#lightbox').showModal();
  }
  $('#lb-prev').addEventListener('click', () => showLightbox(lbIndex - 1));
  $('#lb-next').addEventListener('click', () => showLightbox(lbIndex + 1));
  $('#lightbox').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
  });
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') e.target.close(); });

  /* ---------- reading the letter up close ---------- */
  const READER_SIZES = [1, 1.2, 1.45, 1.75];
  let readerSize = 1;
  try { readerSize = Math.min(READER_SIZES.length - 1, Math.max(0, +localStorage.getItem('petal-post-reader') || 1)); } catch { /* ignore */ }
  function setReaderSize(i) {
    readerSize = Math.min(READER_SIZES.length - 1, Math.max(0, i));
    $('#reader').style.setProperty('--zoom', READER_SIZES[readerSize]);
    $('.reader-btn[data-size="-1"]').disabled = readerSize === 0;
    $('.reader-btn[data-size="1"]').disabled = readerSize === READER_SIZES.length - 1;
    try { localStorage.setItem('petal-post-reader', readerSize); } catch { /* ignore */ }
  }
  function openReader() {
    const src = $('#letter');
    const copy = src.cloneNode(true); // same paper, ink and handwriting
    copy.removeAttribute('id');
    copy.removeAttribute('tabindex');
    copy.removeAttribute('role');
    copy.removeAttribute('aria-label');
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    copy.querySelector('.letter-zoom')?.remove();
    copy.classList.add('letter-big');
    $('#reader-body').replaceChildren(copy);
    setReaderSize(readerSize);
    $('#reader').showModal();
    $('#reader-body').scrollTop = 0;
  }
  $('#letter').addEventListener('click', openReader);
  $('#letter').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openReader(); } });
  $('#reader').addEventListener('click', (e) => {
    const btn = e.target.closest('.reader-btn');
    if (btn?.classList.contains('reader-close')) return $('#reader').close();
    if (btn) return setReaderSize(readerSize + +btn.dataset.size);
    if (e.target.id === 'reader' || e.target.id === 'reader-body') $('#reader').close();
  });

  $('#seal').addEventListener('click', openEnvelope);
  $('#btn-replay').addEventListener('click', resetEnvelope);
  $('#btn-save-video').addEventListener('click', () => viewing && recordClip(viewing));

  /* ---------- lock screen for password links ---------- */
  let sealed = '';
  function showLock(data, hint) {
    sealed = data;
    viewing = null;
    setView('viewer');
    document.title = 'A sealed bouquet';
    $('#env-scene').hidden = true;
    $('#reveal').hidden = true;
    $('#lock-scene').hidden = false;
    $('#viewer').classList.remove('revealed');
    const hintEl = $('#lock-hint-text');
    hintEl.hidden = !hint;
    hintEl.textContent = hint ? `Hint: ${hint.slice(0, 60)}` : '';
    $('#unlock-error').textContent = '';
    $('#unlock-pw').value = '';
    window.BouqAmbient?.start([]);
    setTimeout(() => $('#unlock-pw').focus(), 300);
  }
  $('#unlock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#unlock-btn'), err = $('#unlock-error'), card = $('.lock-card');
    if (!window.crypto?.subtle) { err.textContent = 'This page must be opened over https to unlock.'; return; }
    btn.disabled = true;
    btn.textContent = 'Unlocking…';
    err.textContent = '';
    try {
      const st = decode(await unseal(sealed, $('#unlock-pw').value));
      if (!st || !st.stems.length) throw new Error('empty');
      showViewer(st);
    } catch {
      err.textContent = 'That password doesn’t open this bouquet. Try again.';
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      $('#unlock-pw').select();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Unlock';
    }
  });
  $('#btn-own').addEventListener('click', () => {
    state = freshState();
    if (viewing?.card.from) state.card.to = viewing.card.from;
    if (viewing?.card.to) state.card.from = viewing.card.to;
    step = 0;
    save();
  });

  /* ================================================================
     Video keepsake: replays the bloom on a canvas and records it.
     MP4 where the browser can record it (Chrome, Edge, Safari), otherwise WebM.
     ================================================================ */
  const CLIP = { W: 1080, H: 1350, FPS: 30, DUR: 8.5, LETTER: 4.4 };
  const clip01 = (v) => Math.max(0, Math.min(1, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const canvasFont = (id, px) => (id === 'serif' ? `italic ${px}px "Cormorant Garamond", serif` : id === 'hand' ? `${px}px "Caveat", cursive` : `${px}px "Pinyon Script", serif`);
  let clipBusy = false;

  function wrapLines(ctx, text, maxW, maxLines) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
      }
      out.push(line);
    }
    if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return out;
  }

  // The paper's texture on a canvas card (same looks as the CSS papers).
  function drawPaperPattern(ctx, p, w, h) {
    const rnd = mulberry32(w * 31 + h);
    ctx.save();
    ctx.strokeStyle = p.rule;
    ctx.fillStyle = p.rule;
    ctx.lineWidth = 1.2;
    if (p.pattern === 'lines') for (let y = 58; y < h - 10; y += 46) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(w - 18, y); ctx.stroke(); }
    if (p.pattern === 'dots') for (let y = 30; y < h - 10; y += 30) for (let x = 30; x < w - 10; x += 30) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); }
    if (p.pattern === 'frame') { ctx.lineWidth = 2; ctx.strokeRect(16, 16, w - 32, h - 32); ctx.lineWidth = 1; ctx.strokeRect(24, 24, w - 48, h - 48); }
    if (p.pattern === 'fibres') for (let i = 0; i < 260; i++) { ctx.globalAlpha = 0.3 + rnd() * 0.5; const x = rnd() * w, y = rnd() * h, a = rnd() * 6.3, l = 3 + rnd() * 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    if (p.pattern === 'aged') {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(120,80,30,0)');
      g.addColorStop(1, 'rgba(120,80,30,.32)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (p.pattern === 'airmail') {
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.rect(14, 14, w - 28, h - 28);
      ctx.clip('evenodd');
      const cols = ['#b2263a', '#fbfaf6', '#2d4f8c', '#fbfaf6'];
      for (let i = -h; i < w + h; i += 14) { ctx.fillStyle = cols[((i + h) / 14) % 4 | 0]; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 14, 0); ctx.lineTo(i + 14 - h, h); ctx.lineTo(i - h, h); ctx.fill(); }
    }
    if (p.pattern === 'stars') for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.6; ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.6, 0, 7); ctx.fill(); }
    if (p.pattern === 'floral') {
      const sprig = (x, y, fx, fy) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(fx, fy);
        ctx.strokeStyle = '#8fa883'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, 10, 80, 50); ctx.stroke();
        ctx.fillStyle = '#9db590';
        for (const [lx, ly, r] of [[24, 6, 0.6], [46, 18, -0.4], [62, 32, 0.8]]) { ctx.save(); ctx.translate(lx, ly); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, -7, 4, 9, 0, 0, 7); ctx.fill(); ctx.restore(); }
        for (const [fx, fy, c] of [[8, 4, '#e9a3b2'], [30, -6, '#f3c3cd'], [70, 44, '#e9a3b2']]) {
          ctx.fillStyle = c;
          for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 5, fy + Math.sin(a) * 5, 4.2, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#d99a4a'; ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, 7); ctx.fill();
        }
        ctx.restore();
      };
      sprig(w - 20, 22, -1, 1); // top-right and bottom-left, clear of the greeting and signature
      sprig(20, h - 22, 1, -1);
    }
    ctx.restore();
  }

  async function recordClip(st) {
    if (!st?.stems.length) return toast('Add a few stems first.');
    if (clipBusy) return toast('Your video is still being made…');
    const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const candidates = window.MediaRecorder ? types.filter((t) => MediaRecorder.isTypeSupported(t)) : [];
    if (!candidates.length || !HTMLCanvasElement.prototype.captureStream) return toast('This browser can’t record video. Try Chrome, Edge or Safari.');
    clipBusy = true;
    const cv = h('canvas', { width: CLIP.W, height: CLIP.H, style: 'position:fixed;left:-99999px;top:0', 'aria-hidden': 'true' });
    document.body.append(cv);
    try {
      toast('Preparing your video…');
      const { W, H } = CLIP;
      const ctx = cv.getContext('2d');
      const wrap = byId(ASSETS.wraps, st.wrap);
      const blooms = layoutStems(st), sprigs = layoutGreenery(st), addons = layoutAddons(st);
      const srcs = new Set([wrap?.back, wrap?.front, ...sprigs.map((x) => x.g.src), ...blooms.map((b) => b.f.src), ...addons.map((a) => a.a.src)].filter(Boolean));
      const imgs = new Map(await Promise.all([...srcs].map(async (src) => [src, await loadImage(src)])));
      const ribbonImg = wrap?.ribbon === false ? null
        : await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="${SVGNS}" viewBox="0 0 600 760" width="1200" height="1520">${ribbonMarkup(st.ribbon, 'rb', wrap)}</svg>`)}`);
      await Promise.all(['48px "Pinyon Script"', 'italic 40px "Cormorant Garamond"', '40px "Caveat"', '20px "Jost"'].map((f) => document.fonts.load(f).catch(() => {})));

      // letter card, laid out once
      const { to, msg, from, font } = st.card;
      const paper = paperOf(st.card.paper);
      const cardW = 820, padX = 56;
      ctx.font = canvasFont(font, font === 'hand' ? 44 : font === 'serif' ? 38 : 42);
      const msgLines = wrapLines(ctx, msg || 'Just because.', cardW - padX * 2, 4);
      const lineH = font === 'serif' ? 50 : 56;
      const cardH = 64 + 64 + msgLines.length * lineH + (from ? 70 : 20) + 30;
      // bouquet placement: top of the frame, scaled down if a long letter needs the room,
      // so the card sits just below the bow and never covers the bouquet
      const BY = 18, K = Math.min(1.16, (H - cardH - 50 - BY) / 752), BX = (W - 600 * K) / 2;
      const cardY = Math.min(BY + 752 * K, H - cardH - 50);
      const greens = sprigs.length ? greeneryLayer(sprigs, wrap, imgs, K) : null;
      const stemLayer = h('canvas', { width: Math.round(600 * K), height: Math.round(760 * K) });
      const sx = stemLayer.getContext('2d');
      sx.scale(K, K);
      sx.strokeStyle = '#5f7a4a';
      sx.lineWidth = 4;
      sx.lineCap = 'round';
      blooms.forEach((b) => sx.stroke(new Path2D(stemPath(b.x, b.y))));
      const tRibbon = 0.95 + blooms.length * 0.08;

      // falling petals in the bouquet's colours (deterministic, so every frame is consistent)
      const palette = [...new Set(blooms.map((b) => flowerHex(b.f)))].concat('#f6e3dc');
      const rnd = mulberry32(st.seed ^ 0x2468ace);
      const petals = Array.from({ length: 34 }, () => ({
        x: rnd() * W, y: -rnd() * H, vy: 70 + rnd() * 90, sway: 14 + rnd() * 30, sp: 0.6 + rnd(), ph: rnd() * 6.3,
        s: 9 + rnd() * 11, r0: rnd() * 6.3, vr: (rnd() - 0.5) * 1.6, c: palette[Math.floor(rnd() * palette.length)], a: 0.45 + rnd() * 0.4,
      }));


      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#f8f2eb');
      bg.addColorStop(1, '#efe5d8');

      const drawPetal = (p, t) => {
        const y = ((p.y + p.vy * t) % (H + 80) + H + 80) % (H + 80) - 40;
        const x = p.x + Math.sin(t * p.sp + p.ph) * p.sway;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.r0 + p.vr * t);
        ctx.scale(Math.max(0.2, Math.abs(Math.cos(t * 1.7 + p.ph))), 1);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        const s = p.s;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.75, s * 0.7, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.7, -s * 0.95, -s * 0.55, 0, -s);
        ctx.fill();
        ctx.restore();
      };

      const drawFrame = (t) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        // warm glow behind the bouquet
        const glow = ctx.createRadialGradient(W / 2, BY + 330 * K, 40, W / 2, BY + 330 * K, 560);
        glow.addColorStop(0, `rgba(255,255,255,${0.9 * easeOut(clip01(t / 1.2))})`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
        petals.slice(0, 14).forEach((p) => drawPetal(p, t)); // a few behind the bouquet

        ctx.save();
        ctx.translate(BX, BY);
        ctx.scale(K, K);
        const aw = easeOut(clip01(t / 0.8));
        // ground shadow
        ctx.globalAlpha = 0.18 * aw;
        ctx.fillStyle = '#5a3a28';
        ctx.beginPath();
        ctx.ellipse(300, 748, 170, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = aw;
        if (wrap?.back) ctx.drawImage(imgs.get(wrap.back), 0, (1 - aw) * 16, 600, 760);
        const drawAddons = (layer) => addons.filter((a) => a.layer === layer).forEach((a) => {
          const p = clip01((t - (tRibbon + 0.25 + a.k * 0.18)) / 0.6);
          if (!p) return;
          const s = 0.85 + 0.15 * easeBack(p);
          ctx.save();
          ctx.globalAlpha = Math.min(1, p * 1.5);
          ctx.translate(a.x + a.w / 2, a.y + a.h);
          ctx.scale(s, s);
          ctx.drawImage(imgs.get(a.a.src), -a.w / 2, -a.h + (1 - p) * 18, a.w, a.h);
          ctx.restore();
        });
        drawAddons('back');
        if (greens) {
          const g = easeOut(clip01((t - 0.25) / 1.2));
          ctx.save();
          ctx.globalAlpha = g;
          ctx.translate(300, GATHER.y);
          ctx.scale(1, 0.55 + 0.45 * g);
          ctx.translate(-300, -GATHER.y);
          ctx.drawImage(greens, 0, 0, 600, 760);
          ctx.restore();
        }
        ctx.globalAlpha = clip01((t - 0.5) / 0.6);
        ctx.drawImage(stemLayer, 0, 0, 600, 760);
        ctx.globalAlpha = aw;
        if (wrap?.front && !wrap.frontOnTop) ctx.drawImage(imgs.get(wrap.front), 0, (1 - aw) * 16, 600, 760);
        blooms.forEach((b, k) => {
          const p = clip01((t - (0.7 + k * 0.08)) / 0.75);
          if (!p) return;
          const s = 0.2 + 0.8 * easeBack(p);
          ctx.save();
          ctx.globalAlpha = Math.min(1, p * 1.6);
          ctx.shadowColor = 'rgba(60,30,20,.28)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 6;
          ctx.translate(b.x, b.y);
          ctx.rotate(((b.rot - (1 - p) * 25) * Math.PI) / 180);
          ctx.scale(s, s);
          ctx.drawImage(imgs.get(b.f.src), -b.size / 2, -b.size / 2, b.size, b.size);
          ctx.restore();
        });
        ctx.globalAlpha = aw;
        if (wrap?.front && wrap.frontOnTop) ctx.drawImage(imgs.get(wrap.front), 0, (1 - aw) * 16, 600, 760);
        if (ribbonImg) {
          ctx.globalAlpha = clip01((t - tRibbon) / 0.6);
          ctx.drawImage(ribbonImg, 0, 0, 600, 760);
        }
        ctx.globalAlpha = 1;
        drawAddons('top');
        ctx.restore();

        // the letter slides up
        const lp = easeOut(clip01((t - CLIP.LETTER) / 0.9));
        if (lp > 0) {
          ctx.save();
          ctx.globalAlpha = lp;
          ctx.translate(W / 2, cardY + cardH / 2 + (1 - lp) * 70);
          ctx.rotate((-1.2 * Math.PI) / 180);
          ctx.translate(-cardW / 2, -cardH / 2);
          ctx.shadowColor = 'rgba(60,35,25,.28)';
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 18;
          ctx.fillStyle = paper.bg;
          ctx.fillRect(0, 0, cardW, cardH);
          ctx.shadowColor = 'transparent';
          drawPaperPattern(ctx, paper, cardW, cardH);
          ctx.fillStyle = paper.tape;
          ctx.save();
          ctx.translate(cardW / 2, 0);
          ctx.rotate((-3 * Math.PI) / 180);
          ctx.fillRect(-60, -16, 120, 32);
          ctx.restore();
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = paper.accent;
          ctx.font = canvasFont('script', 58);
          ctx.fillText(to ? `Dear ${to},` : 'For you,', padX, 104);
          ctx.fillStyle = paper.ink;
          ctx.font = canvasFont(font, font === 'hand' ? 44 : font === 'serif' ? 38 : 42);
          msgLines.forEach((line, i) => ctx.fillText(line, padX, 104 + 64 + i * lineH));
          if (from) {
            ctx.fillStyle = paper.soft;
            ctx.font = canvasFont('script', 50);
            ctx.textAlign = 'right';
            ctx.fillText(`— ${from}`, cardW - padX, 104 + 64 + msgLines.length * lineH + 34);
            ctx.textAlign = 'left';
          }
          ctx.restore();
        }
        petals.slice(14).forEach((p) => drawPetal(p, t)); // the rest drift in front
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#857970';
        ctx.font = '22px "Jost", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('made with Petal & Post', W / 2, H - 22);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      };

      drawFrame(0);
      try { ctx.getImageData(0, 0, 1, 1); } catch {
        throw new Error(location.protocol === 'file:'
          ? 'Browsers block video export from local files. Run npm run dev and try again.'
          : 'Sorry, the video could not be created.');
      }

      // Records the animation in real time; onTick reports progress.
      const record = (mime, seconds, onTick) => new Promise((resolve, reject) => {
        const stream = cv.captureStream(CLIP.FPS);
        let rec;
        try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 }); } catch (err) { stream.getTracks().forEach((tr) => tr.stop()); return reject(err); }
        const chunks = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onerror = (e) => reject(e.error || new Error('recording failed'));
        rec.onstop = () => { stream.getTracks().forEach((tr) => tr.stop()); resolve(new Blob(chunks, { type: mime.split(';')[0] })); };
        rec.start(250);
        const t0 = performance.now();
        const step = () => {
          const t = (performance.now() - t0) / 1000;
          drawFrame(Math.min(t, CLIP.DUR));
          onTick?.(t);
          if (t < seconds) requestAnimationFrame(step); else rec.stop();
        };
        requestAnimationFrame(step);
      });

      // Some browsers list MP4 but can't actually encode it: a half-second test picks a format that works.
      let mime = null;
      for (const m of candidates) {
        try { if ((await record(m, 0.6)).size > 1500) { mime = m; break; } } catch { /* try the next format */ }
      }
      if (!mime) throw new Error('This browser couldn’t record the video. Try Chrome, Edge or Safari.');

      let shown = -1;
      const blob = await record(mime, CLIP.DUR, (t) => {
        const pct = Math.min(100, Math.round((t / CLIP.DUR) * 100));
        if (Math.floor(pct / 10) !== shown) { shown = Math.floor(pct / 10); toast(`Recording your bouquet… ${pct}%`); }
      });

      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      const name = `bouquet${to ? '-for-' + to.trim().replace(/\s+/g, '-').toLowerCase() : ''}.${ext}`;
      const a = h('a', { href: URL.createObjectURL(blob), download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      toast(`Video saved (${ext.toUpperCase()}).`);
    } catch (err) {
      console.warn(err);
      toast(err.message && !/^[A-Z][a-z]+Error/.test(err.name || '') ? err.message : 'Sorry, the video could not be created.');
    } finally {
      cv.remove();
      clipBusy = false;
    }
  }

  /* ================================================================
     Donations: pick an amount → "Donate" → choose how to pay.
     The site only links out or shows details; payment happens on each provider's own page.
     ================================================================ */
  const DONATE = window.BOUQ_CONFIG?.donate || {};
  const DONATE_CUR = /^[A-Z]{3}$/.test(DONATE.currency || '') ? DONATE.currency : 'USD';
  const okName = (v) => (typeof v === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(v) ? v : '');
  const okHttps = (v) => { try { const u = new URL(v); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  const okImg = (v) => (typeof v === 'string' && (/^[\w\-./ ]+\.(png|jpe?g|webp|svg)$/i.test(v) && !v.includes('..') ? v : okHttps(v)));
  const PAYPAL_ME = /^[A-Za-z0-9]{1,20}$/.test(DONATE.paypalMe || '') ? DONATE.paypalMe : '';
  const PAYPAL_BIZ = typeof DONATE.business === 'string' && /^[^\s"'<>]{3,127}$/.test(DONATE.business) ? DONATE.business : '';
  const STRIPE = okHttps(DONATE.stripeLink || '');
  const KOFI = okName(DONATE.kofi), BMAC = okName(DONATE.buymeacoffee);
  const WALLETS = (Array.isArray(DONATE.wallets) ? DONATE.wallets : [])
    .filter((w) => w && typeof w.name === 'string' && (w.number || w.qr))
    .map((w) => ({ name: String(w.name).slice(0, 30), accountName: String(w.accountName || '').slice(0, 60), number: String(w.number || '').slice(0, 40), qr: okImg(w.qr || '') }));
  const BANK = DONATE.bank && DONATE.bank.accountNumber
    ? { bank: String(DONATE.bank.bank || 'Bank').slice(0, 40), accountName: String(DONATE.bank.accountName || '').slice(0, 60), accountNumber: String(DONATE.bank.accountNumber).slice(0, 40), note: String(DONATE.bank.note || '').slice(0, 80) }
    : null;
  const LINKS = (Array.isArray(DONATE.links) ? DONATE.links : [])
    .map((l) => ({ label: String(l?.label || '').slice(0, 30), url: okHttps(l?.url || '') }))
    .filter((l) => l.label && l.url);

  const ICONS = {
    wallet: '<path d="M4 8h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1z"/><path d="M4 8l12-4v4"/><circle cx="16.5" cy="14" r="1.3"/>',
    card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 1.5 1 1.5 1 3M11 3c0 1.5 1 1.5 1 3"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4M11.5 18h1"/>',
    bank: '<path d="M3 9l9-5 9 5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

  function paypalUrl(amt) {
    if (PAYPAL_ME) return `https://www.paypal.com/paypalme/${PAYPAL_ME}${amt ? `/${amt}${DONATE_CUR}` : ''}`;
    const u = new URL('https://www.paypal.com/donate/');
    u.searchParams.set('business', PAYPAL_BIZ);
    if (amt) u.searchParams.set('amount', amt);
    u.searchParams.set('currency_code', DONATE_CUR);
    u.searchParams.set('item_name', 'Support Petal & Post');
    return u.href;
  }

  function donateMethods(amount) {
    const amt = amount > 0 ? Math.round(amount * 100) / 100 : 0;
    const list = [];
    if (PAYPAL_ME || PAYPAL_BIZ) list.push({ name: 'PayPal', sub: 'PayPal balance, card or bank', icon: 'wallet', url: paypalUrl(amt) });
    if (STRIPE) list.push({ name: 'Credit or debit card', sub: 'Secure card checkout by Stripe', icon: 'card', url: STRIPE });
    if (KOFI) list.push({ name: 'Ko-fi', sub: `ko-fi.com/${KOFI}`, icon: 'cup', url: `https://ko-fi.com/${KOFI}` });
    if (BMAC) list.push({ name: 'Buy Me a Coffee', sub: `buymeacoffee.com/${BMAC}`, icon: 'cup', url: `https://buymeacoffee.com/${BMAC}` });
    WALLETS.forEach((w) => list.push({ name: w.name, sub: w.qr ? 'Scan the QR code or send to our number' : `Send to ${w.number}`, icon: 'phone', wallet: w }));
    if (BANK) list.push({ name: 'Bank transfer', sub: BANK.bank, icon: 'bank', bank: BANK });
    LINKS.forEach((l) => list.push({ name: l.label, sub: new URL(l.url).hostname.replace(/^www\./, ''), icon: 'heart', url: l.url }));
    return list;
  }
  const donateReady = donateMethods(0).length > 0;

  const money = (n) => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: DONATE_CUR, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); } catch { return `${n} ${DONATE_CUR}`; }
  };

  async function copyText(text, label) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = h('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(`${label} copied.`);
  }

  /* ---------- the "choose how to give" window ---------- */
  const dlg = h('dialog', { class: 'donate-dialog', 'aria-labelledby': 'donate-title' });
  document.body.append(dlg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  function openDonate(amount) {
    const amtText = amount > 0 ? money(amount) : '';
    const methods = donateMethods(amount);
    const close = h('button', { class: 'dd-close', type: 'button', 'aria-label': 'Close', onclick: () => dlg.close() }, '×');
    const head = h('header', { class: 'dd-head' },
      h('p', { class: 'eyebrow', text: 'Thank you' }),
      h('h2', { id: 'donate-title', text: amtText ? `Choose how to give ${amtText}` : 'Choose how to give' }));

    const showList = () => {
      const rows = methods.length
        ? methods.map((m) => h('button', {
          class: 'dd-method', type: 'button',
          onclick: () => {
            if (m.url) { window.open(m.url, '_blank', 'noopener'); dlg.close(); toast('Opened in a new tab. Thank you!'); }
            else showDetails(m);
          },
        }, h('span', { class: 'dd-icon', html: icon(m.icon) }), h('span', { class: 'dd-text' }, h('b', { text: m.name }), h('small', { text: m.sub })), h('span', { class: 'dd-go', text: m.url ? '↗' : '›' })))
        : ['PayPal', 'Credit or debit card', 'Ko-fi', 'Buy Me a Coffee', 'GCash / Maya', 'Bank transfer'].map((n) => h('div', { class: 'dd-method is-off' },
          h('span', { class: 'dd-icon', html: icon('heart') }), h('span', { class: 'dd-text' }, h('b', { text: n }), h('small', { text: 'Not set up yet' }))));
      const foot = methods.length
        ? h('p', { class: 'hint', text: amtText && methods.some((m) => !m.url || /paypal/.test(m.url)) ? 'PayPal opens with the amount filled in. For other methods, please enter the amount there.' : 'You finish on the provider\'s own secure page.' })
        : h('p', { class: 'fineprint', text: 'Local preview: fill in your payment details in js/config.js → donate to switch these on. Until then the support section is hidden on the live site.' });
      dlg.replaceChildren(close, head, h('div', { class: 'dd-list' }, rows), foot);
    };

    const showDetails = (m) => {
      const row = (label, value) => value && h('div', { class: 'dd-row' },
        h('span', { text: label }), h('b', { text: value }),
        h('button', { class: 'chip', type: 'button', onclick: () => copyText(value.replace(/\s+/g, ''), label) }, 'Copy'));
      const d = m.wallet || m.bank;
      const body = m.wallet
        ? [d.qr && h('img', { class: 'dd-qr', src: d.qr, alt: `${d.name} QR code` }), row('Account name', d.accountName), row(`${d.name} number`, d.number)]
        : [row('Bank', d.bank), row('Account name', d.accountName), row('Account number', d.accountNumber), d.note && h('p', { class: 'hint', text: d.note })];
      dlg.replaceChildren(close,
        h('button', { class: 'linkish dd-back', type: 'button', onclick: showList }, '‹ All ways to give'),
        h('header', { class: 'dd-head' }, h('p', { class: 'eyebrow', text: m.name }), h('h2', { text: amtText ? `Send ${amtText}` : 'Send any amount' })),
        h('div', { class: 'dd-details' }, body),
        h('p', { class: 'hint', text: 'Thank you! Every gift keeps the flowers free.' }));
    };

    showList();
    dlg.showModal();
  }

  /* ---------- amount picker + Donate button ---------- */
  function mountDonate(el) {
    const amounts = (Array.isArray(DONATE.amounts) ? DONATE.amounts : [3, 5, 10, 25]).filter((n) => n > 0).slice(0, 6);
    let chosen = amounts[Math.min(1, amounts.length - 1)] || 0;
    const custom = h('input', {
      class: 'donate-custom', type: 'number', min: 1, step: 1, inputmode: 'decimal', placeholder: 'Other', 'aria-label': `Other amount in ${DONATE_CUR}`,
      oninput: () => { chosen = +custom.value || 0; sync(); },
    });
    const chips = amounts.map((n) => h('button', {
      class: 'chip', type: 'button', 'data-amt': n,
      onclick: () => { chosen = n; custom.value = ''; sync(); },
    }, money(n)));
    const btn = h('button', { class: 'btn btn-donate', type: 'button', onclick: () => openDonate(chosen) });
    const sync = () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(!custom.value && +c.dataset.amt === chosen)));
      btn.innerHTML = `${icon('heart')}<span>${chosen > 0 ? `Donate ${esc(money(chosen))}` : 'Donate'}</span>`;
    };
    const ways = donateMethods(0).map((m) => m.name);
    el.append(h('div', { class: 'donate-amounts' }, chips, custom), btn,
      h('p', { class: 'hint', text: ways.length ? `Next, choose how to give: ${ways.join(', ')}.` : 'Next, choose how to give.' }));
    sync();
  }

  // Live site: hide the section until at least one method is set up. Locally, preview it anyway.
  const isLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  document.querySelectorAll('[data-donate]').forEach(mountDonate);
  if (!donateReady && !isLocal) document.querySelectorAll('[data-donate-section]').forEach((el) => { el.hidden = true; });

  /* ---------- light / dark theme ---------- */
  const THEME_KEY = 'petal-post-theme';
  function applyTheme(t, save) {
    document.documentElement.setAttribute('data-theme', t);
    $('#meta-theme')?.setAttribute('content', t === 'dark' ? '#171214' : '#f5efe7');
    const btn = $('#theme-toggle');
    btn?.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    if (save) { try { localStorage.setItem(THEME_KEY, t); } catch { /* private mode */ } }
  }
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
  $('#theme-toggle')?.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });
  // follow the device setting live, unless the visitor picked a theme
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
    if (!saved) applyTheme(e.matches ? 'dark' : 'light', false);
  });

  /* ---------- suggestion box ---------- */
  const SUGGEST = window.BOUQ_CONFIG?.suggest || {};
  const SUGGEST_URL = (() => { try { const u = new URL(SUGGEST.formEndpoint || ''); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } })();
  const SUGGEST_EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(SUGGEST.email || '') ? SUGGEST.email : '';
  const IDEA_CATS = ['Flower', 'Greenery', 'Wrap', 'Add-on', 'Music', 'Feature', 'Other'];
  let ideaCat = 'Flower';
  $('#ideas-cats').append(...IDEA_CATS.map((c) => h('button', {
    class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(c === ideaCat), 'aria-pressed': String(c === ideaCat),
    onclick: () => {
      ideaCat = c;
      document.querySelectorAll('#ideas-cats .chip').forEach((b) => { const on = b.textContent === c; b.setAttribute('aria-pressed', on); b.setAttribute('aria-checked', on); });
    },
  }, c)));
  $('#idea-text').addEventListener('input', (e) => { $('#idea-count').textContent = `${e.target.value.length} / 1000`; });
  $('#ideas-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('#idea-text').value.trim(), status = $('#idea-status'), btn = $('#idea-send');
    if (text.length < 4) { status.textContent = 'Write a few words about your idea first.'; $('#idea-text').focus(); return; }
    const emailIn = $('#idea-email').value.trim();
    if (emailIn && !$('#idea-email').checkValidity()) { status.textContent = 'That email doesn’t look right. Leave it empty if you prefer.'; return; }
    if ($('#idea-hp').value) return; // a bot filled the hidden field
    const name = $('#idea-name').value.trim();
    const done = () => {
      $('#ideas-form').hidden = true;
      $('#ideas-thanks').hidden = false;
      $('#ideas-form').reset();
      $('#idea-count').textContent = '0 / 1000';
      status.textContent = '';
    };
    if (SUGGEST_URL) {
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.textContent = '';
      try {
        const res = await fetch(SUGGEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ category: ideaCat, idea: text, name, email: emailIn, _subject: `Petal & Post idea: ${ideaCat}`, page: location.origin }),
        });
        if (!res.ok) throw new Error(String(res.status));
        done();
      } catch {
        status.textContent = SUGGEST_EMAIL ? 'Couldn’t send just now, so your email app will open instead.' : 'Couldn’t send just now. Please try again in a moment.';
        if (SUGGEST_EMAIL) setTimeout(() => openIdeaMail(text, name), 900);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send suggestion';
      }
      return;
    }
    if (SUGGEST_EMAIL) { openIdeaMail(text, name); done(); return; }
    status.textContent = 'Local preview: add a form endpoint or email in js/config.js → suggest to switch this on.';
  });
  function openIdeaMail(text, name) {
    const body = `Category: ${ideaCat}\n\n${text}${name ? `\n\n— ${name}` : ''}`;
    location.href = `mailto:${SUGGEST_EMAIL}?subject=${encodeURIComponent(`Petal & Post idea: ${ideaCat}`)}&body=${encodeURIComponent(body)}`;
  }
  $('#idea-again').addEventListener('click', () => { $('#ideas-thanks').hidden = true; $('#ideas-form').hidden = false; $('#idea-text').focus(); });
  // Live site: hide until a destination is set. Locally, show it for previewing.
  if (!SUGGEST_URL && !SUGGEST_EMAIL && !isLocal) document.querySelectorAll('[data-suggest-section]').forEach((el) => { el.hidden = true; });

  window.addEventListener('hashchange', route);
  route();
})();
