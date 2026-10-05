import { useRef, useState } from 'react';
import { SUGGEST_EMAIL, SUGGEST_URL } from '../lib/donate.js';

const CATS = ['Flower', 'Greenery', 'Wrap', 'Add-on', 'Music', 'Feature', 'Other'];

/* The suggestion box: sends to a form service (e.g. Formspree) or opens an email. */
export default function Ideas() {
  const [cat, setCat] = useState('Flower');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState(''); // a hidden field only bots fill in
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const textRef = useRef(null), emailRef = useRef(null);

  const openMail = (idea) => {
    const body = `Category: ${cat}\n\n${idea}${name.trim() ? `\n\n— ${name.trim()}` : ''}`;
    location.href = `mailto:${SUGGEST_EMAIL}?subject=${encodeURIComponent(`Fleur & Note idea: ${cat}`)}&body=${encodeURIComponent(body)}`;
  };
  const finish = () => { setDone(true); setText(''); setName(''); setEmail(''); setStatus(''); };

  const submit = async (e) => {
    e.preventDefault();
    const idea = text.trim();
    if (idea.length < 4) { setStatus('Write a few words about your idea first.'); textRef.current.focus(); return; }
    if (email.trim() && !emailRef.current.checkValidity()) { setStatus('That email doesn’t look right. Leave it empty if you prefer.'); return; }
    if (trap) return;
    if (SUGGEST_URL) {
      setSending(true);
      setStatus('');
      try {
        const res = await fetch(SUGGEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ category: cat, idea, name: name.trim(), email: email.trim(), _subject: `Fleur & Note idea: ${cat}`, page: location.origin }),
        });
        if (!res.ok) throw new Error(String(res.status));
        finish();
      } catch {
        setStatus(SUGGEST_EMAIL ? 'Couldn’t send just now, so your email app will open instead.' : 'Couldn’t send just now. Please try again in a moment.');
        if (SUGGEST_EMAIL) setTimeout(() => openMail(idea), 900);
      } finally {
        setSending(false);
      }
      return;
    }
    if (SUGGEST_EMAIL) { openMail(idea); finish(); return; }
    setStatus('Local preview: add a form endpoint or email in src/config.js → suggest to switch this on.');
  };

  return (
    <section className="ideas" id="ideas">
      <div className="ideas-card">
        <div className="ideas-head">
          <p className="eyebrow">Suggestion box</p>
          <h2>Help the garden grow</h2>
          <p className="support-copy">Which flower, wrap, add-on or song should we add next? Every idea is read.</p>
        </div>
        {!done ? (
          <form className="ideas-form" id="ideas-form" noValidate onSubmit={submit}>
            <div className="ideas-cats" role="radiogroup" aria-label="What is your idea about?">
              {CATS.map((c) => (
                <button key={c} className="chip" type="button" role="radio" aria-checked={c === cat} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
            <label className="field"><span>Your idea</span>
              <textarea ref={textRef} id="idea-text" rows="4" maxLength="1000" placeholder="e.g. Add peonies in coral, or a wrap with gold stars…" required value={text} onChange={(e) => setText(e.target.value)} />
              <small className="count">{text.length} / 1000</small>
            </label>
            <div className="ideas-row">
              <label className="field"><span>Name (optional)</span><input id="idea-name" maxLength="60" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="field"><span>Email (optional, for a reply)</span><input ref={emailRef} id="idea-email" type="email" maxLength="120" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            </div>
            <input className="hp" tabIndex="-1" autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} />
            <button className="btn" type="submit" id="idea-send" disabled={sending}>{sending ? 'Sending…' : 'Send suggestion'}</button>
            <p className="hint" id="idea-status" role="status">{status}</p>
          </form>
        ) : (
          <div className="ideas-thanks" id="ideas-thanks">
            <p className="ideas-bloom" aria-hidden="true">🌷</p>
            <h3>Thank you!</h3>
            <p>Your idea has been planted. Keep an eye out for it in a future bouquet.</p>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => setDone(false)}>Suggest something else</button>
          </div>
        )}
      </div>
    </section>
  );
}
