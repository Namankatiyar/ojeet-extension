/**
 * Command Handlers
 * Processes keyboard shortcut commands from the manifest.
 * 
 * @module commands
 */

import { requestVideoInfo } from './video-info-requester.js';
import { captureTab, cropScreenshot } from './screenshot-manager.js';
import { saveToStorage } from './storage-manager.js';
import { showUIDirectly } from './ui-injector.js';

/**
 * @typedef {Object} MessageTypes
 * @property {string} SHOW_UI
 * @property {string} SHOW_SCREENSHOT_TOAST
 * @property {string} REQUEST_VIDEO_INFO
 */

const MessageTypes = {
    SHOW_UI: 'SHOW_UI',
    SHOW_SCREENSHOT_TOAST: 'SHOW_SCREENSHOT_TOAST',
    REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO',
};

/**
 * Format seconds to MM:SS or HH:MM:SS
 * @param {number} seconds
 * @returns {string}
 */
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

/**
 * Generate a unique ID.
 * @returns {string}
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle screenshot capture command.
 * @param {chrome.tabs.Tab} tab - The active tab
 * @param {boolean} openEditor - Whether to open the note editor UI
 */
export async function handleScreenshot(tab, openEditor = false) {
    console.log('handleScreenshot called, openEditor:', openEditor);

    try {
        const videoInfo = await requestVideoInfo(tab.id);
        console.log('Video info received:', videoInfo);

        if (!videoInfo) {
            console.log('No video found on page - showing error toast');
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    type: MessageTypes.SHOW_SCREENSHOT_TOAST,
                    payload: { message: 'No video found on page', timestamp: '' },
                }, { frameId: 0 });
            } catch (e) {
                console.log('Could not show error toast');
            }
            return;
        }

        console.log('Capturing visible tab...');
        const dataUrl = await captureTab(tab.windowId);

        // Crop to video bounds if available
        let croppedDataUrl = dataUrl;
        if (videoInfo.bounds && videoInfo.bounds.width > 0) {
            console.log('Cropping screenshot to video bounds:', videoInfo.bounds);
            croppedDataUrl = await cropScreenshot(dataUrl, videoInfo.bounds);
            console.log('Cropped data URL length:', croppedDataUrl?.length);
        }

        if (openEditor) {
            console.log('Opening note editor UI...');

            // Inject UI host script
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/content/ui-host.js'],
                });
                console.log('UI host script injected');
            } catch (e) {
                console.log('UI host injection skipped (may already exist):', e.message);
            }

            // Inject CSS
            try {
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ['src/content/ui-host.css'],
                });
            } catch (e) {
                console.log('CSS injection skipped:', e.message);
            }

            // Delay for script initialization
            await new Promise(resolve => setTimeout(resolve, 100));

            // Send SHOW_UI message
            try {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    type: MessageTypes.SHOW_UI,
                    payload: { screenshot: croppedDataUrl, videoInfo },
                }, { frameId: 0 });
                console.log('SHOW_UI response:', response);
            } catch (e) {
                console.error('Failed to show UI via message:', e);
                console.log('Using direct script injection to show UI...');
                await showUIDirectly(tab.id, croppedDataUrl, videoInfo);
            }
        } else {
            console.log('Quick save - saving screenshot with timestamp');
            const imageId = generateId();

            await saveToStorage(videoInfo, '', imageId, croppedDataUrl, tab.url);

            // Show toast notification
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    type: MessageTypes.SHOW_SCREENSHOT_TOAST,
                    payload: {
                        timestamp: formatTimestamp(videoInfo.currentTime),
                        message: `Screenshot saved at ${formatTimestamp(videoInfo.currentTime)}`,
                    },
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
 * Handle timestamp-only save command.
 * @param {chrome.tabs.Tab} tab - The active tab
 */
export async function handleTimestamp(tab) {
    try {
        const videoInfo = await requestVideoInfo(tab.id);
        if (!videoInfo) {
            console.log('No video found for timestamp');
            return;
        }

        await saveToStorage(videoInfo, '', null, null, tab.url);

        try {
            await chrome.tabs.sendMessage(tab.id, {
                type: MessageTypes.SHOW_SCREENSHOT_TOAST,
                payload: {
                    timestamp: formatTimestamp(videoInfo.currentTime),
                    message: 'Timestamp saved!',
                },
            }, { frameId: 0 });
        } catch (e) {
            console.log('Could not show toast');
        }
    } catch (error) {
        console.error('Timestamp save failed:', error);
    }
}

/**
 * Handle note editor opening command.
 * @param {chrome.tabs.Tab} tab - The active tab
 */
export async function handleNoteEditor(tab) {
    console.log('handleNoteEditor called');
    await handleScreenshot(tab, true);
}
