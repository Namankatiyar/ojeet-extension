# config.js - Centralized Configuration

## Technical Details
- **Role:** Single source of truth for all constants, selectors, and magic numbers.
- **Scope:** Exported as an ES module for use in the service worker and as a reference for content scripts.
- **Key Categories:**
  - UI Constants (Z-indexes, timeouts).
  - Screenshot settings (format, quality).
  - Storage keys and database names.
  - Video platform selectors (YouTube titles, video elements).
  - URL patterns for ID extraction.
  - File paths for extension resources.

## Code Snippets

### YouTube Selectors
```javascript
export const YOUTUBE_VIDEO_SELECTORS = [
  'video.html5-main-video',
  '.html5-video-container video',
  '#movie_player video',
  '.video-stream.html5-main-video',
  'ytd-player video',
  'video',
];
```

### Storage Keys
```javascript
export const STORAGE_KEYS = {
  VIDEOS: 'videos',
  NOTES: 'notes',
  SCREENSHOTS: 'screenshots',
};
```
