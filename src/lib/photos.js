// Turning an uploaded image into something the share link (or the photo bucket) can carry.
import { CLOUD } from './bouquet.js';

export async function preparePhoto(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
  const draw = (max) => {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    const g = c.getContext('2d');
    g.fillStyle = '#fffdf8'; // flatten transparency: alpha costs bytes
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  };
  if (CLOUD) return uploadPhoto(await new Promise((res) => draw(1600).toBlob(res, 'image/jpeg', 0.85)));
  // Inside the link every byte counts: step size and quality down until the photo fits the budget.
  const BUDGET = 36000; // base64 characters, about 27 KB
  let url = '';
  for (const [max, q] of [[560, 0.62], [520, 0.52], [460, 0.45], [400, 0.4], [340, 0.36]]) {
    const c = draw(max);
    url = c.toDataURL('image/webp', q);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', q + 0.08); // Safari can't encode WebP
    if (url.length <= BUDGET) break;
  }
  return url;
}

async function uploadPhoto(blob) {
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const res = await fetch(`${CLOUD.url}/storage/v1/object/${CLOUD.bucket}/${name}`, {
    method: 'POST',
    headers: { apikey: CLOUD.anonKey, Authorization: `Bearer ${CLOUD.anonKey}`, 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  return `${CLOUD.url}/storage/v1/object/public/${CLOUD.bucket}/${name}`;
}
