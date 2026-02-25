# offscreen.html & offscreen.js - Image Processing Service

## Technical Details
- **Role:** Provides access to the HTML5 Canvas API for image cropping, which is restricted in Manifest V3 Service Workers.
- **Workflow:**
  1. Background sends `CROP_IMAGE` message with full-page dataURL and video bounds.
  2. `offscreen.js` draws the image to a hidden canvas, crops to bounds.
  3. Returns a compact WebP dataURL back to the service worker.
- **Efficiency:** Drastically reduces storage size by storing only the relevant video portion.

## Code Snippets

### Canvas Cropping
```javascript
async function handleCrop(payload) {
  const { dataUrl, bounds } = payload;
  const img = await loadImage(dataUrl);
  canvas.width = bounds.width * bounds.devicePixelRatio;
  canvas.height = bounds.height * bounds.devicePixelRatio;
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.8);
}
```
