This codebase is being maintained on a windows 10 pc. To get a more intense overview of the codebase if you are going to refactor the codebase, you can go through the code files summaries provided in the .ai_workflow/src folder.
# OJEET Extension - Project Overview

## 1. Introduction
OJEET is a Chrome Extension designed for enhanced video learning. It allows users to take timestamped notes, capture cropped screenshots, and organize their learning materials directly from video platforms like YouTube. The extension features a modern, dark-themed UI with glassmorphism effects and synchronizes data across a Popup, a persistent Dashboard, and the video page itself.

## 2. Architecture & Core Components

The project follows a standard Manifest V3 architecture, separated into distinct contexts that communicate via a typed messaging layer. The codebase was refactored using several key design patterns:

- **Strategy Pattern** for video platform detection (Provider-based)
- **Module Decomposition** for the service worker (single-responsibility)
- **DRY Principle** for shared UI components and utilities
- **Transaction Safety** for storage operations
- **Centralized Configuration** for all constants and magic numbers

### 2.1 Background Service Worker (`src/background/`)
The service worker is decomposed into focused modules imported by the main entry point:

*   **`service-worker.js`** — Slim orchestrator. Registers Chrome command & message listeners, delegates to sub-modules.
*   **`commands.js`** — Handles keyboard shortcuts (`take-screenshot`, `save-timestamp`, `open-note-editor`).
*   **`screenshot-manager.js`** — Captures the visible tab and delegates cropping to the offscreen document.
*   **`storage-manager.js`** — Manages saving to `chrome.storage.local` with transaction rollback on failure.
*   **`video-info-requester.js`** — Multi-frame video info request logic (main frame → sub-frames → dynamic injection).
*   **`ui-injector.js`** — Fallback UI injection when the standard ui-host messaging fails.

### 2.2 Offscreen Document (`src/background/`)
*   **Files:** `offscreen.html`, `offscreen.js`
*   **Role:** Performs DOM-dependent operations prohibited in the Service Worker.
*   **Key Function:** Uses the HTML5 Canvas API to crop screenshots based on video bounds received from the content script. It converts the cropped image to a WebP data URL for efficient storage.

### 2.3 Content Scripts (`src/content/`)
*   **Video Agent (`video-agent.js`):**
    *   Runs in **all frames** to detect embedded videos.
    *   Uses the **Strategy (Provider) Pattern** with a provider registry.
    *   **`YouTubeProvider`** — All YouTube-specific logic (URL parsing, CSS selectors, live detection).
    *   **`GenericProvider`** — Fallback for any HTML5 `<video>` element.
    *   Adding a new platform (Twitch, Vimeo, etc.) only requires creating a new provider class and adding it to the registry.
    *   Handles playback control (play/pause) and fullscreen toggling during screenshot capture.
*   **Provider Module Files (`src/content/providers/`):**
    *   `video-provider.js` — Base class defining the provider interface.
    *   `youtube-provider.js` — YouTube-specific implementation.
    *   `generic-provider.js` — Generic HTML5 video fallback.
    *   *Note: These are standalone ES module files for reference/documentation. The actual content script inlines the classes due to MV3 content script limitations with ES modules.*
*   **UI Host (`ui-host.js`, `ui-host.css`):**
    *   Runs only in the **top-level frame**.
    *   Injects a **Shadow DOM** overlay (`#ojeet-overlay-root`) to render the Note Editor and Toast notifications.
    *   Isolates styles (`all: initial`) and keyboard events to prevent conflicts with the host page (e.g., stopping YouTube hotkeys while typing).

### 2.4 Popup Interface (`src/popup/`)
*   **Files:** `popup.html`, `popup.css`, `popup.js`
*   **Role:** Quick access menu for recent notes and settings.
*   **Features:**
    *   Lists recent notes with screenshots.
    *   Filters notes by the current video or search terms.
    *   Provides "Grant Permission" prompts for sites that require host permissions.
    *   Displays current keyboard shortcuts.

### 2.5 Dashboard (`src/dashboard/`)
*   **Files:** `dashboard.html`, `dashboard.css`, `dashboard.js`
*   **Role:** Full-page application for browsing and managing all saved content.
*   **Features:**
    *   **Views:** "All Notes", "By Video" (grouped), and "Screenshots" (gallery).
    *   **Search:** Real-time filtering by note text or video title.
    *   **Export:** Backs up data to a JSON file.
    *   **Image Viewer:** Modal with zoom and rotate controls for inspecting screenshots.

### 2.6 Shared Libraries (`src/lib/`)
*   **Messaging (`messaging.js`):**
    *   Typed wrapper around `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`.
    *   Defines `MessageTypes` enum to ensure type safety across contexts.
    *   Includes comprehensive JSDoc `@typedef` definitions for all message payloads.
    *   Includes `broadcastToTab` to locate video agents in nested frames.
*   **Storage (`storage.js`):**
    *   **Hybrid Strategy:**
        *   **Metadata:** Stores notes and video info in `chrome.storage.local`.
        *   **Binary:** Stores large screenshot blobs in **IndexedDB** (`OjeetDB`) to avoid Chrome's storage quota limits.
    *   **Transaction Safety:** `saveNoteWithScreenshot()` ensures atomicity — if the screenshot save fails, the note is rolled back.
*   **UI Components (`ui-components.js`):**
    *   **Single Source of Truth** for shared rendering functions used by both Dashboard and Popup.
    *   Exports: `formatTimestamp()`, `formatDate()`, `truncate()`, `escapeHtml()`, `generateId()`, `buildVideoUrl()`, `createNoteCardHTML()`.
*   **DOM Builder (`dom-builder.js`):**
    *   Safe, programmatic DOM construction via `el()` and `svg()` helpers.
    *   Replaces error-prone `innerHTML` template literals.
    *   Includes pre-built SVG `Icons` (trash, external link, zoom, rotate).

### 2.7 Configuration (`src/config.js`)
*   Centralized constants for the entire extension:
    *   UI z-indices, timeouts, delays.
    *   Screenshot format/quality settings.
    *   Zoom parameters.
    *   YouTube selectors and URL patterns.
    *   Video provider identifiers.
    *   Storage keys and database config.
    *   File paths for content scripts and offscreen documents.
    *   Reserved keyboard shortcuts.

### 2.8 Styling (`src/styles/`)
*   **Theme (`theme.css`):**
    *   Centralized CSS variables for a consistent design system.
    *   Supports Light/Dark modes (defaulting to Dark).
    *   Implements glassmorphism effects for desktop views (`backdrop-filter`).
*   **Components (`components.css`):**
    *   Shared utility classes and component styles (buttons, note cards, scrollbars, animations).
    *   Imported by both `dashboard.css` and `popup.css` to eliminate duplication.

## 3. Key Workflows

### 3.1 Taking a Screenshot
1.  **Trigger:** User presses `Alt+S` (or configured shortcut).
2.  **Background:** `service-worker.js` receives command → delegates to `commands.js`.
3.  **Video Info:** `commands.js` → `video-info-requester.js` → requests metadata from `video-agent.js` (provider pattern).
4.  **Capture:** `screenshot-manager.js` captures the visible tab.
5.  **Crop:** If video bounds exist, the image is sent to `offscreen.js` for cropping.
6.  **Save:** `storage-manager.js` saves with transaction safety.
7.  **Notify:** A success toast is sent to `ui-host.js` for display.

### 3.2 Saving a Note with Screenshot
1.  **Trigger:** User presses `Alt+N`.
2.  **Capture:** Same screenshot process as above.
3.  **UI:** Background injects/activates `ui-host.js`.
4.  **Render:** `ui-host.js` creates a Shadow DOM overlay displaying the screenshot and a text input.
5.  **User Input:** User types a note and presses Enter.
6.  **Save:** `ui-host.js` sends a `SAVE_DATA` message to the background.
7.  **Persist:** Background saves the note + screenshot to storage (with rollback on failure).

## 4. Technical Constraints & Design Choices
*   **Manifest V3 Compliance:** Uses `offscreen` documents for Canvas API access since Service Workers lack DOM access. Service worker uses `"type": "module"` for ES imports.
*   **Storage Limits:** Uses IndexedDB for images because `chrome.storage.local` has strict quota limits (usually 5MB-10MB) which would fill up quickly with screenshots.
*   **Style Isolation:** The UI is strictly isolated in Shadow DOM with `all: initial` to ensure it looks consistent on any website.
*   **Event Isolation:** Aggressive `stopPropagation` is used on the note input to preventing the host page from reacting to keypresses (critical for YouTube).
*   **Content Script Module Limitation:** Content scripts cannot use ES module imports in MV3 without a build step. The provider classes are inlined within the video-agent IIFE. Standalone provider files exist in `src/content/providers/` for reference and documentation.


