/* Add-ons are images with see-through areas, so an add-on is only picked up when the press lands
   on a visible pixel. Alpha maps are loaded once per image. */
import { layoutAddons } from './bouquet.js';

const alphaMaps = new Map();

export function alphaMap(src) {
  if (alphaMaps.has(src)) return alphaMaps.get(src);
  const entry = { ready: false, data: null, w: 0, h: 0 };
  alphaMaps.set(src, entry);
  const im = new Image();
  im.onload = () => {
    const w = Math.min(400, im.naturalWidth || 400), hh = Math.round((w * (im.naturalHeight || w)) / (im.naturalWidth || w));
    const c = Object.assign(document.createElement('canvas'), { width: w, height: hh });
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, w, hh);
    try { entry.data = g.getImageData(0, 0, w, hh).data; } catch { entry.data = null; } // file:// blocks pixel reads
    Object.assign(entry, { ready: true, w, h: hh });
  };
  im.src = src;
  return entry;
}

function hitsAddon(a, p) {
  const u = (p.x - a.x) / a.w, v = (p.y - a.y) / a.h;
  if (u < 0 || v < 0 || u > 1 || v > 1) return false;
  const m = alphaMap(a.a.src);
  if (!m.ready || !m.data) return u > 0.15 && u < 0.85 && v > 0.15 && v < 0.85; // fallback: inner box
  return m.data[(Math.floor(v * (m.h - 1)) * m.w + Math.floor(u * (m.w - 1))) * 4 + 3] > 40;
}

// The add-on under a point (bouquet coordinates) on one layer, topmost first.
export function addonAt(st, p, layer) {
  const list = layoutAddons(st).filter((a) => a.layer === layer);
  for (let i = list.length - 1; i >= 0; i--) if (hitsAddon(list[i], p)) return list[i];
  return null;
}
