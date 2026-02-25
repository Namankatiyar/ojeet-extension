/**
 * UI Injector
 * Fallback method for directly injecting the note editor UI into a page.
 * Used when the regular ui-host.js message channel fails.
 * 
 * @module ui-injector
 */

/**
 * Inject the note editor UI directly into a tab via chrome.scripting.executeScript.
 * This is a fallback when the ui-host content script is not responding.
 * 
 * @param {number} tabId - Target tab ID
 * @param {string} screenshot - Screenshot data URL
 * @param {Object} videoInfo - Video metadata
 */
export async function showUIDirectly(tabId, screenshot, videoInfo) {
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

                // Cleanup state
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
                            payload: { videoInfo: videoData, noteText, screenshot: screenshotData },
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

                // Event isolation
                const noteInput = shadow.querySelector('.note-input');

                const stopPropagation = (e) => {
                    if (e.target === noteInput) return;
                    e.stopPropagation();
                };

                overlayRoot.addEventListener('keydown', stopPropagation, true);
                overlayRoot.addEventListener('keyup', stopPropagation, true);
                overlayRoot.addEventListener('keypress', stopPropagation, true);

                noteInput.addEventListener('keydown', (e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
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

                // Global escape handler
                escHandler = (e) => {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        e.preventDefault();
                        closeOverlay();
                    }
                };
                document.addEventListener('keydown', escHandler, true);

                setTimeout(() => noteInput?.focus(), 100);
            },
            args: [screenshot, videoInfo],
        });

        console.log('UI injected directly');
    } catch (error) {
        console.error('Direct UI injection failed:', error);
    }
}
