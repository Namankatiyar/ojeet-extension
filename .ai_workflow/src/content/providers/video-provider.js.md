# video-provider.js - Platform Strategy Interface

## Technical Details
- **Role:** Abstract base class for the **Video Provider Strategy Pattern**.
- **Interface:** Defines mandatory methods for platform-specific implementations:
  - `canHandle()`: Boolean check for page compatibility.
  - `getVideoElement()`: DOM query for the player.
  - `getVideoId()`: Platform-specific ID extraction.
  - `getVideoInfo()`: Template method that gathers all metadata.

## Code Snippets

### Provider Interface
```javascript
export class VideoProvider {
  getVideoInfo() {
    const video = this.getVideoElement();
    const videoId = this.getVideoId();
    if (!video || !videoId) return null;
    const rect = video.getBoundingClientRect();
    return {
      videoId, provider: this.getProviderType(),
      title: this.getTitle(), currentTime: video.currentTime,
      bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    };
  }
}
```
