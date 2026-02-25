# State Map

---

## 1. State Classification Overview

The OJEET extension manages state across four distinct execution contexts: Background Service Worker, Content Scripts, Popup, and Dashboard.

- **Global Runtime State:** Shared state containers within a context (e.g., Note Editor UI state in Content Scripts).
- **Module-Scoped State:** Internal state restricted to a single module (e.g., Dashboard view filters).
- **Persistent Storage State:** Long-term data stored in `chrome.storage.local` and IndexedDB.
- **Derived/Computed State:** Values calculated from other state (e.g., filtered notes list).
- **UI State:** Ephemeral visual state like zoom levels or rotation angles.

---

## 2. Global Runtime State

### State Container: Note Editor State
Location:
- `src/content/ui-host.js`

Type:
- Composite (Shadow DOM Nodes + Visibility status)

Ownership:
- `ui-host.js`

Fields:
- `isVisible`: boolean — Whether the note editor overlay is shown.
- `currentScreenshot`: string (dataURL) — The image being edited.
- `videoInfo`: object — Metadata for the active video.

Mutated By:
- `ui-host.js` (via message listeners for `SHOW_UI`)

Read By:
- `ui-host.js` (to render the Shadow DOM)

Lifecycle:
- Initialized on first `Alt+N` or `Alt+S` (with openEditor=true).
- Reset/Hidden on Save or Escape.

Persistence:
- In-memory only.

Risks:
- State is tightly coupled to the DOM tree; if the host page removes the `#ojeet-overlay-root`, state is lost.

---

## 3. Module-Scoped State

### Module: src/dashboard/dashboard.js
Internal State:
- `currentView`: string ('all' | 'by-video' | 'screenshots')
- `searchQuery`: string
- `selectedImageId`: string | null
- `zoomLevel`: number
- `rotation`: number

Purpose:
- Manages the user's focus and interaction within the dashboard.

Mutated By:
- `handleViewChange()`, `updateSearch()`, `openModal()`, `adjustZoom()`.

Externally Influenced By:
- User clicks and keyboard input.

Risk Level:
- Low (self-contained).

---

### Module: src/popup/popup.js
Internal State:
- `hasHostPermission`: boolean
- `searchQuery`: string

Purpose:
- Gates access to features and filters recent notes.

Mutated By:
- `checkPermissions()`, `updateSearch()`.

Externally Influenced By:
- Extension reload / User granting permissions.

Risk Level:
- Medium (requires synchronization with Browser API).

---

## 4. Persistent State

### Storage Mechanism: chrome.storage.local
Keys:
- `videos`: array — Metadata for all videos where notes were taken.
- `notes`: array — Text content, timestamps, and image references.
- `settings`: object — User-defined keyboard shortcuts (if configured).

Written By:
- `src/background/storage-manager.js` (Transaction-safe save)

Read By:
- `src/dashboard/dashboard.js`, `src/popup/popup.js`.

Load Timing:
- On demand when UI opens.

Serialization Format:
- JSON.

Migration Strategy:
- None (currently relies on static schema).

Failure Handling:
- **Auto-Rollback:** Metadata save is reverted if image save fails.

---

### Storage Mechanism: IndexedDB (OjeetDB)
Keys:
- `screenshots`: Map<imageId, blob/dataURL>

Written By:
- `src/lib/storage.js`

Read By:
- `src/dashboard/dashboard.js`, `src/popup/popup.js` (via dataURL).

Load Timing:
- Interactive/Asynchronous.

---

## 5. Derived / Computed State

### Derived State: Filtered Notes
Derived From:
- `storage.notes` (Source)
- `dashboard.searchQuery` / `dashboard.currentView` (Inputs)

Used By:
- `src/dashboard/dashboard.js` (Rendering engine)

Recomputed When:
- User types in search or switches views.

Storage:
- Computed on access (Filter function).

Risk:
- Performance risk if `notes` array exceeds several hundred entries.

---

## 6. Event → State Transition Map

Event: `Alt+S` (Command)
Source: Keyboard
Mutates: `storage-manager` creates new `note` + `screenshot`.
Downstream Effects: Popup and Dashboard refresh their lists.

Event: `SHOW_UI` (Internal Message)
Source: Background
Mutates: `ui-host.isVisible` -> `true`.
Outcome: Shadow DOM Overlay appears.

Event: Input Change (Search Box)
Source: DOM / Keyboard
Mutates: `dashboard.searchQuery`.
Outcome: View re-renders with filtered notes.

---

## 7. State Ownership Matrix

State Name | Owner | Writers | Readers | Persistent | Risk Level
-----------|-------|---------|---------|------------|-----------
notesMetadata | storage-manager | storage-manager | dashboard, popup | Yes | Low
screenshots | storage.js | storage.js, storage-manager | dashboard, popup | Yes (IDB) | Low
editorVisibility | ui-host | ui-host | ui-host | No | Medium
dashboardView | dashboard | dashboard | dashboard | No | Low
permissions | popup | popup | popup | No (Browser API) | Medium

---

## 8. State Lifecycle Phases

- **Application initialization:** `chrome.storage.local` is checked for existing notes.
- **Video Detection:** `video-agent` identifies current video; state remains transient.
- **Shortcut Trigger:** Background orchestrates data capture; persistent state is mutated.
- **UI Overlay Open:** `ui-host` initializes Shadow DOM state.
- **Save/Close:** `ui-host` resets visibility; storage is updated.

---

## 9. State Invariants

- Every `note.imageId` must have a corresponding entry in the `screenshots` IndexedDB.
- `zoomLevel` must be within constraints defined in `config.js` (e.g., 100% - 500%).
- `rotation` values must be multiples of 90.
- All dashboard images must adhere to a **16:9 aspect-ratio** for layout stability.

---

## 10. State Risk Assessment

- **Hidden mutation paths:** None (centralized through `storage-manager`/`storage.js`).
- **State tightly coupled to DOM:** High risk in `ui-host.js` where UI state depends on the existence of the Shadow Root.
- **Multiple writers:** `chrome.storage.local` is written to only by the background context, minimizing race conditions.
- **Redundant derived state:** Note counts per video are computed on the fly, avoiding data drift.
