/**
 * Messaging Module - Cross-context communication wrapper
 * Provides typed message passing between content scripts and background.
 * 
 * @module messaging
 */

// ============ JSDoc Type Definitions ============

/**
 * @typedef {Object} VideoBounds
 * @property {number} x - Left position relative to viewport
 * @property {number} y - Top position relative to viewport
 * @property {number} width - Width in CSS pixels
 * @property {number} height - Height in CSS pixels
 * @property {number} devicePixelRatio - Device pixel ratio for HiDPI
 */

/**
 * @typedef {Object} VideoInfo
 * @property {string} videoId - Unique video identifier
 * @property {'youtube-direct'|'youtube-embed'|'generic-html5'} provider - Video provider type
 * @property {string} title - Video title
 * @property {number} currentTime - Current playback position in seconds
 * @property {number} duration - Total video duration in seconds
 * @property {boolean} isLive - Whether the video is a livestream
 * @property {boolean} isPaused - Whether the video is currently paused
 * @property {VideoBounds} bounds - Video element viewport bounds
 */

/**
 * @typedef {Object} CaptureRequest
 * @property {VideoInfo} videoInfo - Video metadata from the content script
 * @property {string} [screenshot] - Screenshot data URL (if captured)
 * @property {string} [noteText] - User's note text
 */

/**
 * @typedef {Object} ShowUIPayload
 * @property {string} screenshot - Screenshot data URL
 * @property {VideoInfo} videoInfo - Video metadata
 */

/**
 * @typedef {Object} SaveDataPayload
 * @property {VideoInfo} videoInfo - Video metadata
 * @property {string} noteText - User's note text
 * @property {string} [screenshot] - Screenshot data URL (optional)
 */

/**
 * @typedef {Object} ToastPayload
 * @property {string} [timestamp] - Formatted timestamp string
 * @property {string} message - Toast message text
 */

/**
 * @typedef {Object} RestoreStatePayload
 * @property {boolean} [restoreFullscreen] - Whether to restore fullscreen mode
 * @property {boolean} [resumePlayback] - Whether to resume video playback
 */

/**
 * @typedef {Object} UIClosedPayload
 * @property {boolean} wasFullscreen - Whether the video was in fullscreen before the UI opened
 */

/**
 * @typedef {Object} CropImagePayload
 * @property {string} dataUrl - Full-page screenshot data URL
 * @property {VideoBounds} bounds - Crop region bounds
 */

/**
 * @typedef {Object} MessageResponse
 * @property {boolean} success - Whether the operation succeeded
 * @property {*} [data] - Response data (varies by message type)
 * @property {string} [error] - Error message if success is false
 */

// ============ Message Types ============

/** Enum of all message types used across contexts. */
export const MessageTypes = {
  // Video Agent → Background
  /** @type {'CAPTURE_REQUEST'} */
  CAPTURE_REQUEST: 'CAPTURE_REQUEST',
  /** @type {'GET_VIDEO_INFO'} */
  GET_VIDEO_INFO: 'GET_VIDEO_INFO',

  // Background → UI Host
  /** @type {'SHOW_UI'} — Payload: {@link ShowUIPayload} */
  SHOW_UI: 'SHOW_UI',
  /** @type {'SHOW_SCREENSHOT_TOAST'} — Payload: {@link ToastPayload} */
  SHOW_SCREENSHOT_TOAST: 'SHOW_SCREENSHOT_TOAST',

  // UI Host → Background
  /** @type {'SAVE_DATA'} — Payload: {@link SaveDataPayload} */
  SAVE_DATA: 'SAVE_DATA',
  /** @type {'UI_CLOSED'} — Payload: {@link UIClosedPayload} */
  UI_CLOSED: 'UI_CLOSED',

  // Background → Video Agent
  /** @type {'RESTORE_STATE'} — Payload: {@link RestoreStatePayload} */
  RESTORE_STATE: 'RESTORE_STATE',
  /** @type {'REQUEST_VIDEO_INFO'} */
  REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO',

  // Offscreen Document
  /** @type {'CROP_IMAGE'} — Payload: {@link CropImagePayload} */
  CROP_IMAGE: 'CROP_IMAGE',

  // Generic
  /** @type {'PING'} */
  PING: 'PING',
  /** @type {'PONG'} */
  PONG: 'PONG',
};

// ============ Messaging Functions ============

/**
 * Send a message to the background script.
 * @param {string} type - Message type from MessageTypes
 * @param {Object} payload - Message payload
 * @returns {Promise<MessageResponse>} Response from background
 */
export async function sendToBackground(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload });
}

/**
 * Send a message to a specific tab.
 * @param {number} tabId - Target tab ID
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @param {Object} [options={}] - Additional options (e.g. { frameId: 0 })
 * @returns {Promise<MessageResponse>}
 */
export async function sendToTab(tabId, type, payload = {}, options = {}) {
  return chrome.tabs.sendMessage(tabId, { type, payload }, options);
}

/**
 * Send a message to all frames in a tab.
 * Failures on individual frames are silently ignored.
 * 
 * @param {number} tabId - Target tab ID
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @returns {Promise<Array<MessageResponse|null>>}
 */
export async function broadcastToTab(tabId, type, payload = {}) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  const promises = frames.map(frame =>
    chrome.tabs.sendMessage(tabId, { type, payload }, { frameId: frame.frameId })
      .catch(() => null)
  );
  return Promise.all(promises);
}

/**
 * Create a message listener with type-based routing.
 * 
 * @param {Object<string, function(Object, chrome.runtime.MessageSender): (Promise<*>|*)>} handlers
 *   Object mapping message types to handler functions.
 *   Handlers receive (payload, sender) and may return a value or Promise.
 * @returns {function} Listener function for chrome.runtime.onMessage.addListener
 */
export function createMessageListener(handlers) {
  return (message, sender, sendResponse) => {
    const { type, payload } = message;
    const handler = handlers[type];

    if (handler) {
      const result = handler(payload, sender);

      if (result instanceof Promise) {
        result
          .then(response => sendResponse({ success: true, data: response }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
      }

      sendResponse({ success: true, data: result });
    }

    return false;
  };
}
