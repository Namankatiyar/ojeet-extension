/**
 * Centralized Configuration & Constants
 * Single source of truth for magic numbers, selectors, timeouts, and settings.
 * 
 * @module config
 */

// ============ UI Constants ============

/** Z-index for overlay elements (maximum safe integer for CSS) */
export const Z_INDEX_OVERLAY = 2147483647;

/** Z-index for toast notifications */
export const Z_INDEX_TOAST = 2147483647;

// ============ Timeouts & Delays (ms) ============

/** Delay before focusing the note input after overlay opens */
export const INPUT_FOCUS_DELAY = 100;

/** Delay after injecting UI host script before sending messages */
export const SCRIPT_INJECTION_DELAY = 100;

/** Delay after exiting fullscreen before proceeding */
export const FULLSCREEN_EXIT_DELAY = 100;

/** Duration a toast notification is visible */
export const TOAST_DURATION = 3000;

/** Duration a temporary message is visible (popup) */
export const TEMP_MESSAGE_DURATION = 2000;

/** Toast fade-out animation delay (CSS, seconds) */
export const TOAST_FADE_DELAY_SEC = 2.5;

// ============ Screenshot & Image Settings ============

/** Output format for cropped screenshots */
export const SCREENSHOT_FORMAT = 'image/webp';

/** Quality setting for WebP encoding (0-1) */
export const SCREENSHOT_QUALITY = 0.9;

/** Capture format for chrome.tabs.captureVisibleTab */
export const CAPTURE_FORMAT = 'png';

// ============ Image Viewer / Zoom ============

/** Zoom step increment/decrement */
export const ZOOM_STEP = 0.25;

/** Minimum zoom level */
export const MIN_ZOOM = 0.25;

/** Maximum zoom level */
export const MAX_ZOOM = 4;

/** Default zoom level */
export const DEFAULT_ZOOM = 1;

// ============ Storage ============

/** IndexedDB database name */
export const DB_NAME = 'OjeetDB';

/** IndexedDB database version */
export const DB_VERSION = 1;

/** IndexedDB object store for screenshots */
export const SCREENSHOTS_STORE = 'screenshots';

/** Chrome storage keys */
export const STORAGE_KEYS = {
    VIDEOS: 'videos',
    NOTES: 'notes',
    SCREENSHOTS: 'screenshots',
};

// ============ Video Detection Selectors ============

/**
 * YouTube-specific video element selectors, ordered by specificity.
 * Tried sequentially — first match wins.
 */
export const YOUTUBE_VIDEO_SELECTORS = [
    'video.html5-main-video',
    '.html5-video-container video',
    '#movie_player video',
    '.video-stream.html5-main-video',
    'ytd-player video',
    'video',
];

/**
 * YouTube title selectors, tried sequentially.
 */
export const YOUTUBE_TITLE_SELECTORS = [
    'h1.ytd-video-primary-info-renderer yt-formatted-string',
    'h1.title.ytd-video-primary-info-renderer',
    '#title h1 yt-formatted-string',
    '#title h1',
    'h1.title',
    'meta[property="og:title"]',
    'meta[name="title"]',
];

/**
 * Fullscreen container selectors for restoring fullscreen state.
 */
export const FULLSCREEN_CONTAINER_SELECTORS = [
    '.html5-video-player',
    '.video-container',
];

// ============ YouTube URL Patterns ============

/** Regex for YouTube video ID (11 alphanumeric + hyphen/underscore chars) */
export const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Regex patterns for extracting YouTube video ID from URL paths */
export const YOUTUBE_URL_PATTERNS = {
    EMBED: /\/embed\/([a-zA-Z0-9_-]{11})/,
    SHORTS: /\/shorts\/([a-zA-Z0-9_-]{11})/,
    LIVE: /\/live\/([a-zA-Z0-9_-]{11})/,
    PARAM: /[?&]v=([a-zA-Z0-9_-]{11})/,
    SHORT_URL: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
};

// ============ Video Providers ============

/** Known video provider identifiers */
export const PROVIDERS = {
    YOUTUBE_DIRECT: 'youtube-direct',
    YOUTUBE_EMBED: 'youtube-embed',
    GENERIC_HTML5: 'generic-html5',
};

// ============ Reserved Keyboard Shortcuts ============

/** Shortcuts reserved by Chrome or the OS — cannot be overridden */
export const RESERVED_SHORTCUTS = [
    'Ctrl+T', 'Ctrl+N', 'Ctrl+W', 'Ctrl+Q', 'Ctrl+Tab', 'Ctrl+Shift+Tab',
    'Ctrl+L', 'Ctrl+D', 'Ctrl+H', 'Ctrl+J', 'Ctrl+P', 'Ctrl+S', 'Ctrl+O',
    'Ctrl+F', 'Ctrl+G', 'Ctrl+R', 'Ctrl+Shift+N', 'Ctrl+Shift+T',
    'Alt+F4', 'Alt+Tab', 'Alt+F', 'Alt+E', 'Alt+V', 'Alt+H',
    'F1', 'F3', 'F5', 'F6', 'F7', 'F11', 'F12',
];

// ============ Offscreen Document ============

/** Path to the offscreen HTML document */
export const OFFSCREEN_DOCUMENT_PATH = 'src/background/offscreen.html';

/** Offscreen document justification string */
export const OFFSCREEN_JUSTIFICATION = 'Crop screenshot image';

// ============ Content Script Paths ============

/** Path to the UI host content script */
export const UI_HOST_SCRIPT_PATH = 'src/content/ui-host.js';

/** Path to the UI host CSS */
export const UI_HOST_CSS_PATH = 'src/content/ui-host.css';

/** Path to the dashboard HTML */
export const DASHBOARD_PATH = 'src/dashboard/dashboard.html';

// ============ Debug ============

/** Enable debug logging in content scripts */
export const DEBUG = true;
