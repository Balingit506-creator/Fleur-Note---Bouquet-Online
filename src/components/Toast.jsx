import { useEffect, useState } from 'react';

// A short message at the bottom of the screen; message.n changes for every new message.
export default function Toast({ message }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!message.n) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <div className={`toast${show ? ' show' : ''}`} id="toast" role="status" aria-live="polite">{message.text}</div>
  );
}
