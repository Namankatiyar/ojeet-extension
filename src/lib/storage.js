/**
 * Storage Module - Unified storage for notes and screenshots
 * Uses chrome.storage.local for metadata and IndexedDB for binary blobs
 */

const DB_NAME = 'OjeetDB';
const DB_VERSION = 1;
const SCREENSHOTS_STORE = 'screenshots';

let dbInstance = null;

/**
 * Initialize IndexedDB
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

/**
 * Generate a unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
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
 * Save or update video metadata
 */
export async function saveVideoMeta(videoMeta) {
  const { videos = {} } = await chrome.storage.local.get('videos');
  videos[videoMeta.id] = { ...videos[videoMeta.id], ...videoMeta };
  await chrome.storage.local.set({ videos });
  return videoMeta;
}

/**
 * Get video metadata by ID
 */
export async function getVideoMeta(videoId) {
  const { videos = {} } = await chrome.storage.local.get('videos');
  return videos[videoId] || null;
}

/**
 * Get all video metadata
 */
export async function getAllVideos() {
  const { videos = {} } = await chrome.storage.local.get('videos');
  return Object.values(videos);
}

// ============ Notes ============

/**
 * Save a note entry
 */
export async function saveNote(note) {
  const { notes = [] } = await chrome.storage.local.get('notes');
  
  // Generate ID if not present
  if (!note.uuid) {
    note.uuid = generateId();
  }
  
  // Add timestamps
  if (!note.createdAt) {
    note.createdAt = Date.now();
  }
  note.updatedAt = Date.now();
  
  // Format timestamp if not present
  if (!note.timestampFormatted && note.timestampSeconds !== undefined) {
    note.timestampFormatted = formatTimestamp(note.timestampSeconds);
  }
  
  notes.push(note);
  await chrome.storage.local.set({ notes });
  return note;
}

/**
 * Get all notes
 */
export async function getAllNotes() {
  const { notes = [] } = await chrome.storage.local.get('notes');
  return notes;
}

/**
 * Get notes for a specific video
 */
export async function getNotesByVideo(videoId) {
  const notes = await getAllNotes();
  return notes.filter(note => note.videoId === videoId);
}

/**
 * Delete a note by ID
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
 * Update a note
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
 * Save a screenshot blob
 */
export async function saveScreenshot(id, dataUrl, mimeType = 'image/webp') {
  const db = await getDB();
  
  // Convert data URL to blob
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
 * Get a screenshot by ID
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
        // Convert blob back to data URL
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
 * Delete a screenshot by ID
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
 * Get all screenshots
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

// ============ Export/Import ============

/**
 * Export all data (for backup)
 */
export async function exportAllData() {
  const videos = await getAllVideos();
  const notes = await getAllNotes();
  
  return {
    version: 1,
    exportedAt: Date.now(),
    videos,
    notes
    // Note: Screenshots are not exported (too large)
  };
}

/**
 * Clear all data
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
