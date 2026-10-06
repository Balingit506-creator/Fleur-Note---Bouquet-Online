import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Home from './components/Home.jsx';
import Toast from './components/Toast.jsx';
import Topbar from './components/Topbar.jsx';
import Studio from './components/studio/Studio.jsx';
import Viewer from './components/viewer/Viewer.jsx';
import { decode, freshState, sanitize } from './lib/bouquet.js';
import { DRAFT_KEY, STEPS, stepIndex } from './lib/constants.js';
import { ToastContext, useHash, useTheme } from './lib/hooks.js';
import Footer from './components/Footer.jsx';
import { popunderFor } from './lib/ads.js';
import { store } from './lib/util.js';

const DEFAULT_TITLE = 'Fleur & Note — Digital Bouquets';

// What the address after the # asks for.
function parseRoute(hash) {
  if (hash.startsWith('#e=')) {
    const q = new URLSearchParams(hash.slice(1));
    return { view: 'viewer', sealed: q.get('e') || '', hint: q.get('h') || '' };
  }
  if (hash.startsWith('#z=')) return { view: 'viewer', packed: hash.slice(3) };
  if (hash.startsWith('#s=')) return { view: 'viewer', stored: hash.slice(3) };
  if (hash.startsWith('#b=')) {
    const st = decode(hash.slice(3));
    return st && st.stems.length ? { view: 'viewer', st } : { view: 'bad-link' };
  }
  if (hash.startsWith('#studio')) return { view: 'studio', step: hash.split('/')[1] };
  return { view: 'home', anchor: hash === '#support' || hash === '#ideas' ? hash : null };
}

export default function App() {
  const [hash, replaceHash] = useHash();
  const [theme, toggleTheme] = useTheme();
  const route = useMemo(() => parseRoute(hash), [hash]);

  /* ---------- messages ---------- */
  const [toastMsg, setToastMsg] = useState({ text: '', n: 0 });
  const toast = useCallback((text) => setToastMsg((t) => ({ text, n: t.n + 1 })), []);

  /* ---------- the bouquet being made, saved as a draft in this browser ---------- */
  // Only a reload mid-studio (address is just #studio) picks the draft back up; opening the site starts clean.
  const [draft, setDraft] = useState(() => (location.hash === '#studio' ? sanitize(store.get(DRAFT_KEY)) : freshState()));
  const [step, setStep] = useState(0);
  const update = useCallback((fn) => setDraft((prev) => {
    const next = structuredClone(prev);
    fn(next);
    return next;
  }), []);
  useEffect(() => {
    const t = setTimeout(() => store.set(DRAFT_KEY, draft), 250);
    return () => clearTimeout(t);
  }, [draft]);
  const resetDraft = useCallback((st = freshState()) => {
    store.del(DRAFT_KEY);
    setDraft(st);
  }, []);

  /* ---------- routing side effects ---------- */
  useEffect(() => { popunderFor(route.view); }, [route.view]);
  useEffect(() => {
    if (route.view === 'bad-link') {
      toast('That bouquet link looks incomplete. Here’s the studio instead.');
      replaceHash('#studio');
    }
    // #studio/blooms → pick flowers yourself; #studio/occasion → start from an arrangement.
    // Both are "start a new bouquet" links, so they clear whatever was made before.
    if (route.view === 'studio' && route.step) {
      const at = stepIndex(route.step);
      if (at >= 0) {
        resetDraft();
        setStep(at);
        // On one-column layouts the occasion list sits below the stage, so bring it into view.
        if (route.step === 'occasion' && window.matchMedia('(max-width: 960px)').matches) {
          requestAnimationFrame(() => document.querySelector('#studio .panel-col')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      }
      replaceHash('#studio');
    }
  }, [route, toast, replaceHash, resetDraft]);

  const view = route.view === 'bad-link' ? 'studio' : route.view;
  useLayoutEffect(() => {
    document.body.dataset.view = view; // the stylesheet keys some layout off this
    if (view !== 'viewer') document.title = DEFAULT_TITLE;
    window.scrollTo(0, 0);
  }, [view]);

  const sendBack = useCallback((viewing) => {
    const st = freshState();
    if (viewing?.card.from) st.card.to = viewing.card.from;
    if (viewing?.card.to) st.card.from = viewing.card.to;
    resetDraft(st);
    setStep(0);
  }, [resetDraft]);

  return (
    <ToastContext.Provider value={toast}>
      <Topbar theme={theme} onToggleTheme={toggleTheme} />
      {view === 'home' && <Home anchor={route.anchor} />}
      {view === 'studio' && (
        <Studio
          state={draft}
          update={update}
          step={Math.min(step, STEPS.length - 1)}
          setStep={setStep}
          onStartOver={() => { resetDraft(); setStep(0); }}
        />
      )}
      {view === 'viewer' && (
        <Viewer
          key={hash} route={route} onSendBack={sendBack}
          onBadLink={() => { toast('That bouquet link looks incomplete. Here’s the studio instead.'); replaceHash('#studio'); }}
        />
      )}
      {(view === 'home' || view === 'studio') && <Footer />}
      <Toast message={toastMsg} />
    </ToastContext.Provider>
  );
}
