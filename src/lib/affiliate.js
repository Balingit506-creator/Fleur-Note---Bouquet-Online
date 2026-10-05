// Amazon Associates links from src/config.js.
import config from '../config.js';
import { isLocal } from './util.js';

const AFF = config.affiliate || {};
export const AFF_TAG = /^[A-Za-z0-9-]{3,40}$/.test(AFF.tag || '') ? AFF.tag : '';
const DOMAIN = /^amazon\.[a-z.]{2,8}$/.test(AFF.domain || '') ? AFF.domain : 'amazon.com';

// Adds the tracking ID to a search or product link (only Amazon links are accepted).
function amazonUrl(p) {
  let u;
  if (p.url) {
    try { u = new URL(p.url); } catch { return ''; }
    if (u.protocol !== 'https:' || !/(^|\.)amazon\.[a-z.]+$/.test(u.hostname)) return '';
  } else {
    u = new URL(`https://www.${DOMAIN}/s`);
    u.searchParams.set('k', String(p.search || p.title || ''));
  }
  if (AFF_TAG) u.searchParams.set('tag', AFF_TAG);
  return u.href;
}

export const AFF_PRODUCTS = (Array.isArray(AFF.products) ? AFF.products : [])
  .filter((p) => p && p.title && (p.search || p.url))
  .slice(0, 12)
  .map((p) => ({ title: String(p.title).slice(0, 60), note: String(p.note || '').slice(0, 80), icon: p.icon, href: amazonUrl(p) }))
  .filter((p) => p.href);

// Live site: hidden until a tracking ID is set. Locally, previewed anyway.
export const showShelf = AFF_PRODUCTS.length > 0 && (!!AFF_TAG || isLocal);
