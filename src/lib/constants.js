import { byId } from './util.js';

export const MAX_STEMS = 18;
export const MAX_GREEN = 3;
export const MAX_ADDONS = 3;
export const LONG_LINK = 60000; // characters; longer links may be cut off by some chat apps
export const DRAFT_KEY = 'petal-post-draft-v1';
export const GATHER = { x: 300, y: 560 };
export const GREEN_FADE = [320, 372]; // y-range on the stage where foliage outside the wrap fades out
// Where the photo pile sits beside the bouquet, as a share of the bouquet's box: left, top, width, height.
export const PILE_BOX = [0.068, 0.815, 0.25, 0.22];
// each photo in the pile: x %, y % (of its own size) and tilt in degrees
export const PILE_LAYERS = [[0, 0, -7], [7, -4, 5], [-5, -7, -2], [9, -9, 8], [2, -12, -4]];

export const RIBBONS = [
  { id: 'ivory', name: 'Ivory satin', c: '#efe4cf', l: '#fbf6ec', d: '#c9b896' },
  { id: 'blush', name: 'Blush silk', c: '#e7b3ab', l: '#f6d6d0', d: '#c08a82' },
  { id: 'burgundy', name: 'Burgundy velvet', c: '#7a2335', l: '#9c3a4d', d: '#4f1220' },
  { id: 'sage', name: 'Sage chiffon', c: '#9aab8a', l: '#bccab0', d: '#6f8061' },
  { id: 'gold', name: 'Antique gold', c: '#c9a45c', l: '#e6cd92', d: '#94733a' },
  { id: 'noir', name: 'Noir grosgrain', c: '#2b2629', l: '#4a4347', d: '#0f0d0e' },
];
export const SEALS = [
  { id: 'burgundy', name: 'Bordeaux', c: '#8a2a3b', h: '#bb5466', d: '#55141f' },
  { id: 'gold', name: 'Gilt', c: '#b8914a', h: '#e3c67f', d: '#7a5c26' },
  { id: 'sage', name: 'Moss', c: '#6f7f5f', h: '#9eae8b', d: '#46523b' },
  { id: 'navy', name: 'Ink', c: '#2c3a5c', h: '#56688f', d: '#18213a' },
  { id: 'blush', name: 'Rosewater', c: '#d39a95', h: '#f0c4bf', d: '#9d6560' },
];
export const FONTS = [
  { id: 'script', name: 'Calligraphy', css: 'var(--script)' },
  { id: 'serif', name: 'Classic', css: 'var(--serif)' },
  { id: 'hand', name: 'Handwritten', css: 'var(--hand)' },
];
// Letter papers. Colours are shared by the page (CSS variables) and the video keepsake (canvas).
export const PAPERS = [
  { id: 'lined', name: 'Lined Notepaper', bg: '#fffdf8', ink: '#241e1b', soft: '#3f3531', accent: '#7a2638', rule: 'rgba(180,138,82,.16)', tape: 'rgba(225,205,175,.72)', pattern: 'lines' },
  { id: 'ivory', name: 'Ivory Cotton', bg: '#f9f3e6', ink: '#2b231e', soft: '#4a3f37', accent: '#8a5a2b', rule: 'rgba(168,125,67,.35)', tape: 'rgba(210,190,160,.7)', pattern: 'frame' },
  { id: 'dotted', name: 'Dotted Journal', bg: '#fdfcf7', ink: '#22262b', soft: '#3c434b', accent: '#2f5d7c', rule: 'rgba(60,80,100,.22)', tape: 'rgba(170,200,215,.7)', pattern: 'dots' },
  { id: 'kraft', name: 'Kraft', bg: '#d8b78e', ink: '#2e1f12', soft: '#4a3420', accent: '#6b2a1f', rule: 'rgba(90,60,30,.28)', tape: 'rgba(250,245,232,.75)', pattern: 'fibres' },
  { id: 'blush', name: 'Blush Floral', bg: '#fbe8e4', ink: '#3a2226', soft: '#5a3a3f', accent: '#a83a52', rule: 'rgba(200,120,135,.22)', tape: 'rgba(255,255,255,.7)', pattern: 'floral' },
  { id: 'parchment', name: 'Aged Parchment', bg: '#f2e2c0', ink: '#3b2a17', soft: '#5a4228', accent: '#7a3b1c', rule: 'rgba(120,80,30,.18)', tape: 'rgba(205,180,140,.75)', pattern: 'aged' },
  { id: 'airmail', name: 'Airmail', bg: '#fbfaf6', ink: '#1f2433', soft: '#3a4157', accent: '#b2263a', rule: 'rgba(40,60,110,.12)', tape: 'rgba(225,215,195,.75)', pattern: 'airmail' },
  { id: 'midnight', name: 'Midnight Gold', bg: '#1d2742', ink: '#f2e6c9', soft: '#e0cf9f', accent: '#e8c47a', rule: 'rgba(232,196,122,.18)', tape: 'rgba(232,196,122,.55)', pattern: 'stars' },
];
export const paperOf = (id) => byId(PAPERS, id) || PAPERS[0];
// Props for an element drawn on a paper: <div {...paperProps(id)}>
export function paperProps(id) {
  const p = paperOf(id);
  return {
    'data-paper': p.id,
    style: { '--ink': p.ink, '--ink-soft': p.soft, '--accent': p.accent, '--lp-bg': p.bg, '--lp-rule': p.rule, '--lp-tape': p.tape },
  };
}

// Photo frames; the look lives in CSS (.pf[data-frame]).
export const FRAMES = [
  { id: 'polaroid', name: 'Polaroid' },
  { id: 'washi', name: 'Washi Tape' },
  { id: 'gold', name: 'Gold' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'film', name: 'Film' },
];

export const STEPS = [
  { id: 'occasion', label: 'Occasion' },
  { id: 'blooms', label: 'Blooms' },
  { id: 'greenery', label: 'Greenery' },
  { id: 'wrap', label: 'Wrap' },
  { id: 'letter', label: 'Letter' },
  { id: 'extras', label: 'Extras' },
  { id: 'send', label: 'Send' },
];
export const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);

export const COLOR_HEX = {
  red: '#9e1b32', pink: '#e08aa3', white: '#f1ece2', yellow: '#efc12f', peach: '#f2b088', orange: '#ec8731',
  purple: '#8b5fb0', blue: '#4b6fb3', burgundy: '#4d1426', bicolor: '#e2563c', black: '#2a1a20', velvety: '#9e1b32',
  coral: '#ef8a74', lavender: '#b9a3d9', golden: '#f2b630',
};

export const OCCASIONS = [
  { id: 'romance', name: 'Romance', line: 'Velvet reds and blush, tied in satin.',
    flowers: [['rose', 'red', 5], ['rose', 'pink', 3], ['dahlia', 'peach', 1], ['ranunculus', 'hot', 2], ['tulip', 'pink', 2]], greens: ['eucalyptus_waxflower', 'baby'],
    wrap: 'dusty_rose', ribbon: 'burgundy', envelope: 'blush', seal: 'burgundy', addons: ['teddy', 'fluffy_heart'],
    note: 'Every ordinary day with you still feels like the first bloom of spring.' },
  { id: 'gratitude', name: 'Gratitude', line: 'Sunlit yellows with a sprig of olive.',
    flowers: [['sunflower', 'golden', 2], ['tulip', 'yellow', 3], ['tulip', 'peach', 3], ['ranunculus', 'coral', 2], ['rose', 'white', 2], ['rose', 'yellow', 2]], greens: ['olive', 'collar'],
    wrap: 'champagne', ribbon: 'ivory', envelope: 'kraft', seal: 'gold', addons: ['bunny'],
    note: 'Thank you, for the big things and, most of all, for the small ones.' },
  { id: 'apology', name: 'I’m sorry', line: 'Soft whites that say it gently.',
    flowers: [['lily', 'white', 1], ['rose', 'white', 3], ['tulip', 'white', 3], ['ranunculus', 'pastel', 2], ['tulip', 'pink', 2]], greens: ['bay_leaf', 'baby'],
    wrap: 'ivory', ribbon: 'blush', envelope: 'ivory', seal: 'blush', addons: ['teddy'],
    note: 'I was wrong, and I’m sorry. I hope these say what I couldn’t.' },
  { id: 'celebration', name: 'Celebration', line: 'A bright burst of orange and gold.',
    flowers: [['sunflower', 'golden', 1], ['dahlia', 'flame', 2], ['tulip', 'orange', 2], ['rose', 'orange', 2], ['ranunculus', 'orange', 2], ['tulip', 'bicolor', 3], ['rose', 'yellow', 1], ['tulip', 'purple', 2]], greens: ['woodland_posy', 'lavender'],
    wrap: 'sage', ribbon: 'gold', envelope: 'sage', seal: 'gold', addons: ['satin_bow', 'kitty_charm'],
    note: 'Here’s to you and everything you worked so hard for. Congratulations!' },
  { id: 'sympathy', name: 'Sympathy', line: 'Quiet whites and lilac, softly held.',
    flowers: [['lily', 'white', 2], ['rose', 'white', 3], ['tulip', 'white', 2], ['ranunculus', 'lavender', 2], ['tulip', 'purple', 2], ['rose', 'purple', 1]], greens: ['trailing_eucalyptus', 'lavender', 'fern_waxflower'],
    wrap: 'lilac', ribbon: 'ivory', envelope: 'lilac', seal: 'sage', addons: ['bunny'],
    note: 'Thinking of you, and holding you close through all of this.' },
  { id: 'after-dark', name: 'After dark', line: 'Moody burgundy, violet and blue on noir.',
    flowers: [['tulip', 'burgundy', 3], ['dahlia', 'burgundy', 2], ['ranunculus', 'burgundy', 2], ['rose', 'blue', 2], ['rose', 'purple', 3], ['rose', 'red', 2]], greens: ['ruscus', 'olive'],
    wrap: 'noir', ribbon: 'gold', envelope: 'midnight', seal: 'gold', addons: ['turtle', 'fluffy_heart'],
    note: 'For the one who makes ordinary nights feel like something worth remembering.' },
];
export const OCCASION_PAPER = { romance: 'blush', gratitude: 'kraft', apology: 'ivory', celebration: 'airmail', sympathy: 'parchment', 'after-dark': 'midnight' };
