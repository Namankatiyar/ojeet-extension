# dom-builder.js - Programmatic DOM Construction

## Technical Details
- **Role:** Provides a safe, functional way to create DOM elements without using `innerHTML`.
- **Key Functions:**
  - `el(tag, attrs, ...children)`: Standard HTML element builder with support for `className`, `style`, `dataset`, and event listeners.
  - `svg(tag, attrs, ...children)`: Builder for SVG elements using the correct namespace.
  - `Icons`: Pre-built SVG icon factory (trash, externalLink, zoom, etc.).
- **Security:** Prevents XSS by using `textContent` for text nodes by default.

## Code Snippets

### el() Helper
```javascript
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  // ... attribute mapping ...
  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }
  return element;
}
```

### SVG Icon Factory
```javascript
export const Icons = {
  trash(size = 14) {
    return svg('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
      svg('polyline', { points: '3 6 5 6 21 6' }),
      svg('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
    );
  },
};
```
