import { useRef, useState } from 'react';
import { DONATE_AMOUNTS, DONATE_CUR, donateMethods, money } from '../lib/donate.js';
import { useToast } from '../lib/hooks.js';
import { copyText } from '../lib/util.js';

const ICONS = {
  wallet: <><path d="M4 8h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1z" /><path d="M4 8l12-4v4" /><circle cx="16.5" cy="14" r="1.3" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  cup: <><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 1.5 1 1.5 1 3M11 3c0 1.5 1 1.5 1 3" /></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4M11.5 18h1" /></>,
  bank: <path d="M3 9l9-5 9 5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>
);
const NOT_SET_UP = ['PayPal', 'Credit or debit card', 'Ko-fi', 'Buy Me a Coffee', 'GCash / Maya', 'Bank transfer'];

/* Pick an amount → "Donate" → the "choose how to give" window. */
export default function Donate() {
  const [chosen, setChosen] = useState(DONATE_AMOUNTS[Math.min(1, DONATE_AMOUNTS.length - 1)] || 0);
  const [custom, setCustom] = useState('');
  const dialog = useRef(null);
  const [detail, setDetail] = useState(null); // a wallet/bank method being shown
  const ways = donateMethods(0).map((m) => m.name);

  const open = () => { setDetail(null); dialog.current.showModal(); };
  return (
    <div className="donate">
      <div className="donate-amounts">
        {DONATE_AMOUNTS.map((n) => (
          <button key={n} className="chip" type="button" aria-pressed={!custom && n === chosen} onClick={() => { setChosen(n); setCustom(''); }}>
            {money(n)}
          </button>
        ))}
        <input
          className="donate-custom" type="number" min="1" step="1" inputMode="decimal" placeholder="Other"
          aria-label={`Other amount in ${DONATE_CUR}`} value={custom}
          onChange={(e) => { setCustom(e.target.value); setChosen(+e.target.value || 0); }}
        />
      </div>
      <button className="btn btn-donate" type="button" onClick={open}>
        <Icon name="heart" /><span>{chosen > 0 ? `Donate ${money(chosen)}` : 'Donate'}</span>
      </button>
      <p className="hint">{ways.length ? `Next, choose how to give: ${ways.join(', ')}.` : 'Next, choose how to give.'}</p>
      <DonateDialog dialogRef={dialog} amount={chosen} detail={detail} setDetail={setDetail} />
    </div>
  );
}

function DonateDialog({ dialogRef, amount, detail, setDetail }) {
  const toast = useToast();
  const amtText = amount > 0 ? money(amount) : '';
  const methods = donateMethods(amount);
  const close = () => dialogRef.current.close();
  const copy = async (value, label) => { await copyText(value.replace(/\s+/g, '')); toast(`${label} copied.`); };
  const Row = ({ label, value }) => value ? (
    <div className="dd-row"><span>{label}</span><b>{value}</b><button className="chip" type="button" onClick={() => copy(value, label)}>Copy</button></div>
  ) : null;

  let body;
  if (detail) {
    const d = detail.wallet || detail.bank;
    body = (
      <>
        <button className="linkish dd-back" type="button" onClick={() => setDetail(null)}>‹ All ways to give</button>
        <header className="dd-head"><p className="eyebrow">{detail.name}</p><h2>{amtText ? `Send ${amtText}` : 'Send any amount'}</h2></header>
        <div className="dd-details">
          {detail.wallet ? (
            <>
              {d.qr && <img className="dd-qr" src={d.qr} alt={`${d.name} QR code`} />}
              <Row label="Account name" value={d.accountName} />
              <Row label={`${d.name} number`} value={d.number} />
            </>
          ) : (
            <>
              <Row label="Bank" value={d.bank} />
              <Row label="Account name" value={d.accountName} />
              <Row label="Account number" value={d.accountNumber} />
              {d.note && <p className="hint">{d.note}</p>}
            </>
          )}
        </div>
        <p className="hint">Thank you! Every gift keeps the flowers free.</p>
      </>
    );
  } else {
    body = (
      <>
        <header className="dd-head">
          <p className="eyebrow">Thank you</p>
          <h2 id="donate-title">{amtText ? `Choose how to give ${amtText}` : 'Choose how to give'}</h2>
        </header>
        <div className="dd-list">
          {methods.length ? methods.map((m) => (
            <button
              key={m.name} className="dd-method" type="button"
              onClick={() => {
                if (m.url) { window.open(m.url, '_blank', 'noopener'); close(); toast('Opened in a new tab. Thank you!'); } else setDetail(m);
              }}
            >
              <span className="dd-icon"><Icon name={m.icon} /></span>
              <span className="dd-text"><b>{m.name}</b><small>{m.sub}</small></span>
              <span className="dd-go">{m.url ? '↗' : '›'}</span>
            </button>
          )) : NOT_SET_UP.map((n) => (
            <div key={n} className="dd-method is-off">
              <span className="dd-icon"><Icon name="heart" /></span>
              <span className="dd-text"><b>{n}</b><small>Not set up yet</small></span>
            </div>
          ))}
        </div>
        {methods.length ? (
          <p className="hint">{amtText && methods.some((m) => !m.url || /paypal/.test(m.url)) ? 'PayPal opens with the amount filled in. For other methods, please enter the amount there.' : 'You finish on the provider’s own secure page.'}</p>
        ) : (
          <p className="fineprint">Local preview: fill in your payment details in src/config.js → donate to switch these on. Until then the support section is hidden on the live site.</p>
        )}
      </>
    );
  }

  return (
    <dialog className="donate-dialog" ref={dialogRef} aria-labelledby="donate-title" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <button className="dd-close" type="button" aria-label="Close" onClick={close}>×</button>
      {body}
    </dialog>
  );
}
