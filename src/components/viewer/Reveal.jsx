import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PILE_BOX, PILE_LAYERS as PILE, paperProps } from '../../lib/constants.js';
import { useToast } from '../../lib/hooks.js';
import { exportPNG, recordClip } from '../../lib/render.js';
import Bouquet from '../Bouquet.jsx';
import Photo from '../Photo.jsx';

/* After the envelope: the bouquet, its photos, the letter and a few actions. */
export default function Reveal({ st, onOpenAgain, onSendBack }) {
  const toast = useToast();
  const svgRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [photo, setPhoto] = useState(null); // index of the photo shown large
  const [busy, setBusy] = useState(null); // 'picture' | 'video' while one is being made
  const n = st.photos.length;
  const save = async (kind, make) => {
    if (busy) return;
    setBusy(kind);
    try { await make(st, toast); } finally { setBusy(null); }
  };

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  return (
    <section className="reveal" id="reveal">
      <div className="reveal-bouquet">
        <div className="bq-frame" style={{ '--space': n ? 0.22 : 0 }}>
          <Bouquet st={st} animate svgRef={svgRef} id="viewer-bouquet" />
          {n > 0 && <PhotoStack st={st} svgRef={svgRef} onOpen={setPhoto} />}
        </div>
      </div>
      <Letter st={st} onClick={() => setReading(true)} />
      <div className="reveal-actions">
        <button className="act act-replay" type="button" id="btn-replay" onClick={onOpenAgain}>
          <ActIcon><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></ActIcon>
          <span>Open again</span>
        </button>
        <button className={`act act-picture${busy === 'picture' ? ' busy' : ''}`} type="button" id="btn-save-picture" disabled={!!busy} aria-busy={busy === 'picture'} onClick={() => save('picture', exportPNG)}>
          <ActIcon><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle className="sun" cx="9" cy="10" r="1.8" /><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" /></ActIcon>
          <span>Save as picture</span>
        </button>
        <button className={`act act-video${busy === 'video' ? ' busy' : ''}`} type="button" id="btn-save-video" disabled={!!busy} aria-busy={busy === 'video'} onClick={() => save('video', recordClip)}>
          <ActIcon><rect x="3" y="6.5" width="12.5" height="11" rx="2.5" /><path className="lens" d="M15.5 10.5l5-3v9l-5-3z" /></ActIcon>
          <span>Save as video</span>
        </button>
        <a className="act act-send" href="#studio" onClick={onSendBack}>
          <ActIcon><path className="heart" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></ActIcon>
          <span>Send one back</span>
        </a>
      </div>
      {reading && <Reader st={st} onClose={() => setReading(false)} />}
      {photo != null && <Lightbox photos={st.photos} index={photo} setIndex={setPhoto} onClose={() => setPhoto(null)} />}
    </section>
  );
}

// A button icon; while its button is busy a spinner takes its place.
const ActIcon = ({ children }) => (
  <span className="act-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    <i className="act-spin" />
  </span>
);

/* ---------- the letter ---------- */
function LetterBody({ st }) {
  const { to, msg, from } = st.card;
  return (
    <>
      <p className="letter-to">{to ? `Dear ${to},` : 'For you,'}</p>
      <p className="letter-msg">{msg || 'Just because.'}</p>
      <p className="letter-from">{from ? `— ${from}` : ''}</p>
    </>
  );
}

function Letter({ st, onClick }) {
  const paper = paperProps(st.card.paper);
  return (
    <article
      className={`letter paper-face font-${st.card.font}`} id="letter" tabIndex="0" role="button" aria-label="Open the letter to read it larger"
      data-paper={paper['data-paper']} style={paper.style}
      onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <LetterBody st={st} />
      <span className="letter-zoom" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5M10.5 8v5M8 10.5h5" /></svg>
        Tap to read
      </span>
    </article>
  );
}

/* ---------- reading the letter up close ---------- */
const READER_SIZES = [1, 1.2, 1.45, 1.75];
const READER_KEY = 'petal-post-reader';

// A modal <dialog> that is open while mounted (unmounting removes it, which closes it).
function useModal(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d.open) d.showModal();
    const closed = () => onClose();
    d.addEventListener('close', closed);
    return () => d.removeEventListener('close', closed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

function Reader({ st, onClose }) {
  const ref = useModal(onClose);
  const [size, setSize] = useState(() => {
    try { return Math.min(READER_SIZES.length - 1, Math.max(0, +localStorage.getItem(READER_KEY) || 1)); } catch { return 1; }
  });
  const change = (d) => setSize((s) => {
    const next = Math.min(READER_SIZES.length - 1, Math.max(0, s + d));
    try { localStorage.setItem(READER_KEY, next); } catch { /* ignore */ }
    return next;
  });
  const paper = paperProps(st.card.paper);
  return (
    <dialog
      className="reader" ref={ref} aria-label="The letter" style={{ '--zoom': READER_SIZES[size] }}
      onClick={(e) => { if (e.target === e.currentTarget || e.target.classList.contains('reader-body')) ref.current.close(); }}
    >
      <div className="reader-tools">
        <button type="button" className="reader-btn" aria-label="Smaller text" disabled={size === 0} onClick={() => change(-1)}>A−</button>
        <button type="button" className="reader-btn" aria-label="Larger text" disabled={size === READER_SIZES.length - 1} onClick={() => change(1)}>A+</button>
        <button type="button" className="reader-btn reader-close" aria-label="Close" onClick={() => ref.current.close()}>✕</button>
      </div>
      <div className="reader-body">
        <article className={`letter paper-face letter-big font-${st.card.font}`} data-paper={paper['data-paper']} style={paper.style}>
          <LetterBody st={st} />
        </article>
      </div>
    </dialog>
  );
}

/* ---------- photos: a small pile beside the bouquet ---------- */
// Hover (or a first tap on touch screens) fans them out; clicking one opens it large.

function PhotoStack({ st, svgRef, onOpen }) {
  const n = st.photos.length;
  const wrap = useRef(null);
  const [box, setBox] = useState(null);
  const [fanned, setFanned] = useState(false);

  // the same box as the studio's photo spot, so the preview and the result always match
  useLayoutEffect(() => {
    const place = () => {
      const s = svgRef.current?.getBoundingClientRect(), g = wrap.current?.getBoundingClientRect();
      if (!s?.width || !g) return;
      const [l, t, w, hh] = PILE_BOX;
      setBox({ left: s.left - g.left + l * s.width, top: s.top - g.top + t * s.height, width: w * s.width, height: hh * s.height, transform: 'none', aspectRatio: 'auto' });
    };
    place();
    const ro = new ResizeObserver(place); // re-measure whenever the bouquet changes size
    if (svgRef.current) ro.observe(svgRef.current);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [svgRef]);

  useEffect(() => {
    if (!fanned) return;
    const away = (e) => { if (!e.target.closest('.photo-stack')) setFanned(false); };
    document.addEventListener('click', away);
    return () => document.removeEventListener('click', away);
  }, [fanned]);

  return (
    <div className="reveal-photos" ref={wrap}>
      <div className={`photo-stack${fanned ? ' fanned' : ''}`} role="group" aria-label={`${n} photo${n > 1 ? 's' : ''}`} style={box || undefined}>
        {st.photos.map((p, i) => {
          const [ox, oy, r] = PILE[i % PILE.length];
          const c = i - (n - 1) / 2;
          return (
            <button
              key={i} className="polaroid pf" type="button" data-frame={st.photoFrame}
              style={{ '--ox': `${ox}%`, '--oy': `${oy}%`, '--r': `${r}deg`, '--fx': `${c * 62}%`, '--fy': `${-8 + Math.abs(c) * 6}%`, '--fr': `${c * 7}deg`, zIndex: i + 1, '--d': `${(2 + i * 0.15).toFixed(2)}s` }}
              aria-label={p.cap ? `Open photo: ${p.cap}` : `Open photo ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                // on touch screens the first tap spreads the pile so every photo can be chosen
                if (n > 1 && !fanned && !matchMedia('(hover: hover)').matches) { setFanned(true); return; }
                onOpen(i);
              }}
            >
              <i className="pf-deco" aria-hidden="true" />
              <Photo src={p.src} alt={p.cap || ''} />
              {p.cap && <span>{p.cap}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Lightbox({ photos, index, setIndex, onClose }) {
  const ref = useModal(onClose);
  const go = (d) => setIndex((i) => (i + d + photos.length) % photos.length);
  const p = photos[index];
  const many = photos.length > 1;
  return (
    <dialog
      className="lightbox" ref={ref}
      onClick={(e) => { if (e.target === e.currentTarget) ref.current.close(); }}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }}
    >
      <form method="dialog"><button className="lightbox-close" aria-label="Close">×</button></form>
      <Photo src={p.src} alt={p.cap || ''} />
      <p>{p.cap || ''}</p>
      {many && <button className="lb-nav lb-prev" type="button" aria-label="Previous photo" onClick={() => go(-1)}>‹</button>}
      {many && <button className="lb-nav lb-next" type="button" aria-label="Next photo" onClick={() => go(1)}>›</button>}
      <p className="lb-count">{many ? `${index + 1} / ${photos.length}` : ''}</p>
    </dialog>
  );
}
