/**
 * UI Host Content Script
 * Runs in TOP-LEVEL frame only
 * Renders overlay UI and handles user interaction
 */

// Prevent multiple initializations
if (window.__ojeetUIHostInitialized) {
  console.log('[Ojeet UI Host] Already initialized, skipping');
} else {
  window.__ojeetUIHostInitialized = true;
  
  (function() {
    'use strict';
    
    console.log('[Ojeet UI Host] Initializing...');
    
    // Message types
    const MessageTypes = {
      SHOW_UI: 'SHOW_UI',
      SHOW_SCREENSHOT_TOAST: 'SHOW_SCREENSHOT_TOAST',
      SAVE_DATA: 'SAVE_DATA',
      UI_CLOSED: 'UI_CLOSED'
    };
    
    // State
    let currentVideoInfo = null;
    let currentScreenshot = null;
    let wasFullscreen = false;
    let escapeHandler = null;
    
    /**
     * Close any existing overlay
     */
    function closeExistingOverlay() {
      const existing = document.getElementById('ojeet-overlay-root');
      if (existing) {
        existing.remove();
      }
      if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler, true);
        escapeHandler = null;
      }
    }
    
    /**
     * Format time as MM:SS or HH:MM:SS
     */
    function formatTime(seconds) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Show the note editor overlay
     */
    function showNoteEditor(screenshot, videoInfo) {
      console.log('[Ojeet UI Host] showNoteEditor called');
      
      // Close any existing overlay first
      closeExistingOverlay();
      
      currentScreenshot = screenshot;
      currentVideoInfo = videoInfo;
      
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        wasFullscreen = true;
        document.exitFullscreen().catch(() => {});
      }
      
      // Create overlay container
      const overlayRoot = document.createElement('div');
      overlayRoot.id = 'ojeet-overlay-root';
      overlayRoot.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto;';
      
      const shadowRoot = overlayRoot.attachShadow({ mode: 'closed' });
      
      const timestamp = formatTime(videoInfo.currentTime);
      
      shadowRoot.innerHTML = `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          .overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            display: flex; align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: fadeIn 0.2s ease;
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .modal {
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 16px; padding: 24px;
            max-width: 500px; width: 90%; max-height: 85vh; overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(6, 182, 212, 0.15);
            animation: slideUp 0.3s ease;
          }
          .modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
          .modal-header h2 { color: #fff; font-size: 18px; font-weight: 600; flex: 1; }
          .timestamp {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            color: white; padding: 4px 12px; border-radius: 20px;
            font-size: 13px; font-weight: 600; font-family: monospace;
          }
          .close-btn {
            background: none; border: none; color: #888; font-size: 24px;
            cursor: pointer; padding: 4px 8px; border-radius: 4px;
            transition: all 0.2s;
          }
          .close-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
          .screenshot-preview { margin-bottom: 20px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
          .screenshot-preview img { width: 100%; height: auto; display: block; }
          .note-input {
            width: 100%; background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 10px; padding: 14px; color: #fff;
            font-size: 14px; font-family: inherit;
            font-size: 14px; font-family: inherit;
            transition: all 0.2s;
          }
          .note-input:focus { 
            outline: none; 
            border-color: #06b6d4; 
            box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
            background: rgba(0,0,0,0.5);
          }
          .note-input::placeholder { color: #666; }
          .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
          .btn {
            padding: 10px 20px; border-radius: 8px; font-size: 14px;
            font-weight: 500; cursor: pointer; border: none;
            transition: all 0.2s;
          }
          .btn-secondary { background: rgba(255,255,255,0.1); color: #ccc; }
          .btn-secondary:hover { background: rgba(255,255,255,0.15); color: #fff; }
          .btn-primary {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            color: white;
            box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
          }
          .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4); }
          .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
          .keyboard-hint {
            text-align: center; margin-top: 16px; color: #555; font-size: 12px;
          }
          .keyboard-hint kbd {
            background: rgba(255,255,255,0.1); padding: 2px 6px;
            border-radius: 4px; font-family: inherit;
          }
        </style>
        <div class="overlay">
          <div class="modal">
            <div class="modal-header">
              <h2>Save Note</h2>
              <span class="timestamp">${timestamp}</span>
              <button class="close-btn" aria-label="Close">×</button>
            </div>
            ${screenshot ? `<div class="screenshot-preview"><img src="${screenshot}" alt="Video screenshot" /></div>` : ''}
            <div class="note-input-container">
              <input type="text" class="note-input" placeholder="Add your note here... (optional)" autocomplete="off">
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary cancel-btn">Cancel</button>
              <button class="btn btn-primary save-btn">Save Note</button>
            </div>
            <div class="keyboard-hint">
              Press <kbd>Enter</kbd> to save · <kbd>Esc</kbd> to cancel
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlayRoot);
      
      // Get elements
      const overlay = shadowRoot.querySelector('.overlay');
      const closeBtn = shadowRoot.querySelector('.close-btn');
      const cancelBtn = shadowRoot.querySelector('.cancel-btn');
      const saveBtn = shadowRoot.querySelector('.save-btn');
      const noteInput = shadowRoot.querySelector('.note-input');
      
      /**
       * Close overlay
       */
      const closeOverlay = () => {
        console.log('[Ojeet UI Host] Closing overlay');
        if (escapeHandler) {
          document.removeEventListener('keydown', escapeHandler, true);
          escapeHandler = null;
        }
        overlayRoot.remove();
        
        // Notify background
        chrome.runtime.sendMessage({
          type: MessageTypes.UI_CLOSED,
          payload: { wasFullscreen }
        }).catch(() => {});
        
        wasFullscreen = false;
        currentScreenshot = null;
        currentVideoInfo = null;
      };
      
      /**
       * Save note
       */
      const saveNote = async () => {
        console.log('[Ojeet UI Host] Saving note...');
        const noteText = noteInput?.value?.trim() || '';
        
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        try {
          await chrome.runtime.sendMessage({
            type: MessageTypes.SAVE_DATA,
            payload: {
              videoInfo: currentVideoInfo,
              noteText,
              screenshot: currentScreenshot
            }
          });
          
          console.log('[Ojeet UI Host] Note saved successfully');
          closeOverlay();
          showToast('Note saved!');
        } catch (error) {
          console.error('[Ojeet UI Host] Failed to save note:', error);
          showToast('Failed to save note', true);
          saveBtn.textContent = 'Save Note';
          saveBtn.disabled = false;
        }
      };
      
      // Stop propagation helper - BUT allow events on input to pass through to the input listener
      const stopPropagation = (e) => {
        // If target is the input, let it pass (we handle it in the input listener)
        if (e.target === noteInput) return;
        e.stopPropagation();
      };
      
      // Capture all keyboard events on the overlay
      overlayRoot.addEventListener('keydown', stopPropagation, true);
      overlayRoot.addEventListener('keyup', stopPropagation, true);
      overlayRoot.addEventListener('keypress', stopPropagation, true);
      
      // Handle note input keyboard events
      noteInput.addEventListener('keydown', (e) => {
        // Always stop propagation to prevent YouTube from hearing this key
        e.stopPropagation();
        
        console.log('[Ojeet UI] Input keydown:', e.key);
        
        if (e.key === 'Enter') {
          console.log('[Ojeet UI] Enter pressed, saving...');
          e.preventDefault();
          saveNote();
        } else if (e.key === 'Escape') {
          console.log('[Ojeet UI] Escape pressed, closing...');
          e.preventDefault();
          closeOverlay();
        }
      }, true);
      
      noteInput.addEventListener('keyup', stopPropagation, true);
      noteInput.addEventListener('keypress', stopPropagation, true);
      
      // Button event listeners
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
      });
      closeBtn.addEventListener('click', closeOverlay);
      cancelBtn.addEventListener('click', closeOverlay);
      saveBtn.addEventListener('click', saveNote);
      
      // Global escape handler
      escapeHandler = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          e.preventDefault();
          closeOverlay();
        }
      };
      document.addEventListener('keydown', escapeHandler, true);
      
      // Focus input
      setTimeout(() => noteInput.focus(), 100);
    }
    
    /**
     * Show a toast notification
     */
    function showToast(message, isError = false) {
      // Remove existing toast
      const existing = document.getElementById('ojeet-toast-container');
      if (existing) existing.remove();
      
      const toastContainer = document.createElement('div');
      toastContainer.id = 'ojeet-toast-container';
      toastContainer.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';
      
      const toastShadow = toastContainer.attachShadow({ mode: 'closed' });
      
      toastShadow.innerHTML = `
        <style>
          .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: ${isError ? '#ef4444' : 'linear-gradient(135deg, #06b6d4, #0891b2)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.5s forwards;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .toast-icon {
            font-size: 18px;
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes fadeOut {
            to {
              opacity: 0;
              transform: translateY(10px);
            }
          }
        </style>
        <div class="toast">
          <span class="toast-icon">${isError ? '⚠️' : '✓'}</span>
          <span>${message}</span>
        </div>
      `;
      
      document.body.appendChild(toastContainer);
      
      // Remove after animation
      setTimeout(() => toastContainer.remove(), 3000);
    }
    
    /**
     * Message listener
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[Ojeet UI Host] Message received:', message.type);
      
      const { type, payload } = message;
      
      switch (type) {
        case MessageTypes.SHOW_UI:
          showNoteEditor(payload.screenshot, payload.videoInfo);
          sendResponse({ success: true });
          break;
          
        case MessageTypes.SHOW_SCREENSHOT_TOAST:
          const msg = payload.message || `Screenshot saved at ${payload.timestamp}`;
          showToast(msg);
          sendResponse({ success: true });
          break;
          
        default:
          break;
      }
      
      return false;
    });
    
    console.log('[Ojeet UI Host] Fully initialized');
  })();
}
