// The pixel-art cat that blows kisses (from Products/Cute2). Each letter is one pixel colour; "." is empty.
const PALETTE = {
  K: '#3a332d', // outline
  O: '#f4a261', // orange fur
  D: '#dc8446', // tabby stripes
  W: '#fff7ec', // white fur
  G: '#eadfd0', // white fur shadow
  P: '#f4a5a8', // inner ear
  C: '#f7b1a6', // blush
  E: '#2a2420', // eyes
  H: '#ffffff', // eye shine
  N: '#e98a8f', // nose
  B: '#4a4541', // collar
  Y: '#f7c948', // bell
  A: '#d69e2e', // bell shadow
  R: '#ff5d8f', // heart
  r: '#d9376e', // heart shadow
  S: '#ffc2d4', // heart shine
};

const CAT_X = 1, CAT_Y = 0;

// Left half of the cat; each row is mirrored to build the symmetric sprite.
const CAT_LEFT = [
  '...............',
  '...............',
  '.....KK........',
  '.....KOK.......',
  '.....KPOK......',
  '.....KPPOK.....',
  '....KOPPPOKKKKK',
  '....KOPPPOOOOOO',
  '....KOOPPOODOOD',
  '...KOOOOOOODOOD',
  '...KOOOOOOOOOOO',
  '...KOOOOOOOOOOO',
  '...KOOWWWWWWOOO',
  '...KOWWWWHEWWWW',
  '...KOWWWWEEWWWW',
  'KKKKOWWWWEEWWWW',
  '...KWWCCWWWWWWN',
  'KKKKWWCCWWWKWWK',
  '...KWWWWWWWWKKW',
  '....KWWWWWWWWWW',
  '.....KKWWWWWWWW',
  '......KOBBBBBBB',
  '.....KOOWWWWWWY',
  '.....KOOWWWWWWA',
  '....KOOOWWWWWWW',
  '....KOOOWWWWWWW',
  '....KDDOWWWWWWW',
  '....KOOOWWWWWWW',
  '....KOOOKWWWWWG',
  '....KOOOKWWWWWG',
  '....KOWWKWWWWWG',
  '....KWWWKWWWWWG',
  '.....KKKKKKKKKK',
];

// Tail frames (resting, swished), drawn behind the body starting at this cell.
const TAIL_COL = 25, TAIL_ROW = 19;
const TAIL_REST = ['..KK.', '.KWWK', '.KWWK', '.KOOK', '.KOOK', '.KODK', '.KOOK', 'KOOK.', 'OODK.', 'OOK..', 'OK...'];
const TAIL_SWISH = ['...KK.', '..KWWK', '..KWWK', '..KOOK', '.KOOK.', '.KODK.', '.KOOK.', 'KOOK..', 'OODK..', 'OOK...', 'OK....'];

const HEART = ['SR.RR', 'RRRRr', 'RRRRr', '.RRr.', '..r..'];
const HEART_START = [17, 19]; // where a heart's bottom-left corner starts, beside the mouth

const EYE_COLS = [9, 10, 19, 20];
const EYE_TOP = 13;

const mirror = (half) => half.map((row) => row + [...row].reverse().join(''));

function edited(sprite, changes) {
  const grid = sprite.map((row) => [...row]);
  for (const [row, col, color] of changes) grid[row][col] = color;
  return grid.map((row) => row.join(''));
}

const closedEye = (cols) => cols.flatMap((col) => [[EYE_TOP, col, 'W'], [EYE_TOP + 1, col, 'E'], [EYE_TOP + 2, col, 'W']]);

// Kiss face: left eye winks shut as a happy arc, the "w" mouth puckers into a little "3", the blush grows.
const KISS_FACE = [
  ...closedEye(EYE_COLS.slice(0, 2)),
  [EYE_TOP + 1, 8, 'W'], [EYE_TOP + 1, 11, 'W'], [EYE_TOP + 2, 8, 'E'], [EYE_TOP + 2, 11, 'E'],
  ...[11, 14, 15, 18].map((col) => [17, col, 'W']),
  ...[12, 13, 16, 17].map((col) => [18, col, 'W']),
  [17, 15, 'K'], [18, 16, 'K'], [19, 15, 'K'],
  ...[6, 7, 22, 23].map((col) => [18, col, 'C']),
];

const CAT_OPEN = mirror(CAT_LEFT);
const CAT_BLINK = edited(CAT_OPEN, closedEye(EYE_COLS));
const CAT_KISS = edited(CAT_OPEN, KISS_FACE);

// A sprite as rects, merging horizontal runs of one colour.
function runs(rows, x, y) {
  const out = [];
  rows.forEach((line, dy) => {
    let start = 0;
    while (start < line.length) {
      let end = start;
      while (end < line.length && line[end] === line[start]) end++;
      if (line[start] !== '.') out.push([x + start, y + dy, end - start, line[start]]);
      start = end;
    }
  });
  return out;
}
// Only the pixels where a face differs from the open face, shown as an overlay.
function changes(face) {
  const out = [];
  face.forEach((line, dy) => [...line].forEach((c, dx) => { if (c !== CAT_OPEN[dy][dx]) out.push([CAT_X + dx, CAT_Y + dy, 1, c]); }));
  return out;
}

const LAYERS = {
  tailRest: runs(TAIL_REST, CAT_X + TAIL_COL, CAT_Y + TAIL_ROW),
  tailSwish: runs(TAIL_SWISH, CAT_X + TAIL_COL, CAT_Y + TAIL_ROW),
  body: runs(CAT_OPEN, CAT_X, CAT_Y),
  blink: changes(CAT_BLINK),
  kiss: changes(CAT_KISS),
  hearts: [0, 1, 2].map((i) => runs(HEART, CAT_X + HEART_START[0] + (i % 2), CAT_Y + HEART_START[1] - HEART.length + 1)),
};

const Rects = ({ list }) => list.map(([x, y, w, c]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={PALETTE[c]} />);

export default function PixelCat({ className = '' }) {
  return (
    <svg className={`pixel-cat ${className}`} viewBox="0 0 32 34" role="img" aria-label="A pixel-art cat blowing kisses">
      <g className="pc-tail pc-tail-rest"><Rects list={LAYERS.tailRest} /></g>
      <g className="pc-tail pc-tail-swish"><Rects list={LAYERS.tailSwish} /></g>
      <g className="pc-body"><Rects list={LAYERS.body} /></g>
      <g className="pc-face pc-face-blink"><Rects list={LAYERS.blink} /></g>
      <g className="pc-face pc-face-kiss"><Rects list={LAYERS.kiss} /></g>
      {LAYERS.hearts.map((h, i) => <g key={i} className={`pc-heart pc-heart-${i + 1}`}><Rects list={h} /></g>)}
    </svg>
  );
}
