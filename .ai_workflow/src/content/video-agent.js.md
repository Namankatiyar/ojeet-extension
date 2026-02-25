# video-agent.js - Content Script Entry Point

## Technical Details
- **Role:** Platform-agnostic content script that detects and controls video playback.
- **Refactoring:** Now uses the **Provider Pattern**. It holds a registry of platform providers and delegates all detection logic to the first one that can handle the page.
- **Features:**
  - Play/Pause control for screenshot capture.
  - Fullscreen restoration logic.
  - SPA Navigation listeners (YouTube specific).
  - Response helper for `REQUEST_VIDEO_INFO`.

## Code Snippets

### Provider Strategy implementation
```javascript
const providers = [ new YouTubeProvider(), new GenericProvider() ];

function getActiveProvider() {
  return providers.find(p => p.canHandle()) || providers[1];
}

function getVideoInfo() {
  return getActiveProvider().getVideoInfo();
}
```
