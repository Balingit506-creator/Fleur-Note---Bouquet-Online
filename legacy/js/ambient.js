// Ambient background for the recipient page: falling petals in the bouquet's colours,
// soft floating light orbs and twinkling sparkles, drawn on one fixed canvas.
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let cv = null, ctx = null, raf = 0, last = 0, W = 0, H = 0, dpr = 1;
  let parts = [], colors = ['#e8a0b0', '#f3d9d2', '#ffffff'], running = false, extra = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(c + (255 - c) * k);
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, '0')).join('')}`;
  }

  const petal = (init) => ({
    k: 'petal', x: rand(-20, W + 20), y: init ? rand(-H, H) : rand(-90, -20), s: rand(6, 14),
    vy: rand(16, 36), sway: rand(16, 44), ph: rand(0, 6.28), sp: rand(0.4, 1.1),
    rot: rand(0, 6.28), vr: rand(-0.9, 0.9), flip: rand(0, 6.28), vf: rand(1, 2.4), c: pick(colors), a: rand(0.5, 0.85),
  });
  const orb = (init) => ({ k: 'orb', x: rand(0, W), y: init ? rand(0, H) : H + rand(30, 140), r: rand(22, 80), vy: rand(4, 11), ph: rand(0, 6.28), c: pick(colors), a: rand(0.06, 0.15) });
  const spark = () => ({ k: 'spark', x: rand(0, W), y: rand(0, H), r: rand(1.2, 2.6), ph: rand(0, 6.28), sp: rand(0.7, 1.8) });

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function populate() {
    const scale = Math.min(1.4, Math.max(0.45, (W * H) / (1280 * 800)));
    const n = Math.round(22 * scale);
    parts = [
      ...Array.from({ length: Math.round(n * 0.5) }, () => orb(true)),
      ...Array.from({ length: Math.round(n * 0.8) }, spark),
      ...Array.from({ length: n }, () => petal(true)),
    ];
  }

  // Petals and glows are drawn once per colour into small sprites, then stamped each frame.
  const PS = 32; // sprite petal half-height in px
  const sprites = new Map();
  function sprite(kind, c) {
    const key = kind + c;
    if (sprites.has(key)) return sprites.get(key);
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = PS * 2 + 4;
    const g = cnv.getContext('2d');
    g.translate(PS + 2, PS + 2);
    if (kind === 'orb') {
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, PS);
      rg.addColorStop(0, rgba(c, 1));
      rg.addColorStop(1, rgba(c, 0));
      g.fillStyle = rg;
      g.fillRect(-PS, -PS, PS * 2, PS * 2);
    } else {
      const s = PS;
      const lg = g.createLinearGradient(0, -s, 0, s);
      lg.addColorStop(0, lighten(c, 0.45));
      lg.addColorStop(1, c);
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(0, -s);
      g.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.75, s * 0.7, 0, s);
      g.bezierCurveTo(-s * 0.75, s * 0.7, -s * 0.95, -s * 0.55, 0, -s);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(0, -s * 0.6);
      g.quadraticCurveTo(s * 0.12, 0, 0, s * 0.7);
      g.stroke();
    }
    sprites.set(key, cnv);
    return cnv;
  }

  function drawPetal(p, x) {
    const k = p.s / PS;
    const flip = Math.max(0.18, Math.abs(Math.cos(p.flip))); // turning over as it falls
    const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
    ctx.setTransform(cos * k * flip * dpr, sin * k * flip * dpr, -sin * k * dpr, cos * k * dpr, x * dpr, p.y * dpr);
    ctx.globalAlpha = p.a;
    ctx.drawImage(sprite('petal', p.c), -PS - 2, -PS - 2);
  }

  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      if (p.k === 'orb') {
        p.y -= p.vy * dt;
        p.ph += dt * 0.3;
        if (p.y < -p.r * 2) Object.assign(p, orb(false));
        const x = p.x + Math.sin(p.ph) * 24;
        ctx.globalAlpha = p.a;
        ctx.drawImage(sprite('orb', p.c), x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        ctx.globalAlpha = 1;
      } else if (p.k === 'spark') {
        p.ph += dt * p.sp;
        const a = Math.pow(Math.max(0, Math.sin(p.ph)), 3) * 0.85;
        if (a < 0.02) continue;
        const r = p.r * (0.7 + a * 0.6);
        ctx.fillStyle = `rgba(232,200,130,${a})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 3);
        ctx.quadraticCurveTo(p.x, p.y, p.x + r * 3, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 3);
        ctx.quadraticCurveTo(p.x, p.y, p.x - r * 3, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 3);
        ctx.fill();
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.k !== 'petal') continue;
      p.y += p.vy * dt;
      p.ph += dt * p.sp;
      p.rot += p.vr * dt;
      p.flip += p.vf * dt;
      if (p.y > H + 30) {
        if (p.burst) { parts.splice(i, 1); continue; } // extra shower petals fall once
        Object.assign(p, petal(false));
      }
      drawPetal(p, p.x + Math.sin(p.ph) * p.sway);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    draw(dt);
  }

  function ensure() {
    if (cv) return;
    cv = document.getElementById('ambient');
    ctx = cv.getContext('2d');
    window.addEventListener('resize', () => { if (running) { resize(); populate(); if (reduce.matches) draw(0); } });
    document.addEventListener('visibilitychange', () => {
      if (!running || reduce.matches) return;
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    });
  }

  window.BouqAmbient = {
    // palette: flower colours from the bouquet
    start(palette = []) {
      ensure();
      colors = [...new Set([...palette, '#f6e3dc', '#ffffff'])];
      running = true;
      cv.hidden = false;
      resize();
      populate();
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (reduce.matches) { draw(0); return; } // one still frame, no motion
      raf = requestAnimationFrame(frame);
    },
    // a fuller shower of petals, e.g. when the envelope opens
    burst(n = 34) {
      if (!running || reduce.matches) return;
      extra = n;
      for (let i = 0; i < extra; i++) parts.push({ ...petal(false), y: rand(-H * 0.6, -10), vy: rand(30, 60), burst: true });
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      if (cv) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); cv.hidden = true; }
    },
  };
})();
