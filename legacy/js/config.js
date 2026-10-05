// Site settings. The site stays fully static either way.
window.BOUQ_CONFIG = {
  // Photo storage.
  //   null      → photos are shrunk and carried inside the share link (up to 3, no account needed).
  //   Supabase  → photos upload straight from the browser to your free Supabase bucket
  //               (up to 5, full quality, short links). See README → "Optional photo storage".
  storage: null,
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
    formEndpoint: '',
    email: '',
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
