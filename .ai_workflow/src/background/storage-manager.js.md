# storage-manager.js - Background Data Saver

## Technical Details
- **Role:** Specialized storage wrapper for the background context.
- **Features:**
  - **Auto-Rollback:** If screenshot save fails, the metadata (note/video) is deleted to prevent inconsistent state.
  - **Video Tracking:** Automatically updates video metadata (title, URL) whenever a note is saved.
  - **Typed Storage:** Handles conversion of raw data URLs to IDs before saving.

## Code Snippets

### Transaction Safety
```javascript
export async function saveToStorage(videoInfo, noteText, imageId, screenshot, tabUrl) {
  // 1. Save video & note metadata
  await chrome.storage.local.set({ videos, notes });
  // 2. Try screenshot save
  if (imageId && screenshot) {
    try {
      await saveScreenshot(imageId, screenshot);
    } catch (e) {
      // 3. Rollback metadata if screenshot fails
      await rollbackNote(note.uuid);
      throw e;
    }
  }
}
```
