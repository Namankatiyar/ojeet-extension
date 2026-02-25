# Communication Layer Implementation

## React (Vite) Website ↔ MV3 Chrome Extension

### Content Script Bridge + Structured Message Protocol

------------------------------------------------------------------------

## 1. Objective

Implement a secure, production-grade communication bridge between:

-   A public production React (Vite) website
-   A Manifest V3 Chrome extension
-   Extension as the authoritative data source

### Requirements

Website must: - Have read-only access - Use real-time request/response
(not polling) - Make few calls per session - Work offline - Support
eventual consistency - Follow last-write-wins (extension-only writes)

Extension: - Uses chrome.storage.local and IndexedDB - Injects content
scripts only on specific domains (e.g., `pcm-tracker.vercel.app`) - Allows communication
only from trusted origins - Writes all data (website never mutates)

------------------------------------------------------------------------

## 2. Architecture Overview

Communication Flow:

Website (React)\
→ window.postMessage\
→ Content Script\
→ chrome.runtime.sendMessage\
→ Background Service Worker\
→ chrome.storage.local / IndexedDB\
→ Response\
→ Content Script\
→ window.postMessage\
→ Website

The extension remains the single source of truth.

------------------------------------------------------------------------

## 3. Message Protocol Specification

### Website → Extension

``` ts
type WebsiteToExtensionMessage =
  | {
      source: "my-bridge";
      type: "GET_KEY";
      key: string;
      requestId: string;
    }
  | {
      source: "my-bridge";
      type: "GET_ALL";
      requestId: string;
    };
```

### Extension → Website

``` ts
type ExtensionToWebsiteMessage = {
  source: "my-extension";
  type: "RESPONSE";
  requestId: string;
  success: boolean;
  payload?: any;
  error?: string;
};
```

### Protocol Rules

-   Always validate `source`
-   Always return `requestId`
-   Ignore unknown message types
-   Never execute arbitrary commands
-   Never allow write operations

------------------------------------------------------------------------

## 4. Manifest Configuration (MV3)

``` json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "permissions": ["storage"],
  "host_permissions": [
    "*://pcm-tracker.vercel.app/*",
    "http://localhost:5173/*"
  ],
  "externally_connectable": {
    "matches": [
      "*://pcm-tracker.vercel.app/*",
      "http://localhost/*"
    ]
  },
  "content_scripts": [
    {
      "matches": [
        "*://pcm-tracker.vercel.app/*",
        "http://localhost/*"
      ],
      "js": ["content-script.js"],
      "run_at": "document_start"
    }
  ]
}
```

------------------------------------------------------------------------

## 5. Content Script Implementation

Responsibilities:

-   Listen for `window.postMessage`
-   Validate:
    -   `event.source === window`
    -   `message.source === "my-bridge"`
-   Forward message to background
-   Relay structured response back to website
-   Ignore malformed input
-   Avoid memory leaks

Example structure:

``` js
const ALLOWED_ORIGINS = [
  "https://pcm-tracker.vercel.app",
  "http://localhost:5173"
];

window.addEventListener("message", (event) => {
  // 1. Validate Source
  if (event.source !== window) return;

  // 2. Validate Origin
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;

  const message = event.data;
  if (!message || message.source !== "my-bridge") return;

  chrome.runtime.sendMessage(message, (response) => {
    window.postMessage(
      {
        source: "my-extension",
        type: "RESPONSE",
        requestId: message.requestId,
        ...response
      },
      event.origin // Securely target the origin
    );
  });
});
```

------------------------------------------------------------------------

## 6. Background Service Worker Router

Responsibilities:

-   Listen via `chrome.runtime.onMessage`
-   Validate `message.source`
-   Route by `type`
-   Retrieve from:
    -   chrome.storage.local
    -   IndexedDB
-   Return structured response
-   Use `return true` for async operations
-   Implement rate limiting
-   Handle errors safely

Example:

``` js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.source !== "my-bridge") return;

  if (message.type === "GET_KEY") {
    chrome.storage.local.get(message.key)
      .then(result => {
        sendResponse({
          success: true,
          payload: result[message.key] ?? null
        });
      })
      .catch(err => {
        sendResponse({
          success: false,
          error: err.message
        });
      });

    return true;
  }
});
```

------------------------------------------------------------------------

## 7. React-Side Bridge SDK

Create `bridge.ts`.

Requirements:

-   Promise-based API
-   Use `crypto.randomUUID()` for requestId
-   Automatic event listener cleanup
-   Timeout fallback (e.g., 2 seconds)
-   Proper error propagation

Example:

``` ts
export function requestExtension(type: "GET_KEY" | "GET_ALL", key?: string) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();

    function listener(event: MessageEvent) {
      if (
        event.data?.source === "my-extension" &&
        event.data?.requestId === requestId
      ) {
        window.removeEventListener("message", listener);

        if (event.data.success) {
          resolve(event.data.payload);
        } else {
          reject(event.data.error);
        }
      }
    }

    window.addEventListener("message", listener);

    window.postMessage(
      {
        source: "my-bridge",
        type,
        key,
        requestId
      },
      "*"
    );

    setTimeout(() => {
      window.removeEventListener("message", listener);
      reject("Extension not installed or timeout");
    }, 2000);
  });
}
```

------------------------------------------------------------------------

## 8. Data Structure Standardization

Store in extension as:

``` ts
{
  value: string;
  updatedAt: number;
}
```

Rules:

-   Extension is sole writer
-   Website is read-only
-   Last-write-wins via timestamp
-   No bidirectional sync

------------------------------------------------------------------------

## 9. Security Hardening

Because extension is public:

Implement:

-   Source validation
-   Strict type checking
-   Rate limiting (e.g., 300ms minimum interval)
-   No privileged API exposure
-   No dynamic evaluation

Do NOT:

-   Expose IndexedDB schema
-   Allow writes
-   Execute arbitrary commands

------------------------------------------------------------------------

## 10. Failure Handling

Must handle:

-   Extension not installed
-   Service worker inactive
-   Timeout
-   Storage access errors
-   IndexedDB errors

Website must degrade gracefully.

------------------------------------------------------------------------

## 11. Performance Constraints

-   Few calls per session
-   No polling
-   No subscriptions
-   Text-only payloads
-   Lightweight transfer

------------------------------------------------------------------------

## 12. Testing Checklist

Website: - Confirm message sending - Confirm response handling - Confirm
timeout behavior - Confirm behavior without extension

Extension: - Inspect service worker logs - Test malformed messages -
Test rapid requests - Test IndexedDB fallback

------------------------------------------------------------------------

## 13. Success Criteria

Implementation is complete when:

-   Website can request a key
-   Extension returns data correctly
-   System works offline
-   Extension remains authoritative
-   Invalid messages are ignored
-   No memory leaks
-   Timeout works
-   Rate limiting works

------------------------------------------------------------------------

## 14. Advanced Implementation: Direct Connection

For a more robust and secure connection, use `externally_connectable`. This allows the React website to call `chrome.runtime` directly.

### React Side (bridge.ts)
``` ts
const EXTENSION_ID = "your-extension-id-here";

export async function sendDirectMessage(message: any) {
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(EXTENSION_ID, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  throw new Error("Extension not detected or externally_connectable not configured");
}
```

### Background Worker (background.js)
``` js
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // sender.url contains the origin of the calling website
  const ALLOWED_ORIGINS = ["https://pcm-tracker.vercel.app/"];
  if (!ALLOWED_ORIGINS.some(origin => sender.url.startsWith(origin))) {
    return; // Reject untrusted origins
  }

  // Handle message...
});
```

------------------------------------------------------------------------

## 15. Advanced Implementation: Real-time Port (Sync Mode)

To stream real-time study clock ticks without polling.

### Content Script Relay
``` js
let port = null;

window.addEventListener("message", (event) => {
  if (event.data.type === "OPEN_PORT") {
    port = chrome.runtime.connect({ name: "tracker-sync" });
    port.onMessage.addListener((msg) => {
      window.postMessage({ type: "SYNC_TICK", payload: msg }, event.origin);
    });
  }
});
```

### Background Worker
``` js
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "tracker-sync") {
    const interval = setInterval(() => {
      port.postMessage({ time: Date.now() });
    }, 1000);

    port.onDisconnect.addListener(() => {
      clearInterval(interval);
    });
  }
});
```
