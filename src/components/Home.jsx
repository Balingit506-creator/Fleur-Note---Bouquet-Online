import { useEffect, useMemo } from 'react';
import { findAddon } from '../lib/assets.js';
import { applyOccasionTo, freshState } from '../lib/bouquet.js';
import { OCCASIONS } from '../lib/constants.js';
import { showDonate, showIdeas } from '../lib/donate.js';
import Bouquet from './Bouquet.jsx';
import { showShelf } from '../lib/affiliate.js';
import Donate from './Donate.jsx';
import GiftShelf from './GiftShelf.jsx';
import AdSlot from './AdSlot.jsx';
import { showAds } from '../lib/ads.js';
import Ideas from './Ideas.jsx';

export default function Home({ anchor }) {
  const demo = useMemo(() => {
    const st = applyOccasionTo(freshState(), OCCASIONS[0], 20240214);
    st.addons = st.addons.filter((id) => !/fluffy_heart/.test(id)); // the hero shows the teddy only
    // no photos on the hero, so the teddy can sit low beside the wrap instead of over the flowers
    const teddy = findAddon('teddy');
    if (teddy) st.addonPos = { ...st.addonPos, [teddy.id]: { x: 118, y: 640 } };
    return st;
  }, []);

  useEffect(() => {
    if (anchor) requestAnimationFrame(() => document.querySelector(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [anchor]);

  return (
    <main className="view view-home" id="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A florist&apos;s studio, online</p>
          <h1>Flowers that arrive <em>by letter,</em> and never wilt.</h1>
          <p className="lede">Hand-tie a bouquet stem by stem, wrap it in fine paper, seal a letter in wax, and send it as a private link. No account, no checkout, just a gesture.</p>
          <div className="hero-actions">
            <a href="#studio/blooms" className="btn btn-begin">
              <span>Begin a bouquet</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </a>
            <a href="#studio/occasion" className="btn btn-ghost">Start from an occasion</a>
          </div>
          <ol className="how">
            <li><span>i.</span><strong>Compose</strong> blooms, greenery and wrap</li>
            <li><span>ii.</span><strong>Write</strong> a letter, sealed in wax</li>
            <li><span>iii.</span><strong>Send</strong> one link that opens like an envelope</li>
          </ol>
        </div>
        <div className="hero-art">
          <div className="hero-halo" />
          <Bouquet st={demo} animate id="hero-bouquet" />
        </div>
      </section>

      {showShelf && <GiftShelf />}

      {showAds && <div className="ad-row"><AdSlot /></div>}

      {showDonate && (
        <section className="support" id="support">
          <div className="support-card">
            <div className="support-art" aria-hidden="true">
              <span className="sa-halo" />
              <img className="sa-emoji" src="img/support-emoji.webp?v=2" alt="" width="347" height="360" loading="lazy" />
              <span className="sa-heart h1">♥</span><span className="sa-heart h2">♥</span><span className="sa-heart h3">♥</span>
            </div>
            <div className="support-body">
              <p className="eyebrow">Support Fleur &amp; Note</p>
              <h2>Keep the flowers free</h2>
              <p className="support-copy">No accounts, no checkout, and never an ad inside the gifts you send. If a bouquet made someone smile, a small gift helps keep it that way.</p>
              <Donate />
            </div>
          </div>
        </section>
      )}

      {showIdeas && <Ideas />}
    </main>
  );
}
