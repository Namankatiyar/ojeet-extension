# Dependency Map

## 1. High-Level Architectural Layers

### Layer: Entry Points
Includes:
- `src/background/service-worker.js`
- `src/content/video-agent.js`
- `src/content/ui-host.js`
- `src/popup/popup.js`
- `src/dashboard/dashboard.js`

Allowed Dependencies:
- Backend Managers (from Background)
- Shared Libraries (src/lib/*)
- Configuration (src/config.js)

Forbidden Dependencies:
- Direct DOM manipulation (from Background context)
- Deep internal provider logic (should use Strategy Pattern)

---

### Layer: Backend Managers
Includes:
- `src/background/commands.js`
- `src/background/screenshot-manager.js`
- `src/background/storage-manager.js`
- `src/background/ui-injector.js`
- `src/background/video-info-requester.js`

Allowed Dependencies:
- Shared Libraries (src/lib/*)
- Configuration (src/config.js)
- Offscreen Document (via messaging)

Forbidden Dependencies:
- Popup/Dashboard UI logic
- Content script internals

---

### Layer: Content Providers
Includes:
- `src/content/providers/video-provider.js`
- `src/content/providers/youtube-provider.js`
- `src/content/providers/generic-provider.js`

Allowed Dependencies:
- Configuration (src/config.js)

Forbidden Dependencies:
- Background managers
- Storage (must communicate via messaging)
- UI Host (except via defined interfaces)

---

### Layer: Shared Libraries
Includes:
- `src/lib/messaging.js`
- `src/lib/storage.js`
- `src/lib/ui-components.js`
- `src/lib/dom-builder.js`

Allowed Dependencies:
- Configuration (src/config.js)
- Browser APIs (Chrome/WebNav)

Forbidden Dependencies:
- Background managers (to prevent circularity)
- Specific UI layouts (should remain generic)

---

### Layer: Configuration & Assets
Includes:
- `src/config.js`
- `src/styles/*`

Allowed Dependencies:
- None (Base Layer)

Forbidden Dependencies:
- Any functional code

---

## 2. Module Dependency Index

### Module: src/background/service-worker.js
Purpose:
- Orchestrates background events and routes messages to specialized handlers.

Depends On:
- `src/background/commands.js`
- `src/background/storage-manager.js`
- `src/lib/messaging.js`

Used By:
- Chrome Runtime (Browser Entry Point)

External APIs Used:
- `chrome.commands`
- `chrome.runtime`

Dependency Type:
- Initialization dependency

---

### Module: src/background/commands.js
Purpose:
- Implements logic for keyboard shortcuts.

Depends On:
- `src/background/screenshot-manager.js`
- `src/background/storage-manager.js`
- `src/background/video-info-requester.js`
- `src/background/ui-injector.js`

Used By:
- `src/background/service-worker.js`

External APIs Used:
- `chrome.commands`

Dependency Type:
- Runtime dependency

---

### Module: src/background/screenshot-manager.js
Purpose:
- Handles tab capture and coordinates offscreen cropping.

Depends On:
- `src/background/offscreen.js` (via messaging/URL)
- `src/config.js`

Used By:
- `src/background/commands.js`

External APIs Used:
- `chrome.tabs.captureVisibleTab`
- `chrome.offscreen`

Dependency Type:
- Side-effect dependency

---

### Module: src/background/storage-manager.js
Purpose:
- Handles background data persistence with rollback safety.

Depends On:
- `src/lib/storage.js`

Used By:
- `src/background/service-worker.js`
- `src/background/commands.js`

External APIs Used:
- `chrome.storage.local`

Dependency Type:
- State mutation dependency

---

### Module: src/content/video-agent.js
Purpose:
- Detects video presence and provides metadata to background.

Depends On:
- `src/content/providers/youtube-provider.js`
- `src/content/providers/generic-provider.js`
- `src/lib/messaging.js`

Used By:
- Browser (Content Script)

External APIs Used:
- DOM (HTML5 Video)
- `chrome.runtime`

Dependency Type:
- Runtime dependency

---

### Module: src/lib/storage.js
Purpose:
- Unified wrapper for Local Storage and IndexedDB.

Depends On:
- `src/config.js`

Used By:
- `src/background/storage-manager.js`
- `src/dashboard/dashboard.js`
- `src/popup/popup.js`

External APIs Used:
- `chrome.storage.local`
- `IndexedDB`

Dependency Type:
- Runtime dependency

---

### Module: src/lib/ui-components.js
Purpose:
- Shared HTML generators and formatting helpers.

Depends On:
- `src/lib/dom-builder.js`
- `src/config.js`

Used By:
- `src/dashboard/dashboard.js`
- `src/popup/popup.js`

External APIs Used:
- DOM

Dependency Type:
- Runtime dependency

---

## 3. Dependency Graph (Textual)

User Interaction (Shortcut/Click)
  ↓
Service Worker / Popup / Dashboard
  ↓
Managers / Commands
  ↓
Shared Libraries (Messaging / Storage / UI-Components)
  ↓
Browser APIs (Storage / Tabs / Offscreen / IndexedDB)
  ↓
Hardware/Disk

Data Flow (Saving Note):
UI (Host/Dashboard) -> Background (Storage Manager) -> IndexedDB/Local Storage

---

## 4. Circular Dependency Analysis

"No circular dependencies detected."

*Analysis Note:* The split between `src/background/storage-manager.js` and `src/lib/storage.js` prevents the background modules from needing to import high-level UI logic, which remains in the entry points.

---

## 5. Cross-Layer Violations

"No cross-layer violations detected."

*Analysis Note:* Use of `all: initial` in Shadow DOM (ui-host.js/ui-injector.js) effectively isolates the UI from host pages, maintaining a clean architectural boundary.

---

## 6. Risk Assessment

- **High coupling modules:** `src/background/commands.js` (Orchestrates most capture logic).
- **Central modules (high fan-in):** `src/config.js`, `src/lib/messaging.js`, `src/lib/storage.js`.
- **Fragile modules (high fan-out):** `src/background/commands.js` (depends on multiple managers).
- **Refactor-sensitive nodes:** `src/content/video-agent.js` (Regulates all platform detection).
