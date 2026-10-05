import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useMusic } from '../../lib/hooks.js';
import Music from '../../lib/music.js';
import { mountYT, ytWatchUrl } from '../../lib/youtube.js';
import YTFallback from '../YTFallback.jsx';

/* The spinning record in the corner: plays a built-in piece or the sender's YouTube song.
   ref.start() / ref.stop() are called by the page when the seal is broken / the envelope resets. */
export default function MusicCard({ st, ref }) {
  const { current, paused } = useMusic();
  const host = useRef(null);
  const player = useRef(null);
  const [ytReady, setYtReady] = useState(false);
  const [ytState, setYtState] = useState(-1);
  const [failed, setFailed] = useState(null); // { why, code }
  const [tries, setTries] = useState(0);
  const [title, setTitle] = useState(st.yt?.title || '');
  const [started, setStarted] = useState(false);
  const wantPlay = useRef(false);
  // small screens start with just the record, so the card never covers the letter or buttons
  const [mini, setMini] = useState(() => matchMedia('(max-width: 900px)').matches);

  // the YouTube player is prepared as soon as the page opens, so it can start the moment the seal breaks
  useEffect(() => {
    if (!st.yt || failed) return undefined;
    const p = mountYT(host.current, st.yt, {
      onReady: (e) => {
        setYtReady(true);
        if (!st.yt.title) setTitle((e.target.getVideoData?.().title || '').slice(0, 100));
        if (wantPlay.current) e.target.playVideo();
      },
      onStateChange: (e) => setYtState(e.data),
      onFail: (why, code) => { setYtReady(false); setFailed({ why, code }); },
    });
    player.current = p;
    return () => p.destroy();
  }, [st, tries, failed]); // eslint-disable-line react-hooks/exhaustive-deps
  const retry = () => {
    wantPlay.current = true; // they asked for it, so play as soon as it's ready
    setStarted(true);
    setFailed(null);
    setTries((t) => t + 1);
  };
  useEffect(() => () => Music.stop(), []);

  useImperativeHandle(ref, () => ({
    start() {
      if (st.yt) {
        wantPlay.current = true;
        setStarted(true);
        if (ytReady) player.current.player.playVideo();
      } else if (st.music) {
        Music.play(st.music);
      }
    },
    stop() {
      Music.stop();
      wantPlay.current = false;
      setStarted(false);
      if (ytReady) { try { player.current.player.pauseVideo(); player.current.player.seekTo(st.yt?.start || 0, true); } catch { /* ignore */ } }
    },
  }), [st, ytReady]);

  const yt = !!st.yt;
  const show = yt ? started : !!current;
  const playing = yt ? !failed && (ytState === 1 || ytState === 3) : !!current && !paused;
  const name = yt ? title || 'A song for you' : Music.TRACKS.find((t) => t.id === (current || st.music))?.name || '';

  const tap = () => {
    if (yt) {
      if (failed) return window.open(ytWatchUrl(st.yt), '_blank', 'noopener');
      if (!ytReady) return;
      if (playing) player.current.player.pauseVideo(); else player.current.player.playVideo();
      return;
    }
    if (current) Music.togglePause(); else if (st.music) Music.play(st.music);
  };

  return (
    <div className={`music-card${mini ? ' mini' : ''}${show ? ' show' : ''}${playing ? ' playing' : ''}${yt ? ' is-yt' : ''}${failed ? ' yt-failed' : ''}`} aria-live="polite">
      <button className="mc-disk" type="button" onClick={tap} aria-label={yt && failed ? `Listen to ${name} on YouTube` : `${playing ? 'Pause' : 'Play'} ${name}`}>
        <span className="vinyl" aria-hidden="true"><span className="vinyl-label" /></span>
        <span className="tonearm" aria-hidden="true" />
      </button>
      <div className="mc-info">
        <small>{yt && failed ? 'A song for you' : playing ? 'Now playing' : 'Paused · tap the record'}</small>
        <b>{name}</b>
      </div>
      <button className="mc-toggle" type="button" onClick={() => setMini((m) => !m)} aria-label={mini ? 'Show the music player' : 'Make the music player smaller'} aria-expanded={!mini}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{mini ? <path d="M8 14l4-4 4 4" /> : <path d="M8 10l4 4 4-4" />}</svg>
      </button>
      <div className="mc-yt">{failed ? <YTFallback yt={st.yt} failure={failed} onRetry={retry} /> : <div ref={host} />}</div>
    </div>
  );
}
