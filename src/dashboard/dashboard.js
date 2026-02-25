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
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmAction = document.getElementById('confirmAction');

// Viewer DOM
const viewerOverlay = document.getElementById('viewerOverlay');
const viewerCanvas = document.getElementById('viewerCanvas');
const viewerImage = document.getElementById('viewerImage');
const viewerClose = document.getElementById('viewerClose');
const viewerDownload = document.getElementById('viewerDownload');
const viewerPrev = document.getElementById('viewerPrev');
const viewerNext = document.getElementById('viewerNext');

// State
let allNotes = [];
let allVideos = {};
let allScreenshots = {};
let currentView = 'all';
let currentSearch = '';
let confirmCallback = null;

// Viewer state
let viewerImages = [];   // [{src, imageId}]
let viewerIndex = -1;
let vScale = 1;
let vTx = 0, vTy = 0;
let vFitScale = 1;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let panStartTx = 0, panStartTy = 0;
const V_ZOOM_FACTOR = 1.15;
const V_MIN_SCALE = 0.1;
const V_MAX_SCALE = 6;

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

    // Confirm dialog
    confirmCancel.addEventListener('click', closeConfirm);
    confirmAction.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });

    // --- Image Viewer events ---
    viewerClose.addEventListener('click', closeViewer);
    viewerDownload.addEventListener('click', () => {
        if (viewerImages[viewerIndex]) {
            downloadDataUrl(viewerImages[viewerIndex].src, 'ojeet-screenshot.webp');
        }
    });
    viewerPrev.addEventListener('click', () => navigateViewer(-1));
    viewerNext.addEventListener('click', () => navigateViewer(1));

    // Scroll-wheel zoom (cursor-focused)
    viewerCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = viewerCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const direction = e.deltaY < 0 ? 1 : -1;
        const factor = direction > 0 ? V_ZOOM_FACTOR : (1 / V_ZOOM_FACTOR);
        const newScale = Math.min(V_MAX_SCALE, Math.max(V_MIN_SCALE, vScale * factor));
        // Adjust translate so point under cursor stays fixed
        vTx = mx - (mx - vTx) * (newScale / vScale);
        vTy = my - (my - vTy) * (newScale / vScale);
        vScale = newScale;
        updateCursorState();
        applyViewerTransform();
    }, { passive: false });

    // Panning
    viewerCanvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartTx = vTx;
        panStartTy = vTy;
        viewerOverlay.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        vTx = panStartTx + (e.clientX - panStartX);
        vTy = panStartTy + (e.clientY - panStartY);
        applyViewerTransform();
    });

    window.addEventListener('mouseup', () => {
        if (!isPanning) return;
        isPanning = false;
        viewerOverlay.classList.remove('panning');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (viewerOverlay.classList.contains('visible')) {
                closeViewer();
            }
            closeConfirm();
        }
        if (viewerOverlay.classList.contains('visible')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateViewer(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateViewer(1);
            }
        }
    });

    // Recalculate fit on resize
    window.addEventListener('resize', () => {
        if (viewerOverlay.classList.contains('visible') && viewerImage.naturalWidth) {
            const oldFit = vFitScale;
            computeFitScale();
            // Maintain relative zoom: if user was at fit level, stay at fit
            if (Math.abs(vScale - oldFit) < 0.001) {
                vScale = vFitScale;
            }
            centerImage();
            applyViewerTransform();
            updateCursorState();
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
            <div class="screenshot-top-actions">
              <button class="screenshot-download-btn" data-image-id="${note.imageId}" title="Download">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button class="screenshot-delete-btn" data-uuid="${note.uuid}" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
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
    // Build viewer image list from current gallery order
    const galleryCards = document.querySelectorAll('.screenshot-card');
    viewerImages = [];
    galleryCards.forEach(card => {
        const imageId = card.dataset.imageId;
        if (allScreenshots[imageId]) {
            viewerImages.push({ src: allScreenshots[imageId].dataUrl, imageId });
        }
    });

    galleryCards.forEach((card, idx) => {
        const img = card.querySelector('img');
        if (img) {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                openViewer(idx);
            });
        }
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

    // Attach click listeners to download buttons in screenshot gallery
    document.querySelectorAll('.screenshot-download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadScreenshot(btn.dataset.imageId);
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
          ${hasScreenshot ? `<button class="download-btn" title="Download Screenshot" data-image-id="${note.imageId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>` : ''}
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

    // Download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadScreenshot(btn.dataset.imageId);
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

    // Screenshot clicks — build viewer list from all visible note screenshots
    const noteImages = document.querySelectorAll('.note-screenshot');
    noteImages.forEach((img, idx) => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            // Build viewerImages from all note screenshots on screen
            viewerImages = [];
            document.querySelectorAll('.note-screenshot').forEach(nImg => {
                viewerImages.push({ src: nImg.src, imageId: nImg.dataset.imageId || '' });
            });
            openViewer(idx);
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
 * Download a single screenshot by its image ID
 */
function downloadScreenshot(imageId) {
    const screenshot = allScreenshots[imageId];
    if (!screenshot) return;
    downloadDataUrl(screenshot.dataUrl, `ojeet-screenshot-${imageId}.webp`);
}

/**
 * Trigger a download from a data URL
 */
function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
}

/**
 * Sanitize a string for use as a folder/file name
 */
function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/_{2,}/g, '_').trim() || 'Untitled';
}

/**
 * Handle export — produces a .zip with images grouped by video folder
 */
async function handleExport() {
    try {
        if (typeof JSZip === 'undefined') {
            showToast('Export library not loaded');
            return;
        }

        showToast('Preparing export…');

        const zip = new JSZip();

        // Add notes.json at root
        const jsonData = {
            version: 1,
            exportedAt: Date.now(),
            videos: Object.values(allVideos),
            notes: allNotes
        };
        zip.file('notes.json', JSON.stringify(jsonData, null, 2));

        // Group notes with screenshots by video
        const notesWithScreenshots = allNotes.filter(n => n.imageId && allScreenshots[n.imageId]);

        for (const note of notesWithScreenshots) {
            const video = allVideos[note.videoId];
            const folderName = sanitizeFilename(video?.title || 'Ungrouped');
            const timestamp = note.timestampFormatted || formatTime(note.timestampSeconds);
            const safeTimestamp = timestamp.replace(/:/g, '_');
            const fileName = `screenshot-${safeTimestamp}.webp`;

            const screenshot = allScreenshots[note.imageId];
            // Convert data URL to binary
            const base64 = screenshot.dataUrl.split(',')[1];
            if (base64) {
                zip.folder(folderName).file(fileName, base64, { base64: true });
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ojeet-export-${formatDateForFilename(new Date())}.zip`;
        a.click();

        URL.revokeObjectURL(url);
        showToast('Export complete!');
    } catch (error) {
        console.error('Export failed:', error);
        showToast('Export failed');
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

// ─── Image Viewer ───────────────────────────────────────────

/**
 * Open the image viewer at the given index in viewerImages
 */
function openViewer(index) {
    if (!viewerImages.length) return;
    viewerIndex = index;
    // Show/hide nav arrows
    const multi = viewerImages.length > 1;
    viewerPrev.classList.toggle('hidden', !multi);
    viewerNext.classList.toggle('hidden', !multi);
    // Show overlay first so canvas has layout dimensions for fit-scale
    viewerOverlay.classList.add('visible');
    loadViewerImage();
}

/**
 * Close the viewer
 */
function closeViewer() {
    viewerOverlay.classList.remove('visible');
    viewerOverlay.classList.remove('pannable', 'panning');
    viewerImage.src = '';
    isPanning = false;
}

/**
 * Navigate to prev/next image
 */
function navigateViewer(delta) {
    if (viewerImages.length <= 1) return;
    viewerIndex = (viewerIndex + delta + viewerImages.length) % viewerImages.length;
    loadViewerImage();
}

/**
 * Load the current viewer image, compute fit, center
 */
function loadViewerImage() {
    const entry = viewerImages[viewerIndex];
    if (!entry) return;
    viewerImage.src = entry.src;
    // Reset transform immediately
    vScale = 1; vTx = 0; vTy = 0;
    viewerImage.style.transform = '';

    // Once image dimensions available, compute fit
    if (viewerImage.naturalWidth) {
        onImageReady();
    } else {
        viewerImage.onload = onImageReady;
    }
}

function onImageReady() {
    viewerImage.onload = null;
    computeFitScale();
    vScale = vFitScale;
    centerImage();
    applyViewerTransform();
    updateCursorState();
}

/**
 * Compute the scale that fits the image entirely within the viewport
 */
function computeFitScale() {
    const vw = viewerCanvas.clientWidth;
    const vh = viewerCanvas.clientHeight;
    const iw = viewerImage.naturalWidth;
    const ih = viewerImage.naturalHeight;
    if (!iw || !ih) { vFitScale = 1; return; }
    vFitScale = Math.min(vw / iw, vh / ih);
}

/**
 * Center the image within the canvas at the current scale
 */
function centerImage() {
    const vw = viewerCanvas.clientWidth;
    const vh = viewerCanvas.clientHeight;
    const iw = viewerImage.naturalWidth * vScale;
    const ih = viewerImage.naturalHeight * vScale;
    vTx = (vw - iw) / 2;
    vTy = (vh - ih) / 2;
}

/**
 * Apply the current transform
 */
function applyViewerTransform() {
    viewerImage.style.transform = `translate(${vTx}px, ${vTy}px) scale(${vScale})`;
}

/**
 * Update cursor class based on zoom level
 */
function updateCursorState() {
    // Show grab cursor when image is zoomed in or out from fit (i.e. panning makes sense)
    const scaled = Math.abs(vScale - vFitScale) > 0.001;
    if (scaled) {
        viewerOverlay.classList.add('pannable');
    } else {
        viewerOverlay.classList.remove('pannable');
    }
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
