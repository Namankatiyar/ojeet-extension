# youtube-provider.js - YouTube Specialized Logic

## Technical Details
- **Role:** Implementation of `VideoProvider` tailored for YouTube.
- **Key Features:**
  - Robust ID extraction (URL params, SPA paths, embeds, shorts, canonical links).
  - Specialized title detection (handles YouTube's custom DOM structure).
  - Live Stream detection (via `.ytp-live-badge`).
  - SPA Navigation support: invalidates cache on `yt-navigate-finish`.

## Code Snippets

### Advanced ID Extraction
```javascript
getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  const vParam = urlParams.get('v');
  if (vParam) return vParam;

  const embedMatch = window.location.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  // ... shorts, live, canonical ...
}
```
