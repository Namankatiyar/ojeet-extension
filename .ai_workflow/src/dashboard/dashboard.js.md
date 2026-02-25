# dashboard.js - Full Page Browser Logic

## Technical Details
- **Role:** Main logic for the notes dashboard.
- **Refactoring:** Converted to an **ES Module**. Now imports all utility and storage logic from shared libraries (`ui-components.js`, `storage.js`).
- **Features:**
  - **Dynamic Rendering:** Three views (All Notes, By Video, Screenshots).
  - **Image Processing:** Zoom, Rotate, and Fullscreen modal for screenshots.
  - **Data Management:** Uses `storage.js` for atomic deletes and exports.
  - **Real-time Search:** Filters both note text and video titles.

## Code Snippets

### Modular Imports
```javascript
import { createNoteCardHTML } from '../lib/ui-components.js';
import { getAllNotes, deleteNote } from '../lib/storage.js';

async function loadData() {
  allNotes = await getAllNotes();
  // ... update local state maps ...
}
```
