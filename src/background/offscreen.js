/**
 * Offscreen Document Script
 * Handles image cropping using Canvas API (required for MV3)
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CROP_IMAGE') {
    cropImage(message.payload)
      .then(dataUrl => sendResponse({ success: true, data: dataUrl }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Crop an image to specified bounds
 */
async function cropImage({ dataUrl, bounds }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Account for device pixel ratio
        const dpr = bounds.devicePixelRatio || 1;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to cropped dimensions
        canvas.width = bounds.width * dpr;
        canvas.height = bounds.height * dpr;
        
        // Draw cropped portion
        ctx.drawImage(
          img,
          bounds.x * dpr,      // Source X
          bounds.y * dpr,      // Source Y
          bounds.width * dpr,  // Source Width
          bounds.height * dpr, // Source Height
          0,                   // Dest X
          0,                   // Dest Y
          canvas.width,        // Dest Width
          canvas.height        // Dest Height
        );
        
        // Convert to WebP for smaller file size
        const croppedDataUrl = canvas.toDataURL('image/webp', 0.9);
        resolve(croppedDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
