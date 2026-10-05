// Drawing a bouquet onto a canvas: the downloadable image and the video keepsake.
import { ASSETS, flowerHex } from './assets.js';
import { layoutAddons, layoutGreenery, layoutStems, ribbonMarkup, stemPath } from './bouquet.js';
import { GATHER, GREEN_FADE, paperOf } from './constants.js';
import { byId, downloadBlob, fileSafe, mulberry32 } from './util.js';

const SVGNS = 'http://www.w3.org/2000/svg';

const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.round(w), height: Math.round(h) });

export const loadImage = (src) => new Promise((res, rej) => {
  const im = new Image();
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

/* ---------- still image ---------- */
export async function exportPNG(st, toast) {
  if (!st.stems.length) return toast('Add a few stems first.');
  toast('Preparing your image…');
  try {
    const S = 2;
    const c = canvas(600 * S, 760 * S);
    const ctx = c.getContext('2d');
    ctx.scale(S, S);
    const bg = ctx.createRadialGradient(300, 330, 40, 300, 380, 520);
    bg.addColorStop(0, '#fffdfa');
    bg.addColorStop(1, '#efe5d8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 600, 760);

    const { wrap, blooms, sprigs, addons, imgs, ribbonImg } = await prepare(st);
    const drawAddons = (which) => addons.filter((a) => a.layer === which).forEach((a) => ctx.drawImage(imgs.get(a.a.src), a.x, a.y, a.w, a.h));
    const drawFront = () => { if (wrap?.front) ctx.drawImage(imgs.get(wrap.front), 0, 0, 600, 760); };

    if (wrap?.back) ctx.drawImage(imgs.get(wrap.back), 0, 0, 600, 760);
    drawAddons('back');
    ctx.drawImage(greeneryLayer(sprigs, wrap, imgs, S), 0, 0, 600, 760);
    ctx.strokeStyle = '#5f7a4a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    blooms.forEach((b) => ctx.stroke(new Path2D(stemPath(b.x, b.y))));
    if (!wrap?.frontOnTop) drawFront();
    blooms.forEach((b) => {
      ctx.save();
      ctx.shadowColor = 'rgba(60,30,20,.28)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
      ctx.translate(b.x, b.y);
      ctx.rotate((b.rot * Math.PI) / 180);
      ctx.drawImage(imgs.get(b.f.src), -b.size / 2, -b.size / 2, b.size, b.size);
      ctx.restore();
    });
    if (wrap?.frontOnTop) drawFront();
    if (ribbonImg) ctx.drawImage(ribbonImg, 0, 0, 600, 760);
    drawAddons('top');

    const blob = await new Promise((res, rej) => {
      try { c.toBlob((b) => (b ? res(b) : rej(new Error('empty'))), 'image/png'); } catch (err) { rej(err); }
    });
    downloadBlob(blob, `bouquet${fileSafe(st.card.to)}.png`);
    toast('Bouquet image saved.');
  } catch (err) {
    console.warn(err);
    toast(location.protocol === 'file:'
      ? 'Browsers block image export from local files. Run npm run dev and try again.'
      : 'Sorry, the image could not be created.');
  }
}

/* ---------- video keepsake: replays the bloom on a canvas and records it ---------- */
// MP4 where the browser can record it (Chrome, Edge, Safari), otherwise WebM.
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
    const { W, H } = CLIP;
    const ctx = cv.getContext('2d');
    const { wrap, blooms, sprigs, addons, imgs, ribbonImg } = await prepare(st, 1200);
    await Promise.all(['48px "Pinyon Script"', 'italic 40px "Cormorant Garamond"', '40px "Caveat"', '20px "Jost"'].map((f) => document.fonts.load(f).catch(() => {})));

    // letter card, laid out once
    const { to, msg, from, font } = st.card;
    const paper = paperOf(st.card.paper);
    const cardW = 820, padX = 56;
    ctx.font = canvasFont(font, font === 'hand' ? 44 : font === 'serif' ? 38 : 42);
    const msgLines = wrapLines(ctx, msg || 'Just because.', cardW - padX * 2, 4);
    const lineH = font === 'serif' ? 50 : 56;
    const cardH = 64 + 64 + msgLines.length * lineH + (from ? 70 : 20) + 30;
    // bouquet placement: top of the frame, scaled down if a long letter needs the room,
    // so the card sits just below the bow and never covers the bouquet
    const BY = 18, K = Math.min(1.16, (H - cardH - 50 - BY) / 752), BX = (W - 600 * K) / 2;
    const cardY = Math.min(BY + 752 * K, H - cardH - 50);
    const greens = sprigs.length ? greeneryLayer(sprigs, wrap, imgs, K) : null;
    const stemLayer = canvas(600 * K, 760 * K);
    const sx = stemLayer.getContext('2d');
    sx.scale(K, K);
    sx.strokeStyle = '#5f7a4a';
    sx.lineWidth = 4;
    sx.lineCap = 'round';
    blooms.forEach((b) => sx.stroke(new Path2D(stemPath(b.x, b.y))));
    const tRibbon = 0.95 + blooms.length * 0.08;

    // falling petals in the bouquet's colours (deterministic, so every frame is consistent)
    const palette = [...new Set(blooms.map((b) => flowerHex(b.f)))].concat('#f6e3dc');
    const rnd = mulberry32(st.seed ^ 0x2468ace);
    const petals = Array.from({ length: 34 }, () => ({
      x: rnd() * W, y: -rnd() * H, vy: 70 + rnd() * 90, sway: 14 + rnd() * 30, sp: 0.6 + rnd(), ph: rnd() * 6.3,
      s: 9 + rnd() * 11, r0: rnd() * 6.3, vr: (rnd() - 0.5) * 1.6, c: palette[Math.floor(rnd() * palette.length)], a: 0.45 + rnd() * 0.4,
    }));

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f8f2eb');
    bg.addColorStop(1, '#efe5d8');

    const drawPetal = (p, t) => {
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

    const drawFrame = (t) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      // warm glow behind the bouquet
      const glow = ctx.createRadialGradient(W / 2, BY + 330 * K, 40, W / 2, BY + 330 * K, 560);
      glow.addColorStop(0, `rgba(255,255,255,${0.9 * easeOut(clip01(t / 1.2))})`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      petals.slice(0, 14).forEach((p) => drawPetal(p, t)); // a few behind the bouquet

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
        ctx.font = canvasFont(font, font === 'hand' ? 44 : font === 'serif' ? 38 : 42);
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
      petals.slice(14).forEach((p) => drawPetal(p, t)); // the rest drift in front
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#857970';
      ctx.font = '22px "Jost", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('made with Fleur & Note', W / 2, H - 22);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    };

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
        drawFrame(Math.min(t, CLIP.DUR));
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
    const blob = await record(mime, CLIP.DUR, (t) => {
      const pct = Math.min(100, Math.round((t / CLIP.DUR) * 100));
      if (Math.floor(pct / 10) !== shown) { shown = Math.floor(pct / 10); toast(`Recording your bouquet… ${pct}%`); }
    });

    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    downloadBlob(blob, `bouquet${fileSafe(to)}.${ext}`, 10000);
    toast(`Video saved (${ext.toUpperCase()}).`);
  } catch (err) {
    console.warn(err);
    toast(err.message && !/^[A-Z][a-z]+Error/.test(err.name || '') ? err.message : 'Sorry, the video could not be created.');
  } finally {
    cv.remove();
    clipBusy = false;
  }
}
