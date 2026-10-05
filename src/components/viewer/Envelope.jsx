import { useEffect, useMemo, useRef, useState } from 'react';
import { ASSETS } from '../../lib/assets.js';
import { initial, sealMarkup } from '../../lib/bouquet.js';
import { SEALS, paperProps } from '../../lib/constants.js';
import { byId, uid, wait } from '../../lib/util.js';

const anim = (el, frames, opts) => el.animate(frames, { fill: 'forwards', ...opts }).finished.catch(() => {});

// The wax seal splits along a crack; both halves tumble away and a few crumbs scatter.
function breakSeal(env, seal, sl) {
  seal.style.visibility = 'hidden';
  for (const side of ['l', 'r']) {
    const half = document.createElement('div');
    half.className = `seal-half ${side}`;
    // each half gets its own gradient id, so its colour survives the original being hidden
    half.innerHTML = seal.innerHTML.replace(/(id="|url\(#)(u\d+)/g, `$1$2${side}`);
    env.append(half);
    const dir = side === 'l' ? -1 : 1;
    half.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dir * 16}px), calc(-50% - 12px)) rotate(${dir * 14}deg)`, opacity: 1, offset: 0.22 },
      { transform: `translate(calc(-50% + ${dir * 52}px), calc(-50% + 150px)) rotate(${dir * 70}deg)`, opacity: 0 },
    ], { duration: 950, easing: 'cubic-bezier(.45,0,.85,.55)', fill: 'forwards' });
  }
  for (let i = 0; i < 9; i++) {
    const crumb = document.createElement('span');
    crumb.className = 'wax-crumb';
    crumb.style.background = i % 3 ? sl.c : sl.d;
    env.append(crumb);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 30 + Math.random() * 40;
    const dx = Math.cos(ang) * v, up = Math.sin(ang) * v;
    crumb.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${up * 0.6}px)) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${90 + Math.random() * 40}px)) scale(.6) rotate(${Math.random() * 360}deg)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.3,0,.8,.6)', fill: 'forwards' });
  }
}

// Waits until the letter is pulled: a tap, a drag upwards, or on its own after a few seconds.
function waitForPull(letter, peek, run) {
  return new Promise((resolve) => {
    let start = null, done = false, auto;
    const arm = () => { clearTimeout(auto); auto = setTimeout(finish, 4500); };
    const set = (pct) => { letter.getAnimations().forEach((x) => x.cancel()); letter.style.transform = `translateY(${pct}%)`; };
    const down = (ev) => { ev.preventDefault(); start = ev.clientY; clearTimeout(auto); letter.setPointerCapture?.(ev.pointerId); };
    const move = (ev) => { if (start == null) return; set(peek + (Math.min(0, ev.clientY - start) / (letter.offsetHeight || 1)) * 90); };
    const up = (ev) => {
      if (start == null) return;
      const pulled = start - ev.clientY;
      start = null;
      if (pulled < 6 || pulled > (letter.offsetHeight || 100) * 0.16) return finish(); // a tap, or pulled far enough
      anim(letter, [{ transform: letter.style.transform }, { transform: `translateY(${peek}%)` }], { duration: 280, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      arm();
    };
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(auto);
      letter.removeEventListener('pointerdown', down);
      letter.removeEventListener('pointermove', move);
      letter.removeEventListener('pointerup', up);
      letter.removeEventListener('pointercancel', up);
      resolve();
    }
    letter.addEventListener('pointerdown', down);
    letter.addEventListener('pointermove', move);
    letter.addEventListener('pointerup', up);
    letter.addEventListener('pointercancel', up);
    run.finish = finish;
    arm();
  });
}

/* The sealed envelope. Breaking the seal opens it step by step, like a real one. */
export default function Envelope({ st, onOpenStart, onOpened }) {
  const scene = useRef(null), env = useRef(null), seal = useRef(null), flap = useRef(null), flapOut = useRef(null);
  const letter = useRef(null), kicker = useRef(null), back = useRef(null), pocket = useRef(null), address = useRef(null);
  const [hint, setHint] = useState('Break the seal to open');
  const [pullable, setPullable] = useState(false);
  const run = useRef(null);
  const sealHtml = useMemo(() => sealMarkup(st.seal, initial(st.card.from), uid()), [st]);
  const envImg = byId(ASSETS.envelopes, st.envelope);
  const sl = byId(SEALS, st.seal) || SEALS[0];

  // leaving mid-way (e.g. "Open again") cancels the sequence
  useEffect(() => () => { if (run.current) { run.current.cancelled = true; run.current.finish?.(); } }, []);

  const open = async () => {
    if (run.current) return;
    const r = (run.current = { cancelled: false });
    onOpenStart(); // inside the click, so browsers allow sound
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scene.current.classList.add('leaving');
      await wait(300);
      if (!r.cancelled) onOpened();
      return;
    }
    env.current.classList.add('opening');
    setHint('');

    // 1. the seal gives a little under the thumb, then cracks
    await anim(seal.current, [
      { transform: 'translate(-50%, -50%)' }, { transform: 'translate(-50%, -50%) rotate(-7deg) scale(.95)' },
      { transform: 'translate(-50%, -50%) rotate(5deg) scale(.97)' }, { transform: 'translate(-50%, -50%)' },
    ], { duration: 280, fill: 'none' });
    if (r.cancelled) return;
    breakSeal(env.current, seal.current, sl);
    // 2. the envelope is lifted and tilted towards you
    anim(env.current, [{ transform: 'perspective(1200px) rotateX(0deg) scale(1)' }, { transform: 'perspective(1200px) rotateX(7deg) scale(1.035)' }],
      { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' });
    await wait(300);
    if (r.cancelled) return;

    // 3. the flap lifts on its fold, darkens edge-on, swings back and settles with a small bounce
    anim(kicker.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 380 }); // the open flap rises where the heading is
    anim(flapOut.current, [{ filter: 'brightness(1.03)' }, { filter: 'brightness(.7)', offset: 0.45 }, { filter: 'brightness(1)' }], { duration: 950 });
    await anim(flap.current, [
      { transform: 'rotateX(0deg)', zIndex: 4 },
      { transform: 'rotateX(92deg)', zIndex: 4, offset: 0.44 },
      { transform: 'rotateX(96deg)', zIndex: 1, offset: 0.46 },
      { transform: 'rotateX(188deg)', zIndex: 1, offset: 0.76 },
      { transform: 'rotateX(173deg)', zIndex: 1, offset: 0.89 },
      { transform: 'rotateX(180deg)', zIndex: 1 },
    ], { duration: 950, easing: 'cubic-bezier(.35,.05,.35,1)' });
    if (r.cancelled) return;

    // 4. the letter peeks out and waits to be pulled
    const PEEK = -30;
    await anim(letter.current, [{ transform: 'translateY(0%)' }, { transform: `translateY(${PEEK - 4}%)`, offset: 0.7 }, { transform: `translateY(${PEEK}%)` }],
      { duration: 700, easing: 'cubic-bezier(.3,.7,.3,1)' });
    if (r.cancelled) return;
    setHint('Pull out the letter');
    setPullable(true);
    await waitForPull(letter.current, PEEK, r);
    if (r.cancelled) return;
    setPullable(false);
    setHint('');

    // 5. out it comes, and the envelope is set aside
    await anim(letter.current, [{ transform: getComputedStyle(letter.current).transform }, { transform: 'translateY(-118%) rotate(-2deg)' }],
      { duration: 520, easing: 'cubic-bezier(.45,0,.2,1)' });
    if (r.cancelled) return;
    letter.current.style.zIndex = 8;
    [back, pocket, flap, address].forEach((ref) =>
      anim(ref.current, [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 80px' }], { duration: 620, easing: 'ease-in' }));
    await anim(letter.current, [{ transform: 'translateY(-118%) rotate(-2deg)' }, { transform: 'translateY(-52%) rotate(1deg) scale(1.2)' }],
      { duration: 720, easing: 'cubic-bezier(.3,.7,.2,1)' });
    if (r.cancelled) return;
    scene.current.classList.add('leaving');
    await wait(420);
    if (!r.cancelled) onOpened();
  };

  const paper = paperProps(st.card.paper);
  return (
    <section className="env-scene" id="env-scene" ref={scene}>
      <p className="env-kicker" ref={kicker}>{st.card.from ? `${st.card.from} sent you flowers` : 'Something arrived for you'}</p>
      <div
        ref={env}
        className={`envelope${/midnight|noir|navy|dark/i.test(st.envelope || '') ? ' dark' : ''}`}
        id="envelope"
        style={{
          '--env': envImg ? `url("${new URL(envImg.src, location.href).href}")` : 'linear-gradient(#f3ecdf, #e7dcc8)',
          '--liner': sl.c,
        }}
      >
        <div className="env-back" ref={back} />
        <div ref={letter} className={`env-letter paper-face${pullable ? ' pullable' : ''}`} data-paper={paper['data-paper']} style={paper.style}>
          <span className="el-to">{st.card.to ? `Dear ${st.card.to},` : 'For you,'}</span><i /><i /><i />
        </div>
        <div className="env-pocket" ref={pocket} />
        <div className="env-flap" ref={flap}><div className="flap-face flap-out" ref={flapOut} /><div className="flap-face flap-in" /></div>
        <button className="seal" id="seal" ref={seal} type="button" aria-label="Break the seal and open" onClick={open} dangerouslySetInnerHTML={{ __html: sealHtml }} />
        <p className="env-address" ref={address}>{st.card.to ? `For ${st.card.to}` : 'For you'}</p>
      </div>
      <p className="env-hint">{hint}</p>
    </section>
  );
}
