// Adsterra banner settings from src/config.js.
import config from '../config.js';
import { useSyncExternalStore } from 'react';
import { isLocal, store } from './util.js';

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

// Social Bar: one script for the whole site, from Adsterra's code <script src="…">.
export const AD_SOCIAL_BAR = (() => {
  try {
    const raw = (ADS.socialBar?.src || '').trim();
    const u = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    return u.protocol === 'https:' && u.pathname.length > 1 ? u.href : null;
  } catch { return null; }
})();

// Ad-free pass: anyone who gives (any amount) stops seeing ads in this browser, for good.
// Granted only when PayPal reports a completed payment. (v1 passes came from a mere click on a
// "give" button, so they no longer count.)
const AD_FREE_KEY = 'fleur-ad-free-v2';
store.del('fleur-ad-free-v1');
let adFree = !!store.get(AD_FREE_KEY);
const adFreeListeners = new Set();
export function grantAdFree() {
  if (adFree) return;
  adFree = true;
  store.set(AD_FREE_KEY, { since: Date.now() });
  adFreeListeners.forEach((fn) => fn());
  // The Social Bar script can't be unloaded, so reload quietly once they come back from paying.
  if (barLoaded) {
    const onBack = () => { if (document.visibilityState === 'visible') location.reload(); };
    document.addEventListener('visibilitychange', onBack);
  }
}
// Paid in another tab? Pick the pass up here too.
window.addEventListener('storage', (e) => {
  if (e.key !== AD_FREE_KEY || !e.newValue || adFree) return;
  adFree = true;
  adFreeListeners.forEach((fn) => fn());
  if (barLoaded) location.reload();
});
const subscribeAdFree =(fn) => { adFreeListeners.add(fn); return () => adFreeListeners.delete(fn); };
export const useAdFree = () => useSyncExternalStore(subscribeAdFree, () => adFree);

// Loads the Social Bar on the home page and in the studio only. Never on a received bouquet:
// if one is opened in a tab that already has it, the page reloads without it.
let barLoaded = false;
export function socialBarFor(view) {
  if (!AD_SOCIAL_BAR || isLocal || adFree) return;
  if (view === 'viewer') { if (barLoaded) location.reload(); return; }
  if (barLoaded || (view !== 'home' && view !== 'studio')) return;
  barLoaded = true;
  const s = document.createElement('script');
  s.src = AD_SOCIAL_BAR;
  s.async = true;
  s.dataset.cfasync = 'false';
  document.body.append(s);
}

export const adsReady = !!(AD_NATIVE || AD_WIDE || AD_NARROW);
// Live site: no slots until a banner is set up. Locally, placeholders show where they'll go.
export const showAds = adsReady || isLocal;
// The native ad holds the main spot, so a banner set up alongside it gets a spot of its own.
export const showBanner = !!AD_NATIVE && (!!(AD_WIDE || AD_NARROW) || isLocal);

// The banner's own little page: Adsterra's code relies on one global atOptions, so each banner
// runs in its own frame and several can share a page.
export function bannerDoc(u) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>
<script>atOptions = { key: ${JSON.stringify(u.key)}, format: 'iframe', height: ${u.height}, width: ${u.width}, params: {} };</script>
<script src="https://${HOST}/${u.key}/invoke.js"></script>
</body></html>`;
}
