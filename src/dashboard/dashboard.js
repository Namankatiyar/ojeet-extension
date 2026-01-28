/**
 * Dashboard Script - Full Page Notes Browser
 */

// DOM Elements
const searchInput = document.getElementById('searchInput');
const contentArea = document.getElementById('contentArea');
const emptyState = document.getElementById('emptyState');
const statsDisplay = document.getElementById('statsDisplay');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const screenshotModal = document.getElementById('screenshotModal');
const modalImage = document.getElementById('modalImage');
const modalImageContainer = document.getElementById('modalImageContainer');
const modalClose = document.getElementById('modalClose');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const rotateBtn = document.getElementById('rotateBtn');
const zoomLevelDisplay = document.getElementById('zoomLevel');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmAction = document.getElementById('confirmAction');

// State
let allNotes = [];
let allVideos = {};
let allScreenshots = {};
let currentView = 'all';
let currentSearch = '';
let confirmCallback = null;
let currentZoom = 1;
let currentRotation = 0;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

/**
 * Initialize the dashboard
 */
async function init() {
    await loadData();
    setupEventListeners();
    renderCurrentView();
}

/**
 * Load all data from storage
 */
async function loadData() {
    try {
        const data = await chrome.storage.local.get(['notes', 'videos', 'screenshots']);
        allNotes = data.notes || [];
        allVideos = data.videos || {};
        allScreenshots = data.screenshots || {};
        updateStats();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

/**
 * Update stats display
 */
function updateStats() {
    const noteCount = allNotes.length;
    const videoCount = Object.keys(allVideos).length;
    const screenshotCount = Object.keys(allScreenshots).length;
    statsDisplay.textContent = `${noteCount} note${noteCount !== 1 ? 's' : ''} • ${videoCount} video${videoCount !== 1 ? 's' : ''} • ${screenshotCount} screenshot${screenshotCount !== 1 ? 's' : ''}`;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            renderCurrentView();
        });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim().toLowerCase();
        renderCurrentView();
    });

    // Export
    exportBtn.addEventListener('click', handleExport);

    // Clear All
    clearAllBtn.addEventListener('click', handleClearAll);

    // Modal close
    modalClose.addEventListener('click', closeModal);
    screenshotModal.addEventListener('click', (e) => {
        if (e.target === screenshotModal) closeModal();
    });

    // Zoom controls
    zoomInBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomIn();
    });
    zoomOutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomOut();
    });
    rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        rotateImage();
    });

    // Mouse wheel zoom in modal
    modalImageContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    });

    // Confirm dialog
    confirmCancel.addEventListener('click', closeConfirm);
    confirmAction.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeConfirm();
        }
        // Zoom shortcuts when modal is open
        if (screenshotModal.classList.contains('visible')) {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                rotateImage();
            }
        }
    });
}

/**
 * Render current view
 */
function renderCurrentView() {
    const filtered = filterNotes();

    if (allNotes.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    switch (currentView) {
        case 'all':
            renderAllNotes(filtered);
            break;
        case 'videos':
            renderByVideo(filtered);
            break;
        case 'screenshots':
            renderScreenshots(filtered);
            break;
    }
}

/**
 * Filter notes based on search
 */
function filterNotes() {
    if (!currentSearch) return allNotes;

    return allNotes.filter(note => {
        const noteText = (note.noteText || '').toLowerCase();
        const video = allVideos[note.videoId];
        const videoTitle = (video?.title || '').toLowerCase();
        return noteText.includes(currentSearch) || videoTitle.includes(currentSearch);
    });
}

/**
 * Render all notes view
 */
function renderAllNotes(notes) {
    const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);

    if (sorted.length === 0) {
        contentArea.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h2>No matching notes</h2>
        <p>Try a different search term</p>
      </div>
    `;
        return;
    }

    contentArea.innerHTML = `
    <div class="notes-grid">
      ${sorted.map(note => createNoteCard(note)).join('')}
    </div>
  `;

    attachNoteCardListeners();
}

/**
 * Render notes grouped by video
 */
function renderByVideo(notes) {
    // Group notes by video
    const groups = {};
    notes.forEach(note => {
        if (!groups[note.videoId]) {
            groups[note.videoId] = [];
        }
        groups[note.videoId].push(note);
    });

    if (Object.keys(groups).length === 0) {
        contentArea.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h2>No matching notes</h2>
        <p>Try a different search term</p>
      </div>
    `;
        return;
    }

    contentArea.innerHTML = `
    <div class="video-groups">
      ${Object.entries(groups).map(([videoId, videoNotes]) => {
        const video = allVideos[videoId] || { title: 'Unknown Video' };
        const sortedNotes = videoNotes.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

        return `
          <div class="video-group">
            <div class="video-group-header" data-video-id="${videoId}">
              <div class="video-info">
                <h3>${escapeHtml(video.title || 'Untitled Video')}</h3>
                <span class="meta">${sortedNotes.length} note${sortedNotes.length !== 1 ? 's' : ''} • ${video.provider || 'Video'}</span>
              </div>
            </div>
            <div class="video-notes-list">
              ${sortedNotes.map(note => createNoteCard(note, true)).join('')}
            </div>
          </div>
        `;
    }).join('')}
    </div>
  `;

    attachNoteCardListeners();
}

/**
 * Render screenshots gallery
 */
function renderScreenshots(notes) {
    const notesWithScreenshots = notes.filter(note => note.imageId && allScreenshots[note.imageId]);

    if (notesWithScreenshots.length === 0) {
        contentArea.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📷</div>
        <h2>No screenshots${currentSearch ? ' matching your search' : ''}</h2>
        <p>Use <kbd>Alt+S</kbd> or <kbd>Alt+N</kbd> to capture screenshots</p>
      </div>
    `;
        return;
    }

    const sorted = notesWithScreenshots.sort((a, b) => b.createdAt - a.createdAt);

    contentArea.innerHTML = `
    <div class="screenshots-grid">
      ${sorted.map(note => {
        const video = allVideos[note.videoId] || {};
        const screenshot = allScreenshots[note.imageId];
        return `
          <div class="screenshot-card" data-image-id="${note.imageId}" data-uuid="${note.uuid}" data-video-id="${note.videoId}" data-time="${note.timestampSeconds}">
            <img src="${screenshot.dataUrl}" alt="Screenshot">
            <button class="screenshot-delete-btn" data-uuid="${note.uuid}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
            <div class="screenshot-overlay">
              <button class="timestamp" data-video-id="${note.videoId}" data-time="${note.timestampSeconds}">${note.timestampFormatted || formatTime(note.timestampSeconds)}</button>
              <span class="video-name">${escapeHtml(truncate(video.title || 'Video', 20))}</span>
            </div>
          </div>
        `;
    }).join('')}
    </div>
  `;

    // Attach click listeners to screenshot images (not overlays)
    document.querySelectorAll('.screenshot-card img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = img.closest('.screenshot-card');
            const imageId = card.dataset.imageId;
            if (allScreenshots[imageId]) {
                showModal(allScreenshots[imageId].dataUrl);
            }
        });
    });

    // Attach click listeners to timestamps in screenshot gallery
    document.querySelectorAll('.screenshot-overlay .timestamp').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = btn.dataset.videoId;
            const time = parseFloat(btn.dataset.time);
            openVideoAtTimestamp(videoId, time);
        });
    });

    // Attach click listeners to delete buttons in screenshot gallery
    document.querySelectorAll('.screenshot-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uuid = btn.dataset.uuid;
            showConfirm('Delete this screenshot?', () => deleteNote(uuid));
        });
    });
}

/**
 * Create a note card HTML
 */
function createNoteCard(note, compact = false) {
    const video = allVideos[note.videoId] || {};
    const hasScreenshot = note.imageId && allScreenshots[note.imageId];

    return `
    <div class="note-card" data-uuid="${note.uuid}">
      <div class="note-card-header">
        <div class="note-meta">
          <button class="timestamp-badge" data-video-id="${note.videoId}" data-time="${note.timestampSeconds}">
            ${note.timestampFormatted || formatTime(note.timestampSeconds)}
          </button>
          ${!compact ? `<span class="video-title" title="${escapeHtml(video.title || 'Unknown Video')}">${escapeHtml(truncate(video.title || 'Unknown Video', 30))}</span>` : ''}
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
      ${hasScreenshot ? `<img class="note-screenshot" src="${allScreenshots[note.imageId].dataUrl}" alt="Screenshot" data-image-id="${note.imageId}">` : ''}
      ${note.noteText ? `<div class="note-text">${escapeHtml(note.noteText)}</div>` : ''}
      <div class="note-date">${formatDate(note.createdAt)}</div>
    </div>
  `;
}

/**
 * Attach event listeners to note cards
 */
function attachNoteCardListeners() {
    // Timestamp badge clicks
    document.querySelectorAll('.timestamp-badge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = btn.dataset.videoId;
            const time = parseFloat(btn.dataset.time);
            openVideoAtTimestamp(videoId, time);
        });
    });

    // Open link buttons
    document.querySelectorAll('.open-link-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = btn.dataset.videoId;
            const time = parseFloat(btn.dataset.time);
            openVideoAtTimestamp(videoId, time);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uuid = btn.dataset.uuid;
            showConfirm('Delete this note?', () => deleteNote(uuid));
        });
    });

    // Screenshot clicks
    document.querySelectorAll('.note-screenshot').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showModal(img.src);
        });
    });
}

/**
 * Open video at timestamp
 */
function openVideoAtTimestamp(videoId, seconds) {
    const url = buildYouTubeUrl(videoId, seconds);
    chrome.tabs.create({ url });
}

/**
 * Build YouTube URL with timestamp
 */
function buildYouTubeUrl(videoId, seconds) {
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://youtu.be/${videoId}?t=${Math.floor(seconds)}`;
    }
    const video = allVideos[videoId];
    return video?.originalUrl || '#';
}

/**
 * Delete a note
 */
async function deleteNote(uuid) {
    try {
        const noteIndex = allNotes.findIndex(n => n.uuid === uuid);
        if (noteIndex === -1) return;

        const note = allNotes[noteIndex];

        // Remove screenshot if exists
        if (note.imageId && allScreenshots[note.imageId]) {
            delete allScreenshots[note.imageId];
        }

        // Remove note
        allNotes.splice(noteIndex, 1);

        // Save to storage
        await chrome.storage.local.set({
            notes: allNotes,
            screenshots: allScreenshots
        });

        updateStats();
        renderCurrentView();
        showToast('Note deleted');
    } catch (error) {
        console.error('Failed to delete note:', error);
    }
}

/**
 * Handle export
 */
async function handleExport() {
    try {
        const data = {
            version: 1,
            exportedAt: Date.now(),
            videos: Object.values(allVideos),
            notes: allNotes
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ojeet-notes-${formatDateForFilename(new Date())}.json`;
        a.click();

        URL.revokeObjectURL(url);
        showToast('Notes exported!');
    } catch (error) {
        console.error('Export failed:', error);
    }
}

/**
 * Handle clear all
 */
function handleClearAll() {
    showConfirm('Delete ALL notes and screenshots?<br><small style="color:#888">This cannot be undone.</small>', async () => {
        try {
            await chrome.storage.local.clear();
            allNotes = [];
            allVideos = {};
            allScreenshots = {};
            updateStats();
            renderCurrentView();
            showToast('All data cleared');
        } catch (error) {
            console.error('Failed to clear data:', error);
        }
    });
}

/**
 * Show screenshot modal
 */
function showModal(src) {
    modalImage.src = src;
    resetZoom();
    currentRotation = 0;
    screenshotModal.classList.add('visible');
}

/**
 * Close modal
 */
function closeModal() {
    screenshotModal.classList.remove('visible');
    modalImage.src = '';
    resetZoom();
    currentRotation = 0;
}

/**
 * Zoom in
 */
function zoomIn() {
    if (currentZoom < MAX_ZOOM) {
        currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
        applyZoom();
    }
}

/**
 * Zoom out
 */
function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
        currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
        applyZoom();
    }
}

/**
 * Reset zoom to 100%
 */
function resetZoom() {
    currentZoom = 1;
    applyZoom();
}

/**
 * Apply current zoom level
 */
function applyZoom() {
    modalImage.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
    zoomLevelDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
}

/**
 * Rotate image 90 degrees clockwise
 */
function rotateImage() {
    currentRotation = (currentRotation + 90) % 360;
    applyZoom();
}

/**
 * Show confirm dialog
 */
function showConfirm(message, callback) {
    confirmMessage.innerHTML = message;
    confirmCallback = callback;
    confirmOverlay.classList.add('visible');
}

/**
 * Close confirm dialog
 */
function closeConfirm() {
    confirmOverlay.classList.remove('visible');
    confirmCallback = null;
}

/**
 * Show toast notification
 */
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// Utility functions
function formatTime(seconds) {
    if (seconds === undefined || seconds === null) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(timestamp) {
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

function formatDateForFilename(date) {
    return date.toISOString().split('T')[0];
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
init();
