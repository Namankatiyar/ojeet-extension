# service-worker.js - Context Orchestrator

## Technical Details
- **Role:** Main entry point for the extension background. Refactored from a 700+ line monolith into a slim orchestrator.
- **Refactoring:** Uses **ES Modules** (`type: module` in manifest) to import specialized logic.
- **Responsibilities:**
  - Standardizing Chrome event listeners (`onCommand`, `onMessage`).
  - Routing messages to specialized handlers.
  - Managing high-level context (tab IDs, sender URLs).

## Code Snippets

### Slim Entry Point
```javascript
import { handleScreenshot, handleTimestamp, handleNoteEditor } from './commands.js';
import { saveToStorage } from './storage-manager.js';

chrome.commands.onCommand.addListener(async (command, tab) => {
  switch (command) {
    case 'take-screenshot': await handleScreenshot(tab, false); break;
    case 'save-timestamp': await handleTimestamp(tab); break;
    case 'open-note-editor': await handleNoteEditor(tab); break;
  }
});
```
