// Site settings. The site stays fully static either way.
// Edit this file, then the dev server reloads (or run npm run build for the live site).
const config = {
  // Short links and photo storage.
  //   null      → the whole bouquet travels inside the share link; photos are shrunk (up to 3).
  //   Supabase  → bouquets are saved to your free Supabase project, so links are short
  //               (…/#s=k3Hq9xTbQw) and photos upload at full quality (up to 5).
  //               Run supabase/setup.sql once. See README → "Short links with Supabase".
  storage: {
    provider: 'supabase',
    url: 'https://apdffyheypjpjnpxlcap.supabase.co',
    anonKey: 'sb_publishable_-LblgWhVN85q0SzhP2QfUQ_dJe7PHEi', // publishable key: safe to be public
    bucket: 'bouquet-photos',
  },
  // storage: {
  //   provider: 'supabase',
  //   url: 'https://YOUR-PROJECT.supabase.co',
  //   anonKey: 'YOUR-ANON-PUBLIC-KEY',
  //   bucket: 'bouquet-photos',
  // },

  // Suggestion box. Fill in ONE (or both):
  //   formEndpoint → a form service URL that accepts POSTed JSON, e.g. Formspree:
  //                  'https://formspree.io/f/xxxxxxx' (free; each suggestion arrives in your email)
  //   email        → fallback: the visitor's email app opens with the suggestion filled in
  // While both are empty the suggestion box stays hidden on the live site.
  suggest: {
    formEndpoint: 'https://formspree.io/f/myekgrzo',
    email: '',
  },

  // Adsterra banner ads (home page and studio). From each banner's code in your Adsterra dashboard
  // ("Get code"), copy the 'key' and the size. scriptHost is the address in the code's
  // src="//…/invoke.js" (e.g. 'www.highperformanceformat.com').
  //   wide   → shown where there's room, e.g. 728×90
  //   narrow → shown on phones, e.g. 320×50 (leave key empty to use only the wide one)
  // While both keys are empty no ads load on the live site.
  ads: {
    // Native Banner: from its code, the script's src="…" and the container's id="…".
    // When set, the ad spots show this native ad (it resizes to fit) instead of the banners below.
    native: {
      src: 'https://bauval.org/21/f9f85b6a3731dbb70e361968dd35e6cb',
      containerId: 'container-f9f85b6a3731dbb70e361968dd35e6cb',
    },
    scriptHost: 'www.highperformanceformat.com',
    wide: { key: '', width: 728, height: 90 },
    narrow: { key: '', width: 320, height: 50 },
  },

  // Amazon Associates: the "Make it real" gift shelf on the home page.
  //   tag    → your Associates tracking ID, e.g. 'petalpost-20' (shown in Associates Central, top right)
  //   domain → your Amazon store, e.g. 'amazon.com', 'amazon.co.uk', 'amazon.ca'
  //   each product links to an Amazon search ('search') or a specific product page ('url');
  //   icon: rose | dome | teddy | chocolate | vase | card
  // While tag is empty the shelf stays hidden on the live site.
  affiliate: {
    tag: 'jbzrecommends-20',
    domain: 'amazon.com',
    products: [
      { title: 'Fresh roses, delivered', note: 'The real thing, at their door', search: 'fresh roses delivery bouquet', icon: 'rose' },
      { title: 'Forever rose in a glass dome', note: 'A preserved bloom that lasts for years', search: 'preserved rose glass dome', icon: 'dome' },
      { title: 'Soft teddy bear', note: 'Someone to hug while they read', search: 'teddy bear plush gift', icon: 'teddy' },
      { title: 'Chocolate gift box', note: 'A sweet note to go with the flowers', search: 'chocolate gift box', icon: 'chocolate' },
      { title: 'Glass flower vase', note: 'A home for real stems', search: 'glass flower vase', icon: 'vase' },
      { title: 'Handwritten cards', note: 'Blank cards for a letter on paper', search: 'blank greeting cards with envelopes', icon: 'card' },
    ],
  },

  // Donations. Visitors pick an amount, press "Donate", then choose how to pay from the
  // methods below. Only the ones you fill in are shown; while all are empty the support
  // section stays hidden on the live site.
  donate: {
    currency: 'USD',          // three-letter code, e.g. 'USD', 'EUR', 'PHP'
    amounts: [3, 5, 10, 25],  // preset buttons

    // PayPal: fill in ONE. paypalMe = the part after paypal.me/ ; business = your PayPal email
    paypalMe: 'JuarenBalingit',
    business: '',

    // Card payments: a Stripe Payment Link (Stripe dashboard → Payment Links), e.g. 'https://buy.stripe.com/xxxx'
    stripeLink: '',

    // Creator pages: just the username
    kofi: '',                 // ko-fi.com/<name>
    buymeacoffee: '',         // buymeacoffee.com/<name>

    // E-wallets shown with your QR code and number (put QR images in the Donate/ folder)
    wallets: [
      // { name: 'GCash', accountName: 'Juan D.', number: '0917 123 4567', qr: 'Donate/gcash-qr.png' },
      // { name: 'Maya',  accountName: 'Juan D.', number: '0917 123 4567', qr: 'Donate/maya-qr.png' },
    ],

    // Bank transfer details
    bank: null,
    // bank: { bank: 'BDO', accountName: 'Juan Dela Cruz', accountNumber: '0012 3456 7890', note: 'Savings' },

    // Any other page, e.g. Patreon or GoFundMe
    links: [
      // { label: 'Patreon', url: 'https://www.patreon.com/yourname' },
    ],
  },
};

export default config;
