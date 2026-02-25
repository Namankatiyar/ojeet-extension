# commands.js - Background Shortcut Handlers

## Technical Details
- **Role:** Implements the logic for keyboard shortcuts defined in `manifest.json`.
- **Functions:**
  - `handleScreenshot`: Coordinates video info retrieval, tab capture, cropping, and UI injection or quick saving.
  - `handleTimestamp`: Quick-saves a timestamp without a screenshot.
  - `handleNoteEditor`: Opens the overlay UI for the current video.
- **Orchestration:** Imports from specialized managers (`screenshot-manager`, `storage-manager`, `video-info-requester`).

## Code Snippets

### Main Screenshot Command Logic
```javascript
export async function handleScreenshot(tab, openEditor = false) {
  const videoInfo = await requestVideoInfo(tab.id);
  // ... check validity ...
  const dataUrl = await captureTab(tab.windowId);
  const croppedDataUrl = await cropScreenshot(dataUrl, videoInfo.bounds);

  if (openEditor) {
    await injectUI(tab.id, croppedDataUrl, videoInfo);
  } else {
    const imageId = generateId();
    await saveToStorage(videoInfo, '', imageId, croppedDataUrl, tab.url);
  }
}
```
