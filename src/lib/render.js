// Drawing a bouquet onto a canvas: the downloadable picture and the video keepsake
// (both show the bouquet, its photos and the letter).
import { ASSETS, flowerHex } from './assets.js';
import { layoutAddons, layoutGreenery, layoutStems, ribbonMarkup, stemPath } from './bouquet.js';
import { photoSrc } from './cloud.js';
import { GATHER, GREEN_FADE, PILE_BOX, PILE_LAYERS, paperOf } from './constants.js';
import { byId, downloadBlob, fileSafe, mulberry32 } from './util.js';

const SVGNS = 'http://www.w3.org/2000/svg';

const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.round(w), height: Math.round(h) });

export const loadImage = (src, cors = false) => new Promise((res, rej) => {
  const im = new Image();
  if (cors) im.crossOrigin = 'anonymous';
  im.onload = () => res(im);
  im.onerror = rej;
  im.src = src;
});

// Everything a bouquet needs to be drawn, with its images loaded.
async function prepare(st, ribbonPx = 600) {
  const wrap = byId(ASSETS.wraps, st.wrap);
  const blooms = layoutStems(st), sprigs = layoutGreenery(st), addons = layoutAddons(st);
  const srcs = new Set([wrap?.back, wrap?.front, ...sprigs.map((x) => x.g.src), ...blooms.map((b) => b.f.src), ...addons.map((a) => a.a.src)].filter(Boolean));
  const imgs = new Map(await Promise.all([...srcs].map(async (src) => [src, await loadImage(src)])));
  const ribbonSvg = `<svg xmlns="${SVGNS}" viewBox="0 0 600 760" width="${ribbonPx}" height="${ribbonPx * 760 / 600}">${ribbonMarkup(st.ribbon, 'rb', wrap)}</svg>`;
  const ribbonImg = wrap?.ribbon === false ? null : await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ribbonSvg)}`);
  return { wrap, blooms, sprigs, addons, imgs, ribbonImg };
}

// Greenery on its own canvas (stage units × scale), masked to the wrap like on screen.
function greeneryLayer(sprigs, wrap, imgs, scale) {
  const gl = canvas(600 * scale, 760 * scale);
  const gx = gl.getContext('2d');
  gx.scale(scale, scale);
  sprigs.forEach((sp) => {
    gx.save();
    gx.translate(300, GATHER.y);
    gx.rotate((sp.rot * Math.PI) / 180);
    if (sp.fan) gx.translate(-300, -GATHER.y);
    gx.drawImage(imgs.get(sp.g.src), sp.x, sp.y, sp.w, sp.h);
    gx.restore();
  });
  if (wrap?.back) {
    const [y0, y1] = wrap.greeneryFade || GREEN_FADE;
    const m = canvas(gl.width, gl.height);
    const mx = m.getContext('2d');
    mx.scale(scale, scale);
    const fade = mx.createLinearGradient(0, y0, 0, y1);
    fade.addColorStop(0, '#000');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    mx.fillStyle = fade;
    mx.fillRect(0, 0, 600, 760);
    mx.drawImage(imgs.get(wrap.back), 0, 0, 600, 760);
    gx.setTransform(1, 0, 0, 1, 0, 0);
    gx.globalCompositeOperation = 'destination-in';
    gx.drawImage(m, 0, 0);
  }
  return gl;
}


const CLIP = { W: 1080, H: 1350, FPS: 30, DUR: 8.5, LETTER: 4.4 };
const clip01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const canvasFont = (id, px) => (id === 'serif' ? `italic ${px}px "Cormorant Garamond", serif` : id === 'hand' ? `${px}px "Caveat", cursive` : `${px}px "Pinyon Script", serif`);
let clipBusy = false;

function wrapLines(ctx, text, maxW, maxLines) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
  return out;
}

// The paper's texture on a canvas card (same looks as the CSS papers).
function drawPaperPattern(ctx, p, w, h) {
  const rnd = mulberry32(w * 31 + h);
  ctx.save();
  ctx.strokeStyle = p.rule;
  ctx.fillStyle = p.rule;
  ctx.lineWidth = 1.2;
  if (p.pattern === 'lines') for (let y = 58; y < h - 10; y += 46) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(w - 18, y); ctx.stroke(); }
  if (p.pattern === 'dots') for (let y = 30; y < h - 10; y += 30) for (let x = 30; x < w - 10; x += 30) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); }
  if (p.pattern === 'frame') { ctx.lineWidth = 2; ctx.strokeRect(16, 16, w - 32, h - 32); ctx.lineWidth = 1; ctx.strokeRect(24, 24, w - 48, h - 48); }
  if (p.pattern === 'fibres') for (let i = 0; i < 260; i++) { ctx.globalAlpha = 0.3 + rnd() * 0.5; const x = rnd() * w, y = rnd() * h, a = rnd() * 6.3, l = 3 + rnd() * 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  if (p.pattern === 'aged') {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(120,80,30,0)');
    g.addColorStop(1, 'rgba(120,80,30,.32)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (p.pattern === 'airmail') {
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.rect(14, 14, w - 28, h - 28);
    ctx.clip('evenodd');
    const cols = ['#b2263a', '#fbfaf6', '#2d4f8c', '#fbfaf6'];
    for (let i = -h; i < w + h; i += 14) { ctx.fillStyle = cols[((i + h) / 14) % 4 | 0]; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 14, 0); ctx.lineTo(i + 14 - h, h); ctx.lineTo(i - h, h); ctx.fill(); }
  }
  if (p.pattern === 'stars') for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.6; ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.6, 0, 7); ctx.fill(); }
  if (p.pattern === 'floral') {
    const sprig = (x, y, fx, fy) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(fx, fy);
      ctx.strokeStyle = '#8fa883'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, 10, 80, 50); ctx.stroke();
      ctx.fillStyle = '#9db590';
      for (const [lx, ly, r] of [[24, 6, 0.6], [46, 18, -0.4], [62, 32, 0.8]]) { ctx.save(); ctx.translate(lx, ly); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, -7, 4, 9, 0, 0, 7); ctx.fill(); ctx.restore(); }
      for (const [fx2, fy2, c] of [[8, 4, '#e9a3b2'], [30, -6, '#f3c3cd'], [70, 44, '#e9a3b2']]) {
        ctx.fillStyle = c;
        for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28; ctx.beginPath(); ctx.arc(fx2 + Math.cos(a) * 5, fy2 + Math.sin(a) * 5, 4.2, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#d99a4a'; ctx.beginPath(); ctx.arc(fx2, fy2, 2.6, 0, 7); ctx.fill();
      }
      ctx.restore();
    };
    sprig(w - 20, 22, -1, 1); // top-right and bottom-left, clear of the greeting and signature
    sprig(20, h - 22, 1, -1);
  }
  ctx.restore();
}


/* ---------- photos, drawn in their frames like the pile on screen ---------- */
// pad: top, sides, bottom, as fractions of the width (like the CSS padding)
const FRAME_LOOK = {
  polaroid: { bg: '#fffdf8', pad: [0.06, 0.06, 0.09] },
  washi: { bg: '#ffffff', pad: [0.05, 0.05, 0.05] },
  gold: { bg: null, pad: [0.07, 0.07, 0.07] },
  vintage: { bg: '#f2e6cc', pad: [0.07, 0.07, 0.09] },
  film: { bg: '#161214', pad: [0.15, 0.04, 0.06] },
};
const frameSize = (frame, w, cap) => {
  const [pt, px, pb] = (FRAME_LOOK[frame] || FRAME_LOOK.polaroid).pad.map((v) => v * w);
  return { pt, px, pb, inner: w - 2 * px, capH: cap ? w * 0.14 : 0, h: pt + (w - 2 * px) + pb + (cap ? w * 0.14 : 0) };
};

// One framed photo, centred on the current origin, w wide.
function drawPhotoCard(ctx, { im, cap }, frame, w) {
  const look = FRAME_LOOK[frame] || FRAME_LOOK.polaroid;
  const { pt, px, inner, capH, h } = frameSize(frame, w, cap);
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(50,30,20,.42)';
  ctx.shadowBlur = w * 0.11;
  ctx.shadowOffsetY = w * 0.05;
  if (look.bg) ctx.fillStyle = look.bg;
  else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    [[0, '#f8e7ad'], [0.28, '#c8973f'], [0.52, '#f6dc8f'], [0.76, '#a87a2c'], [1, '#f1d58a']].forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = 'transparent';
  // the photo, cropped square from its centre
  const s = Math.min(im.width, im.height);
  if (frame === 'vintage') ctx.filter = 'sepia(.35) contrast(.96) saturate(.9)';
  ctx.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, px, pt, inner, inner);
  ctx.filter = 'none';
  if (frame === 'gold') {
    ctx.strokeStyle = 'rgba(120,80,20,.35)'; ctx.lineWidth = w * 0.03; ctx.strokeRect(px, pt, inner, inner);
    ctx.strokeStyle = '#fff3cf'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, pt + 1, inner - 2, inner - 2);
  }
  if (frame === 'vintage') {
    // photo corners
    const c = inner * 0.16, x0 = w * 0.05, y0 = w * 0.05, side = w * 0.9;
    ctx.fillStyle = '#2c2420';
    [[x0, y0, 1, 1], [x0 + side, y0, -1, 1], [x0, y0 + side, 1, -1], [x0 + side, y0 + side, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c * dx, y); ctx.lineTo(x, y + c * dy); ctx.fill();
    });
  }
  if (frame === 'film') {
    // sprocket holes along the top and bottom edges
    ctx.fillStyle = '#efe7da';
    const hw = w * 0.94 * 0.07, hh = h * 0.05;
    for (let x = w * 0.03; x < w * 0.97 - hw / 2; x += w * 0.94 * 0.14) {
      ctx.fillRect(x, h * 0.04, hw, hh);
      ctx.fillRect(x, h * 0.96 - hh, hw, hh);
    }
  }
  if (frame === 'washi') {
    // a strip of striped tape across the top
    ctx.save();
    ctx.translate(w / 2, h * -0.005);
    ctx.rotate((-4 * Math.PI) / 180);
    const tw = w * 0.46, th = h * 0.13;
    ctx.beginPath(); ctx.rect(-tw / 2, -th / 2, tw, th); ctx.clip();
    for (let i = -tw - th; i < tw + th; i += 12) {
      ctx.fillStyle = (Math.round(i / 12) & 1) ? 'rgba(250,205,212,.85)' : 'rgba(235,150,165,.85)';
      ctx.beginPath(); ctx.moveTo(i, -th / 2); ctx.lineTo(i + 12, -th / 2); ctx.lineTo(i + 12 + th, th / 2); ctx.lineTo(i + th, th / 2); ctx.fill();
    }
    ctx.restore();
  }
  if (cap) {
    ctx.fillStyle = frame === 'film' ? '#efe7da' : '#3f3531';
    ctx.font = `${Math.round(w * 0.11)}px "Caveat", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let text = cap;
    while (text.length > 1 && ctx.measureText(text).width > inner) text = text.slice(0, -2) + '…';
    ctx.fillText(text, w / 2, pt + inner + capH * 0.55);
  }
  ctx.restore();
}

// The photos beside the foot of the bouquet (bouquet units, 600 × 760), spread out like the pile
// when it's hovered on the page, so every photo shows. show(i) → 0…1 for animating in.
function drawPile(ctx, photos, frame, show = () => 1) {
  const [l, t, bw, bh] = PILE_BOX;
  const W = bw * 600, cx = l * 600 + W / 2, cy = t * 760 + (bh * 760) / 2;
  photos.forEach((p, i) => {
    const k = show(i);
    if (k <= 0) return;
    const [, , r] = PILE_LAYERS[i % PILE_LAYERS.length];
    const c = i - (photos.length - 1) / 2;
    const { h } = frameSize(frame, W, p.cap);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.4);
    ctx.translate(cx + c * 0.62 * W, cy + (-0.08 + Math.abs(c) * 0.06) * h + (1 - easeOut(k)) * 40);
    ctx.rotate(((c * 7 + r * 0.3) * Math.PI) / 180);
    drawPhotoCard(ctx, p, frame, W);
    ctx.restore();
  });
}

async function loadPhotos(st) {
  const all = await Promise.all(st.photos.map(async (p) => {
    try {
      const src = await photoSrc(p.src);
      return { im: await loadImage(src, /^https?:/.test(src)), cap: p.cap };
    } catch (err) {
      console.warn('A photo could not be loaded for the keepsake.', err);
      return null;
    }
  }));
  return all.filter(Boolean);
}

/* ---------- the keepsake scene: bouquet, photos and letter, shared by the image and the video ---------- */
async function keepsake(st) {
  const { W } = CLIP;
  const { wrap, blooms, sprigs, addons, imgs, ribbonImg } = await prepare(st, 1200);
  const photos = await loadPhotos(st);
  await Promise.all(['48px "Pinyon Script"', 'italic 40px "Cormorant Garamond"', '40px "Caveat"', '20px "Jost"'].map((f) => document.fonts.load(f).catch(() => {})));

  // letter card, laid out once
  const { to, msg, from, font } = st.card;
  const paper = paperOf(st.card.paper);
  const cardW = 820, padX = 56;
  const measure = canvas(10, 10).getContext('2d');
  const bottom = photos.length ? 805 : 752; // photos hang a little below the bouquet
  const BY = 18;
  // The whole letter is always shown. For long letters the text gets a little smaller and the
  // bouquet a little smaller; if it still doesn't fit, the frame grows taller.
  let fs = 1, msgLines, lineH, cardH, K;
  for (;;) {
    measure.font = canvasFont(font, Math.round((font === 'hand' ? 44 : font === 'serif' ? 38 : 42) * fs));
    msgLines = wrapLines(measure, msg || 'Just because.', cardW - padX * 2, Infinity);
    lineH = Math.round((font === 'serif' ? 50 : 56) * fs);
    cardH = 64 + 64 + msgLines.length * lineH + (from ? 70 : 20) + 30;
    K = Math.min(1.16, (CLIP.H - cardH - 50 - BY) / bottom);
    if (K >= 0.85 || fs <= 0.75) break;
    fs -= 0.05;
  }
  K = Math.max(K, 0.85);
  const H = Math.max(CLIP.H, Math.ceil((BY + bottom * K + cardH + 50) / 2) * 2); // even, for video encoders
  const BX = (W - 600 * K) / 2;
  const cardY = Math.min(BY + bottom * K, H - cardH - 50);
  const msgFont = canvasFont(font, Math.round((font === 'hand' ? 44 : font === 'serif' ? 38 : 42) * fs));
  // long letters stay on screen longer in the video, so there's time to read them
  const dur = Math.min(16, CLIP.DUR + Math.max(0, msgLines.length - 4) * 0.45);
  const greens = sprigs.length ? greeneryLayer(sprigs, wrap, imgs, K) : null;
  const stemLayer = canvas(600 * K, 760 * K);
  const sx = stemLayer.getContext('2d');
  sx.scale(K, K);
  sx.strokeStyle = '#5f7a4a';
  sx.lineWidth = 4;
  sx.lineCap = 'round';
  blooms.forEach((b) => sx.stroke(new Path2D(stemPath(b.x, b.y))));
  const tRibbon = 0.95 + blooms.length * 0.08;
  const tPhotos = tRibbon + 0.45;

  // falling petals in the bouquet's colours (deterministic, so every frame is consistent)
  const palette = [...new Set(blooms.map((b) => flowerHex(b.f)))].concat('#f6e3dc');
  const rnd = mulberry32(st.seed ^ 0x2468ace);
  const petals = Array.from({ length: 34 }, () => ({
    x: rnd() * W, y: -rnd() * H, vy: 70 + rnd() * 90, sway: 14 + rnd() * 30, sp: 0.6 + rnd(), ph: rnd() * 6.3,
    s: 9 + rnd() * 11, r0: rnd() * 6.3, vr: (rnd() - 0.5) * 1.6, c: palette[Math.floor(rnd() * palette.length)], a: 0.45 + rnd() * 0.4,
  }));

  // draws the scene at time t (seconds) onto ctx; scale draws it larger, still leaves out the petals in front
  const draw = (ctx, t, { scale = 1, still = false } = {}) => {
    const drawPetal = (p) => {
      const y = ((p.y + p.vy * t) % (H + 80) + H + 80) % (H + 80) - 40;
      const x = p.x + Math.sin(t * p.sp + p.ph) * p.sway;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.r0 + p.vr * t);
      ctx.scale(Math.max(0.2, Math.abs(Math.cos(t * 1.7 + p.ph))), 1);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.c;
      const s = p.s;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.75, s * 0.7, 0, s);
      ctx.bezierCurveTo(-s * 0.75, s * 0.7, -s * 0.95, -s * 0.55, 0, -s);
      ctx.fill();
      ctx.restore();
    };

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f8f2eb');
    bg.addColorStop(1, '#efe5d8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // warm glow behind the bouquet
    const glow = ctx.createRadialGradient(W / 2, BY + 330 * K, 40, W / 2, BY + 330 * K, 560);
    glow.addColorStop(0, `rgba(255,255,255,${0.9 * easeOut(clip01(t / 1.2))})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    petals.slice(0, 14).forEach(drawPetal); // a few behind the bouquet

    ctx.save();
    ctx.translate(BX, BY);
    ctx.scale(K, K);
    const aw = easeOut(clip01(t / 0.8));
    // ground shadow
    ctx.globalAlpha = 0.18 * aw;
    ctx.fillStyle = '#5a3a28';
    ctx.beginPath();
    ctx.ellipse(300, 748, 170, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = aw;
    if (wrap?.back) ctx.drawImage(imgs.get(wrap.back), 0, (1 - aw) * 16, 600, 760);
    const drawAddons = (layer) => addons.filter((a) => a.layer === layer).forEach((a) => {
      const p = clip01((t - (tRibbon + 0.25 + a.k * 0.18)) / 0.6);
      if (!p) return;
      const s = 0.85 + 0.15 * easeBack(p);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 1.5);
      ctx.translate(a.x + a.w / 2, a.y + a.h);
      ctx.scale(s, s);
      ctx.drawImage(imgs.get(a.a.src), -a.w / 2, -a.h + (1 - p) * 18, a.w, a.h);
      ctx.restore();
    });
    drawAddons('back');
    if (greens) {
      const g = easeOut(clip01((t - 0.25) / 1.2));
      ctx.save();
      ctx.globalAlpha = g;
      ctx.translate(300, GATHER.y);
      ctx.scale(1, 0.55 + 0.45 * g);
      ctx.translate(-300, -GATHER.y);
      ctx.drawImage(greens, 0, 0, 600, 760);
      ctx.restore();
    }
    ctx.globalAlpha = clip01((t - 0.5) / 0.6);
    ctx.drawImage(stemLayer, 0, 0, 600, 760);
    ctx.globalAlpha = aw;
    if (wrap?.front && !wrap.frontOnTop) ctx.drawImage(imgs.get(wrap.front), 0, (1 - aw) * 16, 600, 760);
    blooms.forEach((b, k) => {
      const p = clip01((t - (0.7 + k * 0.08)) / 0.75);
      if (!p) return;
      const s = 0.2 + 0.8 * easeBack(p);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 1.6);
      ctx.shadowColor = 'rgba(60,30,20,.28)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
      ctx.translate(b.x, b.y);
      ctx.rotate(((b.rot - (1 - p) * 25) * Math.PI) / 180);
      ctx.scale(s, s);
      ctx.drawImage(imgs.get(b.f.src), -b.size / 2, -b.size / 2, b.size, b.size);
      ctx.restore();
    });
    ctx.globalAlpha = aw;
    if (wrap?.front && wrap.frontOnTop) ctx.drawImage(imgs.get(wrap.front), 0, (1 - aw) * 16, 600, 760);
    if (ribbonImg) {
      ctx.globalAlpha = clip01((t - tRibbon) / 0.6);
      ctx.drawImage(ribbonImg, 0, 0, 600, 760);
    }
    ctx.globalAlpha = 1;
    drawAddons('top');
    drawPile(ctx, photos, st.photoFrame, (i) => clip01((t - (tPhotos + i * 0.15)) / 0.7));
    ctx.restore();

    // the letter slides up
    const lp = easeOut(clip01((t - CLIP.LETTER) / 0.9));
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha = lp;
      ctx.translate(W / 2, cardY + cardH / 2 + (1 - lp) * 70);
      ctx.rotate((-1.2 * Math.PI) / 180);
      ctx.translate(-cardW / 2, -cardH / 2);
      ctx.shadowColor = 'rgba(60,35,25,.28)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      ctx.fillStyle = paper.bg;
      ctx.fillRect(0, 0, cardW, cardH);
      ctx.shadowColor = 'transparent';
      drawPaperPattern(ctx, paper, cardW, cardH);
      ctx.fillStyle = paper.tape;
      ctx.save();
      ctx.translate(cardW / 2, 0);
      ctx.rotate((-3 * Math.PI) / 180);
      ctx.fillRect(-60, -16, 120, 32);
      ctx.restore();
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = paper.accent;
      ctx.font = canvasFont('script', 58);
      ctx.fillText(to ? `Dear ${to},` : 'For you,', padX, 104);
      ctx.fillStyle = paper.ink;
      ctx.font = msgFont;
      msgLines.forEach((line, i) => ctx.fillText(line, padX, 104 + 64 + i * lineH));
      if (from) {
        ctx.fillStyle = paper.soft;
        ctx.font = canvasFont('script', 50);
        ctx.textAlign = 'right';
        ctx.fillText(`— ${from}`, cardW - padX, 104 + 64 + msgLines.length * lineH + 34);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
    if (!still) petals.slice(14).forEach(drawPetal); // the rest drift in front
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#857970';
    ctx.font = '22px "Jost", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('made with Fleur & Note', W / 2, H - 22);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  };
  return Object.assign(draw, { W, H, dur });
}

/* ---------- still image: the finished keepsake ---------- */
export async function exportPNG(st, toast) {
  if (!st?.stems.length) return toast('Add a few stems first.');
  toast('Preparing your picture…');
  try {
    const S = 2; // 2160 × 2700
    const draw = await keepsake(st);
    const c = canvas(draw.W * S, draw.H * S);
    draw(c.getContext('2d'), draw.dur, { scale: S, still: true });
    const blob = await new Promise((res, rej) => {
      try { c.toBlob((b) => (b ? res(b) : rej(new Error('empty'))), 'image/png'); } catch (err) { rej(err); }
    });
    downloadBlob(blob, `bouquet${fileSafe(st.card.to)}.png`);
    toast('Picture saved.');
  } catch (err) {
    console.warn(err);
    toast(location.protocol === 'file:'
      ? 'Browsers block image export from local files. Run npm run dev and try again.'
      : 'Sorry, the picture could not be created.');
  }
}

/* ---------- video keepsake: replays the bloom on a canvas and records it ---------- */
export async function recordClip(st, toast) {
  if (!st?.stems.length) return toast('Add a few stems first.');
  if (clipBusy) return toast('Your video is still being made…');
  const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const candidates = window.MediaRecorder ? types.filter((t) => MediaRecorder.isTypeSupported(t)) : [];
  if (!candidates.length || !HTMLCanvasElement.prototype.captureStream) return toast('This browser can’t record video. Try Chrome, Edge or Safari.');
  clipBusy = true;
  const cv = canvas(CLIP.W, CLIP.H);
  cv.style.cssText = 'position:fixed;left:-99999px;top:0';
  cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  try {
    toast('Preparing your video…');
    const ctx = cv.getContext('2d');
    const draw = await keepsake(st);
    cv.width = draw.W; cv.height = draw.H; // taller for long letters
    const DUR = draw.dur;
    const drawFrame = (t) => draw(ctx, t);

    drawFrame(0);
    try { ctx.getImageData(0, 0, 1, 1); } catch {
      throw new Error(location.protocol === 'file:'
        ? 'Browsers block video export from local files. Run npm run dev and try again.'
        : 'Sorry, the video could not be created.');
    }

    // Records the animation in real time; onTick reports progress.
    const record = (mime, seconds, onTick) => new Promise((resolve, reject) => {
      const stream = cv.captureStream(CLIP.FPS);
      let rec;
      try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 }); } catch (err) { stream.getTracks().forEach((tr) => tr.stop()); return reject(err); }
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onerror = (e) => reject(e.error || new Error('recording failed'));
      rec.onstop = () => { stream.getTracks().forEach((tr) => tr.stop()); resolve(new Blob(chunks, { type: mime.split(';')[0] })); };
      rec.start(250);
      const t0 = performance.now();
      const step = () => {
        const t = (performance.now() - t0) / 1000;
        drawFrame(Math.min(t, DUR));
        onTick?.(t);
        if (t < seconds) requestAnimationFrame(step); else rec.stop();
      };
      requestAnimationFrame(step);
    });

    // Some browsers list MP4 but can't actually encode it: a half-second test picks a format that works.
    let mime = null;
    for (const m of candidates) {
      try { if ((await record(m, 0.6)).size > 1500) { mime = m; break; } } catch { /* try the next format */ }
    }
    if (!mime) throw new Error('This browser couldn’t record the video. Try Chrome, Edge or Safari.');

    let shown = -1;
    const blob = await record(mime, DUR, (t) => {
      const pct = Math.min(100, Math.round((t / DUR) * 100));
      if (Math.floor(pct / 10) !== shown) { shown = Math.floor(pct / 10); toast(`Recording your bouquet… ${pct}%`); }
    });

    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    downloadBlob(blob, `bouquet${fileSafe(st.card.to)}.${ext}`, 10000);
    toast(`Video saved (${ext.toUpperCase()}).`);
  } catch (err) {
    console.warn(err);
    toast(err.message && !/^[A-Z][a-z]+Error/.test(err.name || '') ? err.message : 'Sorry, the video could not be created.');
  } finally {
    cv.remove();
    clipBusy = false;
  }
}
