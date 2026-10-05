import { useLayoutEffect, useRef, useState } from 'react';
import { AD_NARROW, AD_WIDE, adsReady, bannerDoc } from '../lib/ads.js';

/* One banner ad. Picks the wide banner where it fits, else the narrow one; on this computer,
   before any banner is set up, it shows a placeholder of the right size instead. */
export default function AdSlot({ className = '' }) {
  const box = useRef(null);
  const [room, setRoom] = useState(0);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setRoom(Math.floor(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const wideFits = AD_WIDE && room >= AD_WIDE.width;
  const unit = wideFits ? AD_WIDE : AD_NARROW && room >= AD_NARROW.width ? AD_NARROW : null;
  const placeholder = !adsReady && (room >= 728 ? { width: 728, height: 90 } : { width: 320, height: 50 });

  return (
    <aside className={`ad-slot ${className}`} ref={box} aria-label="Advertisement">
      <div className="ad-frame">
        <span className="ad-label">Advertisement</span>
        {['tl', 'tr', 'bl', 'br'].map((c) => <Sprig key={c} corner={c} />)}
        <AdContent unit={unit} placeholder={placeholder} />
      </div>
    </aside>
  );
}

// A small floral sprig for the frame's corners (drawn for this site).
const Sprig = ({ corner }) => (
  <svg className={`ad-sprig ad-sprig-${corner}`} viewBox="0 0 40 40" aria-hidden="true">
    <path d="M3 3 C12 4 20 9 26 18" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M10 5 q4 -4 8 -1 q-4 3 -8 1Z M15 9 q5 -3 8 1 q-5 2 -8 -1Z M20 13 q3 -5 8 -3 q-3 4 -8 3Z" fill="currentColor" opacity=".7" />
    <circle cx="27" cy="19" r="2.2" fill="currentColor" />
    <circle cx="5" cy="9" r="1.2" fill="currentColor" opacity=".7" />
  </svg>
);

function AdContent({ unit, placeholder }) {
  return (
    <>
      {unit && (
        <iframe
          key={unit.key} title="Advertisement" srcDoc={bannerDoc(unit)} width={unit.width} height={unit.height}
          loading="lazy" scrolling="no"
          // the ad may run its script and open its link in a new tab, but can't touch this page
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        />
      )}
      {placeholder && (
        <div className="ad-placeholder" style={{ width: placeholder.width, height: placeholder.height }}>
          Ad space {placeholder.width}×{placeholder.height} · add your Adsterra banner in src/config.js
        </div>
      )}
    </>
  );
}
