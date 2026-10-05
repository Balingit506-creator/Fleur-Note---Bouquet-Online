// The image catalogue, generated from public/ by tools/build-manifest.js.
import data from '../data/assets.json';
import { COLOR_HEX } from './constants.js';

export const ASSETS = { flowers: [], greenery: [], wraps: [], envelopes: [], addons: [], ...data };

export const findFlower = (kind, color) =>
  ASSETS.flowers
    .filter((f) => f.kind.toLowerCase().startsWith(kind) && f.name.toLowerCase().split(/\s+/).includes(color))
    .sort((a, b) => a.name.length - b.name.length)[0];
export const findGreen = (t) => ASSETS.greenery.find((g) => g.id.toLowerCase().includes(t));
export const findWrap = (t) => ASSETS.wraps.find((w) => w.id.toLowerCase().includes(t));
export const findEnv = (t) => ASSETS.envelopes.find((e) => e.id.toLowerCase().includes(t));
export const findAddon = (t) => ASSETS.addons.find((a) => a.id.toLowerCase().includes(t));

export const flowerLabel = (f) => `${f.name} ${f.kind}`;
export const flowerHex = (f) => {
  const word = f.name.toLowerCase().split(/\s+/).find((w) => COLOR_HEX[w]);
  return COLOR_HEX[word] || '#c9a0a8';
};
