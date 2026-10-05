import { execFileSync } from 'node:child_process';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const IMAGE_DIRS = ['Flowers', 'Greenery', 'Wrap', 'Envelope', 'AddOns'];

// Rebuilds src/data/assets.json from the image folders in public/, at start-up and whenever an
// image (or a *-settings.json) is added, removed or changed while the dev server runs.
function imageCatalogue() {
  const run = () => execFileSync(process.execPath, ['tools/build-manifest.js'], { stdio: 'inherit' });
  return {
    name: 'petal-post-image-catalogue',
    buildStart: run,
    configureServer(server) {
      const watched = (file) => {
        const rel = path.relative(path.resolve('public'), file).split(path.sep);
        return IMAGE_DIRS.includes(rel[0]) && /\.(png|jpe?g|webp|svg|avif|json)$/i.test(file);
      };
      const onChange = (file) => { if (watched(file)) run(); };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}

export default defineConfig({
  base: './', // relative paths, so the built site works in any folder or host
  plugins: [react(), imageCatalogue()],
  server: { port: 5173 },
});
