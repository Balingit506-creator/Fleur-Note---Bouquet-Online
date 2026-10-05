import { useEffect, useState } from 'react';
import { photoSrc } from '../lib/cloud.js';

/* A bouquet photo. Stored photos are encrypted, so they're decrypted before showing. */
export default function Photo({ src, alt = '' }) {
  const plain = !src.includes('#k=');
  const [url, setUrl] = useState(plain ? src : '');
  useEffect(() => {
    if (plain) return setUrl(src);
    let live = true;
    setUrl('');
    photoSrc(src).then((u) => live && setUrl(u), () => live && setUrl(''));
    return () => { live = false; };
  }, [src, plain]);
  return url ? <img src={url} alt={alt} /> : <img alt={alt} className="photo-loading" />;
}
