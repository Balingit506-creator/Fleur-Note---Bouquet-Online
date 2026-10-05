import { useState } from 'react';
import { ASSETS, findFlower, flowerHex, flowerLabel } from '../../lib/assets.js';
import { applyOccasionTo } from '../../lib/bouquet.js';
import { FONTS, MAX_ADDONS, MAX_GREEN, MAX_STEMS, OCCASIONS, PAPERS, RIBBONS, SEALS, paperProps } from '../../lib/constants.js';
import { useToast } from '../../lib/hooks.js';
import { byId } from '../../lib/util.js';

const Head = ({ eyebrow, title, children }) => (
  <header className="panel-head">
    <p className="eyebrow">{eyebrow}</p>
    <h2>{title}</h2>
    <p>{children}</p>
  </header>
);

// An image card that can be switched on or off.
const Pick = ({ on, onClick, thumb, name }) => (
  <button className={`pick${on ? ' on' : ''}`} type="button" aria-pressed={on} onClick={onClick}>
    <span className="thumb">{thumb}</span>
    <span className="name">{name}</span>
    <span className="check">✓</span>
  </button>
);

/* ---------- 1. occasion ---------- */
export function Occasion({ state, update, goStep }) {
  const toast = useToast();
  return (
    <>
      <Head eyebrow="Step one" title="What is the occasion?">Each one starts with a florist&apos;s arrangement you can then make your own.</Head>
      <div className="occasions">
        {OCCASIONS.map((o) => (
          <button
            key={o.id} className="occ" type="button" aria-pressed={state.occasion === o.id}
            onClick={() => {
              update((st) => Object.assign(st, applyOccasionTo(st, o)));
              toast(`${o.name} arrangement gathered. Now make it yours.`);
              setTimeout(() => goStep(1), 350);
            }}
          >
            <h3>{o.name}</h3>
            <p>{o.line}</p>
            <span className="dots">
              {o.flowers.map(([k, c]) => findFlower(k, c)).filter(Boolean).map((f, i) => <i key={i} style={{ background: flowerHex(f) }} />)}
            </span>
          </button>
        ))}
        <button
          className="occ occ-blank" type="button"
          onClick={() => { update((st) => { st.occasion = null; st.stems = []; st.greenery = []; }); goStep(1); }}
        >
          <h3>Blank canvas</h3>
          <p>Start with an empty vase and choose every stem yourself.</p>
        </button>
      </div>
    </>
  );
}

/* ---------- 2. blooms ---------- */
// one filter per Flowers/ sub-folder (e.g. "Ranunculus"), with catch-all folders like "Others" last
const catchAll = (k) => /^(others?|mixed|misc|more)$/i.test(k);
const GROUPS = ['All', ...[...new Set(ASSETS.flowers.map((f) => f.kinds || f.kind))].sort((a, b) => catchAll(a) - catchAll(b))];

export function Blooms({ state, update, addStem, removeStem }) {
  const [filter, setFilter] = useState('All');
  const total = state.stems.length;
  return (
    <>
      <Head eyebrow="Step two" title="Choose your blooms">Tap a flower to add a stem. Up to {MAX_STEMS} stems.</Head>
      <div className="filters">
        {GROUPS.map((k) => <button key={k} className="chip" type="button" aria-pressed={k === filter} onClick={() => setFilter(k)}>{k}</button>)}
      </div>
      <div className="grid grid-blooms">
        {ASSETS.flowers.filter((f) => filter === 'All' || (f.kinds || f.kind) === filter).map((f) => {
          const n = state.stems.filter((x) => x.id === f.id).length;
          return (
            <div key={f.id} className={`pick${n ? ' on' : ''}`}>
              <button className="pick-main" type="button" aria-label={`Add a ${flowerLabel(f)}`} onClick={() => addStem(f.id)}>
                <span className="thumb"><img src={f.src} alt="" loading="lazy" decoding="async" /></span>
                <span className="name">{f.name}</span>
                <span className="kind">{f.kind}</span>
              </button>
              {n > 0 && <span className="badge">{n}</span>}
              <div className="stepper">
                <button type="button" aria-label={`Remove a ${flowerLabel(f)}`} disabled={!n} onClick={() => removeStem(f.id)}>−</button>
                <output>{n}</output>
                <button type="button" aria-label={`Add a ${flowerLabel(f)}`} disabled={total >= MAX_STEMS} onClick={() => addStem(f.id)}>+</button>
              </div>
            </div>
          );
        })}
        {!ASSETS.flowers.length && <p className="fineprint">No flowers found. Add images to public/Flowers/&lt;Kind&gt;/ and restart npm run dev.</p>}
      </div>
      <div className="panel-row">
        <span className="meter"><span style={{ width: `${(total / MAX_STEMS) * 100}%` }} /></span>
        <button className="chip" type="button" onClick={() => update((st) => { st.stems = []; })}>Clear stems</button>
      </div>
    </>
  );
}

/* ---------- 3. greenery ---------- */
export function Greenery({ state, update }) {
  const toast = useToast();
  return (
    <>
      <Head eyebrow="Step three" title="Add greenery">Foliage gives the blooms room to breathe. Choose up to {MAX_GREEN}.</Head>
      <div className="grid grid-green">
        {ASSETS.greenery.map((g) => (
          <Pick
            key={g.id} on={state.greenery.includes(g.id)} name={g.name} thumb={<img src={g.src} alt="" loading="lazy" />}
            onClick={() => {
              if (!state.greenery.includes(g.id) && state.greenery.length >= MAX_GREEN) return toast(`Up to ${MAX_GREEN} kinds of greenery. Remove one first.`);
              update((st) => { st.greenery = st.greenery.includes(g.id) ? st.greenery.filter((x) => x !== g.id) : [...st.greenery, g.id]; });
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ---------- 4. wrap & add-ons ---------- */
export function Wrap({ state, update }) {
  const toast = useToast();
  const wrap = byId(ASSETS.wraps, state.wrap);
  return (
    <>
      <Head eyebrow="Step four" title="Wrap & add-ons">Choose the paper, then tuck in a little something extra. Up to {MAX_ADDONS} add-ons.</Head>
      <h3 className="sub">Paper</h3>
      <div className="grid grid-wraps">
        {ASSETS.wraps.map((w) => (
          <Pick
            key={w.id} on={state.wrap === w.id} name={w.name} onClick={() => update((st) => { st.wrap = w.id; })}
            thumb={<>{w.back && <img src={w.back} alt="" />}{w.front && <img src={w.front} alt="" />}</>}
          />
        ))}
      </div>
      {wrap?.ribbon !== false && ( // wraps with their own bow don't need a ribbon
        <>
          <h3 className="sub">Ribbon</h3>
          <div className="swatches">
            {RIBBONS.map((r) => (
              <button key={r.id} className="swatch" type="button" aria-pressed={state.ribbon === r.id} onClick={() => update((st) => { st.ribbon = r.id; })}>
                <i style={{ background: `linear-gradient(135deg, ${r.l}, ${r.c} 60%, ${r.d})` }} />{r.name}
              </button>
            ))}
          </div>
        </>
      )}
      <h3 className="sub">Add-ons</h3>
      <div className="grid grid-addons">
        {ASSETS.addons.map((a) => (
          <Pick
            key={a.id} on={state.addons.includes(a.id)} name={a.name} thumb={<img src={a.src} alt="" />}
            onClick={() => {
              if (!state.addons.includes(a.id) && state.addons.length >= MAX_ADDONS) return toast(`Up to ${MAX_ADDONS} add-ons. Remove one first.`);
              update((st) => {
                if (st.addons.includes(a.id)) { st.addons = st.addons.filter((x) => x !== a.id); delete st.addonPos[a.id]; } else st.addons.push(a.id);
              });
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ---------- 5. letter ---------- */
export function Letter({ state, update }) {
  const { card } = state;
  const occ = byId(OCCASIONS, state.occasion);
  const setCard = (key) => (e) => { const v = e.target.value; update((st) => { st.card[key] = v; }); };
  return (
    <>
      <Head eyebrow="Step five" title="Write the letter">It&apos;s tucked into an envelope and sealed until they open it.</Head>
      <div className="form">
        <label className="field"><span>To</span><input maxLength="40" placeholder="Their name" autoComplete="off" value={card.to} onChange={setCard('to')} /></label>
        <label className="field"><span>Message</span>
          <textarea rows="6" maxLength="600" placeholder={occ ? occ.note : 'Write something only you could say…'} value={card.msg} onChange={setCard('msg')} />
          <small className="count">{card.msg.length} / 600</small>
        </label>
        <button
          className="linkish" type="button"
          onClick={() => { const o = occ || OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)]; update((st) => { st.card.msg = o.note; }); }}
        >
          Need words? Use a suggestion
        </button>
        <label className="field"><span>From</span><input maxLength="40" placeholder="Your name" autoComplete="off" value={card.from} onChange={setCard('from')} /></label>
        <div className="field"><span>Handwriting</span>
          <div className="segmented">
            {FONTS.map((f) => (
              <button key={f.id} type="button" title={f.name} aria-label={f.name} aria-pressed={card.font === f.id} style={{ fontFamily: f.css }} onClick={() => update((st) => { st.card.font = f.id; })}>{f.name}</button>
            ))}
          </div>
        </div>
      </div>
      <h3 className="sub">Letter paper</h3>
      <div className="papers">
        {PAPERS.map((p) => (
          <button key={p.id} className="paper-pick" type="button" aria-pressed={card.paper === p.id} title={p.name} onClick={() => update((st) => { st.card.paper = p.id; })}>
            <span className="paper-face paper-mini" {...paperProps(p.id)}><i /><i /><i /></span>
            <span className="name">{p.name}</span>
          </button>
        ))}
      </div>
      <h3 className="sub">Envelope</h3>
      <div className="grid grid-env">
        {ASSETS.envelopes.map((e) => (
          <button key={e.id} className={`pick${state.envelope === e.id ? ' on' : ''}`} type="button" aria-pressed={state.envelope === e.id} onClick={() => update((st) => { st.envelope = e.id; })}>
            <span className="thumb" style={{ backgroundImage: `url("${e.src}")` }} />
            <span className="name">{e.name}</span>
            <span className="check">✓</span>
          </button>
        ))}
      </div>
      <h3 className="sub">Wax seal</h3>
      <div className="swatches">
        {SEALS.map((sl) => (
          <button key={sl.id} className="swatch" type="button" aria-pressed={state.seal === sl.id} onClick={() => update((st) => { st.seal = sl.id; })}>
            <i style={{ background: `radial-gradient(circle at 35% 30%, ${sl.h}, ${sl.c} 55%, ${sl.d})` }} />{sl.name}
          </button>
        ))}
      </div>
    </>
  );
}
