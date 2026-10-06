import { useEffect, useRef, useState } from 'react';
import config from '../config.js';
import { AFF_TAG } from '../lib/affiliate.js';
import { showDonate, showIdeas } from '../lib/donate.js';
import PixelCat from './PixelCat.jsx';

const CREATOR = config.creator || {};
const initials = String(CREATOR.initials || '').trim().slice(0, 4);

// Clicking the monogram pops up a little cat that blows a kiss.
function Monogram() {
  const [shown, setShown] = useState(0); // 0 = hidden; each click counts up, so the kiss replays
  const wrap = useRef(null);
  useEffect(() => {
    if (!shown) return undefined;
    const t = setTimeout(() => setShown(0), 7000);
    const away = (e) => { if (!wrap.current?.contains(e.target)) setShown(0); };
    const esc = (e) => { if (e.key === 'Escape') setShown(0); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [shown]);
  return (
    <span className="mono-wrap" ref={wrap}>
      <button
        className="monogram" type="button" title={CREATOR.name || initials}
        aria-label={`${CREATOR.name || initials}: say hi`} aria-expanded={!!shown}
        onClick={() => setShown((n) => n + 1)}
      >
        <span aria-hidden="true">{initials}</span>
      </button>
      {shown > 0 && (
        <span className="cat-pop" key={shown} role="status">
          <PixelCat />
          <span className="cat-say">mwah! thanks for visiting&nbsp;♥</span>
          <span className="cat-dedication">dedicated to LJC</span>
        </span>
      )}
    </span>
  );
}

/* The footer on the home page and in the studio (received bouquets stay clean). */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="sf-inner">
        <div className="sf-brand">
          <a className="brand" href="#" aria-label="Fleur and Note home">
            <img className="brand-mark" src="img/logo.png" alt="" width="40" height="48" loading="lazy" />
            <span>Fleur <em>&amp;</em> Note</span>
          </a>
          <p className="sf-tag">Flowers that arrive by letter, and never wilt.</p>
        </div>

        <nav className="sf-links" aria-label="Footer">
          <p className="sf-head">Make</p>
          <a href="#studio/blooms">Begin a bouquet</a>
          <a href="#studio/occasion">Start from an occasion</a>
        </nav>
        <nav className="sf-links" aria-label="More">
          <p className="sf-head">Fleur &amp; Note</p>
          <a href="#">Home</a>
          {showIdeas && <a href="#ideas">Share an idea</a>}
          {showDonate && <a href="#support">Support the studio</a>}
        </nav>

        <div className="sf-promise">
          <p className="sf-head">Private by design</p>
          <p>No accounts and no tracking of your letters. Each bouquet lives in its own private link, and photos are encrypted before they leave your device.</p>
        </div>
      </div>

      <div className="sf-bottom">
        <p>© {year} Fleur &amp; Note</p>
        {initials && (
          <p className="sf-sign">
            Made with <span className="sf-heart" aria-hidden="true">♥</span> by
            <Monogram />
          </p>
        )}
        {AFF_TAG && <p className="sf-fine">As an Amazon Associate, Fleur &amp; Note earns from qualifying purchases.</p>}
      </div>
    </footer>
  );
}
