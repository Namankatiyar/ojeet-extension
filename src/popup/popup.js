/**
 * Popup Script - Notes Management Interface
 */

// DOM Elements
const searchInput = document.getElementById('searchInput');
const videoFilter = document.getElementById('videoFilter');
const notesContainer = document.getElementById('notesContainer');
const notesList = document.getElementById('notesList');
const emptyState = document.getElementById('emptyState');
const noteCount = document.getElementById('noteCount');
const dashboardBtn = document.getElementById('dashboardBtn');
const settingsBtn = document.getElementById('settingsBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const permissionBanner = document.getElementById('permissionBanner');
const grantPermissionBtn = document.getElementById('grantPermissionBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const keybindWarning = document.getElementById('keybindWarning');
const keybindWarningText = document.getElementById('keybindWarningText');
const chromeShortcutsLink = document.getElementById('chromeShortcutsLink');

// State
let allNotes = [];
let allVideos = {};
let allScreenshots = {};
let currentFilter = 'all';
let currentSearch = '';
let recordingKeybind = null; // Currently recording keybind button

/**
 * Show a custom confirm dialog
 * @param {string} message - The confirmation message
 * @param {string} confirmText - Text for confirm button (default: 'Delete')
 * @param {boolean} isDanger - Whether this is a dangerous action (red styling)
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showConfirmDialog(message, confirmText = 'Delete', isDanger = true) {
  return new Promise((resolve) => {
    // Remove existing dialog if any
    const existing = document.querySelector('.confirm-dialog-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-message">${message}</div>
        <div class="confirm-buttons">
          <button class="confirm-btn cancel">Cancel</button>
          <button class="confirm-btn ${isDanger ? 'danger' : 'primary'}">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.confirm-btn.cancel');
    const confirmBtn = overlay.querySelector('.confirm-btn.danger, .confirm-btn.primary');

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    // Focus confirm button
    confirmBtn.focus();

    // Handle keyboard
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    });
  });
}

/**
 * Initialize the popup
 */
async function init() {
  await loadData();
  await checkPermissions();
  await loadKeybinds();
  setupEventListeners();
}

/**
 * Load all data from storage
 */
async function loadData() {
  try {
    const data = await chrome.storage.local.get(['notes', 'videos', 'screenshots']);

    allNotes = data.notes || [];
    allScreenshots = data.screenshots || {};

    // Create video lookup map
    allVideos = data.videos || {};

    // Populate video filter
    populateVideoFilter(Object.values(allVideos));

    // Render notes
    renderNotes();
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

/**
 * Populate video filter dropdown
 */
function populateVideoFilter(videos) {
  videoFilter.innerHTML = '<option value="all">All Videos</option>';

  videos.forEach(video => {
    const option = document.createElement('option');
    option.value = video.id;
    option.textContent = truncate(video.title || 'Untitled Video', 40);
    videoFilter.appendChild(option);
  });
}

/**
 * Render notes based on current filters
 */
function renderNotes() {
  // Filter notes
  let filtered = allNotes;

  // Apply video filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(note => note.videoId === currentFilter);
  }

  // Apply search filter
  if (currentSearch) {
    const search = currentSearch.toLowerCase();
    filtered = filtered.filter(note => {
      const noteText = (note.noteText || '').toLowerCase();
      const video = allVideos[note.videoId];
      const videoTitle = (video?.title || '').toLowerCase();
      return noteText.includes(search) || videoTitle.includes(search);
    });
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => b.createdAt - a.createdAt);

  // Update count
  noteCount.textContent = `${filtered.length} note${filtered.length !== 1 ? 's' : ''}`;

  // Show/hide empty state
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    notesList.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    notesList.classList.remove('hidden');

    // Render note cards
    notesList.innerHTML = '';
    filtered.forEach(note => {
      const card = createNoteCard(note);
      notesList.appendChild(card);
    });
  }
}

/**
 * Create a note card element
 */
function createNoteCard(note) {
  const video = allVideos[note.videoId] || {};
  const card = document.createElement('div');
  card.className = 'note-card';
  card.dataset.uuid = note.uuid;

  card.innerHTML = `
    <div class="note-card-header">
      <div class="note-timestamp">
        <span class="timestamp-badge" data-video-id="${note.videoId}" data-time="${note.timestampSeconds}">
          ${note.timestampFormatted || formatTime(note.timestampSeconds)}
        </span>
        <span class="video-title" title="${video.title || 'Unknown Video'}">
          ${truncate(video.title || 'Unknown Video', 25)}
        </span>
      </div>
      <div class="note-actions">
        <button class="open-link-btn" title="Open in New Tab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
        <button class="delete-btn" title="Delete Note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="note-screenshot-container" data-image-id="${note.imageId || ''}"></div>
    ${note.noteText ? `<div class="note-text">${escapeHtml(note.noteText)}</div>` : ''}
    <div class="note-date">${formatDate(note.createdAt)}</div>
  `;

  // Load screenshot if exists
  if (note.imageId && allScreenshots[note.imageId]) {
    const container = card.querySelector('.note-screenshot-container');
    const img = document.createElement('img');
    img.className = 'note-screenshot';
    img.src = allScreenshots[note.imageId].dataUrl;
    img.alt = 'Note screenshot';
    img.addEventListener('click', () => showFullscreenImage(allScreenshots[note.imageId].dataUrl));
    container.appendChild(img);
  }

  // Setup event listeners
  const timestampBadge = card.querySelector('.timestamp-badge');
  timestampBadge.addEventListener('click', () => jumpToTimestamp(note.videoId, note.timestampSeconds));

  const openBtn = card.querySelector('.open-link-btn');
  openBtn.addEventListener('click', () => jumpToTimestamp(note.videoId, note.timestampSeconds));

  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => handleDeleteNote(note.uuid));

  return card;
}

/**
 * Show fullscreen image modal
 */
function showFullscreenImage(dataUrl) {
  const modal = document.createElement('div');
  modal.className = 'screenshot-modal';
  modal.innerHTML = `<img src="${dataUrl}" alt="Full screenshot" />`;
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

/**
 * Jump to timestamp in YouTube video
 */
async function jumpToTimestamp(videoId, seconds) {
  // Build YouTube URL with timestamp
  const url = buildYouTubeUrl(videoId, seconds);

  // Open in new tab
  await chrome.tabs.create({ url });
}

/**
 * Build YouTube URL with timestamp
 */
function buildYouTubeUrl(videoId, seconds) {
  // Check if it's a YouTube video ID (11 characters, alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return `https://youtu.be/${videoId}?t=${Math.floor(seconds)}`;
  }
  // For generic videos, return the original URL if stored
  const video = allVideos[videoId];
  return video?.originalUrl || '#';
}

/**
 * Handle note deletion
 */
async function handleDeleteNote(uuid) {
  const confirmed = await showConfirmDialog('Delete this note?', 'Delete', true);
  if (!confirmed) return;

  try {
    // Find the note
    const noteIndex = allNotes.findIndex(n => n.uuid === uuid);
    if (noteIndex === -1) return;

    const note = allNotes[noteIndex];

    // Remove screenshot if exists
    if (note.imageId && allScreenshots[note.imageId]) {
      delete allScreenshots[note.imageId];
    }

    // Remove note from array
    allNotes.splice(noteIndex, 1);

    // Save back to storage
    await chrome.storage.local.set({
      notes: allNotes,
      screenshots: allScreenshots
    });

    renderNotes();
    showTemporaryMessage('Note deleted');
  } catch (error) {
    console.error('Failed to delete note:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim();
    renderNotes();
  });

  // Video filter
  videoFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderNotes();
  });

  // Dashboard
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
  });

  // Settings
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  // Chrome shortcuts link
  chromeShortcutsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Permission grant
  grantPermissionBtn.addEventListener('click', requestPermission);

  // Keybind buttons
  document.querySelectorAll('.keybind-btn').forEach(btn => {
    btn.addEventListener('click', () => startRecordingKeybind(btn));
  });

  // Global keydown for keybind recording
  document.addEventListener('keydown', handleKeybindRecording);

  // Clear all
  clearAllBtn.addEventListener('click', handleClearAll);
}

/**
 * Check if we have permission for current tab
 */
async function checkPermissions() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    // Check if it's a YouTube URL (our main use case)
    const isYouTube = tab.url.includes('youtube.com');
    if (isYouTube) {
      permissionBanner.classList.add('hidden');
      return;
    }

    // For other sites, check if we have host permission
    const hasPermission = await chrome.permissions.contains({
      origins: [new URL(tab.url).origin + '/*']
    });

    if (!hasPermission && tab.url.startsWith('http')) {
      permissionBanner.classList.remove('hidden');
    } else {
      permissionBanner.classList.add('hidden');
    }
  } catch (error) {
    console.log('Permission check error:', error);
    permissionBanner.classList.add('hidden');
  }
}

/**
 * Request permission for current tab's origin
 */
async function requestPermission() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const origin = new URL(tab.url).origin + '/*';
    const granted = await chrome.permissions.request({
      origins: [origin]
    });

    if (granted) {
      permissionBanner.classList.add('hidden');
      showTemporaryMessage('Permission granted!');
    }
  } catch (error) {
    console.error('Permission request failed:', error);
    showTemporaryMessage('Permission denied');
  }
}

/**
 * Load current keybinds from Chrome commands API
 */
async function loadKeybinds() {
  try {
    const commands = await chrome.commands.getAll();
    commands.forEach(command => {
      const btn = document.querySelector(`[data-command="${command.name}"]`);
      if (btn) {
        const valueSpan = btn.querySelector('.keybind-value');
        valueSpan.textContent = command.shortcut || 'Not set';
      }
    });
  } catch (error) {
    console.error('Failed to load keybinds:', error);
  }
}

/**
 * Open settings modal
 */
function openSettings() {
  loadKeybinds();
  hideKeybindWarning();
  settingsOverlay.classList.remove('hidden');
}

/**
 * Close settings modal
 */
function closeSettings() {
  if (recordingKeybind) {
    recordingKeybind.classList.remove('recording');
    recordingKeybind = null;
  }
  settingsOverlay.classList.add('hidden');
}

/**
 * Start recording a new keybind
 */
function startRecordingKeybind(btn) {
  // Stop any existing recording
  if (recordingKeybind) {
    recordingKeybind.classList.remove('recording');
  }

  recordingKeybind = btn;
  btn.classList.add('recording');
  btn.querySelector('.keybind-value').textContent = 'Press keys...';
  hideKeybindWarning();
}

/**
 * Handle keybind recording
 */
function handleKeybindRecording(e) {
  if (!recordingKeybind) return;

  e.preventDefault();
  e.stopPropagation();

  // Ignore just modifier keys
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

  // Build shortcut string
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  // Get the key
  let key = e.key.toUpperCase();
  if (key === ' ') key = 'Space';
  if (key.length === 1) key = key.toUpperCase();
  parts.push(key);

  const shortcut = parts.join('+');

  // Validate shortcut
  if (!validateShortcut(shortcut)) {
    showKeybindWarning('This shortcut requires at least one modifier (Ctrl, Alt, or Shift).');
    return;
  }

  // Check for reserved shortcuts
  if (isReservedShortcut(shortcut)) {
    showKeybindWarning(`"${shortcut}" is reserved by Chrome or your system.`);
    return;
  }

  // Update the display
  const valueSpan = recordingKeybind.querySelector('.keybind-value');
  valueSpan.textContent = shortcut;
  recordingKeybind.classList.remove('recording');

  // Show info about changing shortcuts
  showKeybindWarning(`To apply "${shortcut}", open Chrome Shortcuts Settings and set it manually.`);

  recordingKeybind = null;
}

/**
 * Validate shortcut format
 */
function validateShortcut(shortcut) {
  const parts = shortcut.split('+');
  const hasModifier = parts.some(p => ['Ctrl', 'Alt', 'Shift'].includes(p));
  return hasModifier && parts.length >= 2;
}

/**
 * Check if shortcut is reserved
 */
function isReservedShortcut(shortcut) {
  const reserved = [
    'Ctrl+T', 'Ctrl+N', 'Ctrl+W', 'Ctrl+Q', 'Ctrl+Tab', 'Ctrl+Shift+Tab',
    'Ctrl+L', 'Ctrl+D', 'Ctrl+H', 'Ctrl+J', 'Ctrl+P', 'Ctrl+S', 'Ctrl+O',
    'Ctrl+F', 'Ctrl+G', 'Ctrl+R', 'Ctrl+Shift+N', 'Ctrl+Shift+T',
    'Alt+F4', 'Alt+Tab', 'Alt+F', 'Alt+E', 'Alt+V', 'Alt+H',
    'F1', 'F3', 'F5', 'F6', 'F7', 'F11', 'F12'
  ];
  return reserved.includes(shortcut);
}

/**
 * Show keybind warning
 */
function showKeybindWarning(message) {
  keybindWarningText.textContent = message;
  keybindWarning.classList.remove('hidden');
}

/**
 * Hide keybind warning
 */
function hideKeybindWarning() {
  keybindWarning.classList.add('hidden');
}

/**
 * Handle clear all
 */
async function handleClearAll() {
  const confirmed = await showConfirmDialog(
    'Delete ALL notes and screenshots?<br><small style="color:#888">This cannot be undone.</small>',
    'Delete All',
    true
  );
  if (!confirmed) return;

  try {
    await chrome.storage.local.clear();
    allNotes = [];
    allVideos = {};
    allScreenshots = {};
    videoFilter.innerHTML = '<option value="all">All Videos</option>';
    renderNotes();
    showTemporaryMessage('All notes cleared');
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}

/**
 * Show a temporary message
 */
function showTemporaryMessage(message) {
  const existing = document.querySelector('.temp-message');
  if (existing) existing.remove();

  const msg = document.createElement('div');
  msg.className = 'temp-message';
  msg.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: fadeInUp 0.3s ease;
  `;
  msg.textContent = message;
  document.body.appendChild(msg);

  setTimeout(() => msg.remove(), 2000);
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

  // Less than 24 hours
  if (diff < 86400000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Same year
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
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
init();
