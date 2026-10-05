import { showDonate, showIdeas } from '../lib/donate.js';

export default function Topbar({ theme, onToggleTheme }) {
  const dark = theme === 'dark';
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="Fleur and Note home">
        <img className="brand-mark" src="img/logo.png" alt="" width="40" height="48" />
        <span>Fleur <em>&amp;</em> Note</span>
      </a>
      <nav className="topnav">
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
        <a href="#" className="navlink">Home</a>
        {showIdeas && <a href="#ideas" className="navlink">Ideas</a>}
        {showDonate && <a href="#support" className="btn btn-small">Support</a>}
      </nav>
    </header>
  );
}
