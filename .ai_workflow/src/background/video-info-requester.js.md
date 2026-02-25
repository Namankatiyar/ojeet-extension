# video-info-requester.js - Multi-Frame Search Logic

## Technical Details
- **Role:** Locates active video elements across complex page structures (nested iframes).
- **Fallback Hierarchy:**
  1. **Top Level:** Sends message to frameId 0.
  2. **Nested Frames:** Iterates through all frames, prioritizing those with "youtube.com" URLs.
  3. **Injection:** Last-resort fallback that injects raw JavaScript via `chrome.scripting.executeScript` if content scripts aren't responding.

## Code Snippets

### Hierarchical Search
```javascript
export async function requestVideoInfo(tabId) {
  // 1. Try frame 0
  const topResponse = await send(tabId, frameId: 0);
  if (topResponse) return topResponse;

  // 2. Try all subframes
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  for (const frame of frames) {
    const res = await send(tabId, frame.frameId);
    if (res) return res;
  }

  // 3. Fallback injection
  return await injectDiscoveryScript(tabId);
}
```
