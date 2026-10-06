// Donation settings from src/config.js. The site only links out or shows details; payment
// happens on each provider's own page.
import config from '../config.js';
import { isLocal } from './util.js';

const DONATE = config.donate || {};
export const DONATE_CUR = /^[A-Z]{3}$/.test(DONATE.currency || '') ? DONATE.currency : 'USD';
const okName = (v) => (typeof v === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(v) ? v : '');
const okHttps = (v) => { try { const u = new URL(v); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
const okImg = (v) => (typeof v === 'string' && (/^[\w\-./ ]+\.(png|jpe?g|webp|svg)$/i.test(v) && !v.includes('..') ? v : okHttps(v)));
const PAYPAL_ME = /^[A-Za-z0-9]{1,20}$/.test(DONATE.paypalMe || '') ? DONATE.paypalMe : '';
const PAYPAL_BIZ = typeof DONATE.business === 'string' && /^[^\s"'<>]{3,127}$/.test(DONATE.business) ? DONATE.business : '';
export const PAYPAL_CLIENT_ID = /^[A-Za-z0-9_-]{20,128}$/.test(DONATE.paypalClientId || '') ? DONATE.paypalClientId : '';
const STRIPE =okHttps(DONATE.stripeLink || '');
const KOFI = okName(DONATE.kofi), BMAC = okName(DONATE.buymeacoffee);
const WALLETS = (Array.isArray(DONATE.wallets) ? DONATE.wallets : [])
  .filter((w) => w && typeof w.name === 'string' && (w.number || w.qr))
  .map((w) => ({ name: String(w.name).slice(0, 30), accountName: String(w.accountName || '').slice(0, 60), number: String(w.number || '').slice(0, 40), qr: okImg(w.qr || '') }));
const BANK = DONATE.bank && DONATE.bank.accountNumber
  ? { bank: String(DONATE.bank.bank || 'Bank').slice(0, 40), accountName: String(DONATE.bank.accountName || '').slice(0, 60), accountNumber: String(DONATE.bank.accountNumber).slice(0, 40), note: String(DONATE.bank.note || '').slice(0, 80) }
  : null;
const LINKS = (Array.isArray(DONATE.links) ? DONATE.links : [])
  .map((l) => ({ label: String(l?.label || '').slice(0, 30), url: okHttps(l?.url || '') }))
  .filter((l) => l.label && l.url);

export const DONATE_AMOUNTS = (Array.isArray(DONATE.amounts) ? DONATE.amounts : [3, 5, 10, 25]).filter((n) => n > 0).slice(0, 6);

function paypalUrl(amt) {
  if (PAYPAL_ME) return `https://www.paypal.com/paypalme/${PAYPAL_ME}${amt ? `/${amt}${DONATE_CUR}` : ''}`;
  const u = new URL('https://www.paypal.com/donate/');
  u.searchParams.set('business', PAYPAL_BIZ);
  if (amt) u.searchParams.set('amount', amt);
  u.searchParams.set('currency_code', DONATE_CUR);
  u.searchParams.set('item_name', 'Support Fleur & Note');
  return u.href;
}

export function donateMethods(amount) {
  const amt = amount > 0 ? Math.round(amount * 100) / 100 : 0;
  const list = [];
  if (PAYPAL_ME || PAYPAL_BIZ) list.push({ name: 'PayPal', sub: 'PayPal balance, card or bank', icon: 'wallet', url: paypalUrl(amt) });
  if (STRIPE) list.push({ name: 'Credit or debit card', sub: 'Secure card checkout by Stripe', icon: 'card', url: STRIPE });
  if (KOFI) list.push({ name: 'Ko-fi', sub: `ko-fi.com/${KOFI}`, icon: 'cup', url: `https://ko-fi.com/${KOFI}` });
  if (BMAC) list.push({ name: 'Buy Me a Coffee', sub: `buymeacoffee.com/${BMAC}`, icon: 'cup', url: `https://buymeacoffee.com/${BMAC}` });
  WALLETS.forEach((w) => list.push({ name: w.name, sub: w.qr ? (w.number ? 'Scan the QR code or send to our number' : 'Scan the QR code in your app') : `Send to ${w.number}`, icon: 'phone', wallet: w }));
  if (BANK) list.push({ name: 'Bank transfer', sub: BANK.bank, icon: 'bank', bank: BANK });
  LINKS.forEach((l) => list.push({ name: l.label, sub: new URL(l.url).hostname.replace(/^www\./, ''), icon: 'heart', url: l.url }));
  return list;
}

export const donateReady = donateMethods(0).length > 0 || !!PAYPAL_CLIENT_ID;
// Live site: hidden until at least one method is set up. Locally, preview it anyway.
export const showDonate = donateReady || isLocal;

export const money = (n) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: DONATE_CUR, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); } catch { return `${n} ${DONATE_CUR}`; }
};

/* ---------- suggestion box settings ---------- */
const SUGGEST = config.suggest || {};
export const SUGGEST_URL = okHttps(SUGGEST.formEndpoint || '');
export const SUGGEST_EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(SUGGEST.email || '') ? SUGGEST.email : '';
export const showIdeas = !!(SUGGEST_URL || SUGGEST_EMAIL) || isLocal;
