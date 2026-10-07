// Builds the link-preview image (img/og-image.png, 1200×630) shown when the site is shared
// on Messenger, WhatsApp, Facebook, X, Discord, iMessage, etc. Uses the logo from img/logo.png.
// Needs Playwright:  npm run setup-tools   then:  npm run og
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'img', 'og-image.png');
const logo = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'public', 'img', 'logo.png')).toString('base64')}`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400&family=Jost:wght@300;400&family=Pinyon+Script&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; }
  body {
    background: radial-gradient(ellipse at 30% 40%, #fbf6ef 0%, #f5efe7 55%, #ecdfd2 100%);
    display: flex; align-items: center; gap: 64px; padding: 0 96px; box-sizing: border-box;
    font-family: 'Jost', sans-serif; color: #3d2e2a;
  }
  .frame { position: absolute; inset: 24px; border: 1.5px solid #d9b8ad; border-radius: 18px; }
  img { width: 360px; height: 360px; object-fit: contain; flex: none; }
  .script { font-family: 'Pinyon Script', cursive; font-size: 54px; color: #c0727a; line-height: 1; }
  h1 { font-family: 'Cormorant Garamond', serif; font-weight: 500; font-size: 112px; margin: 6px 0 18px; line-height: 1; letter-spacing: -1px; }
  p { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 36px; margin: 0; color: #6b5550; line-height: 1.3; }
  .tag { margin-top: 30px; font-size: 20px; letter-spacing: 5px; text-transform: uppercase; color: #a8857c; font-weight: 300; }
</style></head><body>
  <div class="frame"></div>
  <img src="${logo}">
  <div>
    <div class="script">Digital Bouquets</div>
    <h1>Fleur &amp; Note</h1>
    <p>Compose a hand-tied bouquet,<br>write a letter, send it as a link.</p>
    <div class="tag">Free · Private · No sign-up</div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('wrote', path.relative(ROOT, OUT));
})();
