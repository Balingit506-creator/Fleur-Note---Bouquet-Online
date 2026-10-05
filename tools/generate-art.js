// Generates the placeholder SVG artwork for Greenery/, Wrap/ and Envelope/.
// Run: node tools/generate-art.js   (then: node tools/build-manifest.js)
// Existing files with the same name are overwritten; your own images are left alone.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public'); // image folders live in public/
const r1 = (n) => Math.round(n * 10) / 10;

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.trim() + '\n');
  console.log('wrote', rel);
}

/* ------------------------------------------------------------------ */
/* Greenery: tall sprigs, 300x520, anchored at bottom centre (150,515) */
/* ------------------------------------------------------------------ */

const GW = 300, GH = 520, BX = 150, BY = 515;

function curve(bend, top = 30) {
  const P0 = [BX, BY], P1 = [BX + bend * 0.15, 270], P2 = [BX + bend, top];
  const pt = (t) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  const ang = (t) => {
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    return (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = straight up
  };
  return { d: `M${P0} Q${P1} ${P2}`, pt, ang };
}

function leaf(x, y, a, len, w, fill, rib) {
  const d = `M0,0 Q${r1(w)},${r1(-len * 0.45)} 0,${r1(-len)} Q${r1(-w)},${r1(-len * 0.45)} 0,0Z`;
  const ribLine = rib ? `<path d="M0,-2 L0,${r1(-len * 0.85)}" stroke="${rib}" stroke-width="1" opacity=".55" fill="none"/>` : '';
  return `<g transform="translate(${r1(x)},${r1(y)}) rotate(${r1(a)})"><path d="${d}" fill="${fill}"/>${ribLine}</g>`;
}

function sprig(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GW} ${GH}" width="${GW}" height="${GH}">${inner}</svg>`;
}

function eucalyptus() {
  const c = curve(18), out = [];
  const rand = rng(11);
  for (let i = 0; i < 14; i++) {
    const t = 0.12 + (i / 13) * 0.86;
    const [x, y] = c.pt(t);
    const a = (c.ang(t) * Math.PI) / 180;
    const side = i % 2 ? 1 : -1;
    const r = 25 - i * 1.15 + rand() * 2;
    const nx = Math.cos(a) * side * r * 0.85, ny = Math.sin(a) * side * r * 0.85;
    const fill = i % 3 ? 'url(#e1)' : 'url(#e2)';
    out.push(`<ellipse cx="${r1(x + nx)}" cy="${r1(y + ny)}" rx="${r1(r)}" ry="${r1(r * 0.9)}" fill="${fill}" stroke="#6f8a7e" stroke-width="1"/>`);
    out.push(`<path d="M${r1(x)},${r1(y)} L${r1(x + nx * 1.4)},${r1(y + ny * 1.4)}" stroke="#c9d6cf" stroke-width="1" opacity=".5"/>`);
  }
  return sprig(`
  <defs>
    <radialGradient id="e1" cx=".4" cy=".35"><stop offset="0" stop-color="#c3d3ca"/><stop offset="1" stop-color="#8ea89b"/></radialGradient>
    <radialGradient id="e2" cx=".4" cy=".35"><stop offset="0" stop-color="#b1c6bb"/><stop offset="1" stop-color="#7c978a"/></radialGradient>
  </defs>
  <path d="${c.d}" stroke="#7d6a5c" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  ${out.join('\n  ')}`);
}

function olive() {
  const c = curve(-26, 24), out = [];
  for (let i = 0; i < 22; i++) {
    const t = 0.1 + (i / 21) * 0.9;
    const [x, y] = c.pt(t);
    const side = i % 2 ? 1 : -1;
    const len = 58 - i * 1.4;
    const fill = i % 3 === 0 ? '#aeb78f' : i % 2 ? '#6d7d47' : '#7f8f58';
    out.push(leaf(x, y, c.ang(t) + side * 38, len, 8, fill, '#e9ecd8'));
  }
  const olives = [0.42, 0.47, 0.6].map((t, k) => {
    const [x, y] = c.pt(t);
    const dx = k % 2 ? 14 : -14;
    return `<ellipse cx="${r1(x + dx)}" cy="${r1(y + 6)}" rx="6" ry="8.5" fill="url(#ol)"/>`;
  });
  return sprig(`
  <defs><radialGradient id="ol" cx=".35" cy=".3"><stop offset="0" stop-color="#7a6f88"/><stop offset="1" stop-color="#2f2836"/></radialGradient></defs>
  <path d="${c.d}" stroke="#6b5a48" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${out.join('\n  ')}
  ${olives.join('\n  ')}`);
}

function ruscus() {
  const c = curve(12, 20), out = [];
  for (let i = 0; i < 18; i++) {
    const t = 0.14 + (i / 17) * 0.86;
    const [x, y] = c.pt(t);
    const side = i % 2 ? 1 : -1;
    const len = 66 - i * 2;
    out.push(leaf(x, y, c.ang(t) + side * 30, len, 13 - i * 0.3, i % 2 ? 'url(#r1)' : 'url(#r2)', '#9db58c'));
  }
  return sprig(`
  <defs>
    <linearGradient id="r1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5c7d52"/><stop offset="1" stop-color="#34502f"/></linearGradient>
    <linearGradient id="r2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7047"/><stop offset="1" stop-color="#2c4528"/></linearGradient>
  </defs>
  <path d="${c.d}" stroke="#3f5a35" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${out.join('\n  ')}`);
}

function lavender() {
  const stems = [[-8, 40], [22, 70], [-34, 90]];
  const rand = rng(7);
  const parts = [];
  for (const [bend, top] of stems) {
    const c = curve(bend, top);
    parts.push(`<path d="${c.d}" stroke="#7f9068" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
    for (let t = 0.58; t <= 1.0001; t += 0.032) {
      const [x, y] = c.pt(t);
      const a = c.ang(t);
      const shrink = 1 - (t - 0.58) * 0.9;
      for (const s of [-1, 1]) {
        const col = ['#7d68ad', '#9a87c6', '#b4a5d6'][Math.floor(rand() * 3)];
        parts.push(`<ellipse cx="${r1(x + s * 5 * shrink)}" cy="${r1(y)}" rx="${r1(3.8 * shrink + 1)}" ry="${r1(6 * shrink + 1.5)}" fill="${col}" transform="rotate(${r1(a + s * 28)} ${r1(x + s * 5 * shrink)} ${r1(y)})"/>`);
      }
    }
  }
  for (const [a, len] of [[-24, 120], [16, 140], [36, 100]]) {
    parts.push(leaf(BX, BY - 4, a, len, 4, '#8a9b78'));
  }
  return sprig(parts.join('\n  '));
}

function babysBreath() {
  const rand = rng(42);
  const lines = [], florets = [];
  function branch(x, y, a, len, depth) {
    const rad = (a * Math.PI) / 180;
    const x2 = x + Math.sin(rad) * len, y2 = y - Math.cos(rad) * len;
    const mx = (x + x2) / 2 + (rand() - 0.5) * 10, my = (y + y2) / 2;
    lines.push(`<path d="M${r1(x)},${r1(y)} Q${r1(mx)},${r1(my)} ${r1(x2)},${r1(y2)}" stroke="#7e9168" stroke-width="${r1(depth * 0.55 + 0.6)}" fill="none" stroke-linecap="round"/>`);
    if (depth === 0) {
      const n = 5 + Math.floor(rand() * 5);
      for (let k = 0; k < n; k++) {
        const fx = x2 + (rand() - 0.5) * 18, fy = y2 + (rand() - 0.5) * 16;
        const fr = 2.6 + rand() * 1.8;
        florets.push(`<circle cx="${r1(fx)}" cy="${r1(fy)}" r="${r1(fr)}" fill="#fffdf8" stroke="#ddd5c6" stroke-width=".6"/><circle cx="${r1(fx)}" cy="${r1(fy)}" r="${r1(fr * 0.35)}" fill="#eadfca"/>`);
      }
      return;
    }
    const kids = depth > 3 ? 2 : 2 + Math.floor(rand() * 2);
    for (let k = 0; k < kids; k++) {
      const spread = (k - (kids - 1) / 2) * (22 + rand() * 16);
      branch(x2, y2, a + spread, len * (0.66 + rand() * 0.1), depth - 1);
    }
  }
  branch(BX, BY, 2, 150, 5);
  return sprig(lines.join('\n  ') + '\n  ' + florets.join('\n  '));
}

// Eucalyptus was retired in favour of the Eucalyptus Waxflower / Trailing Eucalyptus sprigs.
write('Greenery/greenery_olive_branch.svg', olive());
write('Greenery/greenery_italian_ruscus.svg', ruscus());
write('Greenery/greenery_lavender.svg', lavender());
write('Greenery/greenery_babys_breath.svg', babysBreath());

/* ------------------------------------------------------------------ */
/* Wraps: back fan + front cone, both 600x760, gathered at (300, 600) */
/* ------------------------------------------------------------------ */

const GRAIN = `<filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer>
  </filter>`;

const PATTERNS = {
  kraft: `<pattern id="tex" width="46" height="46" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="9" r="1.1" fill="#7a5a3c" opacity=".35"/><circle cx="31" cy="4" r=".8" fill="#7a5a3c" opacity=".3"/>
      <circle cx="22" cy="27" r="1.3" fill="#7a5a3c" opacity=".25"/><circle cx="40" cy="38" r=".9" fill="#7a5a3c" opacity=".35"/>
      <circle cx="10" cy="40" r=".7" fill="#fff" opacity=".25"/></pattern>`,
  ivory: `<pattern id="tex" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0,3 H6 M3,0 V6" stroke="#cdbfa6" stroke-width=".6" opacity=".45"/></pattern>`,
  noir: `<pattern id="tex" width="70" height="70" patternUnits="userSpaceOnUse">
      <path d="M18,14 l1.6,4 4,1.6 -4,1.6 -1.6,4 -1.6,-4 -4,-1.6 4,-1.6z" fill="#c9a45c" opacity=".7"/>
      <circle cx="52" cy="48" r="1.2" fill="#c9a45c" opacity=".6"/><circle cx="40" cy="20" r=".8" fill="#e8d6a8" opacity=".5"/></pattern>`,
  lilac: `<pattern id="tex" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="5" r="1.6" fill="#fff" opacity=".45"/><circle cx="16" cy="16" r="1.6" fill="#fff" opacity=".45"/></pattern>`,
  sage: `<pattern id="tex" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <path d="M0,4 H8" stroke="#56644a" stroke-width=".7" opacity=".14"/></pattern>`,
  blush: `<pattern id="tex" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M0,60 Q30,40 60,60 T120,60" stroke="#fff" stroke-width="1.2" fill="none" opacity=".35"/></pattern>`,
};

const WRAPS = [
  { id: 'ivory_linen', base: '#f2eadb', light: '#fbf7ef', dark: '#cdbfa6', edge: '#c8a96a', tex: 'ivory' },
  { id: 'blush_tissue', base: '#efc9c1', light: '#f9e4df', dark: '#c99790', edge: '#f8e2dd', tex: 'blush', tissue: true },
  { id: 'kraft', base: '#c69f76', light: '#dcbb95', dark: '#8f6b48', edge: '#a8835c', tex: 'kraft' },
  { id: 'sage_matte', base: '#a8b598', light: '#c4cfb6', dark: '#76856a', edge: '#8c9a7e', tex: 'sage' },
  { id: 'lilac_dot', base: '#cbbfdc', light: '#e2d9ec', dark: '#9b8cb3', edge: '#f1ebf7', tex: 'lilac', tissue: true },
  { id: 'noir_gold', base: '#262326', light: '#3b373b', dark: '#0e0c0e', edge: '#c9a45c', tex: 'noir' },
];

function wrapSvg(w, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" width="600" height="760">
  <defs>
  ${GRAIN}
  ${PATTERNS[w.tex]}
  <linearGradient id="shadeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
  <linearGradient id="shadeL" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
  <linearGradient id="shadeR" x1="1" y1="0" x2="0" y2=".3"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
  </defs>
  ${body}
</svg>`;
}

function layered(id, d, w, shade) {
  return `<clipPath id="${id}"><path d="${d}"/></clipPath>
  <path d="${d}" fill="${w.base}"/>
  <path d="${d}" fill="url(#tex)"/>
  <rect width="600" height="760" filter="url(#grain)" clip-path="url(#${id})"/>
  <path d="${d}" fill="url(#${shade})"/>`;
}

function backWrap(w) {
  // fan with a scalloped, softly crumpled top edge
  const pts = [];
  const n = 7, x0 = 26, x1 = 574;
  let d = `M300,668 L${x0},262`;
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n, b = x0 + ((x1 - x0) * (i + 1)) / n;
    const mid = (a + b) / 2;
    const dip = 262 - Math.sin((Math.PI * (i + 0.5)) / n) * 92;
    const valley = 262 - Math.sin((Math.PI * (i + 1)) / n) * 70;
    d += ` Q${r1(mid)},${r1(dip - 34)} ${r1(b)},${r1(valley)}`;
    pts.push([b, valley]);
  }
  d += ' Z';
  const folds = pts.slice(0, -1).map(([x, y]) => `<path d="M300,668 L${r1(x)},${r1(y + 4)}" stroke="${w.dark}" stroke-width="1.4" opacity=".35"/>`);
  const tissue = w.tissue
    ? `<path d="${d}" fill="#fff" opacity=".35" transform="translate(300 668) scale(.9 .93) translate(-300 -668) rotate(-3 300 668)"/>`
    : '';
  return wrapSvg(w, `${layered('cb', d, w, 'shadeV')}
  ${tissue}
  ${folds.join('\n  ')}
  <path d="${d}" fill="none" stroke="${w.edge}" stroke-width="2" opacity=".75"/>`);
}

function frontWrap(w) {
  const right = 'M538,438 Q470,476 268,526 Q284,640 300,752 Z';
  const left = 'M62,438 Q150,486 336,528 Q318,640 300,752 Z';
  const rightLip = 'M538,438 Q470,476 268,526 L270,540 Q470,492 536,452 Z';
  const leftLip = 'M62,438 Q150,486 336,528 L334,542 Q150,500 64,452 Z';
  const tissue = w.tissue
    ? `<path d="M90,404 Q200,470 300,476 Q400,470 510,404 Q470,520 300,700 Q130,520 90,404Z" fill="#fff" opacity=".42"/>`
    : '';
  return wrapSvg(w, `${tissue}
  ${layered('cr', right, w, 'shadeR')}
  <path d="M520,446 Q420,560 300,752" stroke="${w.dark}" stroke-width="1.2" fill="none" opacity=".35"/>
  <path d="${rightLip}" fill="${w.light}" opacity=".8"/>
  <path d="M300,752 L210,520" stroke="#000" stroke-width="14" opacity=".06" fill="none" stroke-linecap="round"/>
  ${layered('cl', left, w, 'shadeL')}
  <path d="M90,450 Q190,560 300,752" stroke="${w.dark}" stroke-width="1.2" fill="none" opacity=".3"/>
  <path d="${leftLip}" fill="${w.light}" opacity=".85"/>
  <path d="M62,438 Q150,486 336,528" fill="none" stroke="${w.edge}" stroke-width="2.4" opacity=".9"/>
  <path d="M538,438 Q470,476 268,526" fill="none" stroke="${w.edge}" stroke-width="2" opacity=".6"/>`);
}

// The paper wraps were replaced by the gilded wraps (tools/build-wraps.js); pass --wraps to also write them.
if (process.argv.includes('--wraps')) for (const w of WRAPS) {
  write(`Wrap/wrap_${w.id}_back.svg`, backWrap(w));
  write(`Wrap/wrap_${w.id}_front.svg`, frontWrap(w));
}

/* ------------------------------------------------------------------ */
/* Envelopes: paper textures, 600x400                                   */
/* ------------------------------------------------------------------ */

const ENVELOPES = [
  { id: 'ivory_cotton', base: '#f3ecdf', tint: '#e7dcc8', extra: '' },
  { id: 'blush_vellum', base: '#f0d3cc', tint: '#e2b7ae', extra: '' },
  { id: 'sage_laid', base: '#c3cbb3', tint: '#a9b597',
    extra: `<pattern id="laid" width="600" height="5" patternUnits="userSpaceOnUse"><path d="M0,2.5 H600" stroke="#6d7a5d" stroke-width=".5" opacity=".18"/></pattern><rect width="600" height="400" fill="url(#laid)"/>` },
  { id: 'midnight_gilded', base: '#1f2a44', tint: '#141c30',
    extra: `<pattern id="fleck" width="90" height="90" patternUnits="userSpaceOnUse"><circle cx="12" cy="20" r="1.1" fill="#d8b56a"/><circle cx="64" cy="58" r=".8" fill="#e8cf91"/><circle cx="40" cy="80" r="1.4" fill="#c9a45c" opacity=".8"/><circle cx="78" cy="14" r=".6" fill="#f2e2b6"/></pattern><rect width="600" height="400" fill="url(#fleck)"/>` },
  { id: 'kraft_recycled', base: '#c9a57f', tint: '#a8825d',
    extra: `<pattern id="fib" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M5,12 q8,-3 14,2 M40,44 q6,4 13,0 M30,8 q3,6 9,7" stroke="#6d4e33" stroke-width=".7" fill="none" opacity=".35"/></pattern><rect width="600" height="400" fill="url(#fib)"/>` },
  { id: 'lilac_mist', base: '#d8cde6', tint: '#bfb0d4', extra: '' },
];

for (const e of ENVELOPES) {
  write(`Envelope/envelope_${e.id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <defs>
  ${GRAIN.replace('.09', '.14')}
  <radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="${e.tint}" stop-opacity="0"/><stop offset="1" stop-color="${e.tint}" stop-opacity=".9"/></radialGradient>
  </defs>
  <rect width="600" height="400" fill="${e.base}"/>
  <rect width="600" height="400" fill="url(#vig)"/>
  ${e.extra}
  <rect width="600" height="400" filter="url(#grain)"/>
</svg>`);
}
