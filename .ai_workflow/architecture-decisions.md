# Architecture Decisions Log

Project: OJEET Extension
Last Updated: 2026-02-25

---

## ADR Index

- ADR-001: Use of Vanilla JavaScript and Safe DOM Construction
- ADR-002: Multi-Platform Support via Strategy (Provider) Pattern
- ADR-003: UI Isolation via Shadow DOM
- ADR-004: Decomposed Service Worker Architecture
- ADR-005: Hybrid Storage Strategy (LocalStorage + IndexedDB)
- ADR-006: Transactional Storage Operations with Rollback
- ADR-007: Image Processing via Offscreen Document (MV3)
- ADR-008: Typed Messaging for Cross-Context Communication
- ADR-009: AI-Optimized Workflow via Mirror Summary Directory

---

## ADR-001: Use of Vanilla JavaScript and Safe DOM Construction

Status: Active  
Date: 2026-02-25  

### Context
The extension needs to be lightweight to avoid performance impact on video playback sites (e.g., YouTube). It also requires precise control over DOM elements in the Note Editor and Dashboard.

### Decision
Use Vanilla JavaScript for all logic and programmatic DOM construction via the `el()` and `svg()` helpers in `dom-builder.js`.

### Rationale
- Minimizes bundle size by avoiding heavy frameworks (React/Vue).
- Provides direct control over DOM events and propagation, critical for blocking host page hotkeys.
- Enhances security by using `textContent` for text nodes instead of `innerHTML`.

### Alternatives Considered
- Web Components – Rejected as `dom-builder.js` provided simpler abstraction for the project's scale.
- React/Tailwind – Rejected to maintain zero-build-step simplicity and minimize overhead.

### Tradeoffs
- Maintainability vs Speed: Higher manual effort for DOM updates compared to reactive frameworks.
- Complexity: Requires custom helpers for complex UI state synchronization.

### Consequences
- Requires strict adherence to using `dom-builder.js`.
- Eliminates common XSS vectors associated with `innerHTML`.

### Related Modules
- `src/lib/dom-builder.js`
- `src/dashboard/dashboard.js`

---

## ADR-002: Multi-Platform Support via Strategy (Provider) Pattern

Status: Active  
Date: 2026-02-25  

### Context
OJEET must support different video platforms (YouTube, Vimeo, etc.), each with unique DOM structures and URL patterns.

### Decision
Implement a Provider registry in `video-agent.js` where specialized classes (e.g., `YouTubeProvider`) handle site-specific logic.

### Rationale
- Allows adding support for new platforms by creating a new class without modifying core agent logic.
- Separation of concerns between detection and metadata extraction.

### Alternatives Considered
- Monolithic conditional blocks – Rejected as unmaintainable as more platforms are added.

### Tradeoffs
- Flexibility vs Complexity: Introduces class hierarchy overhead in content scripts.

### Consequences
- High extensibility for future platforms.
- Requires consistent implementation of the `VideoProvider` interface.

### Related Modules
- `src/content/video-agent.js`
- `src/content/providers/`

---

## ADR-003: UI Isolation via Shadow DOM

Status: Active  
Date: 2026-02-25  

### Context
The Note Editor UI must render consistently across diverse websites without inheriting or leaking styles.

### Decision
Inject the UI into a closed Shadow DOM (`#ojeet-overlay-root`) with the `all: initial` CSS reset.

### Rationale
- Prevents host page CSS from breaking the extension's layout.
- Prevents extension styles from affecting the host page.
- "Closed" mode adds a layer of protection against host page script interference.

### Alternatives Considered
- IFrame injection – Rejected due to difficulty in communicating across origins and handling dynamic resizing.

### Tradeoffs
- Simplicity vs Isolation: Shadow DOM requires more complex event handling (e.g., event retargeting).

### Consequences
- Guaranteed visual consistency.
- Aggressive `stopPropagation` is required to block host keyboard listeners.

### Related Modules
- `src/content/ui-host.js`
- `src/background/ui-injector.js`

---

## ADR-004: Decomposed Service Worker Architecture

Status: Active  
Date: 2026-02-25  

### Context
Standard Manifest V3 service workers often become massive, unmaintainable monoliths.

### Decision
Decompose the service worker into specialized ES modules (`commands.js`, `storage-manager.js`, etc.) imported by a slim `service-worker.js`.

### Rationale
- Improves readability and unit testability of individual components.
- Adheres to the Single Responsibility Principle.

### Alternatives Considered
- Bundled Single File – Rejected to maintain developer experience and logical separation.

### Tradeoffs
- Maintainability vs Complexity: Requires managing imports and shared state across modules.

### Consequences
- Modularized background logic.
- Requires `"type": "module"` in `manifest.json`.

### Related Modules
- `src/background/`

---

## ADR-005: Hybrid Storage Strategy (LocalStorage + IndexedDB)

Status: Active  
Date: 2026-02-25  

### Context
`chrome.storage.local` has a strict quota (usually 5-10MB), which is insufficient for storing high-resolution screenshots.

### Decision
Store metadata (notes, video info) in `chrome.storage.local` and binary data (screenshots) in IndexedDB.

### Rationale
- Local storage is ideal for small, searchable metadata.
- IndexedDB handles large binary blobs without strict browser-level storage quotas.

### Alternatives Considered
- Base64 in LocalStorage – Rejected as it quickly exhausts the quota.

### Tradeoffs
- Performance vs Complexity: Dual-system storage requires synchronization logic.

### Consequences
- Unlimited (effectively) storage for screenshots.
- Requires handling asynchronous IndexedDB connections.

### Related Modules
- `src/lib/storage.js`

---

## ADR-006: Transactional Storage Operations with Rollback

Status: Active  
Date: 2026-02-25  

### Context
Saving a note involves two steps: metadata save and screenshot save. Failure in one leads to data corruption.

### Decision
Implement a manual rollback mechanism in `storage-manager.js` that deletes metadata if the screenshot save fails.

### Rationale
- Ensures data integrity (no "orphaned" notes without images).
- Mimics ACID transactions in a non-transactional browser environment.

### Alternatives Considered
- Orphan cleanup tasks – Rejected as too reactive; immediate rollback is cleaner.

### Tradeoffs
- Reliability vs Implementation Effort: Adds complexity to the saving workflow.

### Consequences
- Robust data persistence.
- Higher maintenance discipline for storage-related code.

### Related Modules
- `src/background/storage-manager.js`
- `src/lib/storage.js`

---

## ADR-007: Image Processing via Offscreen Document (MV3)

Status: Active  
Date: 2026-02-25  

### Context
Service Workers in MV3 lack DOM/Canvas access, which is required for cropping screenshots extracted from `tabs.captureVisibleTab`.

### Decision
Utilize an Offscreen Document (`offscreen.html`/`.js`) to perform canvas manipulation for cropping.

### Rationale
- Officially supported solution for DOM access in MV3 background context.
- Offloads heavy image processing from the main service worker thread.

### Alternatives Considered
- Cropping in content scripts – Rejected to avoid exposing raw full-page captures to site-level scripts.

### Tradeoffs
- Control vs Overhead: Requires managing the creation/destruction of the offscreen document.

### Consequences
- Enables pixel-perfect cropping to video bounds.
- Introduces additional asynchronous message round-trips.

### Related Modules
- `src/background/screenshot-manager.js`
- `src/background/offscreen.js`

---

## ADR-008: Typed Messaging for Cross-Context Communication

Status: Active  
Date: 2026-02-25  

### Context
Communication between background, popup, dashboard, and content scripts via `chrome.runtime.sendMessage` can become error-prone.

### Decision
Implement a typed messaging wrapper (`messaging.js`) using a `MessageTypes` enum and JSDoc Typedefs.

### Rationale
- Provides "compile-time" (IDE-level) safety for message payloads.
- Standardizes message routing and response patterns.

### Alternatives Considered
- Raw message objects – Rejected as difficult to maintain at scale.

### Tradeoffs
- Safety vs Verbosity: Requires defining types for every new message interaction.

### Consequences
- Fewer runtime errors due to malformed messages.
- Clearer traceability of communication flows.

### Related Modules
- `src/lib/messaging.js`

---

## ADR-009: AI-Optimized Workflow via Mirror Summary Directory

Status: Active  
Date: 2026-02-25  

### Context
Large codebases can exceed AI context windows, leading to loss of architectural coherence during refactoring.

### Decision
Maintain a `.ai_workflow/src` directory containing architectural summaries (.md files) of every implementation file.

### Rationale
- Allows AI agents to "understand" the whole codebase without reading every line.
- Acts as a high-density index for dependencies and state.

### Alternatives Considered
- Vector-based RAG – Complements but doesn't replace structured summaries for architectural reasoning.

### Tradeoffs
- Context Efficiency vs Maintenance: Requires documentation to be updated alongside code.

### Consequences
- Drastically improves AI agent accuracy for complex tasks.
- Facilitates "structural" reasoning over "implementation" reasoning.

### Related Modules
- Entire repository via `.ai_workflow/`

---

# Architectural Constraints Summary

- **Execution Environment:** Chrome Extension (Manifest V3).
- **Security:** CSP restrictions on content scripts; no remote code execution.
- **Resource Limits:** Storage quotas (handled via IDB); memory management in persistent tabs.
- **UX Constraints:** Transparent glassmorphism UI; dark mode bias; zero-friction capture flow.
- **AI Constraints:** Token-conscious summaries required for all core architectural changes.

---

# Architectural Risk Register

- **Mirror Drift:** The `.ai_workflow/src` directory may lag behind the real `src`, leading to AI hallucinations.
- **Offscreen Overhead:** Frequent creation/deletion of offscreen documents could introduce latency.
- **Canvas Limitations:** Some platforms (DRM protected) may block canvas-based screenshots.
- **SPA Navigation:** YouTube's internal navigation requires robust URL listener logic to keep metadata synced.

---

# Architectural Evolution Guidelines

- **New ADRs:** Required for shifts in state ownership, new external libraries, or changes in layer boundaries.
- **Superseding:** Old decisions must be explicitly marked as `Superseded` when replaced.
- **Refactoring:** Large refactors must update the mirror summaries synchronously before the task is considered complete.
