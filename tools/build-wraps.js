// Builds layered wraps (back + front, in six colours) from one wrap illustration.
// It removes a baked-in checkerboard background, places the wrap on the 600x760 stage and splits
// off the front sheets so flowers sit inside the paper. Needs Playwright (Chromium canvas):
//   npm i -D playwright && npx playwright install chromium
//   node tools/build-wraps.js <design> [preview.png]   then: node tools/build-manifest.js
// Designs (source images live in tools/source/):
const DESIGNS = {
  // open cone with translucent tissue; the studio ties a ribbon at the neck
  gilded: {
    source: 'wrap_gilded_source.png',
    place: { scale: 0.46, from: [655, 1010], to: [300, 606] }, // image point "from" lands on stage point "to"
    front: [[0,676],[250,674],[470,814],[690,964],[900,866],[1090,784],[1323,784],[1323,9999],[0,9999]],
    seeds: [[320,150],[1030,140],[300,170],[1010,125]],
    tissue: [[255, 100, 400, 205], [975, 100, 1085, 195]],
  },
  // closed wrap with its own satin bow; the front (folds + bow) is drawn over the flowers
  satin: {
    source: 'wrap_satin_source.png',
    place: { scale: 0.46, from: [648, 1201], to: [300, 755] },
    front: [[0,600],[370,575],[600,640],[690,662],[980,545],[1295,545],[1295,9999],[0,9999]],
    seeds: [],
    tissue: [],
  },
};
const TINTS = [
  ['champagne', null], ['ivory_pearl', [239, 233, 223]], ['dusty_rose', [228, 178, 178]],
  ['sage', [186, 198, 168]], ['lilac', [206, 192, 224]], ['noir', [62, 56, 58]],
];
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const NAME = process.argv[2] || 'satin';
const D = DESIGNS[NAME];
if (!D) { console.error(`unknown design "${NAME}". Choose: ${Object.keys(DESIGNS).join(', ')}`); process.exit(1); }
const SRC = path.join(__dirname, 'source', D.source);
const OUTDIR = path.join(ROOT, 'public', 'Wrap');
const PREVIEW = process.argv[3];
const VARIANTS = TINTS.map(([id, tint]) => ({ id: `${id}_${NAME}`, tint }));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');
  const res = await p.evaluate(async ({ dataUrl, VARIANTS, D }) => {
    const im = new Image(); im.src = dataUrl; await im.decode();
    const W = im.width, H = im.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, W, H); const px = d.data;
    const bgTest = (tol, floor) => (i) => { const r = px[i], g = px[i+1], b = px[i+2]; return Math.max(r,g,b) - Math.min(r,g,b) < tol && Math.min(r,g,b) > floor; };
    const seen = new Uint8Array(W * H);
    const fill = (seeds, test) => {
      const stack = [...seeds];
      while (stack.length) {
        const k = stack.pop(); if (seen[k]) continue;
        if (!test(k*4)) { seen[k] = 1; continue; }
        seen[k] = 2;
        const x = k % W, y = (k / W) | 0;
        if (x > 0) stack.push(k-1); if (x < W-1) stack.push(k+1); if (y > 0) stack.push(k-W); if (y < H-1) stack.push(k+W);
      }
    };
    const edge = []; for (let x = 0; x < W; x++) edge.push(x, (H-1)*W + x); for (let y = 0; y < H; y++) edge.push(y*W, y*W + W-1);
    fill(edge, bgTest(14, 196));
    // checker visible through the tissue near the top
    for (const k of [...seen.keys()]) if (seen[k] === 1) seen[k] = 0;
    fill(D.seeds.map(([x, y]) => y*W + x), bgTest(24, 186));
    for (let k = 0; k < W*H; k++) {
      if (seen[k] === 2) { px[k*4+3] = 0; continue; }
      const x = k % W, y = (k / W) | 0; let n = 0;
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const xx=x+dx, yy=y+dy; if (xx>=0&&yy>=0&&xx<W&&yy<H&&seen[yy*W+xx]===2) n++; }
      if (n) px[k*4+3] = 255 - n*55;
    }
    // The two tissue sheets peeking out at the top are translucent in the artwork, so the
    // checkerboard shows through them: average it out (masked box blur) and keep them see-through.
    const TISSUE = D.tissue;
    const RAD = 14;
    const isTissue = (k) => {
      const i = k*4, r = px[i], g = px[i+1], b2 = px[i+2], mx = Math.max(r,g,b2), mn = Math.min(r,g,b2);
      return px[i+3] > 200 && mn > 195 && (mx - mn) / mx < 0.14;
    };
    for (const [x0, y0, x1, y1] of TISSUE) {
      const w = x1 - x0, hgt = y1 - y0, mask = new Uint8Array(w*hgt);
      for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) mask[y*w+x] = isTissue((y+y0)*W + x+x0) ? 1 : 0;
      const sum = new Float64Array((w+1)*(hgt+1)*4); // integral image of masked r,g,b and mask count
      for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
        const m = mask[y*w+x], i = ((y+y0)*W + x+x0)*4, o = ((y+1)*(w+1) + x+1)*4, up = (y*(w+1) + x+1)*4, lf = ((y+1)*(w+1) + x)*4, ul = (y*(w+1) + x)*4;
        for (let ch = 0; ch < 4; ch++) sum[o+ch] = (ch < 3 ? px[i+ch]*m : m) + sum[up+ch] + sum[lf+ch] - sum[ul+ch];
      }
      const box = (ch, xa, ya, xb, yb) => sum[(yb*(w+1)+xb)*4+ch] - sum[(ya*(w+1)+xb)*4+ch] - sum[(yb*(w+1)+xa)*4+ch] + sum[(ya*(w+1)+xa)*4+ch];
      for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
        if (!mask[y*w+x]) continue;
        const xa = Math.max(0, x-RAD), ya = Math.max(0, y-RAD), xb = Math.min(w, x+RAD+1), yb = Math.min(hgt, y+RAD+1);
        const n = box(3, xa, ya, xb, yb), i = ((y+y0)*W + x+x0)*4;
        for (let ch = 0; ch < 3; ch++) px[i+ch] = box(ch, xa, ya, xb, yb) / n;
        px[i+3] = Math.min(px[i+3], 215);
      }
    }
    const base = new ImageData(new Uint8ClampedArray(px), W, H);

    // stage placement on the 600x760 viewBox; R = output resolution multiplier
    const S = D.place.scale, OX = D.place.to[0] - D.place.from[0]*S, OY = D.place.to[1] - D.place.from[1]*S, R = 2;
    // front layer = the sheets (and bow) in front of the stems, in image coordinates
    const FRONT = D.front;

    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x-a)/(b-a))); return t*t*(3-2*t); };
    const recolor = (tint) => {
      const out = new ImageData(new Uint8ClampedArray(base.data), W, H); const q = out.data;
      if (!tint) return out;
      const baseLum = 0.80;
      for (let i = 0; i < q.length; i += 4) {
        if (!q[i+3]) continue;
        const r = q[i], g = q[i+1], bl = q[i+2];
        const mx = Math.max(r,g,bl), mn = Math.min(r,g,bl), s = mx ? (mx-mn)/mx : 0;
        let hue = 0; if (mx !== mn) { if (mx === r) hue = 60*(((g-bl)/(mx-mn))%6); else if (mx === g) hue = 60*((bl-r)/(mx-mn)+2); else hue = 60*((r-g)/(mx-mn)+4); } if (hue < 0) hue += 360;
        const gold = smooth(0.26, 0.38, s) * smooth(24, 30, hue) * (1 - smooth(55, 65, hue));
        const lum = (0.299*r + 0.587*g + 0.114*bl) / 255;
        const k = lum / baseLum;
        const nr = Math.min(255, tint[0]*k), ng = Math.min(255, tint[1]*k), nb = Math.min(255, tint[2]*k);
        q[i] = nr + (r-nr)*gold; q[i+1] = ng + (g-ng)*gold; q[i+2] = nb + (bl-nb)*gold;
      }
      return out;
    };
    const outputs = {};
    for (const v of VARIANTS) {
      const src = document.createElement('canvas'); src.width = W; src.height = H;
      src.getContext('2d').putImageData(recolor(v.tint), 0, 0);
      for (const part of ['back', 'front']) {
        const o = document.createElement('canvas'); o.width = 600*R; o.height = 760*R;
        const g = o.getContext('2d'); g.scale(R, R);
        g.translate(OX, OY); g.scale(S, S);
        if (part === 'front') { g.beginPath(); FRONT.forEach(([x,y],j) => j ? g.lineTo(x,y) : g.moveTo(x,y)); g.closePath(); g.clip(); }
        g.imageSmoothingQuality = 'high';
        g.drawImage(src, 0, 0);
        outputs[`wrap_${v.id}_${part}.webp`] = o.toDataURL('image/webp', 0.9);
      }
    }
    // preview sheet: back+front stacked for each variant, plus front alone for the first
    const cols = VARIANTS.length + 1, pv = document.createElement('canvas'); pv.width = 300*cols; pv.height = 380;
    const pg = pv.getContext('2d'); pg.fillStyle = '#f4ece2'; pg.fillRect(0,0,pv.width,pv.height);
    const load = (u) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    for (let j = 0; j < VARIANTS.length; j++) {
      pg.drawImage(await load(outputs[`wrap_${VARIANTS[j].id}_back.webp`]), 300*j, 0, 300, 380);
      pg.fillStyle = 'rgba(200,40,60,.35)'; pg.fillRect(300*j+140, 200, 20, 100);
      pg.drawImage(await load(outputs[`wrap_${VARIANTS[j].id}_front.webp`]), 300*j, 0, 300, 380);
    }
    pg.drawImage(await load(outputs[`wrap_${VARIANTS[0].id}_front.webp`]), 300*VARIANTS.length, 0, 300, 380);
    outputs.__preview = pv.toDataURL('image/png');
    return outputs;
  }, { dataUrl, VARIANTS, D });
  for (const [name, url] of Object.entries(res)) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if (name === '__preview') { if (PREVIEW) fs.writeFileSync(PREVIEW, buf); }
    else { fs.writeFileSync(path.join(OUTDIR, name), buf); console.log(name, (buf.length/1024|0) + 'KB'); }
  }
  await b.close();
})();
