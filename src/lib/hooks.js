import { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import Music from './music.js';

/* ---------- toast ---------- */
export const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

/* ---------- re-render when the built-in music starts, stops or pauses ---------- */
export function useMusic() {
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(() => Music.onChange(bump), []);
  return { current: Music.current(), paused: Music.isPaused() };
}

/* ---------- the address after the # ---------- */
// Returns [hash, replaceHash]; replaceHash swaps the address without adding a history entry.
export function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const replaceHash = useCallback((h) => {
    history.replaceState(null, '', h);
    setHash(h);
  }, []);
  return [hash, replaceHash];
}

/* ---------- light / dark theme ---------- */
const THEME_KEY = 'petal-post-theme';
export function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('meta-theme')?.setAttribute('content', theme === 'dark' ? '#171214' : '#f5efe7');
  }, [theme]);
  useEffect(() => {
    // follow the device setting live, unless the visitor picked a theme
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = (e) => {
      let saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
      if (!saved) setTheme(e.matches ? 'dark' : 'light');
    };
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);
  const toggle = () => setTheme((t) => {
    const next = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
    return next;
  });
  return [theme, toggle];
}
