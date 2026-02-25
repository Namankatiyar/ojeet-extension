# Codebase Analysis & Refactoring Plan

## 1. Executive Summary
The current OJEET codebase is well-structured for a Manifest V3 extension, utilizing appropriate separation of concerns (Service Worker, Offscreen, Content Scripts). However, as the project grows, several areas exhibit signs of tight coupling, potential code duplication, and fragility in HTML generation. The following refactoring proposals aim to improve maintainability, reduce "spaghetti code" in content scripts, and ensure safer data handling.

## 2. Critical Refactoring Areas

### 2.1. Modularize Video Detection (Provider Pattern)
*   **Current State:** `src/content/video-agent.js` contains a monolithic mix of YouTube-specific logic (URL parsing, specific CSS selectors) and generic HTML5 video fallback logic.
*   **Problem:** Adding support for new platforms (Twitch, Vimeo, Coursera) would require hacking into this single file, increasing complexity and regression risk.
*   **Refactoring Proposal:** Implement a **Strategy Pattern**.
    *   Create a `VideoProvider` interface/base class.
    *   Implement `YouTubeProvider`, and `GenericProvider`.
    *   The main script simply iterates through registered providers to find a match.
*   **Benefit:** clean separation of platform-specific logic; easier upgrades.

### 2.2. Unified UI Rendering (DRY Principle)
*   **Current State:** `src/dashboard/dashboard.js` and `src/popup/popup.js` both contain logic to render "Note Cards" (HTML generation, timestamp formatting, event listeners).
*   **Problem:** Changing the design of a note card requires updating code in two separate places. Logic for formatting timestamps (`formatTime`) and dates is also duplicated.
*   **Refactoring Proposal:**
    *   Create `src/lib/ui-components.js` or `src/lib/renderer.js`.
    *   Export functions like `createNoteCardHTML(note)` and `formatTimestamp(seconds)`.
    *   Import these in both Dashboard and Popup contexts.
*   **Benefit:** Single source of truth for UI consistency.

### 2.3. Safer HTML Generation in `ui-host.js`
*   **Current State:** The UI overlay is built using large Template Literals (`innerHTML = ...`).
*   **Problem:**
    *   **Security:** High risk of XSS if data isn't perfectly escaped (though strictly CSP-bound).
    *   **Maintainability:** editing CSS/HTML inside a JS string is error-prone and lacks IDE support.
*   **Refactoring Proposal:**
    *   **Option A (Lightweight):** Create a helper function `createElement(tag, attrs, children)` to build DOM nodes programmatically instead of using strings.
    *   **Option B (Robust):** Use a lightweight, build-free library like **Preact** (via module imports if possible) or a custom `DOMBuilder` class.
*   **Benefit:** Safer code, easier event binding, and better readability.

### 2.4. Robust Storage Transactions
*   **Current State:** Data is split between `chrome.storage.local` (metadata) and `IndexedDB` (binary blobs).
*   **Problem:** The save operation is not atomic. If `chrome.storage` succeeds but `IndexedDB` fails (or vice versa), the application enters an inconsistent state (orphaned records).
*   **Refactoring Proposal:**
    *   Enhance `src/lib/storage.js` to implement a basic **Transaction Manager**.
    *   If one storage operation fails, attempt to roll back the other (e.g., delete the note ID from `chrome.storage` if the image save fails).
*   **Benefit:** Prevents "ghost" notes or missing screenshots.

## 3. Improvements for Navigation & Upgradability

### 3.1. Service Worker Decomposition
*   **Observation:** `src/background/service-worker.js` handles commands, messaging, screenshot orchestration, and context menus.
*   **Suggestion:** Split into functional modules:
    *   `src/background/commands.js`
    *   `src/background/screenshot-manager.js`
    *   `src/background/context-menus.js`
    *   Import these into the main `service-worker.js`.
*   **Why:** Makes the entry point cleaner and easier to debug.

### 3.2. Centralized Configuration
*   **Observation:** Selectors, timeouts, and magic numbers (e.g., `z-index: 2147483647`) are scattered.
*   **Suggestion:** Create `src/config.js` or `src/constants.js` to store:
    *   UI Z-Indices.
    *   Timeout durations.
    *   Selector lists for video detection.
    *   Max screenshot dimensions/quality settings.

### 3.3. Typed Messaging (JSDoc/Types)
*   **Observation:** `messaging.js` is good, but payloads are loose.
*   **Suggestion:** Add JSDoc `@typedef` definitions for all message payloads (`CaptureRequest`, `VideoInfo`).
*   **Why:** Provides better IDE intellisense and reduces "undefined property" bugs during refactors.

## 4. Bloat Removal
*   **CSS Duplication:** `dashboard.css` and `popup.css` share many common styles (buttons, scrollbars).
    *   *Action:* Move common utility classes (buttons, inputs, scrollbars) into `src/styles/components.css` or merge into `theme.css`.
*   **Unused Selectors:** `video-agent.js` checks many selectors that might be obsolete.
    *   *Action:* periodically audit and remove selectors for older/defunct player versions.
