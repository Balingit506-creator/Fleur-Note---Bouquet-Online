// Bouquet data: the draft state, its share-link encoding, and the layout used to draw it.
import config from '../config.js';
import Music from './music.js';
import { ASSETS, findAddon, findEnv, findFlower, findGreen, findWrap, flowerLabel } from './assets.js';
import {
  FONTS, FRAMES, GATHER, MAX_ADDONS, MAX_GREEN, MAX_STEMS, OCCASIONS, OCCASION_PAPER, PAPERS, RIBBONS, SEALS,
} from './constants.js';
import { byId, clamp, esc, mulberry32, randSeed } from './util.js';

/* ---------- optional photo storage ---------- */
const STORAGE = config.storage;
// Optional Supabase bucket for photos; without it photos travel inside the link.
export const CLOUD = STORAGE?.provider === 'supabase' && STORAGE.url && STORAGE.anonKey && STORAGE.bucket
  ? { ...STORAGE, url: STORAGE.url.replace(/\/+$/, '') } : null;
export const MAX_PHOTOS = CLOUD ? 5 : 3;

// Only our own resized images (data URLs) or files in the configured bucket are accepted.
export const okPhoto = (src) => typeof src === 'string' && (
  (src.length < 400000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(src)) ||
  (!!CLOUD && src.startsWith(`${CLOUD.url}/storage/v1/object/public/${CLOUD.bucket}/`) && !/[\s"'<>()]/.test(src)));

/* ---------- state ---------- */
export function freshState() {
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
    yt: null, // { id, start, title }: a YouTube song instead of a built-in piece
  };
}

// Accepts anything (a draft, a decoded link) and returns a safe state.
export function sanitize(raw) {
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
    addons: (Array.isArray(raw.addons) ? raw.addons : []).filter((id) => byId(ASSETS.addons, id)).slice(0, MAX_ADDONS),
    addonPos: Object.fromEntries(Object.entries(raw.addonPos && typeof raw.addonPos === 'object' ? raw.addonPos : {})
      .filter(([id, p]) => Array.isArray(raw.addons) && raw.addons.includes(id) && byId(ASSETS.addons, id) && p && num(p.x) != null && num(p.y) != null)
      .map(([id, p]) => [id, { x: clamp(num(p.x), -200, 800), y: clamp(num(p.y), -200, 960) }])),
    sent: Number.isFinite(raw.sent) ? raw.sent : null,
  };
}

export function applyOccasionTo(st, occ, seed = randSeed()) {
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

export function describe(st) {
  if (!st.stems.length) return 'An empty bouquet';
  const counts = {};
  st.stems.forEach((x) => {
    const f = byId(ASSETS.flowers, x.id);
    if (f) counts[flowerLabel(f)] = (counts[flowerLabel(f)] || 0) + 1;
  });
  return Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
}

/* ---------- share-link encoding: everything lives in the URL ---------- */
export function encode(st) {
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

export function decode(str) {
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

export const shareBase = () => location.href.split('#')[0];
export const shareLink = (st) => `${shareBase()}#b=${encode(st)}`;

/* ---------- layout (all in the 600×760 bouquet space) ---------- */
export function layoutStems(st) {
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

export function layoutGreenery(st) {
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

export function layoutAddons(st) {
  return st.addons
    .map((aid, k) => {
      const a = byId(ASSETS.addons, aid);
      if (!a) return null;
      const w = a.w, h = a.nw && a.nh ? (w * a.nh) / a.nw : w;
      const c = st.addonPos?.[aid] || a; // dragged position, else the default spot
      return { a, k, layer: a.layer === 'back' ? 'back' : 'top', w, h, x: c.x - w / 2, y: c.y - h / 2 };
    })
    .filter(Boolean);
}

export const stemPath = (x, y) => {
  const ex = 300 + (x - 300) * 0.1, ey = GATHER.y + 40;
  const qx = (x + 300) / 2 + (x - 300) * 0.15, qy = (y + GATHER.y) / 2 + 20;
  return `M${x.toFixed(1)},${y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${ex.toFixed(1)},${ey}`;
};
export const sprigTransform = (sp) => (sp.fan ? `rotate(${sp.rot} 300 ${GATHER.y})` : `translate(300 ${GATHER.y}) rotate(${sp.rot.toFixed(1)})`);

// SVG markup of the drawn ribbon; used on the page and for the image/video export.
export function ribbonMarkup(ribbonId, id, wrap) {
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

// SVG markup of a wax seal stamped with a letter.
export function sealMarkup(sealId, letter, id) {
  const sl = byId(SEALS, sealId) || SEALS[0];
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
export const initial = (name) => (name.trim()[0] || '').toUpperCase() || '♥';
