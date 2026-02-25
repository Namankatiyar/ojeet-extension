/**
 * Background Service Worker — Main Entry Point
 * 
 * This is the orchestrator. All logic is delegated to focused sub-modules:
 * - commands.js       → Keyboard shortcut handlers
 * - screenshot-manager.js → Tab capture & image cropping
 * - storage-manager.js    → Data persistence with transaction safety
 * - video-info-requester.js → Multi-frame video info requests
 * - ui-injector.js    → Fallback UI injection
 */

import { handleScreenshot, handleTimestamp, handleNoteEditor } from './commands.js';
import { saveToStorage } from './storage-manager.js';

// ============ Message Types ============

const MessageTypes = {
  SAVE_DATA: 'SAVE_DATA',
  UI_CLOSED: 'UI_CLOSED',
  RESTORE_STATE: 'RESTORE_STATE',
};

// ============ ID Generator ============

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ Startup ============

console.log('Ojeet background service worker starting...');

// ============ Command Listener ============

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

// ============ Message Listener ============

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
      return true; // Keep channel open for async response

    case MessageTypes.UI_CLOSED:
      if (sender.tab?.id && payload?.wasFullscreen) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: MessageTypes.RESTORE_STATE,
          payload: { restoreFullscreen: true },
        }).catch(() => { });
      }
      sendResponse({ success: true });
      break;

    case 'CROP_IMAGE':
      // Handled by offscreen document — no-op here
      break;
  }

  return false;
});

// ============ Ready ============

console.log('Ojeet background service worker initialized');
