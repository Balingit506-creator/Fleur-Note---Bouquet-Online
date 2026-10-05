import { AFF_PRODUCTS, AFF_TAG } from '../lib/affiliate.js';

// Simple line drawings (Amazon's rules don't allow copying its product photos).
const ICONS = {
  rose: <><path d="M12 13c-3.2 0-5-2.2-5-5 2 .3 3.2 1 4 2-.2-2.4.6-4.3 2-5.5 1.4 1.2 2.2 3.1 2 5.5.8-1 2-1.7 4-2 0 2.8-1.8 5-5 5z" /><path d="M12 13v8M12 17c-2-.2-3.4-1.2-4-3M12 18.5c1.8-.2 3-1 3.6-2.6" /></>,
  dome: <><path d="M7 20V10a5 5 0 0 1 10 0v10" /><path d="M5 20h14M8.5 22h7" /><path d="M12 11.5c-1.4 0-2.3-1-2.3-2.3.9.1 1.5.4 1.9.9 0-1.1.3-2 1-2.5.6.6.9 1.4.8 2.5.4-.5 1-.8 1.9-.9 0 1.3-.9 2.3-2.3 2.3z" /><path d="M12 11.5v5" /></>,
  teddy: <><circle cx="7.5" cy="6.5" r="2" /><circle cx="16.5" cy="6.5" r="2" /><circle cx="12" cy="10" r="4.2" /><path d="M8.6 13.4C6.7 14.6 6 16.4 6 18.3 6 20.3 8.7 21 12 21s6-.7 6-2.7c0-1.9-.7-3.7-2.6-4.9" /><path d="M11 10.6h2M12 10.6v1" /></>,
  chocolate: <><path d="M12 20s-7.5-4.7-7.5-10A4.2 4.2 0 0 1 12 7.4 4.2 4.2 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10z" /><circle cx="10" cy="11" r="1.2" /><circle cx="14" cy="11" r="1.2" /><circle cx="12" cy="14.3" r="1.2" /></>,
  vase: <><path d="M9 3h6M9.5 3v3.5C7 8 6 10 6 13c0 4 2.5 8 6 8s6-4 6-8c0-3-1-5-3.5-6.5V3" /><path d="M7 14h10" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="1.5" /><path d="M3 7.5l9 6 9-6" /><path d="M15.5 4.5l1.5-1.5 1.5 1.5-1.5 1.5z" /></>,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {ICONS[name] || ICONS.rose}
  </svg>
);

/* "Make it real": gifts on Amazon to go with a digital bouquet (affiliate links). */
export default function GiftShelf() {
  return (
    <section className="shelf" id="gifts">
      <header className="shelf-head">
        <p className="eyebrow">Make it real</p>
        <h2>Gifts to go with your bouquet</h2>
        <p className="support-copy">A digital bouquet says it today. If you&apos;d like something they can hold too, here are a few favourites.</p>
      </header>
      <ul className="shelf-grid">
        {AFF_PRODUCTS.map((p) => (
          <li key={p.title}>
            <a className="shelf-card" href={p.href} target="_blank" rel="sponsored noopener">
              <span className="shelf-icon"><Icon name={p.icon} /></span>
              <span className="shelf-text"><b>{p.title}</b><small>{p.note}</small></span>
              <span className="shelf-go">View on Amazon ↗</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="shelf-disclosure">
        As an Amazon Associate I earn from qualifying purchases. It costs you nothing extra and helps keep Fleur &amp; Note free.
      </p>
      {!AFF_TAG && (
        <p className="fineprint">Local preview: add your Amazon Associates tracking ID in src/config.js → affiliate to switch this on. Until then the shelf is hidden on the live site.</p>
      )}
    </section>
  );
}
