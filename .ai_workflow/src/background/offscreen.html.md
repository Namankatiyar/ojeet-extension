# Background Offscreen HTML Summary

## Technical Details
- **Purpose:** Acts as a host document for `offscreen.js`.
- **Role:** Required by Manifest V3 to perform DOM-related tasks (like Canvas operations) that are not available in the Service Worker context.
- **Dependencies:** Loads `offscreen.js`.

## Important Code Snippets

```html
<body>
  <script src="offscreen.js"></script>
</body>
```
