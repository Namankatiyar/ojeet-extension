# ui-injector.js - Standard UI Fallback

## Technical Details
- **Role:** A "failsafe" mechanism to ensure the user can always save a note even if the target site blocks content script communication.
- **Method:** Injects a self-contained Note Editor UI directly into the page via `chrome.scripting.executeScript`.
- **Isolation:** Uses a Shadow DOM with `all: initial` to bypass the host page's CSS.

## Code Snippets

### Self-Contained UI Injection
```javascript
export async function showUIDirectly(tabId, screenshot, videoInfo) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (screenshotData, videoData) => {
      const overlayRoot = document.createElement('div');
      overlayRoot.id = 'ojeet-overlay-root';
      const shadow = overlayRoot.attachShadow({ mode: 'closed' });
      shadow.innerHTML = `<style>...</style>...`;
      document.body.appendChild(overlayRoot);
    }
  });
}
```
