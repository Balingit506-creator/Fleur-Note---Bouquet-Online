# Fleur & Note — digital bouquet studio

Compose a bouquet (occasion → blooms → greenery → wrap & ribbon → letter → send) and share it as a
private link. No login, no backend: the whole bouquet is encoded in the link itself.

Built with **React** and **Vite**. It is still a fully static site: `npm run build` produces a `dist/`
folder you can put on any host (Netlify, Vercel, GitHub Pages…).

## Run it

```
npm install        # once
npm run dev        # http://localhost:5173, reloads as you edit
npm run build      # the live site, in dist/
npm run preview    # try the built site locally
```

## Project layout

| Path | What it is |
|---|---|
| `src/App.jsx` | Routing (home, studio, recipient page), the saved draft, theme and messages |
| `src/components/` | The page: `Bouquet.jsx` draws a bouquet from its data; `studio/` holds the studio and its seven steps; `viewer/` the recipient's page (lock screen, envelope, reveal, music card) |
| `src/lib/` | Plain logic: bouquet state and share links (`bouquet.js`), password encryption, image/video export (`render.js`), music, falling petals, YouTube, donations |
| `src/config.js` | Your settings: PayPal and other ways to donate, the suggestion box, optional photo storage |
| `src/styles.css` | All styles, including the light and dark themes |
| `public/` | Images served as-is: `Flowers/`, `Greenery/`, `Wrap/`, `Envelope/`, `AddOns/`, `img/` |
| `src/data/assets.json` | The image catalogue, generated from `public/` (don't edit by hand) |
| `tools/` | Image helpers (cut-outs, wraps, logo); `tools/source/` keeps the original artwork they work from |

## Photos & music

**Music:** four original pieces (Music Box Waltz, Morning Piano, Velvet Strings, Garden After Rain) are
composed in `js/music.js` and synthesised live in the browser, with no audio files. The chosen piece starts
when the recipient breaks the wax seal, and a small button lets them pause it.

**Photos:** by default up to 3 photos are shrunk (about 27 KB each) and stored inside the share link.
The Send step shows the link size. Links over about 60 KB still work in browsers and email, but some chat apps may cut them off.

### Short links with Supabase (still a static site)

Without any setup, the whole bouquet travels inside the link, which makes links long (and too long for a
QR code once photos are added). With a free [Supabase](https://supabase.com) project, each bouquet is saved
there and the link carries only its id, like `https://your-site/#s=k3Hq9xTbQw`. Photos upload at full quality
(up to 5). There's still no server of your own: the browser talks to Supabase directly.

1. Create a free Supabase project at [supabase.com](https://supabase.com) (sign in with GitHub).
2. Open **SQL Editor → New query**, paste all of [`supabase/setup.sql`](supabase/setup.sql), and press **Run**.
   This creates the `bouquets` table and the `bouquet-photos` bucket with safe permissions.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key into `src/config.js`:
   ```js
   storage: { provider: 'supabase', url: 'https://xxxx.supabase.co', anonKey: 'eyJ…', bucket: 'bouquet-photos' },
   ```

Good to know:
- The anon key is meant to be public. With it, visitors can only save a bouquet or open one by its exact id.
  They can't list, change or delete bouquets.
- Every bouquet and photo is encrypted in the browser before it's uploaded. The key exists only in the share
  link (after the `#`, which browsers never send to a server), so Supabase, and you as the owner, only ever see
  scrambled data. Photo files have long random names and the bucket can't be listed.
  Password-locked bouquets are also locked with the password.
- Whoever has a link can still open that bouquet (and screenshot it), so the link is what to keep private.
- If saving fails (offline, or the project is paused), the site quietly falls back to a full-length link.
- Free projects pause after a week with no visits. While paused, short links don't open; press **Restore** in the
  Supabase dashboard to bring them back. Links made before the setup keep working either way.

## Adding your own artwork

1. Drop images into the folders inside `public/`:
   - `Flowers/<Kind>/` (one sub-folder per flower kind, e.g. `Flowers/Peonies/peony_blush.png`). Use square, transparent PNGs of the flower head.
   - `Greenery/`: tall sprigs (portrait) are fanned around the bouquet, and wide images (landscape) sit once behind the blooms as a collar.
   - `Wrap/`: a pair of files named `<name>_back.png` (behind the flowers) and `<name>_front.png` (covers the stems), both 600×760 with the tie point at about (300, 600).
   - `Envelope/`: any paper texture (about 3:2).
2. That's it: while `npm run dev` runs, the image catalogue rebuilds itself and the page reloads.
   (`npm run build` rebuilds it too; by hand it's `npm run catalogue`.)

Display names come from the file names (`tulip_red_yellow_bicolor.png` → "Red Yellow Bicolor Tulip").

### Preparing greenery images

- **One image with a soft or hazy cutout:** `node tools/clean-cutout.js in.png public/Greenery/greenery_name.webp`. It removes the pale halo, trims empty space and resizes.
- **A sticker sheet with several pieces:** `node tools/split-sheet.js sheet.png public/Greenery name1 name2:180 name3:-31 ...`. Pieces are numbered left to right, then top to bottom. `:deg` rotates a piece so its stem points down. Pieces come out with the stem base at the bottom centre.
- `public/Greenery/greenery-settings.json` controls placement for each file. Use `"layout": "collar"` (placed once, centred behind the blooms, e.g. the Garden Collar), `"layout": "fan"` (placed once, low), or `"hidden": true` to keep a source sheet out of the studio. Anything else is a sprig and is fanned around the bouquet.

Both scripts need Playwright (`npm run setup-tools` once).

### Wraps

The six `wrap_*_satin` wraps (Champagne, Ivory Pearl, Dusty Rose, Sage, Lilac, Noir) are all built from one
illustration, `tools/source/wrap_satin_source.png`, by `tools/build-wraps.js`. The script removes the checkerboard background, splits the wrap into a back layer (behind the flowers) and a front layer (the folds and bow), and makes the colour variants with the gold edges kept gold.

Each design in `tools/build-wraps.js` sets its own placement and front cut line. Two designs exist:
- `satin`: the current one, with a built-in bow
- `gilded`: the earlier open cone with tissue

Build either one (needs Playwright):

```
npm i -D playwright && npx playwright install chromium
node tools/build-wraps.js satin      # or: gilded
```

`public/Wrap/wrap-settings.json` holds settings for each wrap:
- `"ribbon": false`: the wrap has its own bow, so the studio hides the ribbon picker.
- `"frontOnTop": true`: the front folds are drawn over the lowest blooms so they tuck into the paper.
- `"ribbon": { "scale": 0.66 }`: resizes the drawn ribbon on wraps without a bow.

The placeholder greenery and envelopes were generated by `node tools/generate-art.js`. Add `--wraps` to bring back the older SVG paper wraps.

### Add-ons

The add-ons (Teddy Bear, Bunny, Kitty Charm, Turtle, Satin Bow, Fluffy Heart) are cut from
`tools/source/addons_plush_sheet.png`, and senders can pick up to 3. The sheet also had a puppy charm; it shows a trademarked character, so it's kept in
`tools/source/addons/` and isn't part of the site or the GitHub repository. To add your own (a transparent PNG/WebP), drop it into `public/AddOns/` and give it a spot in `public/AddOns/addon-settings.json`:

```json
"my_plush.png": { "x": 110, "y": 526, "w": 180, "layer": "top" }
```

`x`/`y` is the centre on the 600×760 bouquet and `w` is the width. Use `"layer": "back"` to put it behind the greenery (as the balloons are), or `"top"` to put it in front of everything. The dev server picks it up straight away.
