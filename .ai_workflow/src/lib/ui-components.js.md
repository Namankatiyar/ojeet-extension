# ui-components.js - Shared UI Rendering Logic

## Technical Details
- **Role:** Consolidates all UI-related logic and HTML generation into a single module shared by the Dashboard and Popup.
- **Key Features:**
  - **Formatting:** `formatTimestamp`, `formatDate`, `truncate`, `escapeHtml`.
  - **Shared UI:** `createNoteCardHTML` generates a consistent HTML structure for notes across all views.
  - **Logic:** `buildVideoUrl` handles timestamped link generation based on provider types.
- **Impact:** Eliminates massive code duplication between `dashboard.js` and `popup.js`.

## Code Snippets

### Shared Note Card Generation
```javascript
export function createNoteCardHTML(note, options = {}) {
  // ... metadata extraction ...
  return `
    <div class="note-card" data-uuid="${note.uuid}">
      <div class="note-card-header">
        <div class="note-meta">
          <button class="timestamp-badge" data-video-id="${note.videoId}" data-time="${note.timestampSeconds}">
            ${timestampText}
          </button>
          ${!compact ? `<span class="video-title" ...>${videoTitle}</span>` : ''}
        </div>
        <!-- ... actions ... -->
      </div>
      <!-- ... screenshot and text ... -->
    </div>
  `;
}
```
