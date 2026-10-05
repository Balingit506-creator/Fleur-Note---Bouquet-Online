// Original background music, synthesised live with the Web Audio API (no audio files).
// Each track is a short looping score played by a few simple instruments through a soft reverb.
(() => {
  'use strict';

  let ctx = null, master, verb, timer = null, track = null, step = 0, nextTime = 0, rain = null, paused = false;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(comp);
      verb = ctx.createConvolver();
      verb.buffer = impulse(3, 2.4);
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      verb.connect(wet);
      wet.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    paused = false;
    return true;
  }

  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function route(node, wet) {
    node.connect(master);
    if (wet) {
      const send = ctx.createGain();
      send.gain.value = wet;
      node.connect(send);
      send.connect(verb);
    }
  }
  function pluckEnv(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function swellEnv(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur * 0.65));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }
  function osc(type, f, t, end, dest, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  }

  /* ---------- instruments ---------- */
  const inst = {
    bell(t, m, v = 0.14, dur = 1.8) { // music-box tine
      const g = ctx.createGain();
      pluckEnv(g, t, v, 0.004, dur);
      route(g, 0.6);
      osc('sine', hz(m), t, t + dur, g);
      const shimmer = ctx.createGain();
      pluckEnv(shimmer, t, v * 0.2, 0.002, dur * 0.3);
      route(shimmer, 0.6);
      osc('sine', hz(m) * 4.02, t, t + dur * 0.3, shimmer);
    },
    piano(t, m, v = 0.12, dur = 2.6) { // soft felt piano
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(800, t + dur);
      const g = ctx.createGain();
      pluckEnv(g, t, v, 0.006, dur);
      lp.connect(g);
      route(g, 0.45);
      osc('triangle', hz(m), t, t + dur, lp);
      const over = ctx.createGain();
      over.gain.value = 0.3;
      over.connect(lp);
      osc('sine', hz(m) * 2, t, t + dur, over);
    },
    pad(t, notes, dur, v = 0.03) { // warm string pad
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      lp.Q.value = 0.5;
      const g = ctx.createGain();
      swellEnv(g, t, v, dur * 0.35, dur);
      lp.connect(g);
      route(g, 0.7);
      notes.forEach((m) => { osc('sawtooth', hz(m), t, t + dur, lp, -7); osc('sawtooth', hz(m), t, t + dur, lp, 7); });
    },
    flute(t, m, dur, v = 0.05) { // breathy sine lead with vibrato
      const g = ctx.createGain();
      swellEnv(g, t, v, 0.25, dur);
      route(g, 0.6);
      const o = osc('sine', hz(m), t, t + dur, g);
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 5;
      depth.gain.value = 5;
      lfo.connect(depth);
      depth.connect(o.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    },
    pluck(t, m, v = 0.09, dur = 1.1) { // nylon-string guitar: bright attack, quickly mellowing
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2800, t);
      lp.frequency.exponentialRampToValueAtTime(420, t + dur * 0.6);
      lp.Q.value = 1.2;
      const g = ctx.createGain();
      pluckEnv(g, t, v, 0.003, dur);
      lp.connect(g);
      route(g, 0.35);
      osc('triangle', hz(m), t, t + dur, lp);
      osc('sawtooth', hz(m), t, t + dur * 0.5, lp, 4);
    },
    harp(t, m, v = 0.07, dur = 2.6) { // round, ringing harp string
      const g = ctx.createGain();
      pluckEnv(g, t, v, 0.005, dur);
      route(g, 0.75);
      osc('sine', hz(m), t, t + dur, g);
      const ring = ctx.createGain();
      pluckEnv(ring, t, v * 0.35, 0.004, dur * 0.5);
      route(ring, 0.75);
      osc('triangle', hz(m) * 2, t, t + dur * 0.5, ring);
    },
  };

  function startRain() {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.03;
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start();
    rain = src;
  }

  /* ---------- scores (original compositions) ---------- */
  const MB = { C: [48, 60, 64, 67], Am: [45, 60, 64, 69], F: [41, 60, 65, 69], G: [43, 59, 62, 67], Em: [40, 59, 64, 67] };
  const PN = { Fmaj7: [41, [53, 57, 60, 64]], Am7: [45, [57, 60, 64, 67]], Dm7: [38, [50, 53, 57, 60]], Bbmaj7: [46, [53, 57, 58, 62]], CE: [40, [55, 60, 64, 67]], C: [48, [55, 60, 64, 67]] };
  const ST = { D: [38, [50, 57, 62, 66]], Bm: [35, [47, 54, 62, 66]], G: [31, [43, 55, 59, 62]], A: [33, [45, 57, 61, 64]], Fsm: [30, [42, 54, 61, 66]], Asus: [33, [45, 57, 62, 64]] };
  // harp arpeggios (low → high chord tones)
  const HP = { Cmaj7: [48, 55, 60, 64, 67, 71], Am9: [45, 52, 57, 60, 64, 71], Fmaj7: [41, 48, 53, 57, 60, 64], G6: [43, 50, 55, 59, 62, 64] };
  // bossa guitar: [bass root, chord voicing]
  const BO = { Dm9: [38, [53, 57, 60, 64]], G13: [43, [53, 59, 64]], Cmaj9: [36, [52, 55, 59, 62]], A7: [45, [55, 61, 65]] };
  // waltz: [bass, chord]
  const WZ = { F: [41, [57, 60, 65]], CE: [40, [55, 60, 64]], Dm: [38, [57, 62, 65]], Bb: [46, [58, 62, 65]], Gm: [43, [58, 62, 67]], C: [36, [55, 60, 64]] };
  // breezy pop: [bass, chord]
  const BR = { G: [43, [59, 62, 67]], D: [38, [57, 62, 66]], Em: [40, [59, 64, 67]], C: [36, [55, 60, 64]] };

  const TRACKS = [
    {
      id: 'music-box', name: 'Music Box Waltz', mood: 'Tender and a little nostalgic', bpm: 100, div: 2, steps: 48,
      prog: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'C'],
      mel: [[0, 76], [2, 79], [4, 76], [5, 74], [6, 72], [8, 76], [10, 81], [12, 81], [14, 79], [16, 77], [17, 76], [18, 74], [20, 79], [22, 71],
        [24, 72], [26, 76], [28, 79], [29, 81], [30, 79], [32, 76], [34, 83], [36, 81], [37, 79], [38, 77], [40, 74], [41, 71], [42, 72], [44, 67], [46, 72]],
      play(t, s, A) {
        const bar = Math.floor(s / 6), pos = s % 6;
        const ch = bar === 6 && pos >= 3 ? MB.G : MB[this.prog[bar]];
        if (pos === 0 || (bar === 6 && pos === 3)) A.bell(t, ch[0] + 12, 0.1, 2.4);
        if (pos === 2 || pos === 4) ch.slice(1).forEach((m) => A.bell(t, m, 0.04, 1.2));
        this.mel.forEach(([at, m]) => at === s && A.bell(t, m + 12, 0.12, 2.2));
      },
    },
    {
      id: 'morning-piano', name: 'Morning Piano', mood: 'Warm and unhurried', bpm: 72, div: 2, steps: 64,
      prog: ['Fmaj7', 'Am7', 'Dm7', 'Bbmaj7', 'Fmaj7', 'CE', 'Dm7', 'Bbmaj7'],
      mel: [[0, 81, 6], [6, 79, 2], [8, 76, 4], [12, 79, 4], [16, 77, 6], [22, 76, 2], [24, 74, 8], [32, 72, 2], [34, 77, 4], [38, 81, 2],
        [40, 79, 6], [46, 76, 2], [48, 77, 4], [52, 74, 4], [56, 74, 4], [60, 72, 4]],
      play(t, s, A, spb) {
        const bar = Math.floor(s / 8), pos = s % 8;
        const [root, v] = bar === 7 && pos >= 4 ? PN.C : PN[this.prog[bar]];
        if (pos === 0 || (bar === 7 && pos === 4)) A.piano(t, root, 0.12, 3.2);
        A.piano(t, v[[0, 1, 2, 3, 2, 1, 2, 3][pos]], 0.045, 1.8);
        this.mel.forEach(([at, m, len]) => at === s && A.piano(t, m, 0.11, Math.max(2, len * spb * 1.6)));
      },
    },
    {
      id: 'velvet-strings', name: 'Velvet Strings', mood: 'Slow and cinematic', bpm: 60, div: 1, steps: 32,
      prog: ['D', 'Bm', 'G', 'A', 'D', 'Fsm', 'G', 'Asus'],
      lead: [[74, 78], [78, 76], [74, 71], [73, 76], [78, 81], [78, 73], [74, 79], [76, 73]],
      play(t, s, A, spb) {
        const bar = Math.floor(s / 4), pos = s % 4;
        const [root, v] = ST[this.prog[bar]];
        if (pos === 0) { A.pad(t, v, spb * 4.3, 0.026); A.pad(t, [root + 12], spb * 4.3, 0.03); }
        if (pos === 0 || pos === 2) A.flute(t, this.lead[bar][pos / 2], spb * 1.9, 0.045);
      },
    },
    {
      id: 'garden-rain', name: 'Garden After Rain', mood: 'Airy and meditative', bpm: 84, div: 2, steps: 64, rain: true,
      scale: [62, 64, 66, 69, 71, 74, 76, 78, 81],
      play(t, s, A, spb) {
        if (s % 16 === 0) A.pad(t, s % 32 === 0 ? [50, 57, 62, 64] : [47, 55, 57, 62], spb * 16.5, 0.02);
        if (Math.random() < 0.3) A.bell(t, this.scale[Math.floor(Math.random() * this.scale.length)], 0.07, 3);
        if (s % 8 === 4 && Math.random() < 0.5) A.piano(t, this.scale[Math.floor(Math.random() * 5)] - 12, 0.05, 3);
      },
    },
    {
      id: 'starlit-harp', name: 'Starlit Harp', mood: 'Dreamy and glimmering', bpm: 76, div: 4, steps: 64,
      prog: ['Cmaj7', 'Am9', 'Fmaj7', 'G6'],
      arp: [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1],
      mel: [[0, 79], [12, 76], [16, 81], [24, 79], [28, 76], [32, 77], [40, 76], [44, 72], [48, 74], [56, 79], [60, 71]],
      play(t, s, A, spb) {
        const bar = Math.floor(s / 16), pos = s % 16, ch = HP[this.prog[bar]];
        if (pos === 0) A.pad(t, [ch[0] + 12, ch[2] + 12, ch[3] + 12], spb * 16.5, 0.016);
        A.harp(t, ch[this.arp[pos]] + 12, pos % 4 === 0 ? 0.07 : 0.045, 2.4);
        this.mel.forEach(([at, m]) => at === s && A.bell(t, m + 12, 0.06, 3));
      },
    },
    {
      id: 'cafe-guitar', name: 'Café Guitar', mood: 'Warm, easy and a little sunny', bpm: 132, div: 2, steps: 64,
      prog: ['Dm9', 'G13', 'Cmaj9', 'Cmaj9', 'Dm9', 'G13', 'Cmaj9', 'A7'],
      mel: [[0, 69, 3], [3, 72, 2], [6, 74, 2], [8, 72, 6], [16, 71, 3], [19, 72, 2], [22, 76, 6], [32, 77, 3], [35, 76, 2], [38, 74, 2],
        [40, 72, 6], [48, 71, 3], [51, 69, 2], [54, 67, 2], [56, 69, 6]],
      play(t, s, A, spb) {
        const bar = Math.floor(s / 8), pos = s % 8;
        const [root, v] = BO[this.prog[bar]];
        if (pos === 0) A.pluck(t, root, 0.13, 1.3);
        if (pos === 4) A.pluck(t, root + 7, 0.1, 1);
        // the bossa comb: different on alternating bars
        if ((bar % 2 === 0 ? [0, 3, 6] : [2, 5]).includes(pos)) v.forEach((m, i) => A.pluck(t + i * 0.012, m, 0.045, 0.7));
        this.mel.forEach(([at, m, len]) => at === s && A.flute(t, m, len * spb * 1.1, 0.032));
      },
    },
    {
      id: 'first-dance', name: 'First Dance', mood: 'A slow, swaying waltz', bpm: 92, div: 1, steps: 48,
      prog: ['F', 'CE', 'Dm', 'Bb', 'F', 'Gm', 'C', 'C'],
      mel: [[0, 72, 3], [3, 74, 2], [5, 76, 1], [6, 79, 4], [10, 77, 2], [12, 74, 3], [15, 72, 3], [18, 70, 2], [20, 69, 1], [21, 70, 3],
        [24, 72, 3], [27, 74, 2], [29, 72, 1], [30, 70, 3], [33, 69, 3], [36, 67, 2], [38, 69, 1], [39, 72, 6], [45, 67, 3]],
      play(t, s, A, spb) {
        const bar = Math.floor(s / 6), pos = s % 3;
        const [root, v] = WZ[this.prog[bar]];
        if (pos === 0) A.piano(t, root, 0.11, 2.6);
        else v.forEach((m) => A.piano(t, m, 0.035, 1.4));
        if (s % 6 === 0) A.pad(t, v, spb * 6.4, 0.016);
        this.mel.forEach(([at, m, len]) => at === s && A.flute(t, m + 12, len * spb * 1.05, 0.04));
      },
    },
    {
      id: 'spring-breeze', name: 'Spring Breeze', mood: 'Light, bouncy and bright', bpm: 116, div: 2, steps: 64,
      prog: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
      mel: [[0, 79], [2, 81], [3, 83], [4, 81], [6, 78], [8, 76], [10, 78], [12, 81], [14, 78], [16, 79], [18, 76], [20, 74], [22, 76],
        [24, 72], [26, 74], [28, 76], [30, 79], [32, 79], [34, 81], [35, 83], [36, 86], [38, 83], [40, 81], [42, 83], [44, 81], [46, 78],
        [48, 76], [50, 79], [52, 76], [54, 72], [56, 74], [58, 78], [60, 81], [62, 78]],
      play(t, s, A) {
        const bar = Math.floor(s / 8), pos = s % 8;
        const [root, v] = BR[this.prog[bar]];
        if (pos === 0 || pos === 4) A.pluck(t, root, 0.12, 0.5);
        if (pos === 2 || pos === 6) v.forEach((m) => A.pluck(t, m, 0.04, 0.35));
        this.mel.forEach(([at, m]) => at === s && A.bell(t, m, 0.09, 1.2));
      },
    },
  ];

  /* ---------- transport ---------- */
  function tick() {
    if (!track) return;
    const spb = 60 / track.bpm / track.div;
    const ahead = document.hidden ? 1.5 : 0.2; // background tabs throttle timers
    while (nextTime < ctx.currentTime + ahead) {
      track.play(nextTime, step % track.steps, inst, spb);
      nextTime += spb;
      step++;
    }
  }

  function halt() {
    clearInterval(timer);
    timer = null;
    track = null;
    if (rain) { try { rain.stop(); } catch { /* already stopped */ } rain = null; }
  }

  function play(id) {
    const tr = TRACKS.find((x) => x.id === id);
    if (!tr) return stop();
    if (!ensure()) return;
    halt();
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.55, now + 1.2);
    track = tr;
    step = 0;
    nextTime = now + 0.1;
    if (tr.rain) startRain();
    tick();
    timer = setInterval(tick, 50);
    emit();
  }

  function stop() {
    if (!ctx || !track) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    const was = track;
    clearInterval(timer);
    timer = null;
    track = null;
    setTimeout(() => { if (!track && was) halt(); }, 600);
    paused = false;
    emit();
  }

  function togglePause() {
    if (!ctx || !track) return;
    paused = !paused;
    paused ? ctx.suspend() : ctx.resume();
    emit();
  }

  window.BouqMusic = {
    TRACKS: TRACKS.map(({ id, name, mood }) => ({ id, name, mood })),
    play,
    stop,
    togglePause,
    current: () => track?.id || null,
    isPaused: () => paused,
    onChange: (fn) => listeners.add(fn),
  };
})();
