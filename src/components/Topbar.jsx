import { useEffect, useRef, useState } from 'react';
import { showDonate, showIdeas } from '../lib/donate.js';

export default function Topbar({ theme, onToggleTheme }) {
  const dark = theme === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const [heartPops, setHeartPops] = useState(0);
  const ref = useRef(null);

  // The phone menu closes on navigation, Escape, or a tap anywhere outside the bar.
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onDown = (e) => { if (!ref.current?.contains(e.target)) close(); };
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('hashchange', close);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menuOpen]);

  return (
    <header className="topbar" ref={ref}>
      <a className="brand" href="#" aria-label="Fleur and Note home">
        <img className="brand-mark" src="img/logo.png" alt="" width="40" height="48" />
        <span>Fleur <em>&amp;</em> Note</span>
      </a>
      <nav className="topnav">
        <div className="navlinks" id="site-menu" data-open={menuOpen} onClick={(e) => { if (e.target.closest('a')) setMenuOpen(false); }}>
          <a href="#" className="navlink">Home</a>
          <a href="#studio/occasion" className="navlink">Occasions</a>
          {showDonate && (
            <a href="#support" className="navlink nav-support" onClick={() => setHeartPops((n) => n + 1)}>
              Support us
              {/* keyed so every click remounts it and replays the hop */}
              <span className={heartPops ? 'nav-heart pop' : 'nav-heart'} key={heartPops} aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>
              </span>
            </a>
          )}
          {showIdeas && <a href="#ideas" className="navlink">Suggestions</a>}
          {/* phones only: the call to action moves into the menu */}
          <a href="#studio/blooms" className="btn nav-cta nav-cta-menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tie a bouquet
          </a>
        </div>
        <button
          className="theme-toggle"
          id="theme-toggle"
          type="button"
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          title="Switch theme"
          onClick={onToggleTheme}
        >
          <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </svg>
          <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            <path d="M17 3.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" />
          </svg>
        </button>
        <a href="#studio/blooms" className="btn btn-small nav-cta nav-cta-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tie a bouquet
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </nav>
    </header>
  );
}
