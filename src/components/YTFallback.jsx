import { useState } from 'react';
import { YT_WHY, ytCanRetry, ytThumb, ytWatchUrl } from '../lib/youtube.js';

// Shown when a YouTube player can't load: the song's cover, a button to listen on YouTube,
// and (when it might help) a way to try the player again.
export default function YTFallback({ yt, failure, onRetry }) {
  const [thumb, setThumb] = useState(true);
  const { why, code } = failure;
  return (
    <div className="yt-fallback">
      {thumb && <img src={ytThumb(yt)} alt="" loading="lazy" onError={() => setThumb(false)} />}
      <span className="yt-fb-text">
        <a href={ytWatchUrl(yt)} target="_blank" rel="noopener"><b>▶ Listen on YouTube ↗</b></a>
        <small>{YT_WHY[why] || ''}{code != null ? ` (YouTube error ${code})` : ''}</small>
        {onRetry && ytCanRetry(why) && <button className="yt-retry" type="button" onClick={onRetry}>↻ Try again</button>}
      </span>
    </div>
  );
}
