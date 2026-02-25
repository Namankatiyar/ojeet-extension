# messaging.js - Typed Cross-Context Communication

## Technical Details
- **Role:** Wrapper for Chrome's messaging API to provide type safety and structured responses.
- **Key Improvements:**
  - Added comprehensive **JSDoc Typedefs** for all message payloads (`VideoInfo`, `SaveDataPayload`, etc.).
  - Centralized `MessageTypes` enum.
  - Utility functions: `sendToBackground`, `sendToTab`, `broadcastToTab`.
  - Higher-order function `createMessageListener` for cleaner message routing.

## Code Snippets

### Message Payload Types
```javascript
/**
 * @typedef {Object} SaveDataPayload
 * @property {VideoInfo} videoInfo
 * @property {string} noteText
 * @property {string} [screenshot]
 */
```

### Broadcast Helper
```javascript
export async function broadcastToTab(tabId, type, payload = {}) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  const promises = frames.map(frame =>
    chrome.tabs.sendMessage(tabId, { type, payload }, { frameId: frame.frameId })
      .catch(() => null)
  );
  return Promise.all(promises);
}
```
