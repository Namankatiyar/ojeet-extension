/**
 * Screenshot Manager
 * Handles screenshot capture, cropping via offscreen document, and storage.
 * 
 * @module screenshot-manager
 */

/**
 * @typedef {Object} VideoBounds
 * @property {number} x - Left position
 * @property {number} y - Top position
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 * @property {number} devicePixelRatio - Device pixel ratio
 */

/**
 * Capture the visible tab as a PNG data URL.
 * 
 * @param {number} windowId - Target window ID
 * @returns {Promise<string>} PNG data URL
 */
export async function captureTab(windowId) {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
        format: 'png',
    });
    console.log('Tab captured, data URL length:', dataUrl?.length);
    return dataUrl;
}

/**
 * Crop a screenshot to the video bounds using the offscreen document.
 * Falls back to the uncropped image if cropping fails.
 * 
 * @param {string} dataUrl - Full-page screenshot data URL
 * @param {VideoBounds} bounds - Video element viewport bounds
 * @returns {Promise<string>} Cropped (or original) data URL
 */
export async function cropScreenshot(dataUrl, bounds) {
    try {
        // Ensure offscreen document exists
        let existingContexts = [];
        try {
            existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT'],
            });
        } catch (e) {
            console.log('getContexts not available');
        }

        if (existingContexts.length === 0) {
            try {
                await chrome.offscreen.createDocument({
                    url: 'src/background/offscreen.html',
                    reasons: ['BLOBS'],
                    justification: 'Crop screenshot image',
                });
                console.log('Offscreen document created');
            } catch (e) {
                console.log('Could not create offscreen document:', e);
                return dataUrl;
            }
        }

        // Send crop request
        const response = await chrome.runtime.sendMessage({
            type: 'CROP_IMAGE',
            payload: { dataUrl, bounds },
        });

        return response?.data || dataUrl;
    } catch (error) {
        console.error('Crop failed:', error);
        return dataUrl;
    }
}
