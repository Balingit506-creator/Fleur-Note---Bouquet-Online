import { useEffect, useRef, useState } from 'react';
import { CLOUD, MAX_PHOTOS } from '../../lib/bouquet.js';
import { FRAMES } from '../../lib/constants.js';
import { useMusic, useToast } from '../../lib/hooks.js';
import Music from '../../lib/music.js';
import { preparePhoto } from '../../lib/photos.js';
import { fmtTime, mountYT, parseYouTube } from '../../lib/youtube.js';
import YTFallback from '../YTFallback.jsx';

/* ---------- 6. photos & music ---------- */
export default function Extras({ state, update }) {
  return (
    <>
      <header className="panel-head">
        <p className="eyebrow">Step six</p>
        <h2>Photos &amp; music</h2>
        <p>Tuck a few photos in with the letter, and choose a piece to play as the envelope opens.</p>
      </header>
      <Photos state={state} update={update} />
      <Music_ state={state} update={update} />
    </>
  );
}

function Photos({ state, update }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addPhotos = async (files) => {
    const room = MAX_PHOTOS - state.photos.length;
    if (room <= 0) return toast(`Up to ${MAX_PHOTOS} photos per bouquet.`);
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return toast('Choose an image file (JPG, PNG or WebP).');
    if (list.length > room) toast(`Only ${room} more photo${room > 1 ? 's' : ''} fit, so the rest were skipped.`);
    setBusy(true);
    for (const file of list.slice(0, room)) {
      try {
        const src = await preparePhoto(file);
        update((st) => { if (st.photos.length < MAX_PHOTOS) st.photos.push({ src, cap: '' }); });
      } catch (err) {
        console.warn(err);
        toast(CLOUD ? `"${file.name}" could not be uploaded.` : `"${file.name}" could not be read. Try a JPG or PNG.`);
      }
    }
    setBusy(false);
  };

  return (
    <>
      <h3 className="sub">Photos</h3>
      <div
        className={`photos${busy ? ' busy' : ''}${dragOver ? ' drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addPhotos(e.dataTransfer.files); }}
      >
        {state.photos.map((p, i) => (
          <figure key={i} className="photo pf" data-frame={state.photoFrame}>
            <i className="pf-deco" aria-hidden="true" />
            <img src={p.src} alt={p.cap || `Photo ${i + 1}`} />
            <input
              className="cap" maxLength="60" placeholder="Caption (optional)" aria-label={`Caption for photo ${i + 1}`} value={p.cap}
              onChange={(e) => { const v = e.target.value; update((st) => { st.photos[i].cap = v; }); }}
            />
            <button className="photo-x" type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => update((st) => { st.photos.splice(i, 1); })}>×</button>
          </figure>
        ))}
        {state.photos.length < MAX_PHOTOS && (
          <label className="photo-add">
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
            <span className="plus-mark">+</span><span>Add photos</span><small>or drop them here</small>
          </label>
        )}
      </div>
      <p className="hint">
        {CLOUD
          ? `Up to ${MAX_PHOTOS} photos, uploaded to your photo storage at full quality.`
          : `Up to ${MAX_PHOTOS} photos. They travel inside the link itself, so they are resized to keep it short.`}
      </p>
      <h3 className="sub">Photo frame</h3>
      <div className="frames">
        {FRAMES.map((f) => (
          <button key={f.id} className="frame-pick" type="button" aria-pressed={state.photoFrame === f.id} onClick={() => update((st) => { st.photoFrame = f.id; })}>
            <span className="pf frame-mini" data-frame={f.id}><i className="pf-deco" /><span className="fm-photo" /></span>
            <span className="name">{f.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const TRACKS = [{ id: null, name: 'No music', mood: 'Let the letter speak for itself' }, ...Music.TRACKS];

function Music_({ state, update }) {
  const toast = useToast();
  const { current } = useMusic();
  const [url, setUrl] = useState('');

  const pickTrack = (id) => {
    update((st) => { st.music = id; st.yt = null; }); // a built-in piece replaces a YouTube song
    if (id) Music.play(id); else Music.stop();
  };
  const useSong = (e) => {
    e.preventDefault();
    const yt = parseYouTube(url);
    if (!yt) return toast('That doesn’t look like a YouTube link. Copy it from the Share button on YouTube.');
    setUrl('');
    Music.stop();
    update((st) => { st.yt = yt; st.music = null; });
    toast('Song added. Press play on the preview to check it.');
  };

  return (
    <>
      <h3 className="sub">Background music</h3>
      <div className="tracks">
        {TRACKS.map((tr) => (
          <div key={tr.id || 'none'} className={`track${tr.id && current === tr.id ? ' playing' : ''}`}>
            <button className="track-main" type="button" aria-pressed={!state.yt && tr.id === state.music} onClick={() => pickTrack(tr.id)}>
              <span className="track-name">{tr.name}</span><span className="track-mood">{tr.mood}</span>
            </button>
            {tr.id && (
              <button className="track-play" type="button" aria-label={`Preview ${tr.name}`} onClick={() => (current === tr.id ? Music.stop() : Music.play(tr.id))}>
                <span className="eq" aria-hidden="true"><i /><i /><i /></span>
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="hint">Original pieces, composed for Fleur &amp; Note and played live in the browser. Music starts when the seal is broken.</p>
      <h3 className="sub">Or a song from YouTube</h3>
      <form className="yt-form" onSubmit={useSong}>
        <input type="url" inputMode="url" placeholder="Paste a YouTube link" aria-label="YouTube link" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-small" type="submit">Use song</button>
      </form>
      {state.yt && <YTPreview key={`${state.yt.id}@${state.yt.start}`} yt={state.yt} update={update} />}
      <p className="hint">Links with a start time (like <code>?t=45</code>) begin there. The recipient sees a small player with the song.</p>
    </>
  );
}

function YTPreview({ yt, update }) {
  const toast = useToast();
  const host = useRef(null);
  const [failed, setFailed] = useState(null); // { why, code }
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (failed) return undefined;
    const player = mountYT(host.current, yt, {
      onReady: (e) => {
        const title = (e.target.getVideoData?.().title || '').slice(0, 100);
        if (title) update((st) => { if (st.yt?.id === yt.id) st.yt.title = title; });
      },
      onFail: (why, code) => {
        setFailed({ why, code });
        if (why === 'owner') toast('This song can’t play inside the page. The recipient gets a “Listen on YouTube” button instead.');
      },
    });
    return () => player.destroy();
  }, [yt.id, yt.start, tries, failed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="yt-preview">
      <div className="yt-frame">
        {failed ? <YTFallback yt={yt} failure={failed} onRetry={() => { setFailed(null); setTries((t) => t + 1); }} /> : <div ref={host} />}
      </div>
      <div className="yt-meta">
        <b>{yt.title || (failed ? 'Your YouTube song' : 'Loading…')}</b>
        <small>{yt.start ? `Starts at ${fmtTime(yt.start)}` : ''}</small>
        <button className="linkish" type="button" onClick={() => update((st) => { st.yt = null; })}>Remove song</button>
      </div>
    </div>
  );
}
