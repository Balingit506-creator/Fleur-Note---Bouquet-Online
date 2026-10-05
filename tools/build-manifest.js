// Scans public/Flowers, Greenery, Wrap, Envelope and AddOns and writes src/data/assets.json.
// Runs automatically with npm run dev / npm run build (and again whenever an image is added or
// removed while the dev server runs). By hand:  node tools/build-manifest.js
//
// Folder conventions
//   Flowers/<Kind>/<any name>.png     each sub-folder is a flower kind (Roses, Tulips, Peonies...)
//   Greenery/<any name>.png|svg       tall sprigs are fanned out; wide images are placed once as a base
//   Wrap/<name>_back.* + <name>_front.*   back sits behind the flowers, front covers the stems
//   Envelope/<name>.png|svg           a paper texture used for the envelope
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public'); // image folders live in public/, served as-is
const OUT = path.join(__dirname, '..', 'src', 'data', 'assets.json');
const IMG = /\.(png|jpe?g|webp|svg|avif)$/i;
const NOISE = /^(greenery|wrap|envelope|addon|photorealistic|isolated|vibrant|bloom|cutout|flower|v\d+|watercolor|png)$/i;
// A folder like Flowers/Others/ can hold different flowers: each file's kind is the last word of its
// name, e.g. "White Lily.png" → White + Lily, "Golden Sunflower.png" → Golden + Sunflower.
const MIXED = /^(others?|mixed|misc|more)$/i;

const list = (dir) => {
  const full = path.join(ROOT, dir);
  return fs.existsSync(full) ? fs.readdirSync(full).sort((a, b) => a.localeCompare(b)) : [];
};
const url = (rel) => rel.split('/').map(encodeURIComponent).join('/');
const title = (words) => words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');

function prettify(file, drop = []) {
  const words = path
    .parse(file)
    .name.split(/[\s_\-]+/)
    .filter((w) => w && !NOISE.test(w) && !drop.some((d) => d.test(w)));
  return title(words.length ? words : [path.parse(file).name]);
}

function size(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  if (buf.toString('ascii', 1, 4) === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (/\.svg$/i.test(rel)) {
    const m = buf.toString('utf8').match(/viewBox="[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/);
    if (m) return { w: +m[1], h: +m[2] };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) }; }
    if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o < buf.length) {
      const marker = buf[o + 1], len = buf.readUInt16BE(o + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { w: buf.readUInt16BE(o + 7), h: buf.readUInt16BE(o + 5) };
      o += 2 + len;
    }
  }
  return { w: 0, h: 0 };
}

const flowers = [];
for (const kind of list('Flowers')) {
  if (!fs.statSync(path.join(ROOT, 'Flowers', kind)).isDirectory()) continue;
  // Roses → Rose, Peonies → Peony, but Ranunculus / Iris / Cosmos stay as they are
  const singular = /(us|is|ss|os)$/i.test(kind) ? kind : kind.replace(/ies$/i, 'y').replace(/s$/i, '');
  const drop = [new RegExp(`^${singular}s?$`, 'i')];
  for (const file of list(`Flowers/${kind}`).filter((f) => IMG.test(f))) {
    const rel = `Flowers/${kind}/${file}`;
    let name = prettify(file, drop), own = title([singular]);
    if (MIXED.test(kind)) {
      const words = prettify(file).split(' ');
      own = words.pop();
      name = words.join(' ') || own;
    }
    flowers.push({ id: rel, src: url(rel), name, kind: own, kinds: kind, ...size(rel) });
  }
}

// Optional Greenery/greenery-settings.json: { "<file name>": { "layout": "collar", "width": 560, "anchor": [0.5, 0.48] } }
//   layout: "sprig" (fanned several times), "fan" (placed once, low) or "collar" (placed once, centred behind the blooms)
//   hidden: true keeps a file (e.g. an uncut source sheet) out of the studio
const greenFile = path.join(ROOT, 'Greenery', 'greenery-settings.json');
const greenSettings = fs.existsSync(greenFile) ? JSON.parse(fs.readFileSync(greenFile, 'utf8')) : {};
const greenery = list('Greenery')
  .filter((f) => IMG.test(f))
  .map((file) => {
    const rel = `Greenery/${file}`;
    return { id: rel, src: url(rel), name: prettify(file), ...size(rel), ...(greenSettings[file] || {}) };
  })
  .filter((g) => !g.hidden);

const wrapGroups = new Map();
for (const file of list('Wrap').filter((f) => IMG.test(f))) {
  const m = path.parse(file).name.match(/^(.*?)[_\-\s]*(back|front)$/i);
  const key = m ? m[1] : path.parse(file).name;
  const part = m ? m[2].toLowerCase() : 'front';
  if (!wrapGroups.has(key)) wrapGroups.set(key, { id: key, name: prettify(key) });
  wrapGroups.get(key)[part] = url(`Wrap/${file}`);
}
// Optional Wrap/wrap-settings.json: { "<wrap id>": { "ribbon": { "scale": 0.65, "y": 606 } } }
const settingsFile = path.join(ROOT, 'Wrap', 'wrap-settings.json');
const wrapSettings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
const wraps = [...wrapGroups.values()].map((w) => ({ ...w, ...(wrapSettings[w.id] || {}) }));

const envelopes = list('Envelope')
  .filter((f) => IMG.test(f))
  .map((file) => ({ id: path.parse(file).name, src: url(`Envelope/${file}`), name: prettify(file) }));

// Optional AddOns/addon-settings.json places each add-on:
//   { "<file>": { "x": 300, "y": 600, "w": 180, "layer": "top" | "back" } }  (centre on the 600x760 stage)
const addonFile = path.join(ROOT, 'AddOns', 'addon-settings.json');
const addonSettings = fs.existsSync(addonFile) ? JSON.parse(fs.readFileSync(addonFile, 'utf8')) : {};
const addons = list('AddOns')
  .filter((f) => IMG.test(f))
  .map((file) => {
    const rel = `AddOns/${file}`;
    const { w: nw, h: nh } = size(rel); // natural size; "w" below is the width on the bouquet
    return { id: rel, src: url(rel), name: prettify(file), nw, nh, x: 300, y: 600, w: 160, layer: 'top', ...(addonSettings[file] || {}) };
  })
  .filter((x) => !x.hidden);

const out = JSON.stringify({ flowers, greenery, wraps, envelopes, addons }, null, 2) + '\n';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// only rewrite when something changed, so the dev server doesn't reload for nothing
if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== out) fs.writeFileSync(OUT, out);
console.log(`src/data/assets.json: ${flowers.length} flowers, ${greenery.length} greenery, ${wraps.length} wraps, ${envelopes.length} envelopes, ${addons.length} add-ons`);
