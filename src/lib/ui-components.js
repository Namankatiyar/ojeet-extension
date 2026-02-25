/**
 * Shared UI Components — Single Source of Truth
 * Provides common rendering functions used by both Dashboard and Popup.
 * 
 * @module ui-components
 */

// ============ Text Formatting ============

/**
 * Format seconds into a human-readable timestamp.
 * Returns "M:SS" or "H:MM:SS" format.
 * 
 * @param {number|undefined|null} seconds - Time in seconds
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(seconds) {
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
 * Format a Unix timestamp into a relative or absolute date string.
 * - Less than 24h ago → "HH:MM" (time only)
 * - Same year → "Mon DD" (short date)
 * - Older → "YYYY Mon DD" (full date)
 * 
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format a Date object for use in filenames.
 * 
 * @param {Date} date - Date to format
 * @returns {string} "YYYY-MM-DD"
 */
export function formatDateForFilename(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Truncate a string to a maximum length, appending "..." if needed.
 * 
 * @param {string} str - Input string
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

/**
 * Escape HTML special characters to prevent XSS.
 * Uses the browser's built-in text encoding via a temporary element.
 * 
 * @param {string} text - Raw text
 * @returns {string} HTML-safe string
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ ID Generation ============

/**
 * Generate a unique ID for notes and screenshots.
 * Combines timestamp with random alphanumeric string.
 * 
 * @returns {string} Unique identifier
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ URL Helpers ============

/**
 * Build a YouTube URL with an optional timestamp.
 * Falls back to the video's original URL for non-YouTube providers.
 * 
 * @param {string} videoId - Video identifier
 * @param {number} seconds - Timestamp in seconds
 * @param {Object} [videosMap={}] - Map of videoId → video metadata
 * @returns {string} Playback URL
 */
export function buildVideoUrl(videoId, seconds, videosMap = {}) {
    // Standard YouTube 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://youtu.be/${videoId}?t=${Math.floor(seconds)}`;
    }
    // Fallback to stored original URL
    const video = videosMap[videoId];
    return video?.originalUrl || '#';
}

// ============ Note Card HTML ============

/**
 * Generate HTML string for a note card.
 * Used by both Dashboard and Popup for consistent rendering.
 * 
 * @param {Object} note - Note data object
 * @param {Object} options - Rendering options
 * @param {Object} [options.videosMap={}] - Map of videoId → video metadata
 * @param {Object} [options.screenshotsMap={}] - Map of imageId → screenshot data
 * @param {boolean} [options.compact=false] - If true, hides video title (for grouped views)
 * @param {number} [options.titleMaxLength=30] - Max chars for video title
 * @returns {string} HTML string for the note card
 */
export function createNoteCardHTML(note, options = {}) {
    const {
        videosMap = {},
        screenshotsMap = {},
        compact = false,
        titleMaxLength = 30,
    } = options;

    const video = videosMap[note.videoId] || {};
    const hasScreenshot = note.imageId && screenshotsMap[note.imageId];
    const timestampText = note.timestampFormatted || formatTimestamp(note.timestampSeconds);
    const videoTitle = escapeHtml(truncate(video.title || 'Unknown Video', titleMaxLength));

    return `
    <div class="note-card" data-uuid="${note.uuid}">
      <div class="note-card-header">
        <div class="note-meta">
          <button class="timestamp-badge" data-video-id="${note.videoId}" data-time="${note.timestampSeconds}">
            ${timestampText}
          </button>
          ${!compact ? `<span class="video-title" title="${escapeHtml(video.title || 'Unknown Video')}">${videoTitle}</span>` : ''}
        </div>
        <div class="note-actions">
          <button class="open-link-btn" title="Open in New Tab" data-video-id="${note.videoId}" data-time="${note.timestampSeconds}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
          <button class="delete-btn" title="Delete Note" data-uuid="${note.uuid}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      ${hasScreenshot ? `<img class="note-screenshot" src="${screenshotsMap[note.imageId].dataUrl}" alt="Screenshot" data-image-id="${note.imageId}">` : ''}
      ${note.noteText ? `<div class="note-text">${escapeHtml(note.noteText)}</div>` : ''}
      <div class="note-date">${formatDate(note.createdAt)}</div>
    </div>
  `;
}
