// Generates the bouquet add-ons (original artwork) into AddOns/, plus their placement settings.
// Run: node tools/generate-addons.js   (then: node tools/build-manifest.js)
// You can also drop your own transparent PNG/WebP into AddOns/ and give it a placement in
// AddOns/addon-settings.json: { "file.png": { "x": 300, "y": 600, "w": 180, "layer": "top" } }
//   x/y = centre on the 600x760 bouquet stage, w = width, layer = "back" (behind the greenery) or "top".
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public'); // image folders live in public/
const r1 = (n) => Math.round(n * 10) / 10;
const write = (name, svg) => {
  fs.mkdirSync(path.join(ROOT, 'AddOns'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'AddOns', name), svg.trim() + '\n');
  console.log('wrote AddOns/' + name);
};

// heart centred on (cx, cy), roughly s wide
function heart(cx, cy, s) {
  const p = (dx, dy) => `${r1(cx + dx * s)},${r1(cy + dy * s)}`;
  return `M${p(0, 0.38)} C${p(-0.06, 0.28)} ${p(-0.5, 0.06)} ${p(-0.5, -0.18)} C${p(-0.5, -0.44)} ${p(-0.16, -0.56)} ${p(0, -0.3)}`
    + ` C${p(0.16, -0.56)} ${p(0.5, -0.44)} ${p(0.5, -0.18)} C${p(0.5, 0.06)} ${p(0.06, 0.28)} ${p(0, 0.38)}Z`;
}

/* ---------------- teddy bear ---------------- */
write('addon_teddy_bear.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 262" width="240" height="262">
  <defs>
    <radialGradient id="fur" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="#d4a06c"/><stop offset=".7" stop-color="#b47a46"/><stop offset="1" stop-color="#8c5a2f"/></radialGradient>
    <radialGradient id="cream" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fbeedd"/><stop offset="1" stop-color="#e9cfae"/></radialGradient>
    <radialGradient id="hrt" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e0566d"/><stop offset="1" stop-color="#9e2236"/></radialGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".6"/></filter>
  </defs>
  <ellipse cx="120" cy="252" rx="92" ry="9" fill="#5a3a28" opacity=".14"/>
  <!-- ears -->
  <circle cx="64" cy="50" r="29" fill="url(#fur)"/><circle cx="64" cy="52" r="15" fill="url(#cream)"/>
  <circle cx="176" cy="50" r="29" fill="url(#fur)"/><circle cx="176" cy="52" r="15" fill="url(#cream)"/>
  <!-- body, legs -->
  <ellipse cx="120" cy="184" rx="72" ry="66" fill="url(#fur)"/>
  <ellipse cx="120" cy="196" rx="43" ry="40" fill="url(#cream)"/>
  <ellipse cx="68" cy="232" rx="35" ry="25" fill="url(#fur)"/><ellipse cx="172" cy="232" rx="35" ry="25" fill="url(#fur)"/>
  <ellipse cx="64" cy="236" rx="20" ry="15" fill="url(#cream)"/><ellipse cx="176" cy="236" rx="20" ry="15" fill="url(#cream)"/>
  <g fill="#c99b74"><circle cx="54" cy="226" r="4"/><circle cx="64" cy="222" r="4"/><circle cx="74" cy="226" r="4"/><circle cx="166" cy="226" r="4"/><circle cx="176" cy="222" r="4"/><circle cx="186" cy="226" r="4"/></g>
  <!-- heart held in the paws -->
  <path d="${heart(120, 186, 74)}" fill="url(#hrt)"/>
  <path d="M100,166 q8,-8 18,-2" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".45"/>
  <ellipse cx="80" cy="172" rx="20" ry="36" fill="url(#fur)" transform="rotate(-38 80 172)"/>
  <ellipse cx="160" cy="172" rx="20" ry="36" fill="url(#fur)" transform="rotate(38 160 172)"/>
  <circle cx="94" cy="186" r="14" fill="url(#fur)"/><circle cx="146" cy="186" r="14" fill="url(#fur)"/>
  <!-- head -->
  <circle cx="120" cy="90" r="62" fill="url(#fur)"/>
  <ellipse cx="120" cy="110" rx="30" ry="23" fill="url(#cream)"/>
  <ellipse cx="120" cy="99" rx="11" ry="8" fill="#3b2418"/><ellipse cx="117" cy="96" rx="3.5" ry="2" fill="#fff" opacity=".6"/>
  <path d="M120,107 v7 M120,114 q-7,8 -14,3 M120,114 q7,8 14,3" stroke="#3b2418" stroke-width="2.6" stroke-linecap="round" fill="none"/>
  <circle cx="95" cy="80" r="6.5" fill="#2a1a12"/><circle cx="145" cy="80" r="6.5" fill="#2a1a12"/>
  <circle cx="97" cy="78" r="2.2" fill="#fff"/><circle cx="147" cy="78" r="2.2" fill="#fff"/>
  <circle cx="82" cy="104" r="10" fill="#ea9a9a" opacity=".45" filter="url(#soft)"/><circle cx="158" cy="104" r="10" fill="#ea9a9a" opacity=".45" filter="url(#soft)"/>
  <!-- bow tie -->
  <path d="M120,148 L96,136 L98,162 Z" fill="#c2566b"/><path d="M120,148 L144,136 L142,162 Z" fill="#c2566b"/>
  <circle cx="120" cy="149" r="7" fill="#a84257"/>
</svg>`);

/* ---------------- butterflies ---------------- */
function butterfly(x, y, s, rot, a, b, edge) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0,0 C-16,-40 -62,-46 -56,-14 C-52,6 -22,8 0,0Z" fill="url(#${a})" stroke="${edge}" stroke-width="1.6"/>
    <path d="M0,0 C16,-40 62,-46 56,-14 C52,6 22,8 0,0Z" fill="url(#${a})" stroke="${edge}" stroke-width="1.6"/>
    <path d="M0,2 C-12,10 -40,26 -32,40 C-24,50 -6,30 0,2Z" fill="url(#${b})" stroke="${edge}" stroke-width="1.6"/>
    <path d="M0,2 C12,10 40,26 32,40 C24,50 6,30 0,2Z" fill="url(#${b})" stroke="${edge}" stroke-width="1.6"/>
    <circle cx="-34" cy="-18" r="5" fill="#fff" opacity=".55"/><circle cx="34" cy="-18" r="5" fill="#fff" opacity=".55"/>
    <ellipse cx="0" cy="4" rx="3.6" ry="18" fill="#3a2a2a"/>
    <path d="M-1,-12 C-6,-26 -12,-30 -16,-32 M1,-12 C6,-26 12,-30 16,-32" stroke="#3a2a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </g>`;
}
write('addon_butterflies.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170" width="240" height="170">
  <defs>
    <linearGradient id="p1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8c9d2"/><stop offset="1" stop-color="#d4708a"/></linearGradient>
    <linearGradient id="p2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3b6c3"/><stop offset="1" stop-color="#bf5672"/></linearGradient>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e2a6"/><stop offset="1" stop-color="#c9a24f"/></linearGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d692"/><stop offset="1" stop-color="#b58c3c"/></linearGradient>
  </defs>
  <path d="M70,120 C110,150 150,40 196,52" stroke="#c9a45c" stroke-width="1.6" stroke-dasharray="2 7" stroke-linecap="round" fill="none" opacity=".8"/>
  ${butterfly(66, 112, 0.95, -14, 'p1', 'p2', '#a8495f')}
  ${butterfly(192, 48, 0.62, 18, 'g1', 'g2', '#94733a')}
</svg>`);

/* ---------------- heart balloons ---------------- */
const balloons = [
  { x: 56, y: 150, s: 64, a: '#f6c4cc', b: '#d97a8e' },
  { x: 150, y: 66, s: 70, a: '#f3dba0', b: '#c39a48' },
  { x: 96, y: 90, s: 92, a: '#e3586f', b: '#9b1f35' },
];
write('addon_heart_balloons.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 380" width="210" height="380">
  <defs>${balloons.map((b, i) => `<radialGradient id="b${i}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${b.a}"/><stop offset="1" stop-color="${b.b}"/></radialGradient>`).join('')}</defs>
  ${balloons.map((b) => `<path d="M${b.x},${r1(b.y + b.s * 0.42)} C${r1(b.x - 8)},${r1(b.y + b.s * 1.2)} ${r1(b.x + 30)},${r1(b.y + b.s * 1.6)} 112,372" stroke="#9c8a7a" stroke-width="1.3" fill="none"/>`).join('\n  ')}
  ${balloons.map((b, i) => `<path d="${heart(b.x, b.y, b.s)}" fill="url(#b${i})"/>
  <path d="M${r1(b.x - b.s * 0.32)},${r1(b.y - b.s * 0.22)} q${r1(b.s * 0.06)},${r1(-b.s * 0.16)} ${r1(b.s * 0.2)},${r1(-b.s * 0.14)}" stroke="#fff" stroke-width="${r1(b.s * 0.06)}" stroke-linecap="round" fill="none" opacity=".55"/>
  <path d="M${r1(b.x - 4)},${r1(b.y + b.s * 0.44)} l4,-7 l4,7z" fill="${b.b}"/>`).join('\n  ')}
</svg>`);

/* ---------------- chocolates ---------------- */
const truffles = [
  [78, 104, '#4a2a1e', '#7a4a34'], [108, 96, '#8a5636', '#b47d58'], [138, 104, '#efe2cf', '#fff8ee'],
  [92, 124, '#e7a3b0', '#f7cdd5'], [124, 124, '#4a2a1e', '#7a4a34'], [108, 144, '#8a5636', '#b47d58'],
];
write('addon_chocolates.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 180" width="220" height="180">
  <defs>
    <linearGradient id="box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8253c"/><stop offset="1" stop-color="#6b1224"/></linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8344d"/><stop offset="1" stop-color="#8a1a2e"/></linearGradient>
  </defs>
  <ellipse cx="110" cy="168" rx="88" ry="8" fill="#5a3a28" opacity=".16"/>
  <g transform="translate(150 70) rotate(18) scale(1 .9)"><path d="${heart(0, 0, 120)}" fill="url(#lid)" stroke="#d8b46a" stroke-width="3"/></g>
  <g transform="translate(108 112) scale(1 .78)"><path d="${heart(0, 0, 150)}" fill="url(#box)" stroke="#d8b46a" stroke-width="4"/>
  <path d="${heart(0, 2, 128)}" fill="#3e0d18" opacity=".55"/></g>
  ${truffles.map(([x, y, c, hl]) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/><path d="M${x - 8},${y - 3} q4,-6 8,0 t8,0" stroke="${hl}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join('\n  ')}
</svg>`);

/* ---------------- fairy lights ---------------- */
function swag(p0, p1, p2, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]);
  }
  return pts;
}
const swags = [[[12, 40], [150, 190], [300, 92]], [[300, 92], [450, 190], [588, 40]]];
const bulbs = swags.flatMap((s, k) => swag(...s, 7).slice(k ? 1 : 0, -1).concat(k ? [s[2]] : []));
write('addon_fairy_lights.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200">
  <defs><radialGradient id="glow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd87a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd87a" stop-opacity="0"/></radialGradient></defs>
  ${swags.map(([a, b, c]) => `<path d="M${a} Q${b} ${c}" stroke="#7a6a4a" stroke-width="1.6" fill="none" opacity=".85"/>`).join('\n  ')}
  ${bulbs.map(([x, y], i) => `<circle cx="${r1(x)}" cy="${r1(y + 9)}" r="17" fill="url(#glow)"/><path d="M${r1(x)},${r1(y)} v4" stroke="#7a6a4a" stroke-width="1.4"/><ellipse cx="${r1(x)}" cy="${r1(y + 9)}" rx="3.6" ry="5.4" fill="${i % 3 === 1 ? '#ffe9b0' : '#fff6d8'}"/>`).join('\n  ')}
</svg>`);

/* ---------------- placement ---------------- */
const settings = {
  'addon_teddy_bear.svg': { x: 110, y: 526, w: 180, layer: 'top' },
  'addon_butterflies.svg': { x: 128, y: 150, w: 170, layer: 'top' },
  'addon_heart_balloons.svg': { x: 468, y: 150, w: 160, layer: 'back' },
  'addon_chocolates.svg': { x: 488, y: 596, w: 170, layer: 'top' },
  'addon_fairy_lights.svg': { x: 300, y: 300, w: 560, layer: 'top' },
};
fs.writeFileSync(path.join(ROOT, 'AddOns', 'addon-settings.json'), JSON.stringify(settings, null, 2) + '\n');
console.log('wrote AddOns/addon-settings.json');
