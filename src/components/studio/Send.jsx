import { useEffect, useState } from 'react';
import { ASSETS } from '../../lib/assets.js';
import { describe } from '../../lib/bouquet.js';
import { FONTS, FRAMES, LONG_LINK, RIBBONS, SEALS, paperOf } from '../../lib/constants.js';
import { estimateLinkSize, lockReady, makeLink } from '../../lib/crypto.js';
import { showDonate } from '../../lib/donate.js';
import { useToast } from '../../lib/hooks.js';
import Music from '../../lib/music.js';
import { exportPNG, recordClip } from '../../lib/render.js';
import { byId, copyText } from '../../lib/util.js';
import Donate from '../Donate.jsx';
import QrDialog from './QrDialog.jsx';

/* ---------- 7. send ---------- */
export default function Send({ state, lock, setLock, onStartOver }) {
  const toast = useToast();
  const [showPw, setShowPw] = useState(false);
  const ready = state.stems.length > 0;
  const wrap = byId(ASSETS.wraps, state.wrap);
  const n = state.photos.length;

  const rows = [
    ['For', state.card.to || '—'],
    ['Blooms', ready ? describe(state) : 'None yet'],
    ['Greenery', state.greenery.map((id) => byId(ASSETS.greenery, id)?.name).filter(Boolean).join(', ') || 'None'],
    ['Wrap', [wrap?.name, wrap?.ribbon === false ? 'satin bow' : `${byId(RIBBONS, state.ribbon).name} ribbon`].filter(Boolean).join(' · ')],
    ['Add-ons', state.addons.map((id) => byId(ASSETS.addons, id)?.name).filter(Boolean).join(', ') || 'None'],
    ['Letter', `${state.card.msg ? `${state.card.msg.length} characters, ${byId(FONTS, state.card.font).name.toLowerCase()}` : 'No message yet'} · ${paperOf(state.card.paper).name}`],
    ['Envelope', [byId(ASSETS.envelopes, state.envelope)?.name, `${byId(SEALS, state.seal).name} seal`].filter(Boolean).join(' · ')],
    ['Photos', n ? `${n} photo${n > 1 ? 's' : ''} · ${byId(FRAMES, state.photoFrame).name} frame` : 'None'],
    ['Music', state.yt ? `YouTube · ${state.yt.title || 'your song'}` : Music.TRACKS.find((t) => t.id === state.music)?.name || 'None'],
    ['From', state.card.from || '—'],
    ['Password', lock.on ? (lock.pw.length >= 4 ? `On${lock.hint.trim() ? ` · hint “${lock.hint.trim()}”` : ''}` : 'On, choose a password') : 'Off'],
  ];
  const [size, setSize] = useState(0);
  useEffect(() => {
    if (!ready) return setSize(0);
    let live = true;
    const t = setTimeout(() => estimateLinkSize(state, lock).then((n) => live && setSize(n)), 150);
    return () => { live = false; clearTimeout(t); };
  }, [state, lock, ready]);

  const guard = () => {
    if (!ready) { toast('Add a few stems first.'); return false; }
    if (!lockReady(lock)) { toast('Choose a password of at least 4 characters, or switch the lock off.'); return false; }
    return true;
  };
  const copy = async () => {
    if (!guard()) return;
    let link;
    try { link = await makeLink(state, lock); } catch (err) { return toast(err.message); }
    await copyText(link);
    toast('Private link copied. Paste it anywhere to send.');
  };
  const preview = async () => {
    if (!guard()) return;
    const win = window.open('', '_blank'); // open now so the browser doesn't block it as a pop-up
    try {
      const link = await makeLink(state, lock);
      if (win) { win.opener = null; win.location.href = link; } else window.open(link, '_blank', 'noopener');
    } catch (err) { win?.close(); toast(err.message); }
  };
  const [qrLink, setQrLink] = useState(null);
  const showQr = async () => {
    if (!guard()) return;
    try { setQrLink(await makeLink(state, lock)); } catch (err) { toast(err.message); }
  };
  const setLockField = (k) => (e) => { const v = k === 'on' ? e.target.checked : e.target.value; setLock((l) => ({ ...l, [k]: v })); };

  return (
    <>
      <header className="panel-head">
        <p className="eyebrow">Final step</p>
        <h2>Ready to send</h2>
        <p>Everything lives inside the link itself, so nothing is stored anywhere.</p>
      </header>
      <dl className="summary">
        {rows.map(([k, v]) => [<dt key={`${k}-t`}>{k}</dt>, <dd key={`${k}-d`}>{v}</dd>])}
      </dl>

      <div className="lock-box">
        <label className="switch">
          <input type="checkbox" checked={lock.on} onChange={setLockField('on')} />
          <span className="switch-ui" aria-hidden="true" />
          <span className="switch-text"><b>Lock with a password</b><small>Only people you share the password with can open it.</small></span>
        </label>
        {lock.on && (
          <div className="lock-fields">
            <label className="field"><span>Password</span>
              <span className="pw-wrap">
                <input type={showPw ? 'text' : 'password'} maxLength="64" autoComplete="new-password" placeholder="At least 4 characters" autoFocus value={lock.pw} onChange={setLockField('pw')} />
                <button type="button" className="pw-eye" onClick={() => setShowPw((s) => !s)}>{showPw ? 'Hide' : 'Show'}</button>
              </span>
            </label>
            <label className="field"><span>Hint (optional)</span><input maxLength="60" placeholder="e.g. Where we first met" autoComplete="off" value={lock.hint} onChange={setLockField('hint')} /></label>
            <p className="hint">The bouquet is encrypted inside the link, so nobody can open it without the password, and it can&apos;t be recovered if forgotten. Send the password separately from the link.</p>
          </div>
        )}
      </div>

      {ready && size > 0 && (
        <p className={`hint${size > LONG_LINK ? ' warn' : ''}`}>
          {size > LONG_LINK
            ? `Link size: ${Math.round(size / 1024)} KB. That is long: it works in browsers and email, but some chat apps may cut it off. Fewer photos keep it short.`
            : `Link size: ${Math.max(1, Math.round(size / 1024))} KB`}
        </p>
      )}
      <div className="send-actions">
        <button className="btn" type="button" disabled={!ready} onClick={copy}>Copy private link</button>
        <button className="btn btn-ghost" type="button" disabled={!ready} onClick={showQr}>Show QR code</button>
        <button className="btn btn-ghost" type="button" disabled={!ready} onClick={preview}>Preview as recipient</button>
        <button className="btn btn-ghost" type="button" disabled={!ready} onClick={() => exportPNG(state, toast)}>Download as picture</button>
        <button className="btn btn-ghost" type="button" onClick={() => recordClip(state, toast)}>Download video keepsake</button>
      </div>
      {location.protocol === 'file:' && (
        <p className="fineprint">You opened this file directly from disk, so links only work on this computer. Run <code>npm run dev</code> (or host the built site) to share links and download images.</p>
      )}
      {showDonate && (
        <div className="donate-mini">
          <p><strong>Enjoyed making this?</strong> Fleur &amp; Note is free, and the bouquets you send never carry ads. A small gift keeps it blooming.</p>
          <Donate />
        </div>
      )}
      {qrLink && <QrDialog link={qrLink} to={state.card.to} onClose={() => setQrLink(null)} />}
      <button
        className="linkish" type="button" id="btn-new"
        onClick={() => { if (confirm('Start over with an empty bouquet? Your current draft will be cleared.')) onStartOver(); }}
      >
        Start a new bouquet
      </button>
    </>
  );
}
