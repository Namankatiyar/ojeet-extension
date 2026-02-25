/**
 * Storage Manager (Background Context)
 * Handles saving notes and screenshots from the service worker.
 * 
 * @module storage-manager
 */

/**
 * Generate a unique ID.
 * @returns {string}
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
 * Save video info, note, and optional screenshot to chrome.storage.local.
 * Implements basic transaction safety: if the screenshot save fails,
 * the note is rolled back.
 * 
 * @param {Object} videoInfo - Video metadata from the content script
 * @param {string} noteText - User's note text
 * @param {string|null} imageId - Screenshot image ID (null for timestamp-only)
 * @param {string|null} screenshot - Screenshot data URL (null for timestamp-only)
 * @param {string} tabUrl - The tab URL for reference
 * @returns {Promise<Object>} The saved note object
 */
export async function saveToStorage(videoInfo, noteText, imageId, screenshot, tabUrl) {
    console.log('Saving to storage...');

    // Step 1: Read current data
    const { videos = {}, notes = [] } = await chrome.storage.local.get(['videos', 'notes']);

    // Step 2: Prepare video metadata
    videos[videoInfo.videoId] = {
        id: videoInfo.videoId,
        provider: videoInfo.provider,
        title: videoInfo.title || 'Untitled Video',
        originalUrl: tabUrl,
        duration: videoInfo.duration,
    };

    // Step 3: Create note entry
    const note = {
        uuid: generateId(),
        videoId: videoInfo.videoId,
        timestampSeconds: videoInfo.currentTime,
        timestampFormatted: formatTimestamp(videoInfo.currentTime),
        noteText: noteText || '',
        imageId: imageId,
        isLiveStream: videoInfo.isLive || false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    notes.push(note);

    // Step 4: Save note + video metadata
    await chrome.storage.local.set({ videos, notes });
    console.log('Saved note to storage:', note.uuid);

    // Step 5: Save screenshot (with rollback on failure)
    if (imageId && screenshot) {
        try {
            const { screenshots = {} } = await chrome.storage.local.get('screenshots');
            screenshots[imageId] = {
                id: imageId,
                dataUrl: screenshot,
                mimeType: 'image/webp',
            };
            await chrome.storage.local.set({ screenshots });
            console.log('Saved screenshot to storage:', imageId);
        } catch (e) {
            console.error('Failed to save screenshot, rolling back note:', e);

            // Rollback: remove the note we just added
            try {
                const { notes: currentNotes = [] } = await chrome.storage.local.get('notes');
                const rollbackNotes = currentNotes.filter(n => n.uuid !== note.uuid);
                await chrome.storage.local.set({ notes: rollbackNotes });
                console.log('Note rolled back successfully');
            } catch (rollbackError) {
                console.error('Rollback also failed:', rollbackError);
            }

            throw new Error('Screenshot save failed — note has been rolled back');
        }
    }

    return note;
}
