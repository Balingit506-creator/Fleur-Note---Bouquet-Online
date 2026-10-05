import { useId } from 'react';
import { ASSETS, flowerLabel } from '../lib/assets.js';
import { describe, layoutAddons, layoutGreenery, layoutStems, ribbonMarkup, sprigTransform, stemPath } from '../lib/bouquet.js';
import { GREEN_FADE } from '../lib/constants.js';
import { byId } from '../lib/util.js';

const s1 = (n) => n.toFixed(1);

/* A bouquet drawn from its state in a 600×760 SVG.
   animate: play the blooming entrance; fresh: index of a just-added stem (pops in);
   dragging: { kind: 'bloom', i } | { kind: 'addon', id } while one is being moved. */
export default function Bouquet({ st, animate = false, fresh = null, dragging = null, svgRef, ...rest }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wrap = byId(ASSETS.wraps, st.wrap);
  const blooms = layoutStems(st);
  const sprigs = layoutGreenery(st);
  const addons = layoutAddons(st);
  const img = (src, x, y, w, h, { key, ...props } = {}) => (
    <image key={key} href={src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" {...props} />
  );
  const addonLayer = (which) => addons.filter((a) => a.layer === which).map((a) => img(a.a.src, a.x, a.y, a.w, a.h, {
    key: a.a.id,
    className: `addon${dragging?.kind === 'addon' && dragging.id === a.a.id ? ' dragging' : ''}`,
    'data-aid': a.a.id,
    style: { '--d': `${(0.9 + blooms.length * 0.07 + a.k * 0.15).toFixed(2)}s` },
  }));
  const front = <g className="l-front">{wrap?.front && img(wrap.front, 0, 0, 600, 760)}</g>;
  const [fade0, fade1] = wrap?.greeneryFade || GREEN_FADE;

  return (
    <svg
      ref={svgRef}
      className={`bouquet-svg${animate ? ' animate' : ''}${blooms.length ? '' : ' is-empty'}`}
      viewBox="0 0 600 760"
      role="img"
      aria-label={`Bouquet: ${describe(st)}`}
      {...rest}
    >
      <defs>
        <filter id={`${id}-sh`} x="-25%" y="-25%" width="150%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3c1e14" floodOpacity=".28" />
        </filter>
        <radialGradient id={`${id}-gr`}>
          <stop offset="0" stopColor="#5a3a28" stopOpacity=".22" />
          <stop offset="1" stopColor="#5a3a28" stopOpacity="0" />
        </radialGradient>
        {wrap?.back && (
          // Keep foliage inside the paper: below the wrap's rim greenery only shows where the wrap is;
          // above the rim it may spill over freely, fading out between the two fade lines.
          <mask id={`${id}-gm`} maskUnits="userSpaceOnUse" x="-200" y="-200" width="1000" height="1160" style={{ maskType: 'alpha' }}>
            <linearGradient id={`${id}-gf`} gradientUnits="userSpaceOnUse" x1="0" y1={fade0} x2="0" y2={fade1}>
              <stop offset="0" stopColor="#000" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </linearGradient>
            <rect x="-200" y="-200" width="1000" height="1160" fill={`url(#${id}-gf)`} />
            {img(wrap.back, 0, 0, 600, 760)}
          </mask>
        )}
      </defs>
      <ellipse cx="300" cy="748" rx="170" ry="16" fill={`url(#${id}-gr)`} />

      <g className="l-back">{wrap?.back && img(wrap.back, 0, 0, 600, 760)}</g>
      <g className="l-addon-back">{addonLayer('back')}</g>

      <g className="l-green" mask={wrap?.back ? `url(#${id}-gm)` : undefined}>
        {sprigs.map((sp) => (
          <g key={`${sp.g.id}-${sp.k}`} transform={sprigTransform(sp)}>
            {img(sp.g.src, sp.x, sp.y, sp.w, sp.h, { className: 'sprig', style: { '--d': `${(0.15 + sp.k * 0.06).toFixed(2)}s` } })}
          </g>
        ))}
      </g>

      <g className="l-stems">
        {blooms.map((b) => (
          <path key={b.i} className="stem" data-i={b.i} d={stemPath(b.x, b.y)} fill="none" stroke="#5f7a4a" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        ))}
      </g>

      {/* Most wraps sit under the blooms so flower heads overlap the paper edge; wraps with
          frontOnTop (the satin wrap with its own bow) cover the lowest blooms instead. */}
      {!wrap?.frontOnTop && front}

      <g className="l-flowers" filter={`url(#${id}-sh)`}>
        {blooms.map((b, k) => (
          <g
            key={b.i}
            className={`bloom-pos${dragging?.kind === 'bloom' && dragging.i === b.i ? ' dragging' : ''}`}
            data-i={b.i}
            data-x={b.x}
            data-y={b.y}
            data-rot={s1(b.rot)}
            transform={`translate(${s1(b.x)} ${s1(b.y)}) rotate(${s1(b.rot)})`}
          >
            <g className={`bloom${fresh === b.i ? ' pop' : ''}`} style={{ '--d': `${(0.55 + k * 0.07).toFixed(2)}s` }}>
              <title>{flowerLabel(b.f)}</title>
              {img(b.f.src, -b.size / 2, -b.size / 2, b.size, b.size)}
            </g>
          </g>
        ))}
      </g>

      {wrap?.frontOnTop && front}

      {wrap?.ribbon !== false && ( // wraps with a bow of their own skip the drawn ribbon
        <g
          className="l-ribbon"
          style={{ '--d': `${(0.6 + blooms.length * 0.07).toFixed(2)}s` }}
          dangerouslySetInnerHTML={{ __html: ribbonMarkup(st.ribbon, `${id}-rb`, wrap) }}
        />
      )}
      <g className="l-addon-top">{addonLayer('top')}</g>
    </svg>
  );
}
