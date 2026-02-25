# screenshot-manager.js - Capture & Cropping Logic

## Technical Details
- **Role:** Handles low-level tab capture and coordinates image processing.
- **Offscreen Integration:** Automatically creates and communicates with an offscreen document to perform pixel-perfect cropping using the Canvas API.
- **Resilience:** Falls back to uncropped full-page screenshots if offscreen document creation or cropping fails.

## Code Snippets

### Offscreen Cropping Coordination
```javascript
export async function cropScreenshot(dataUrl, bounds) {
  // Ensure offscreen doc exists...
  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'src/background/offscreen.html',
      reasons: ['BLOBS'], justification: 'Crop screenshot image'
    });
  }
  const response = await chrome.runtime.sendMessage({
    type: 'CROP_IMAGE', payload: { dataUrl, bounds }
  });
  return response?.data || dataUrl;
}
```
