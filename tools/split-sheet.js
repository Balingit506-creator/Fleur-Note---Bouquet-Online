// Splits a sticker sheet (several pieces on a white/checkerboard background) into separate
// transparent sprigs, ready for Greenery/. Each piece is turned so its stem points up and is
// padded so the stem base sits at the bottom centre, where the bouquet is tied.
// Needs Playwright (Chromium canvas):
//   npm i -D playwright && npx playwright install chromium
//   node tools/split-sheet.js <sheet.png> <out dir> name1[:deg] name2[:deg] ...
// Pieces are numbered left-to-right, top-to-bottom; ":deg" rotates that piece (clockwise).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [SHEET, OUTDIR, ...specs] = process.argv.slice(2);
if (!SHEET || !OUTDIR || !specs.length) {
  console.error('usage: node tools/split-sheet.js <sheet.png> <out dir> name[:deg] ...');
  process.exit(1);
}
const pieces = specs.map((s) => {
  const [name, deg] = s.split(':');
  return { name, deg: +deg || 0 };
});

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const src = `data:image/png;base64,${fs.readFileSync(SHEET).toString('base64')}`;
  const res = await page.evaluate(async ({ src, pieces }) => {
    const im = new Image();
    im.src = src;
    await im.decode();
    const W = im.width, H = im.height;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, W, H), px = d.data;

    // 1. flood-fill the neutral light background from the edges
    const isBg = (k) => {
      const i = k * 4, r = px[i], gg = px[i + 1], b = px[i + 2];
      return px[i + 3] < 10 || (Math.max(r, gg, b) - Math.min(r, gg, b) < 10 && Math.min(r, gg, b) > 228);
    };
    const bg = new Uint8Array(W * H), stack = [];
    for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
    while (stack.length) {
      const k = stack.pop();
      if (bg[k] || !isBg(k)) continue;
      bg[k] = 1;
      const x = k % W;
      if (x > 0) stack.push(k - 1);
      if (x < W - 1) stack.push(k + 1);
      if (k >= W) stack.push(k - W);
      if (k < W * (H - 1)) stack.push(k + W);
    }
    // pockets of background enclosed by leaves: clear any neutral-light patch of 12+ pixels
    // (cream buds are tinted, so they never match)
    for (let s = 0; s < W * H; s++) {
      if (bg[s] || !isBg(s)) continue;
      const region = [], q = [s];
      bg[s] = 2;
      while (q.length) {
        const k = q.pop();
        region.push(k);
        const x = k % W;
        for (const j of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W]) {
          if (j >= 0 && j < W * H && !bg[j] && isBg(j)) { bg[j] = 2; q.push(j); }
        }
      }
      const keep = region.length < 12;
      for (const k of region) bg[k] = keep ? 0 : 1;
    }
    for (let k = 0; k < W * H; k++) {
      if (bg[k]) { px[k * 4 + 3] = 0; continue; }
      const x = k % W;
      let n = 0;
      for (const j of [k - 1, k + 1, k - W, k + W]) if (j >= 0 && j < W * H && Math.abs((j % W) - x) <= 1 && bg[j]) n++;
      if (n) px[k * 4 + 3] = 255 - n * 50; // soften the cut edge
    }
    g.putImageData(d, 0, 0);

    // 2. connected pieces on a coarse grid (so detached leaves stay with their sprig)
    const C = 4, GW = Math.ceil(W / C), GH = Math.ceil(H / C), cell = new Uint8Array(GW * GH);
    for (let k = 0; k < W * H; k++) if (px[k * 4 + 3] > 40) cell[((k / W / C) | 0) * GW + ((k % W) / C | 0)] = 1;
    const label = new Int32Array(GW * GH).fill(-1), comps = [];
    for (let s = 0; s < GW * GH; s++) {
      if (!cell[s] || label[s] >= 0) continue;
      const box = { x0: GW, y0: GH, x1: 0, y1: 0, n: 0 }, q = [s];
      label[s] = comps.length;
      while (q.length) {
        const t = q.pop(), tx = t % GW, ty = (t / GW) | 0;
        box.n++;
        box.x0 = Math.min(box.x0, tx); box.x1 = Math.max(box.x1, tx); box.y0 = Math.min(box.y0, ty); box.y1 = Math.max(box.y1, ty);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = tx + dx, ny = ty + dy, j = ny * GW + nx;
          if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && cell[j] && label[j] < 0) { label[j] = comps.length; q.push(j); }
        }
      }
      comps.push(box);
    }
    const big = comps.filter((b) => b.n > 400).sort((a, b) => b.n - a.n).slice(0, pieces.length);
    // reading order: rows by vertical centre, then left to right
    const rowH = H / C / 2.2;
    big.sort((a, b) => Math.round((a.y0 + a.y1) / 2 / rowH) - Math.round((b.y0 + b.y1) / 2 / rowH) || a.x0 - b.x0);

    // 3. cut, rotate, and pad so the stem base is bottom-centre
    const out = [];
    big.forEach((b, idx) => {
      const id = comps.indexOf(b), spec = pieces[idx];
      const x0 = b.x0 * C, y0 = b.y0 * C, w = (b.x1 - b.x0 + 1) * C, h = (b.y1 - b.y0 + 1) * C;
      const piece = document.createElement('canvas');
      piece.width = w;
      piece.height = h;
      const pg = piece.getContext('2d');
      pg.drawImage(c, x0, y0, w, h, 0, 0, w, h);
      const pd = pg.getImageData(0, 0, w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (label[(((y + y0) / C) | 0) * GW + (((x + x0) / C) | 0)] !== id) pd.data[(y * w + x) * 4 + 3] = 0;
      }
      pg.putImageData(pd, 0, 0);

      const rad = (spec.deg * Math.PI) / 180, cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
      const rw = Math.ceil(w * cos + h * sin), rh = Math.ceil(w * sin + h * cos);
      const rot = document.createElement('canvas');
      rot.width = rw;
      rot.height = rh;
      const rg = rot.getContext('2d');
      rg.translate(rw / 2, rh / 2);
      rg.rotate(rad);
      rg.drawImage(piece, -w / 2, -h / 2);
      const rd = rg.getImageData(0, 0, rw, rh).data;
      let tx0 = rw, ty0 = rh, tx1 = 0, ty1 = 0;
      for (let k = 0; k < rw * rh; k++) if (rd[k * 4 + 3] > 20) {
        const x = k % rw, y = (k / rw) | 0;
        tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); ty0 = Math.min(ty0, y); ty1 = Math.max(ty1, y);
      }
      // stem base = mean x of opaque pixels in the lowest 3% of the piece
      let sx = 0, sn = 0;
      const band = Math.max(4, ((ty1 - ty0) * 0.03) | 0);
      for (let y = ty1 - band; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) if (rd[(y * rw + x) * 4 + 3] > 60) { sx += x; sn++; }
      const base = sn ? sx / sn : (tx0 + tx1) / 2;
      const half = Math.ceil(Math.max(base - tx0, tx1 - base)) + 2;
      const fw = half * 2, fh = ty1 - ty0 + 3;
      const fin = document.createElement('canvas');
      fin.width = fw;
      fin.height = fh;
      fin.getContext('2d').drawImage(rot, base - half, ty0, fw, fh, 0, 0, fw, fh);
      out.push({ name: spec.name, url: fin.toDataURL('image/webp', 0.92), size: [fw, fh], at: [x0, y0] });
    });
    return out;
  }, { src, pieces });

  for (const r of res) {
    const file = path.join(OUTDIR, `${r.name}.webp`);
    fs.writeFileSync(file, Buffer.from(r.url.split(',')[1], 'base64'));
    console.log(`${file}: ${r.size.join('x')} (from sheet at ${r.at.join(',')})`);
  }
  await browser.close();
})();
