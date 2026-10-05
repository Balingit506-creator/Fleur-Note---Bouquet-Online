// Cleans up a transparent cutout: removes the pale halo left by soft masking (alpha "choke"),
// trims empty margins, downsizes, and saves WebP or PNG. Needs Playwright (Chromium canvas):
//   npm i -D playwright && npx playwright install chromium
//   node tools/clean-cutout.js <in.png> <out.webp|out.png> [--choke 70,230] [--max 1000]
// Prints the bounding box it trimmed to, so you can position the image.
const { chromium } = require('playwright');
const fs = require('fs');

const [IN, OUT, ...rest] = process.argv.slice(2);
if (!IN || !OUT) {
  console.error('usage: node tools/clean-cutout.js <in> <out> [--choke lo,hi] [--max px]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};
const [LO, HI] = opt('choke', '70,230').split(',').map(Number);
const MAX = +opt('max', 1000);
const KEEP = rest.includes('--keep-size'); // don't trim or resize (keeps flowers in scale with the others)
const TYPE = /\.webp$/i.test(OUT) ? 'image/webp' : 'image/png';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const src = `data:image/png;base64,${fs.readFileSync(IN).toString('base64')}`;
  const res = await page.evaluate(async ({ src, LO, HI, MAX, TYPE, KEEP }) => {
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
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < px.length; i += 4) {
      const t = Math.min(1, Math.max(0, (px[i + 3] - LO) / (HI - LO)));
      px[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
      if (px[i + 3] > 8) {
        const k = i / 4, x = k % W, y = (k / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    g.putImageData(d, 0, 0);
    const pad = 4;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    if (KEEP) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; MAX = Infinity; }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, s = Math.min(1, MAX / Math.max(cw, ch));
    const o = document.createElement('canvas');
    o.width = Math.round(cw * s);
    o.height = Math.round(ch * s);
    const og = o.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
    return { url: o.toDataURL(TYPE, 0.92), bbox: [x0, y0, x1, y1], size: [o.width, o.height] };
  }, { src, LO, HI, MAX, TYPE, KEEP });
  fs.writeFileSync(OUT, Buffer.from(res.url.split(',')[1], 'base64'));
  console.log(`${OUT}: ${res.size.join('x')} (trimmed source box ${res.bbox.join(',')})`);
  await browser.close();
})();
