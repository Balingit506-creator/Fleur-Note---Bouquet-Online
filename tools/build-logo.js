// Builds the site logo and icons from one illustration (default: tools/source/logo_source.png).
//   - removes the stray curve cropped in at the bottom-left of the source
//   - makes the soft, half-transparent leaves and paper solid so the logo reads on dark backgrounds
//   - trims, then writes img/logo.png (header), img/favicon-32.png, img/favicon-64.png and
//     img/apple-touch-icon.png (180×180 on cream, for phone home screens)
// Needs Playwright:  npm run setup-tools   then:  npm run logo
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || path.join(__dirname, 'source', 'logo_source.png');
const OUT = path.join(ROOT, 'public', 'img');
// areas of the source to clear: [x0, y0, x1, y1] in source pixels
const ERASE = [[0, 420, 72, 9999]];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const src = `data:image/png;base64,${fs.readFileSync(SRC).toString('base64')}`;
  const files = await page.evaluate(async ({ src, ERASE }) => {
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
    for (let k = 0; k < W * H; k++) {
      const x = k % W, y = (k / W) | 0, i = k * 4;
      if (ERASE.some(([a, b, cc, dd]) => x >= a && x < cc && y >= b && y < dd)) { px[i + 3] = 0; continue; }
      // solidify: faint haze vanishes, anything meant to be there becomes opaque, edges stay smooth
      const t = Math.min(1, Math.max(0, (px[i + 3] - 22) / (120 - 22)));
      px[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
      if (px[i + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    g.putImageData(d, 0, 0);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

    const render = (size, { pad = 0, bg = null, square = true, height = null } = {}) => {
      const o = document.createElement('canvas');
      let w, h, s;
      if (square) { w = h = size; s = (size - pad * 2) / Math.max(bw, bh); }
      else { h = height; s = (h - pad * 2) / bh; w = Math.ceil(bw * s + pad * 2); }
      o.width = w;
      o.height = h;
      const og = o.getContext('2d');
      if (bg) { og.fillStyle = bg; og.fillRect(0, 0, w, h); }
      og.imageSmoothingQuality = 'high';
      og.drawImage(c, x0, y0, bw, bh, (w - bw * s) / 2, (h - bh * s) / 2, bw * s, bh * s);
      return o.toDataURL('image/png');
    };
    return {
      'logo.png': render(0, { square: false, height: 192 }),          // shown at ~48px tall, sharp on high-DPI screens
      'favicon-32.png': render(32, { pad: 1 }),
      'favicon-64.png': render(64, { pad: 2 }),
      'apple-touch-icon.png': render(180, { pad: 18, bg: '#f5efe7' }),
    };
  }, { src, ERASE });
  for (const [name, url] of Object.entries(files)) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log(`img/${name}  ${(buf.length / 1024).toFixed(1)} KB`);
  }
  await browser.close();
})();
