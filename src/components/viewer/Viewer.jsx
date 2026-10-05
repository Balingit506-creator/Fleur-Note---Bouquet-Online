import { useEffect, useRef, useState } from 'react';
import Ambient from '../../lib/ambient.js';
import { ASSETS, flowerHex } from '../../lib/assets.js';
import { byId } from '../../lib/util.js';
import Envelope from './Envelope.jsx';
import LockScreen from './LockScreen.jsx';
import MusicCard from './MusicCard.jsx';
import Reveal from './Reveal.jsx';

const FLOURISH = [
  'M300,18 C220,22 170,52 136,98 C108,136 92,180 52,206 C36,216 20,220 6,218',
  'M236,30 q-6,-26 18,-34 q4,24 -18,34Z', 'M196,44 q22,-14 40,2 q-20,14 -40,-2Z', 'M160,76 q-18,-20 -2,-40 q18,18 2,40Z',
  'M140,96 q26,-4 34,18 q-24,6 -34,-18Z', 'M112,140 q-24,-10 -20,-34 q22,10 20,34Z', 'M98,162 q24,4 26,28 q-24,-2 -26,-28Z',
  'M60,200 q-10,-22 8,-36 q10,20 -8,36Z',
];
// Gold botanical line-art that draws itself into the empty corners.
const Flourish = ({ corner, paths, dots }) => (
  <svg className={`flourish flourish-${corner}`} viewBox="0 0 300 260" aria-hidden="true">
    {paths.map((d) => <path key={d} pathLength="1" d={d} />)}
    {dots.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
  </svg>
);

/* The recipient's page: a lock screen for password links, then the envelope, then the bouquet. */
export default function Viewer({ route, onSendBack }) {
  const [viewing, setViewing] = useState(route.st || null);
  const [revealed, setRevealed] = useState(false);
  const [round, setRound] = useState(0); // "Open again" brings back a fresh, sealed envelope
  const ambient = useRef(null), music = useRef(null);

  useEffect(() => {
    document.title = !viewing ? 'A sealed bouquet' : viewing.card.to ? `A bouquet for ${viewing.card.to}` : 'A bouquet for you';
  }, [viewing]);

  // petals in this bouquet's own colours drift behind everything
  useEffect(() => {
    const palette = viewing ? [...new Set(viewing.stems.map((x) => byId(ASSETS.flowers, x.id)).filter(Boolean).map(flowerHex))] : [];
    Ambient.start(ambient.current, palette);
    return () => Ambient.stop();
  }, [viewing]);
  useEffect(() => { if (revealed) Ambient.burst(); }, [revealed]);

  const openAgain = () => {
    music.current?.stop();
    setRevealed(false);
    setRound((r) => r + 1);
  };

  return (
    <main className={`view view-viewer${revealed ? ' revealed' : ''}`} id="viewer">
      <canvas className="ambient" ref={ambient} aria-hidden="true" />
      <Flourish corner="tr" paths={FLOURISH} dots={[[262, 64, 5], [276, 56, 3.5], [186, 104, 4], [30, 206, 4]]} />
      <Flourish corner="bl" paths={FLOURISH.slice(0, 7)} dots={[[262, 64, 5], [186, 104, 4]]} />

      {!viewing && <LockScreen sealed={route.sealed} hint={route.hint} onUnlock={setViewing} />}
      {viewing && !revealed && (
        <Envelope key={round} st={viewing} onOpenStart={() => music.current?.start()} onOpened={() => setRevealed(true)} />
      )}
      {viewing && revealed && <Reveal st={viewing} onOpenAgain={openAgain} onSendBack={() => onSendBack(viewing)} />}
      {viewing && <MusicCard ref={music} st={viewing} />}
    </main>
  );
}
