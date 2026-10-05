// Short share links: the bouquet with short codes instead of file names, defaults left out,
// and compressed by the browser. Links made before this (#b=…) still open.
import { ASSETS } from './assets.js';
import { decode, encode, freshState, sanitize, shareBase, shareLink } from './bouquet.js';

// A short, fixed code for each image file (stays the same as long as the file name does).
const code = (s) => {
  let h = 0x811c9dc5;
  for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
};
const byCode = new Map();
for (const list of ['flowers', 'greenery', 'wraps', 'envelopes', 'addons']) for (const a of ASSETS[list]) byCode.set(code(a.id), a.id);
const toCode = (id) => (id ? code(id) : id);
const fromCode = (c) => byCode.get(c) || null;

export const canCompress = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

const b64u = {
  enc: (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

/* ---------- pack ---------- */
export async function pack(st) {
  const base = sanitize({}); // defaults are left out of the link
  const ids = [...new Set(st.stems.map((x) => x.id))];
  const p = { v: 2, sd: st.seed, f: ids.map(toCode), s: st.stems.map((x) => (x.x != null ? [ids.indexOf(x.id), x.x, x.y, x.z || 0] : ids.indexOf(x.id))) };
  if (st.occasion) p.o = st.occasion;
  if (st.greenery.length) p.g = st.greenery.map(toCode);
  if (st.wrap !== base.wrap) p.w = toCode(st.wrap);
  if (st.ribbon !== base.ribbon) p.r = st.ribbon;
  if (st.envelope !== base.envelope) p.e = toCode(st.envelope);
  if (st.seal !== base.seal) p.l = st.seal;
  const c = [st.card.to, st.card.msg, st.card.from, st.card.font, st.card.paper];
  if (c[4] === 'lined') { c.pop(); if (c[3] === 'script') c.pop(); }
  while (c.length && c[c.length - 1] === '') c.pop();
  if (c.length) p.c = c;
  if (st.photos.length) p.ph = st.photos.map((x) => (x.cap ? [x.src, x.cap] : [x.src]));
  if (st.photos.length && st.photoFrame !== 'polaroid') p.pf = st.photoFrame;
  if (st.music) p.m = st.music;
  if (st.yt) p.y = [st.yt.id, st.yt.start || 0, st.yt.title || ''];
  if (st.addons.length) p.ad = st.addons.map(toCode);
  const ap = st.addons.filter((id) => st.addonPos[id]).map((id) => [st.addons.indexOf(id), st.addonPos[id].x, st.addonPos[id].y]);
  if (ap.length) p.ap = ap;
  p.t = Math.round(Date.now() / 1000);
  const json = new TextEncoder().encode(JSON.stringify(p));
  return b64u.enc(await pipe(json, new CompressionStream('deflate-raw')));
}

/* ---------- unpack ---------- */
export async function unpack(str) {
  try {
    const p = JSON.parse(new TextDecoder().decode(await pipe(b64u.dec(str), new DecompressionStream('deflate-raw'))));
    if (p.v !== 2) return null;
    const ids = (Array.isArray(p.f) ? p.f : []).map(fromCode);
    const c = Array.isArray(p.c) ? p.c : [];
    const ad = (Array.isArray(p.ad) ? p.ad : []).map(fromCode);
    const fresh = freshState();
    return sanitize({
      seed: p.sd, occasion: p.o || null,
      stems: (p.s || []).map((a) => (Array.isArray(a) ? { id: ids[a[0]], x: a[1], y: a[2], z: a[3] } : { id: ids[a] })),
      greenery: (p.g || []).map(fromCode),
      wrap: p.w ? fromCode(p.w) : fresh.wrap, ribbon: p.r || fresh.ribbon,
      envelope: p.e ? fromCode(p.e) : fresh.envelope, seal: p.l || fresh.seal,
      card: { to: c[0] || '', msg: c[1] || '', from: c[2] || '', font: c[3] || 'script', paper: c[4] || 'lined' },
      photos: (Array.isArray(p.ph) ? p.ph : []).map((x) => ({ src: x?.[0], cap: x?.[1] })),
      photoFrame: p.pf || 'polaroid',
      music: p.m || null,
      yt: Array.isArray(p.y) ? { id: p.y[0], start: p.y[1], title: p.y[2] } : null,
      addons: ad,
      addonPos: Object.fromEntries((Array.isArray(p.ap) ? p.ap : []).filter((x) => ad[x?.[0]]).map(([i, x, y]) => [ad[i], { x, y }])),
      sent: Number.isFinite(p.t) ? p.t : null,
    });
  } catch {
    return null;
  }
}

/* ---------- links ---------- */
// The address to share (falls back to the older, longer format in browsers without compression).
export async function bouquetLink(st) {
  return canCompress ? `${shareBase()}#z=${await pack(st)}` : shareLink(st);
}
// What goes inside a password-locked link (the same short form, then encrypted).
export const sealedPayload = async (st) => (canCompress ? `z:${await pack(st)}` : encode(st));
// Reads either form back out of a password-locked link.
export const readSealedPayload = async (text) => (text.startsWith('z:') ? unpack(text.slice(2)) : decode(text));
