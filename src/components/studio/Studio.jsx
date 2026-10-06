import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_STEMS, STEPS } from '../../lib/constants.js';
import { useToast } from '../../lib/hooks.js';
import Music from '../../lib/music.js';
import { clamp } from '../../lib/util.js';
import Extras from './Extras.jsx';
import { Blooms, Greenery, Letter, Occasion, Wrap } from './panels.jsx';
import Send from './Send.jsx';
import Stage from './Stage.jsx';
import AdSlot from '../AdSlot.jsx';
import { showAds, useAdFree } from '../../lib/ads.js';

const PANELS = { occasion: Occasion, blooms: Blooms, greenery: Greenery, wrap: Wrap, letter: Letter, extras: Extras, send: Send };

export default function Studio({ state, update, step, setStep, onStartOver }) {
  const toast = useToast();
  const adFree = useAdFree();
  const panelCol = useRef(null);
  const [lock, setLock] = useState({ on: false, pw: '', hint: '' }); // kept in memory only, never saved
  const [fresh, setFresh] = useState(null); // a just-added stem pops in

  useEffect(() => () => Music.stop(), []); // leaving the studio stops any preview

  const goStep = useCallback((i) => {
    const next = clamp(i, 0, STEPS.length - 1);
    setStep(next);
    if (STEPS[next].id !== 'extras') Music.stop();
    if (window.matchMedia('(max-width: 960px)').matches) panelCol.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setStep]);

  const addStem = (id) => {
    if (state.stems.length >= MAX_STEMS) return toast(`A hand-tied bouquet holds ${MAX_STEMS} stems at most.`);
    setFresh(state.stems.length);
    update((st) => { st.stems.push({ id }); });
  };
  const removeStem = (id) => {
    const idx = state.stems.map((x) => x.id).lastIndexOf(id);
    if (idx >= 0) update((st) => { st.stems.splice(idx, 1); });
  };

  const Panel = PANELS[STEPS[step].id];
  const props = { state, update, goStep, addStem, removeStem, lock, setLock, onStartOver };

  return (
    <main className="view view-studio" id="studio">
      <Stage state={state} update={update} fresh={fresh} onPhotos={() => goStep(STEPS.findIndex((s) => s.id === 'extras'))} />

      <section className="panel-col" ref={panelCol}>
        <nav className="steps" aria-label="Bouquet steps">
          {STEPS.map((st, i) => (
            <button
              key={st.id} className={`step-tab${i < step ? ' done' : ''}`} type="button"
              aria-current={i === step ? 'step' : undefined} onClick={() => goStep(i)}
            >
              <b>{i + 1}</b><span>{st.label}</span>
            </button>
          ))}
        </nav>

        <div className="panel active" data-step={STEPS[step].id} key={STEPS[step].id}>
          <Panel {...props} />
        </div>

        <footer className="panel-nav">
          <button className="btn btn-ghost" type="button" style={{ visibility: step === 0 ? 'hidden' : 'visible' }} onClick={() => goStep(step - 1)}>Back</button>
          {step < STEPS.length - 1 && (
            <button
              className="btn" type="button"
              onClick={() => {
                if (STEPS[step].id === 'blooms' && !state.stems.length) return toast('Add at least one stem to continue.');
                goStep(step + 1);
              }}
            >
              {step === STEPS.length - 2 ? 'Review & send' : 'Continue'}
            </button>
          )}
        </footer>
        {showAds && !adFree && <AdSlot className="ad-in-panel" />}
      </section>
    </main>
  );
}
