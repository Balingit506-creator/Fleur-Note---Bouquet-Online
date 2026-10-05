// Short links: with Supabase set up (config.storage), the bouquet is saved there and the link
// only carries its id. See supabase/setup.sql.
// Everything is encrypted in the browser first. The keys travel only in links (after the #, which
// browsers never send to a server), so Supabase, and the site owner, only ever hold scrambled data.
import { CLOUD } from './bouquet.js';

// Legacy anon keys (eyJ…) also go in Authorization; newer publishable keys (sb_publishable_…) must not.
const headers = () => (CLOUD.anonKey.startsWith('eyJ')
  ? { apikey: CLOUD.anonKey, Authorization: `Bearer ${CLOUD.anonKey}` }
  : { apikey: CLOUD.anonKey });

async function rpc(name, args) {
  const res = await fetch(`${CLOUD.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Supabase ${name} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/* ---------- encryption (AES-GCM, a fresh random 128-bit key each time) ---------- */
const b64u = {
  enc: (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};
const random = (n) => crypto.getRandomValues(new Uint8Array(n));
const aesKey = (raw, use) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [use]);

// Returns [iv + ciphertext, key as text]
async function lock(bytes) {
  const raw = random(16), iv = random(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(raw, 'encrypt'), bytes));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv); out.set(ct, 12);
  return [out, b64u.enc(raw)];
}
async function unlock(bytes, key) {
  const raw = b64u.dec(key);
  if (raw.length !== 16 || bytes.length < 29) throw new Error('bad key');
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await aesKey(raw, 'decrypt'), bytes.slice(12)));
}

/* ---------- bouquets ---------- */
export const okId = (id) => /^[A-Za-z0-9]{6,16}$/.test(id);

// Saves once per unchanged bouquet, so Copy, Preview and QR all give the same link.
// key: the bouquet and its lock settings; makeBody: what to store, made only when needed.
// Resolves to "id.key", the part after #s= in the link.
const saved = new Map();
export function saveBouquet(key, makeBody) {
  if (!saved.has(key)) {
    saved.set(key, (async () => {
      const [ct, k] = await lock(new TextEncoder().encode(await makeBody()));
      return `${await rpc('save_bouquet', { body: `x:${b64u.enc(ct)}` })}.${k}`;
    })().catch((err) => { saved.delete(key); throw err; }));
  }
  return saved.get(key);
}

// "id.key" from a link → the bouquet text it was saved from, or null.
export async function loadBouquet(ref) {
  const [id, k] = ref.split('.');
  if (!CLOUD || !okId(id) || !k) return null;
  const body = await rpc('get_bouquet', { id });
  if (typeof body !== 'string' || !body.startsWith('x:')) return null;
  return new TextDecoder().decode(await unlock(b64u.dec(body.slice(2)), k));
}

/* ---------- photos ---------- */
// Uploads an encrypted photo; its address keeps the key after #k= (and is itself only ever
// stored inside an encrypted bouquet).
export async function uploadPhoto(blob) {
  const [ct, k] = await lock(new Uint8Array(await blob.arrayBuffer()));
  const name = `${[...random(16)].map((b) => b.toString(16).padStart(2, '0')).join('')}.bin`;
  const res = await fetch(`${CLOUD.url}/storage/v1/object/${CLOUD.bucket}/${name}`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/octet-stream' },
    body: ct,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  return `${CLOUD.url}/storage/v1/object/public/${CLOUD.bucket}/${name}#k=${k}`;
}

// A photo's address → something an <img> can show (encrypted ones are fetched and decrypted).
const shown = new Map();
export function photoSrc(src) {
  const at = src.indexOf('#k=');
  if (at < 0) return Promise.resolve(src);
  if (!shown.has(src)) {
    shown.set(src, (async () => {
      const res = await fetch(src.slice(0, at));
      if (!res.ok) throw new Error(`photo ${res.status}`);
      const bytes = await unlock(new Uint8Array(await res.arrayBuffer()), src.slice(at + 3));
      return URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    })().catch((err) => { shown.delete(src); throw err; }));
  }
  return shown.get(src);
}
