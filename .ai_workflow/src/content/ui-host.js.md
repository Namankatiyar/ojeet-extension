# ui-host.js & ui-host.css - UI Overlay Manager

## Technical Details
- **Role:** Renders the Note Editor and Toast notifications directly on the video page.
- **Isolation:** Uses **Shadow DOM** (`#ojeet-overlay-root`) with `mode: 'closed'` to prevent page scripts from interfering with the UI.
- **Events:** Implements aggressive event stopping (`stopPropagation`) for keyboard inputs while the editor is open to prevent triggering YouTube shortcuts.
- **Communication:** Listens for `SHOW_UI` and `SHOW_SCREENSHOT_TOAST` from the background.

## Code Snippets

### Shadow DOM Initialization
```javascript
const root = document.createElement('div');
root.id = 'ojeet-overlay-root';
const shadow = root.attachShadow({ mode: 'closed' });
shadow.appendChild(styleElement);
shadow.appendChild(editorContainer);
document.body.appendChild(root);
```
