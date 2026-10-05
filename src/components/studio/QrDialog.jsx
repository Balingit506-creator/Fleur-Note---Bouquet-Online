import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../lib/hooks.js';
import { downloadBlob, fileSafe } from '../../lib/util.js';

// A QR code holds at most about 2,950 characters of a link; past that it can't be made.
export const QR_MAX = 2900;

/* The share link as a QR code, made in the browser. Opens while mounted; onClose when dismissed. */
export default function QrDialog({ link, to, onClose }) {
  const toast = useToast();
  const ref = useRef(null);
  const [svg, setSvg] = useState('');
  const fits = link.length <= QR_MAX;

  useEffect(() => {
    const d = ref.current;
    if (!d.open) d.showModal();
    const closed = () => onClose();
    d.addEventListener('close', closed);
    return () => d.removeEventListener('close', closed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!fits) return;
    // more error correction for short links (easier to scan), less when space is tight
    const level = link.length < 1200 ? 'M' : 'L';
    QRCode.toString(link, { type: 'svg', errorCorrectionLevel: level, margin: 1, color: { dark: '#2a1a20', light: '#fffdf8' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [link, fits]);

  const save = async () => {
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, link, { errorCorrectionLevel: link.length < 1200 ? 'M' : 'L', margin: 2, width: 1024, color: { dark: '#2a1a20', light: '#fffdf8' } });
      canvas.toBlob((blob) => { downloadBlob(blob, `bouquet-qr${fileSafe(to)}.png`); toast('QR code saved.'); }, 'image/png');
    } catch {
      toast('Sorry, the QR code could not be saved.');
    }
  };

  return (
    <dialog className="qr-dialog" ref={ref} aria-labelledby="qr-title" onClick={(e) => { if (e.target === e.currentTarget) ref.current.close(); }}>
      <button className="dd-close" type="button" aria-label="Close" onClick={() => ref.current.close()}>×</button>
      <p className="eyebrow">Scan to open</p>
      <h2 id="qr-title">{to ? `A bouquet for ${to}` : 'Your bouquet'}</h2>
      {fits ? (
        <>
          <div className="qr-card">
            {svg ? <div className="qr-code" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="qr-code qr-loading" />}
            <p className="qr-caption">Point a phone camera here</p>
          </div>
          <div className="qr-actions">
            <button className="btn" type="button" onClick={save} disabled={!svg}>Save QR image</button>
          </div>
          <p className="hint">Show it on your screen, print it on a card, or send the image. Anyone who scans it opens the bouquet.</p>
        </>
      ) : (
        <div className="qr-too-big">
          <p><b>This bouquet is too big for a QR code.</b></p>
          <p>A QR code can hold about {QR_MAX.toLocaleString()} characters, and this link is {link.length.toLocaleString()}. Photos take up almost all of that space.</p>
          <p className="hint">Remove the photos to get a QR code, or send the private link instead.</p>
        </div>
      )}
    </dialog>
  );
}
