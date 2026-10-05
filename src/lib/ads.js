// Adsterra banner settings from src/config.js.
import config from '../config.js';
import { isLocal } from './util.js';

const ADS = config.ads || {};
const HOST = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(ADS.scriptHost || '') ? ADS.scriptHost : '';
const unit = (u) => (u && /^[a-f0-9]{16,64}$/i.test(u.key || '') && u.width > 0 && u.height > 0
  ? { key: u.key, width: Math.round(u.width), height: Math.round(u.height) } : null);

export const AD_WIDE = HOST ? unit(ADS.wide) : null;
export const AD_NARROW = HOST ? unit(ADS.narrow) : null;

// Native Banner: one script that fills a container with that id.
export const AD_NATIVE = (() => {
  const n = ADS.native || {};
  try {
    const u = new URL(n.src || '');
    if (u.protocol !== 'https:' || !/^container-[A-Za-z0-9_-]{8,80}$/.test(n.containerId || '')) return null;
    return { src: u.href, containerId: n.containerId };
  } catch { return null; }
})();

// Popunder: one script for the whole site, from Adsterra's code <script src="…">.
export const AD_POPUNDER = (() => {
  try {
    const raw = (ADS.popunder?.src || '').trim();
    const u = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    return u.protocol === 'https:' && u.pathname.length > 1 ? u.href : null;
  } catch { return null; }
})();

// Loads the popunder on the home page and in the studio only. Never on a received bouquet:
// if one is opened in a tab that already has it, the page reloads without it.
let popLoaded = false;
export function popunderFor(view) {
  if (!AD_POPUNDER || isLocal) return;
  if (view === 'viewer') { if (popLoaded) location.reload(); return; }
  if (popLoaded || (view !== 'home' && view !== 'studio')) return;
  popLoaded = true;
  const s = document.createElement('script');
  s.src = AD_POPUNDER;
  s.async = true;
  s.dataset.cfasync = 'false';
  document.body.append(s);
}

export const adsReady = !!(AD_NATIVE || AD_WIDE || AD_NARROW);
// Live site: no slots until a banner is set up. Locally, placeholders show where they'll go.
export const showAds = adsReady || isLocal;

// The banner's own little page: Adsterra's code relies on one global atOptions, so each banner
// runs in its own frame and several can share a page.
export function bannerDoc(u) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>
<script>atOptions = { key: ${JSON.stringify(u.key)}, format: 'iframe', height: ${u.height}, width: ${u.width}, params: {} };</script>
<script src="https://${HOST}/${u.key}/invoke.js"></script>
</body></html>`;
}
