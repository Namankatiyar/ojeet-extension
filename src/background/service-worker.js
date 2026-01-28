/**
 * Background Service Worker
 * Handles hotkey commands, screenshot capture, and message routing
 */

// Message Types (defined inline to avoid module import issues)
const MessageTypes = {
  CAPTURE_REQUEST: 'CAPTURE_REQUEST',
  GET_VIDEO_INFO: 'GET_VIDEO_INFO',
  SHOW_UI: 'SHOW_UI',
  SHOW_SCREENSHOT_TOAST: 'SHOW_SCREENSHOT_TOAST',
  SAVE_DATA: 'SAVE_DATA',
  UI_CLOSED: 'UI_CLOSED',
  RESTORE_STATE: 'RESTORE_STATE',
  REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO'
};

// Simple ID generator
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format timestamp
function formatTimestamp(seconds) {
  if (seconds === undefined || seconds === null) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

console.log('Ojeet background service worker starting...');

/**
 * Handle keyboard commands from manifest
 */
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log('=== COMMAND RECEIVED ===');
  console.log('Command:', command);
  console.log('Tab ID:', tab?.id);
  console.log('Tab URL:', tab?.url);
  
  if (!tab?.id) {
    console.error('No tab ID available');
    return;
  }
  
  try {
    switch (command) {
      case 'take-screenshot':
        console.log('Handling take-screenshot...');
        await handleScreenshot(tab, false);
        break;
      case 'save-timestamp':
        console.log('Handling save-timestamp...');
        await handleTimestamp(tab);
        break;
      case 'open-note-editor':
        console.log('Handling open-note-editor...');
        await handleNoteEditor(tab);
        break;
      default:
        console.log('Unknown command:', command);
    }
  } catch (error) {
    console.error('Command handler error:', error);
  }
});

/**
 * Handle screenshot capture
 */
async function handleScreenshot(tab, openEditor = false) {
  console.log('handleScreenshot called, openEditor:', openEditor);
  
  try {
    // Request video info from content script
    const videoInfo = await requestVideoInfo(tab.id);
    console.log('Video info received:', videoInfo);
    
    if (!videoInfo) {
      console.log('No video found on page - showing error toast');
      // Try to show an error toast
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: MessageTypes.SHOW_SCREENSHOT_TOAST,
          payload: { message: 'No video found on page', timestamp: '' }
        });
      } catch (e) {
        console.log('Could not show error toast');
      }
      return;
    }
    
    console.log('Capturing visible tab...');
    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png'
    });
    console.log('Tab captured, data URL length:', dataUrl?.length);
    
    // If video has bounds, crop the screenshot
    let croppedDataUrl = dataUrl;
    if (videoInfo.bounds && videoInfo.bounds.width > 0) {
      console.log('Cropping screenshot to video bounds:', videoInfo.bounds);
      croppedDataUrl = await cropScreenshot(dataUrl, videoInfo.bounds);
      console.log('Cropped data URL length:', croppedDataUrl?.length);
    }
    
    if (openEditor) {
      console.log('Opening note editor UI...');
      
      // First, try to inject the UI host script in case it's not loaded
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/ui-host.js']
        });
        console.log('UI host script injected');
      } catch (e) {
        console.log('UI host injection skipped (may already exist):', e.message);
      }
      
      // Also inject the CSS
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['src/content/ui-host.css']
        });
      } catch (e) {
        console.log('CSS injection skipped:', e.message);
      }
      
      // Small delay to let the script initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now try to send the message
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: MessageTypes.SHOW_UI,
          payload: {
            screenshot: croppedDataUrl,
            videoInfo
          }
        }, { frameId: 0 });
        console.log('SHOW_UI response:', response);
      } catch (e) {
        console.error('Failed to show UI via message:', e);
        
        // Ultimate fallback: Inject the UI directly
        console.log('Using direct script injection to show UI...');
        await showUIDirectly(tab.id, croppedDataUrl, videoInfo);
      }
    } else {
      console.log('Quick save - saving screenshot with timestamp');
      // Quick save - just save screenshot with timestamp
      const imageId = generateId();
      
      // Save to storage
      await saveToStorage(videoInfo, '', imageId, croppedDataUrl, tab.url);
      
      // Show toast notification
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: MessageTypes.SHOW_SCREENSHOT_TOAST,
          payload: {
            timestamp: formatTimestamp(videoInfo.currentTime),
            message: `Screenshot saved at ${formatTimestamp(videoInfo.currentTime)}`
          }
        }, { frameId: 0 });
      } catch (e) {
        console.log('Could not show toast:', e);
      }
    }
  } catch (error) {
    console.error('Screenshot failed:', error);
  }
}

/**
 * Handle timestamp-only save
 */
async function handleTimestamp(tab) {
  try {
    const videoInfo = await requestVideoInfo(tab.id);
    if (!videoInfo) {
      console.log('No video found for timestamp');
      return;
    }
    
    // Save to storage without screenshot
    await saveToStorage(videoInfo, '', null, null, tab.url);
    
    // Show toast
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: MessageTypes.SHOW_SCREENSHOT_TOAST,
        payload: {
          timestamp: formatTimestamp(videoInfo.currentTime),
          message: 'Timestamp saved!'
        }
      }, { frameId: 0 });
    } catch (e) {
      console.log('Could not show toast');
    }
  } catch (error) {
    console.error('Timestamp save failed:', error);
  }
}

/**
 * Handle note editor opening
 */
async function handleNoteEditor(tab) {
  console.log('handleNoteEditor called');
  await handleScreenshot(tab, true);
}

/**
 * Show UI directly by injecting into the page (fallback method)
 */
async function showUIDirectly(tabId, screenshot, videoInfo) {
  console.log('Injecting UI directly into page...');
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (screenshotData, videoData) => {
        // Remove any existing overlay first
        const existing = document.getElementById('ojeet-overlay-root');
        if (existing) existing.remove();
        
        // Create overlay container
        const overlayRoot = document.createElement('div');
        overlayRoot.id = 'ojeet-overlay-root';
        overlayRoot.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto;';
        
        const shadow = overlayRoot.attachShadow({ mode: 'closed' });
        
        // Format time helper
        function formatTime(seconds) {
          const hrs = Math.floor(seconds / 3600);
          const mins = Math.floor((seconds % 3600) / 60);
          const secs = Math.floor(seconds % 60);
          if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          }
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        const timestamp = formatTime(videoData.currentTime);
        
        shadow.innerHTML = `
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
            .modal {
              background: linear-gradient(145deg, #1a1a2e, #16213e);
              border: 1px solid rgba(6, 182, 212, 0.3);
              border-radius: 16px; padding: 24px;
              max-width: 500px; width: 90%; max-height: 85vh; overflow-y: auto;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(6, 182, 212, 0.15);
              animation: slideUp 0.3s ease;
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
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
                <button class="close-btn">×</button>
              </div>
              ${screenshotData ? `<div class="screenshot-preview"><img src="${screenshotData}" /></div>` : ''}
              <div><input type="text" class="note-input" placeholder="Add your note here... (optional)" autocomplete="off"></div>
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
        
        // Store cleanup function
        let escHandler = null;
        
        const closeOverlay = () => {
          if (escHandler) {
            document.removeEventListener('keydown', escHandler, true);
          }
          overlayRoot.remove();
        };
        
        const saveNote = async () => {
          const noteText = shadow.querySelector('.note-input')?.value?.trim() || '';
          const saveBtn = shadow.querySelector('.save-btn');
          if (saveBtn) {
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
          }
          
          try {
            await chrome.runtime.sendMessage({
              type: 'SAVE_DATA',
              payload: { videoInfo: videoData, noteText, screenshot: screenshotData }
            });
            closeOverlay();
            
            // Show success toast
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#06b6d4,#0891b2);color:white;padding:12px 20px;border-radius:8px;font-family:sans-serif;z-index:2147483647;animation:slideIn 0.3s ease;';
            toast.innerHTML = '<style>@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}</style>✓ Note saved!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
          } catch (e) {
            console.error('Save failed:', e);
            if (saveBtn) {
              saveBtn.textContent = 'Save Note';
              saveBtn.disabled = false;
            }
          }
        };
        
        // Stop propagation on all keyboard events to prevent YouTube shortcuts
        const noteInput = shadow.querySelector('.note-input');
        
        // Stop propagation helper
        const stopPropagation = (e) => {
          if (e.target === noteInput) return;
          e.stopPropagation();
        };
        
        // Capture keyboard events and stop propagation to prevent YouTube shortcuts
        overlayRoot.addEventListener('keydown', stopPropagation, true);
        overlayRoot.addEventListener('keyup', stopPropagation, true);
        overlayRoot.addEventListener('keypress', stopPropagation, true);
        
        // Also stop on the note input specifically
        noteInput.addEventListener('keydown', (e) => {
          e.stopPropagation();
          console.log('Direct UI input keydown:', e.key);
          
          if (e.key === 'Enter') { 
            console.log('Direct UI Enter pressed, saving...');
            e.preventDefault(); 
            saveNote(); 
          } else if (e.key === 'Escape') {
            e.preventDefault();
            closeOverlay();
          }
        }, true);
        
        noteInput.addEventListener('keyup', stopPropagation, true);
        noteInput.addEventListener('keypress', stopPropagation, true);
        
        shadow.querySelector('.overlay').addEventListener('click', (e) => {
          if (e.target.classList.contains('overlay')) closeOverlay();
        });
        shadow.querySelector('.close-btn').addEventListener('click', closeOverlay);
        shadow.querySelector('.cancel-btn').addEventListener('click', closeOverlay);
        shadow.querySelector('.save-btn').addEventListener('click', saveNote);
        
        // Global escape handler with capture to get it before YouTube
        escHandler = (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            closeOverlay();
          }
        };
        document.addEventListener('keydown', escHandler, true);
        
        // Focus the input after a short delay
        setTimeout(() => noteInput?.focus(), 100);
      },
      args: [screenshot, videoInfo]
    });
    
    console.log('UI injected directly');
  } catch (error) {
    console.error('Direct UI injection failed:', error);
  }
}

/**
 * Request video info from all frames and return first valid response
 */
async function requestVideoInfo(tabId) {
  console.log('Requesting video info from tab:', tabId);
  
  // First, try to send message to main frame (frameId 0)
  try {
    console.log('Trying main frame...');
    const response = await chrome.tabs.sendMessage(
      tabId,
      { type: MessageTypes.REQUEST_VIDEO_INFO, payload: {} },
      { frameId: 0 }
    );
    
    console.log('Main frame response:', response);
    if (response?.success && response.data) {
      console.log('Got video info from main frame');
      return response.data;
    }
  } catch (e) {
    console.log('Main frame did not respond:', e.message);
  }
  
  // If main frame doesn't have it, try all frames
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    console.log('Found frames:', frames?.length);
    
    if (frames) {
      // Sort frames - YouTube embeds might be in iframes
      const sortedFrames = frames.sort((a, b) => {
        const aIsYT = a.url?.includes('youtube.com') ? -1 : 1;
        const bIsYT = b.url?.includes('youtube.com') ? -1 : 1;
        return aIsYT - bIsYT;
      });
      
      for (const frame of sortedFrames) {
        if (frame.frameId === 0) continue; // Already tried main frame
        
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
          // Frame doesn't have content script or no video
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Failed to enumerate frames:', error);
  }
  
  // Last resort: try dynamic script injection
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
            devicePixelRatio: window.devicePixelRatio || 1
          }
        };
      }
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

/**
 * Crop screenshot using offscreen document
 */
async function cropScreenshot(dataUrl, bounds) {
  try {
    // Create offscreen document if needed
    let existingContexts = [];
    try {
      existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
    } catch (e) {
      console.log('getContexts not available');
    }
    
    if (existingContexts.length === 0) {
      try {
        await chrome.offscreen.createDocument({
          url: 'src/background/offscreen.html',
          reasons: ['BLOBS'],
          justification: 'Crop screenshot image'
        });
        console.log('Offscreen document created');
      } catch (e) {
        console.log('Could not create offscreen document:', e);
        return dataUrl; // Return uncropped
      }
    }
    
    // Send crop request to offscreen document
    const response = await chrome.runtime.sendMessage({
      type: 'CROP_IMAGE',
      payload: { dataUrl, bounds }
    });
    
    return response?.data || dataUrl;
  } catch (error) {
    console.error('Crop failed:', error);
    return dataUrl;
  }
}

/**
 * Save data to storage
 */
async function saveToStorage(videoInfo, noteText, imageId, screenshot, tabUrl) {
  console.log('Saving to storage...');
  
  // Get existing data
  const { videos = {}, notes = [] } = await chrome.storage.local.get(['videos', 'notes']);
  
  // Save video metadata
  videos[videoInfo.videoId] = {
    id: videoInfo.videoId,
    provider: videoInfo.provider,
    title: videoInfo.title || 'Untitled Video',
    originalUrl: tabUrl,
    duration: videoInfo.duration
  };
  
  // Create note entry
  const note = {
    uuid: generateId(),
    videoId: videoInfo.videoId,
    timestampSeconds: videoInfo.currentTime,
    timestampFormatted: formatTimestamp(videoInfo.currentTime),
    noteText: noteText || '',
    imageId: imageId,
    isLiveStream: videoInfo.isLive || false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  notes.push(note);
  
  // Save to chrome.storage
  await chrome.storage.local.set({ videos, notes });
  console.log('Saved note to storage:', note.uuid);
  
  // Save screenshot to IndexedDB if present
  if (imageId && screenshot) {
    try {
      // We can't directly use IndexedDB in service worker reliably
      // So we'll store screenshot in chrome.storage.local as well (with a size limit warning)
      const { screenshots = {} } = await chrome.storage.local.get('screenshots');
      screenshots[imageId] = {
        id: imageId,
        dataUrl: screenshot,
        mimeType: 'image/webp'
      };
      await chrome.storage.local.set({ screenshots });
      console.log('Saved screenshot to storage:', imageId);
    } catch (e) {
      console.error('Failed to save screenshot:', e);
    }
  }
  
  return note;
}

/**
 * Message listener for content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message.type);
  
  const { type, payload } = message;
  
  switch (type) {
    case MessageTypes.SAVE_DATA:
      (async () => {
        try {
          const { videoInfo, noteText, screenshot } = payload;
          const imageId = screenshot ? generateId() : null;
          const note = await saveToStorage(videoInfo, noteText, imageId, screenshot, sender.tab?.url);
          sendResponse({ success: true, data: note });
        } catch (error) {
          console.error('Save failed:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // Keep channel open
      
    case MessageTypes.UI_CLOSED:
      // Notify video agent to restore state if needed
      if (sender.tab?.id && payload?.wasFullscreen) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: MessageTypes.RESTORE_STATE,
          payload: { restoreFullscreen: true }
        }).catch(() => {});
      }
      sendResponse({ success: true });
      break;
      
    case 'CROP_IMAGE':
      // This is handled by offscreen document
      break;
  }
  
  return false;
});

console.log('Ojeet background service worker initialized');
