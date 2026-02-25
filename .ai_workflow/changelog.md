# Changelog

## 2026-02-25

### Refactored OJEET Extension Base Architecture

Completed a major refactoring of the entire codebase to improve modularity, security, and maintainability.

#### Added
- `src/config.js`: Centralized configuration for constants, selectors, and timeouts.
- `src/lib/dom-builder.js`: Safe programmatic DOM construction utility.
- `src/lib/ui-components.js`: Shared UI rendering functions for uniform display across dashboard and popup.
- `src/content/providers/`: New directory for platform-specific video providers.
  - `video-provider.js`: Base class for providers.
  - `youtube-provider.js`: YouTube-specific detection and metadata.
  - `generic-provider.js`: Fallback HTML5 video provider.
- `src/background/`: Decomposed service worker into specialized modules.
  - `commands.js`: Keyboard shortcut handlers.
  - `screenshot-manager.js`: Tab capture and cropping logic.
  - `storage-manager.js`: Transaction-safe storage operations.
  - `video-info-requester.js`: Multi-frame video info request logic.
  - `ui-injector.js`: Fallback UI injection.
- `src/styles/components.css`: Shared CSS components for UI consistency.

#### Modified
- `src/background/service-worker.js`: Refactored to be a slim orchestrator using ES modules.
- `src/content/video-agent.js`: Rewritten using the Strategy (Provider) Pattern.
- `src/lib/messaging.js`: Added comprehensive JSDoc types and new message helpers.
- `src/lib/storage.js`: Implemented transaction-safe save methods with rollback support.
- `manifest.json`: Updated to use V3 ES modules for the service worker and added new web accessible resources.
- `src/dashboard/dashboard.css`, `src/popup/popup.css`: Integrated shared component styles.
- `.ai_workflow/OVERVIEW.md`: Updated to reflect the new architecture.
