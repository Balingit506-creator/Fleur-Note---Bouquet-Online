// Password-locked links: the bouquet is encrypted inside the link (AES-GCM, key from PBKDF2).
import { CLOUD, shareBase } from './bouquet.js';
import { saveBouquet } from './cloud.js';
import { bouquetLink, canCompress, pack, sealedPayload } from './link.js';

const b64u = {
  enc: (bytes) => { let s = ''; bytes.forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};

async function deriveKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(text, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(pw, salt), new TextEncoder().encode(text)));
  const out = new Uint8Array(29 + ct.length);
  out[0] = 1; // format version
  out.set(salt, 1);
  out.set(iv, 17);
  out.set(ct, 29);
  return b64u.enc(out);
}

export async function unseal(str, pw) {
  const d = b64u.dec(str);
  if (d[0] !== 1 || d.length < 30) throw new Error('bad format');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: d.slice(17, 29) }, await deriveKey(pw, d.slice(1, 17)), d.slice(29));
  return new TextDecoder().decode(pt);
}

export const lockReady = (lock) => !lock.on || lock.pw.length >= 4;

export async function makeLink(st, lock) {
  if (lock.on && !window.crypto?.subtle) throw new Error('Password links need the site to be opened over https or localhost.');
  const hint = lock.hint.trim();
  const makeSealed = async () => seal(await sealedPayload(st), lock.pw);
  if (CLOUD && canCompress) {
    // short link: the bouquet (encrypted first when locked) is saved, the link carries only its id
    const body = async () => (lock.on
      ? `e:${await makeSealed()}${hint ? `.${encodeURIComponent(hint)}` : ''}`
      : `z:${await pack(st)}`);
    try {
      return `${shareBase()}#s=${await saveBouquet(JSON.stringify([st, lock.on && [lock.pw, hint]]), body)}`;
    } catch (err) {
      console.warn('Short link failed, using a full link instead.', err);
    }
  }
  if (!lock.on) return bouquetLink(st);
  return `${shareBase()}#e=${await makeSealed()}${hint ? `&h=${encodeURIComponent(hint)}` : ''}`;
}

// Sealed links carry the same bouquet encrypted (about a third longer).
export const estimateLinkSize = async (st, lock) => {
  if (CLOUD && canCompress) return shareBase().length + 13;
  const n = (await bouquetLink(st)).length;
  return lock.on ? Math.round(n * 1.34 + 60 + lock.hint.length * 3) : n;
};
