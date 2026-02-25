# UI Host CSS Summary

## Technical Details
- **Purpose:** strict CSS isolation for the extension's overlay containers.
- **Key Rules:**
    - Uses `all: initial` to reset all inherited properties, preventing the host page's CSS from bleeding into the extension UI.
    - Sets `z-index: 2147483647` (max 32-bit integer) to ensure the UI stays on top of everything.
    - Manages `pointer-events` to allow clicking through the container when appropriate.

## Important Code Snippets

```css
#ojeet-overlay-root,
#ojeet-toast-container {
  all: initial;
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
}

#ojeet-overlay-root *,
#ojeet-toast-container * {
  pointer-events: auto;
}
```
