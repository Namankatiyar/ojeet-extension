/**
 * Storage Module - Unified storage for notes and screenshots
 * Uses chrome.storage.local for metadata and IndexedDB for binary blobs.
 * 
 * Implements basic transaction safety:
 * - saveNoteWithScreenshot() ensures atomicity between note and image saves
 * - If one storage operation fails, the other is rolled back
 * 
 * @module storage
 */

const DB_NAME = 'OjeetDB';
const DB_VERSION = 1;
const SCREENSHOTS_STORE = 'screenshots';

let dbInstance = null;

// ============ IndexedDB ============

/**
 * Initialize or return the existing IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
async function getDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SCREENSHOTS_STORE)) {
        db.createObjectStore(SCREENSHOTS_STORE, { keyPath: 'id' });
      }
    };
  });
}

// ============ ID Generation ============

/**
 * Generate a unique ID combining timestamp and random suffix.
 * @returns {string}
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ Formatting ============

/**
 * Format seconds to MM:SS or HH:MM:SS.
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============ Video Metadata ============

/**
 * Save or update video metadata.
 * @param {Object} videoMeta - Video metadata object
 * @returns {Promise<Object>} Saved video metadata
 */
export async function saveVideoMeta(videoMeta) {
  const { videos = {} } = await chrome.storage.local.get('videos');
  videos[videoMeta.id] = { ...videos[videoMeta.id], ...videoMeta };
  await chrome.storage.local.set({ videos });
  return videoMeta;
}

/**
 * Get video metadata by ID.
 * @param {string} videoId
 * @returns {Promise<Object|null>}
 */
export async function getVideoMeta(videoId) {
  const { videos = {} } = await chrome.storage.local.get('videos');
  return videos[videoId] || null;
}

/**
 * Get all video metadata.
 * @returns {Promise<Object[]>}
 */
export async function getAllVideos() {
  const { videos = {} } = await chrome.storage.local.get('videos');
  return Object.values(videos);
}

// ============ Notes ============

/**
 * Save a note entry.
 * @param {Object} note - Note data
 * @returns {Promise<Object>} Saved note with generated fields
 */
export async function saveNote(note) {
  const { notes = [] } = await chrome.storage.local.get('notes');

  if (!note.uuid) {
    note.uuid = generateId();
  }
  if (!note.createdAt) {
    note.createdAt = Date.now();
  }
  note.updatedAt = Date.now();

  if (!note.timestampFormatted && note.timestampSeconds !== undefined) {
    note.timestampFormatted = formatTimestamp(note.timestampSeconds);
  }

  notes.push(note);
  await chrome.storage.local.set({ notes });
  return note;
}

/**
 * Get all notes.
 * @returns {Promise<Object[]>}
 */
export async function getAllNotes() {
  const { notes = [] } = await chrome.storage.local.get('notes');
  return notes;
}

/**
 * Get notes for a specific video.
 * @param {string} videoId
 * @returns {Promise<Object[]>}
 */
export async function getNotesByVideo(videoId) {
  const notes = await getAllNotes();
  return notes.filter(note => note.videoId === videoId);
}

/**
 * Delete a note by UUID, including its associated screenshot.
 * @param {string} uuid
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteNote(uuid) {
  const { notes = [] } = await chrome.storage.local.get('notes');
  const noteIndex = notes.findIndex(n => n.uuid === uuid);

  if (noteIndex === -1) return false;

  const note = notes[noteIndex];

  // Delete associated screenshot if exists
  if (note.imageId) {
    await deleteScreenshot(note.imageId);
  }

  notes.splice(noteIndex, 1);
  await chrome.storage.local.set({ notes });
  return true;
}

/**
 * Update a note's fields.
 * @param {string} uuid
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated note, or null if not found
 */
export async function updateNote(uuid, updates) {
  const { notes = [] } = await chrome.storage.local.get('notes');
  const noteIndex = notes.findIndex(n => n.uuid === uuid);

  if (noteIndex === -1) return null;

  notes[noteIndex] = { ...notes[noteIndex], ...updates, updatedAt: Date.now() };
  await chrome.storage.local.set({ notes });
  return notes[noteIndex];
}

// ============ Screenshots (IndexedDB) ============

/**
 * Save a screenshot blob to IndexedDB.
 * @param {string} id - Screenshot ID
 * @param {string} dataUrl - Screenshot data URL
 * @param {string} [mimeType='image/webp'] - MIME type
 * @returns {Promise<string>} Saved screenshot ID
 */
export async function saveScreenshot(id, dataUrl, mimeType = 'image/webp') {
  const db = await getDB();

  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readwrite');
    const store = transaction.objectStore(SCREENSHOTS_STORE);

    const request = store.put({ id, blob, mimeType });
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a screenshot by ID, converting blob back to data URL.
 * @param {string} id - Screenshot ID
 * @returns {Promise<Object|null>} Screenshot object with dataUrl, or null
 */
export async function getScreenshot(id) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readonly');
    const store = transaction.objectStore(SCREENSHOTS_STORE);

    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ ...result, dataUrl: reader.result });
        reader.readAsDataURL(result.blob);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a screenshot by ID from IndexedDB.
 * @param {string} id - Screenshot ID
 * @returns {Promise<boolean>}
 */
export async function deleteScreenshot(id) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readwrite');
    const store = transaction.objectStore(SCREENSHOTS_STORE);

    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all screenshots from IndexedDB.
 * @returns {Promise<Object[]>}
 */
export async function getAllScreenshots() {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readonly');
    const store = transaction.objectStore(SCREENSHOTS_STORE);

    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ Transactional Operations ============

/**
 * Save a note with its associated screenshot atomically.
 * If the screenshot save fails, the note is rolled back.
 * If the note save fails, no screenshot is attempted.
 * 
 * @param {Object} noteData - Note data (without uuid/timestamps — they are generated)
 * @param {string} [screenshotDataUrl] - Screenshot data URL (optional)
 * @returns {Promise<Object>} The saved note
 * @throws {Error} If the operation fails (after rollback)
 */
export async function saveNoteWithScreenshot(noteData, screenshotDataUrl) {
  // Step 1: Save the note
  const note = await saveNote(noteData);

  // Step 2: Save the screenshot (with rollback on failure)
  if (noteData.imageId && screenshotDataUrl) {
    try {
      await saveScreenshot(noteData.imageId, screenshotDataUrl);
    } catch (screenshotError) {
      console.error('Screenshot save failed, rolling back note:', screenshotError);

      // Rollback the note
      try {
        await deleteNote(note.uuid);
        console.log('Note rolled back successfully');
      } catch (rollbackError) {
        console.error('Rollback also failed — data may be inconsistent:', rollbackError);
      }

      throw new Error(`Transaction failed: screenshot save error — ${screenshotError.message}`);
    }
  }

  return note;
}

// ============ Export/Import ============

/**
 * Export all data for backup (excludes screenshots due to size).
 * @returns {Promise<Object>}
 */
export async function exportAllData() {
  const videos = await getAllVideos();
  const notes = await getAllNotes();

  return {
    version: 1,
    exportedAt: Date.now(),
    videos,
    notes,
    // Note: Screenshots are not exported (too large)
  };
}

/**
 * Clear all data from both chrome.storage.local and IndexedDB.
 * @returns {Promise<boolean>}
 */
export async function clearAllData() {
  await chrome.storage.local.clear();

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOTS_STORE, 'readwrite');
    const store = transaction.objectStore(SCREENSHOTS_STORE);

    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}
