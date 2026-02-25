# storage.js - Unified Data Persistence

## Technical Details
- **Role:** Handles metadata storage in `chrome.storage.local` and binary screenshots in **IndexedDB**.
- **Refactoring:**
  - Added **Transaction Safety**: `saveNoteWithScreenshot()` ensures that a note is rolled back if its associated screenshot fails to save.
  - Standardized timestamps and UUID generation.
  - Linked deletion: Deleting a note automatically cleans up its screenshot from IndexedDB.

## Code Snippets

### Transactional Save with Rollback
```javascript
export async function saveNoteWithScreenshot(noteData, screenshotDataUrl) {
  const note = await saveNote(noteData);
  if (noteData.imageId && screenshotDataUrl) {
    try {
      await saveScreenshot(noteData.imageId, screenshotDataUrl);
    } catch (screenshotError) {
      await deleteNote(note.uuid); // Rollback
      throw new Error(`Transaction failed: ${screenshotError.message}`);
    }
  }
  return note;
}
```
