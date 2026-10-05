// YouTube songs: parsing links and mounting a player that fails gracefully.

export function parseYouTube(text) {
  let u;
  try { u = new URL(String(text).trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1, 12);
  else if (/^(youtube\.com|youtube-nocookie\.com)$/.test(host)) {
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/) || [])[1];
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const t = u.searchParams.get('t') || u.searchParams.get('start') || '';
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  const start = m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
  return { id, start: Math.min(start, 36000), title: '' };
}

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const ytWatchUrl = (yt) => `https://www.youtube.com/watch?v=${yt.id}${yt.start ? `&t=${yt.start}s` : ''}`;
export const ytThumb = (yt) => `https://i.ytimg.com/vi/${yt.id}/hqdefault.jpg`;
export const YT_WHY = {
  owner: 'The song’s owner only allows it to play on YouTube.',
  file: 'Songs play here once the site is opened with npm run dev or hosted online.',
  config: 'YouTube declined to play it inside this page.',
  blocked: 'The player couldn’t load here (a browser extension or network may be blocking it).',
  slow: 'The player took too long to load.',
  offline: 'YouTube couldn’t be reached.',
};
// Retrying is worth offering for anything that isn't the owner's choice or a local file.
export const ytCanRetry = (why) => !['owner', 'file'].includes(why);

let ytApi = null;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve();
  if (!ytApi) {
    ytApi = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => { ytApi = null; reject(new Error('YouTube could not be reached.')); };
      document.head.append(tag);
    });
  }
  return ytApi;
}

/* Mounts a YouTube player inside `host` (an element React leaves empty) and makes sure it either
   works or fails gracefully: tries the privacy-mode player, then the regular one, and calls
   onFail(reason, code) if neither becomes ready. `code` is YouTube's error number, if it sent one. */
const READY_WAIT = 15000; // the page is busy animating while the player loads, so be patient
export function mountYT(host, yt, { onReady, onStateChange, onFail }) {
  const hosts = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];
  let player = null, cur = -1, done = false, timer = 0, lastCode = null, timedOut = false;
  const api = {
    get player() { return player; },
    destroy() { done = true; clearTimeout(timer); try { player?.destroy(); } catch { /* ignore */ } },
  };
  const fail = (why) => { if (done) return; done = true; clearTimeout(timer); try { player?.destroy(); } catch { /* ignore */ } onFail(why, lastCode); };
  if (location.protocol === 'file:') { setTimeout(() => fail('file'), 0); return api; }
  const attempt = (i) => {
    if (done) return;
    if (i >= hosts.length) {
      // 152/153: YouTube's "player configuration" refusals; no code at all means it never loaded
      return fail([152, 153].includes(lastCode) ? 'config' : lastCode != null ? 'blocked' : timedOut ? 'slow' : 'blocked');
    }
    cur = i;
    try { player?.destroy(); } catch { /* ignore */ }
    const slot = document.createElement('div'); // YT replaces this element with its iframe
    host.replaceChildren(slot);
    player = new window.YT.Player(slot, {
      host: hosts[i], videoId: yt.id, width: '100%', height: '100%',
      playerVars: {
        start: yt.start || 0, playsinline: 1, rel: 0, modestbranding: 1,
        // say which site is embedding the player; YouTube refuses some embeds that don't
        origin: location.origin, widget_referrer: location.href,
      },
      events: {
        onReady: (e) => { if (done || cur !== i) return; clearTimeout(timer); onReady?.(e); },
        onStateChange: (e) => { if (!done && cur === i) onStateChange?.(e); },
        onError: (e) => {
          if (done || cur !== i) return;
          clearTimeout(timer);
          lastCode = e.data;
          if ([100, 101, 150].includes(e.data)) fail('owner'); // removed, or embedding turned off by the owner
          else attempt(i + 1);
        },
      },
    });
    timer = setTimeout(() => { timedOut = true; attempt(i + 1); }, READY_WAIT);
  };
  loadYT().then(() => attempt(0)).catch(() => fail('offline'));
  return api;
}
