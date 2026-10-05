import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { layoutAddons } from '../../lib/bouquet.js';
import { FONTS, PILE_BOX, paperProps } from '../../lib/constants.js';
import { addonAt, alphaMap } from '../../lib/hit.js';
import { byId, clamp, randSeed } from '../../lib/util.js';
import Bouquet from '../Bouquet.jsx';
import Photo from '../Photo.jsx';

/* The live preview: drag blooms and add-ons, see the gift tag and where the photos will go. */
export default function Stage({ state, update, fresh, onPhotos }) {
  const svgRef = useRef(null), stageRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const n = state.stems.length;

  useEffect(() => { layoutAddons(state).forEach((a) => alphaMap(a.a.src)); }, [state]);

  // While something is being dragged, draw the bouquet with it at the pointer.
  const shown = useMemo(() => {
    if (!drag?.moved) return state;
    if (drag.kind === 'addon') {
      return { ...state, addonPos: { ...state.addonPos, [drag.a.a.id]: { x: drag.x + drag.a.w / 2, y: drag.y + drag.a.h / 2 } } };
    }
    const topZ = Math.max(0, ...state.stems.map((x) => x.z || 0));
    return { ...state, stems: state.stems.map((s, i) => (i === drag.i ? { ...s, x: drag.x, y: drag.y, z: topZ + 1 } : s)) };
  }, [state, drag]);

  const toSvg = (e) => {
    const svg = svgRef.current, p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  const onPointerDown = (e) => {
    const p = toSvg(e);
    // order matches what you see: front add-ons, then blooms, then add-ons behind the bouquet
    const bloom = e.target.closest('.bloom-pos');
    const a = addonAt(state, p, 'top') || (!bloom && addonAt(state, p, 'back'));
    if (!a && !bloom) return;
    e.preventDefault();
    svgRef.current.setPointerCapture(e.pointerId);
    if (a) setDrag({ kind: 'addon', id: a.a.id, a, dx: a.x - p.x, dy: a.y - p.y, x: a.x, y: a.y, moved: false });
    else setDrag({ kind: 'bloom', i: +bloom.dataset.i, dx: +bloom.dataset.x - p.x, dy: +bloom.dataset.y - p.y, moved: false });
  };
  const onPointerMove = (e) => {
    const p = toSvg(e);
    if (!drag) { // a grab cursor over anything that can be moved
      const over = addonAt(state, p, 'top') || e.target.closest('.bloom-pos') || addonAt(state, p, 'back');
      svgRef.current.style.cursor = over ? 'grab' : '';
      return;
    }
    if (drag.kind === 'addon') {
      const { a } = drag; // may hang off the edge a little
      setDrag({ ...drag, moved: true, x: clamp(p.x + drag.dx, -a.w * 0.3, 600 - a.w * 0.7), y: clamp(p.y + drag.dy, -a.h * 0.3, 760 - a.h * 0.7) });
    } else {
      setDrag({ ...drag, moved: true, x: clamp(p.x + drag.dx, 40, 560), y: clamp(p.y + drag.dy, 50, 560) });
    }
  };
  const onPointerUp = () => {
    const d = drag;
    setDrag(null);
    if (!d?.moved) return;
    if (d.kind === 'addon') {
      update((st) => { st.addonPos[d.a.a.id] = { x: Math.round(d.x + d.a.w / 2), y: Math.round(d.y + d.a.h / 2) }; });
    } else {
      const topZ = Math.max(0, ...state.stems.map((x) => x.z || 0));
      update((st) => { Object.assign(st.stems[d.i], { x: Math.round(d.x), y: Math.round(d.y), z: topZ + 1 }); });
    }
  };

  const { to, msg, font, paper } = state.card;
  return (
    <section className="stage-col">
      <div className="stage" id="stage" ref={stageRef}>
        <Bouquet
          st={shown} fresh={fresh} dragging={drag?.moved ? drag : null} svgRef={svgRef} id="stage-bouquet"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        />
        {(to || msg) && (
          <div className="tag-card paper-face" id="tag-card" {...paperProps(paper)}>
            <span className="tag-string" />
            <p className="tag-to">{to ? `For ${to}` : 'For you'}</p>
            <p className="tag-msg" style={{ fontFamily: byId(FONTS, font).css }}>{msg}</p>
          </div>
        )}
        <PhotoSlot state={state} svgRef={svgRef} stageRef={stageRef} onClick={onPhotos} />
        {!n && (
          <div className="stage-empty" id="stage-empty">
            <p>Your bouquet will gather here.</p>
            <span>Choose an occasion or add your first stem.</span>
          </div>
        )}
      </div>
      <div className="stage-tools">
        <span className="stage-count">{n} {n === 1 ? 'stem' : 'stems'}</span>
        <button className="chip" type="button" disabled={n < 2} onClick={() => update((st) => { st.seed = randSeed(); st.stems = st.stems.map((x) => ({ id: x.id })); })}>Rearrange</button>
        <button className="chip" type="button" disabled={n < 2} onClick={() => update((st) => { st.stems = st.stems.map((x) => ({ id: x.id })); st.addonPos = {}; })}>Tidy layout</button>
        <span className="stage-hint">Drag any bloom or add-on to move it</span>
      </div>
    </section>
  );
}

const PILE_TILT = [[-7, 0, 0], [5, 7, -4], [-2, -5, -7]]; // tilt, x%, y% for the mini pile

/* Lower-left of the preview: where the photo pile will sit on the recipient's page. */
function PhotoSlot({ state, svgRef, stageRef, onClick }) {
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      const s = svgRef.current?.getBoundingClientRect(), st = stageRef.current?.getBoundingClientRect();
      if (!s?.width || !st?.width) return;
      const [l, t, w, hh] = PILE_BOX;
      const height = hh * s.height;
      // the pile hangs a little below the bouquet; inside the preview box, lift it just enough to stay whole
      const top = Math.min(s.top - st.top + t * s.height, st.height - height - 14);
      const next = { left: s.left - st.left + l * s.width, top, width: w * s.width, height };
      setBox((b) => (b && Object.keys(next).every((k) => Math.abs(b[k] - next[k]) < 0.5) ? b : next));
    };
    place();
    // re-measure whenever the preview or the bouquet changes size (fonts, layout, window)
    const ro = new ResizeObserver(place);
    if (stageRef.current) ro.observe(stageRef.current);
    if (svgRef.current) ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, [svgRef, stageRef]);

  const { photos, photoFrame } = state;
  const count = `${photos.length} photo${photos.length > 1 ? 's' : ''}`;
  return (
    <button
      className={`stage-photos${photos.length ? ' has-photos' : ''}`} type="button" style={box || undefined} onClick={onClick}
      aria-label={photos.length ? `${count} will sit here. Edit photos` : 'Your photos will sit here. Add photos'}
    >
      {photos.length ? (
        <>
          {photos.slice(0, 3).map((p, i) => (
            <span key={i} className="sp-card pf" data-frame={photoFrame}
              style={{ '--r': `${PILE_TILT[i][0]}deg`, '--ox': `${PILE_TILT[i][1]}%`, '--oy': `${PILE_TILT[i][2]}%`, zIndex: i + 1 }}>
              <i className="pf-deco" /><Photo src={p.src} />
            </span>
          ))}
          <span className="sp-label sp-count">{count}</span>
        </>
      ) : (
        <>
          <span className="sp-empty" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
          <span className="sp-label">Your photos go here</span>
        </>
      )}
    </button>
  );
}
