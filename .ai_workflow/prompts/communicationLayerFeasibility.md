# Feasibility Study: Communication Layer (React ↔ Chrome Extension)

## 1. Executive Summary
The proposed plan is **technically sound** and follows the standard "Messenger" pattern. It correctly identifies the authoritative role of the extension. However, it leans towards a "generic" implementation that might introduce unnecessary security risks and store-review friction for a project where the website and extension are twins.

## 2. Critical Issues to Address
1. **Security Vulnerability**: `window.postMessage` is global. A malicious site could trigger `GET_ALL` and sniff the balance.
2. **Permission Scope**: `<all_urls>` is too broad for an extension that only needs to talk to a specific tracker website.

## 3. The "Optimal" Implementation Plan

### Stage 1: Security Hardening (Highest Priority)
- **Scoped Injection**: Change `manifest.json` matches from `<all_urls>` to `["*://pcm-tracker.vercel.app/*", "http://localhost:5173/*"]`.
- **Origin Validation**: In the Content Script, check `event.origin` to ensure the website is who it says it is.

### Stage 2: Direct Connection (Recommended Upgrade)
- Transition to `externally_connectable`. This eliminates the need for the `content-script.js` middleman, allowing your React app to speak directly to the Background Worker.

### Stage 3: Real-time Sync
- Implement a **Port-based connection** (`chrome.runtime.connect`). This allows the extension to "broadcast" study clock ticks to the website in real-time without polling.

## 4. Final Verdict
**Approved for development with security modifications.** The architecture is robust enough to handle the "Offline-First" requirement and ensures data integrity by keeping the Extension as the sole writer.
