/**
 * Video Info Requester
 * Handles multi-frame video info request logic.
 * Tries main frame, then all sub-frames, then dynamic injection as fallback.
 * 
 * @module video-info-requester
 */

const MessageTypes = {
    REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO',
};

/**
 * Request video info from all frames in a tab, returning the first valid response.
 * 
 * Tries in order:
 * 1. Main frame (frameId 0)
 * 2. All sub-frames (prioritizing YouTube frames)
 * 3. Dynamic script injection (last resort)
 * 
 * @param {number} tabId - Target tab ID
 * @returns {Promise<Object|null>} Video info object, or null if no video found
 */
export async function requestVideoInfo(tabId) {
    console.log('Requesting video info from tab:', tabId);

    // 1. Try main frame
    try {
        console.log('Trying main frame...');
        const response = await chrome.tabs.sendMessage(
            tabId,
            { type: MessageTypes.REQUEST_VIDEO_INFO, payload: {} },
            { frameId: 0 }
        );

        if (response?.success && response.data) {
            console.log('Got video info from main frame');
            return response.data;
        }
    } catch (e) {
        console.log('Main frame did not respond:', e.message);
    }

    // 2. Try all sub-frames
    try {
        const frames = await chrome.webNavigation.getAllFrames({ tabId });
        console.log('Found frames:', frames?.length);

        if (frames) {
            // Prioritize YouTube frames
            const sortedFrames = frames.sort((a, b) => {
                const aIsYT = a.url?.includes('youtube.com') ? -1 : 1;
                const bIsYT = b.url?.includes('youtube.com') ? -1 : 1;
                return aIsYT - bIsYT;
            });

            for (const frame of sortedFrames) {
                if (frame.frameId === 0) continue; // Already tried

                try {
                    console.log('Trying frame:', frame.frameId, frame.url?.substring(0, 50));
                    const response = await chrome.tabs.sendMessage(
                        tabId,
                        { type: MessageTypes.REQUEST_VIDEO_INFO, payload: {} },
                        { frameId: frame.frameId }
                    );

                    if (response?.success && response.data) {
                        console.log('Got video info from frame:', frame.frameId);
                        return response.data;
                    }
                } catch (e) {
                    continue; // Frame doesn't have content script
                }
            }
        }
    } catch (error) {
        console.error('Failed to enumerate frames:', error);
    }

    // 3. Last resort: dynamic script injection
    try {
        console.log('Trying dynamic script injection...');
        const results = await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            func: () => {
                const video = document.querySelector('video');
                if (!video) return null;

                const rect = video.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return null;

                const urlParams = new URLSearchParams(window.location.search);
                let videoId = urlParams.get('v');

                if (!videoId) {
                    const match = window.location.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
                    if (match) videoId = match[1];
                }
                if (!videoId) {
                    const match = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
                    if (match) videoId = match[1];
                }
                if (!videoId) {
                    videoId = 'video-' + Date.now();
                }

                return {
                    videoId,
                    provider: window.location.hostname.includes('youtube') ? 'youtube-direct' : 'generic-html5',
                    title: document.title,
                    currentTime: video.currentTime,
                    duration: video.duration || 0,
                    isLive: false,
                    isPaused: video.paused,
                    bounds: {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height,
                        devicePixelRatio: window.devicePixelRatio || 1,
                    },
                };
            },
        });

        console.log('Script injection results:', results?.length);
        for (const result of results) {
            if (result.result) {
                console.log('Got video info via dynamic injection from frame:', result.frameId);
                return result.result;
            }
        }
    } catch (error) {
        console.error('Dynamic script injection failed:', error);
    }

    console.log('No video found in any frame');
    return null;
}
