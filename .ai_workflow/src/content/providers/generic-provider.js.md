# generic-provider.js - HTML5 Fallback Strategy

## Technical Details
- **Role:** Catch-all provider for any site using standard `<video>` elements (Vimeo, Twitter, personal sites).
- **Selection Heuristics:**
  - If multiple videos exist, it prioritizes a currently playing video.
  - If none are playing, it selects the largest visible video (surface area calculation).
- **ID Generation:** Uses a stable hash of the URL to generate a "Video ID" for non-platform sites.

## Code Snippets

### Multi-Video Heuristics
```javascript
getVideoElement() {
  const videos = Array.from(document.querySelectorAll('video'));
  if (videos.length === 1) return videos[0];
  // 1. Prioritize playing video
  let video = videos.find(v => !v.paused);
  // 2. Fallback to largest area
  if (!video) {
    video = videos.reduce((best, v) => {
      const area = v.offsetWidth * v.offsetHeight;
      return area > bestArea ? v : best;
    }, null);
  }
  return video;
}
```
