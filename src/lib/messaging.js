/**
 * Messaging Module - Cross-context communication wrapper
 * Provides typed message passing between content scripts and background
 */

// Message Types
export const MessageTypes = {
  // Video Agent -> Background
  CAPTURE_REQUEST: 'CAPTURE_REQUEST',
  GET_VIDEO_INFO: 'GET_VIDEO_INFO',
  
  // Background -> UI Host
  SHOW_UI: 'SHOW_UI',
  SHOW_SCREENSHOT_TOAST: 'SHOW_SCREENSHOT_TOAST',
  
  // UI Host -> Background
  SAVE_DATA: 'SAVE_DATA',
  UI_CLOSED: 'UI_CLOSED',
  
  // Background -> Video Agent
  RESTORE_STATE: 'RESTORE_STATE',
  REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO',
  
  // Generic
  PING: 'PING',
  PONG: 'PONG'
};

/**
 * Send a message to the background script
 * @param {string} type - Message type from MessageTypes
 * @param {object} payload - Message payload
 * @returns {Promise<any>} Response from background
 */
export async function sendToBackground(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload });
}

/**
 * Send a message to a specific tab
 * @param {number} tabId - Target tab ID
 * @param {string} type - Message type
 * @param {object} payload - Message payload
 * @param {object} options - Additional options (frameId, etc.)
 */
export async function sendToTab(tabId, type, payload = {}, options = {}) {
  return chrome.tabs.sendMessage(tabId, { type, payload }, options);
}

/**
 * Send message to all frames in a tab
 * @param {number} tabId - Target tab ID
 * @param {string} type - Message type
 * @param {object} payload - Message payload
 */
export async function broadcastToTab(tabId, type, payload = {}) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  const promises = frames.map(frame => 
    chrome.tabs.sendMessage(tabId, { type, payload }, { frameId: frame.frameId })
      .catch(() => null) // Ignore frames that can't receive messages
  );
  return Promise.all(promises);
}

/**
 * Create a message listener with type routing
 * @param {object} handlers - Object mapping message types to handler functions
 * @returns {function} Listener function to pass to chrome.runtime.onMessage.addListener
 */
export function createMessageListener(handlers) {
  return (message, sender, sendResponse) => {
    const { type, payload } = message;
    const handler = handlers[type];
    
    if (handler) {
      const result = handler(payload, sender);
      
      // Handle async handlers
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
