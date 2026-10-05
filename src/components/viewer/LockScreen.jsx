import { useEffect, useRef, useState } from 'react';
import { readSealedPayload } from '../../lib/link.js';
import { unseal } from '../../lib/crypto.js';

/* Password-locked links: the bouquet only decrypts with the right password. */
export default function LockScreen({ sealed, hint, onUnlock }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const input = useRef(null);

  useEffect(() => { const t = setTimeout(() => input.current?.focus(), 300); return () => clearTimeout(t); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!window.crypto?.subtle) return setError('This page must be opened over https to unlock.');
    setBusy(true);
    setError('');
    try {
      const st = await readSealedPayload(await unseal(sealed, pw));
      if (!st || !st.stems.length) throw new Error('empty');
      onUnlock(st);
    } catch {
      setError('That password doesn’t open this bouquet. Try again.');
      setShake((n) => n + 1);
      input.current?.select();
      setBusy(false);
    }
  };

  return (
    <section className="lock-scene" id="lock-scene">
      <div className={`lock-card${shake ? ' shake' : ''}`} key={shake}>
        <svg className="lock-art" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="56" fill="#f6e7e1" />
          <path d="M42,54 v-10 a18,18 0 0 1 36,0 v10" fill="none" stroke="#8a2a3b" strokeWidth="6" strokeLinecap="round" />
          <rect x="34" y="52" width="52" height="40" rx="9" fill="#b8475c" />
          <circle cx="60" cy="70" r="6" fill="#fbe9e4" /><path d="M60,74 v8" stroke="#fbe9e4" strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="40" r="7" fill="#e9a0b0" /><circle cx="94" cy="34" r="5" fill="#f3c3cd" /><circle cx="82" cy="33" r="5" fill="#f3c3cd" />
        </svg>
        <p className="eyebrow">A sealed bouquet</p>
        <h2>Someone sent you flowers</h2>
        <p className="lock-sub">Enter the password they shared with you to open it.</p>
        {hint && <p className="lock-hint">Hint: {hint.slice(0, 60)}</p>}
        <form className="unlock-form" onSubmit={submit}>
          <input ref={input} id="unlock-pw" type="password" autoComplete="off" placeholder="Password" aria-label="Password" required value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn" type="submit" id="unlock-btn" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock'}</button>
        </form>
        <p className="lock-error" id="unlock-error" role="alert">{error}</p>
      </div>
    </section>
  );
}
