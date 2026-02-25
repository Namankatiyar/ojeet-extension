# Theme CSS Summary

## Technical Details
- **Purpose:** Centralized design system using CSS variables.
- **Key Features:**
    - **Dual Theme Support:** Defines variables for both Light (default) and Dark (`[data-theme="dark"]`) modes.
    - **Color Palette:** Semantic naming (e.g., `--bg-primary`, `--text-muted`, `--priority-high`) alongside brand/subject colors.
    - **Glassmorphism:** Implements translucent, blurred backgrounds for dark mode on desktop (`min-width: 768px`).
    - **Mobile Optimization:** Falls back to solid colors on smaller screens to improve rendering performance.

## Important Code Snippets

### Root Variables (Light Mode)
```css
:root {
  --bg-base: #f8fafc;
  --accent: #06b6d4;
  --text-primary: #0f172a;
  /* ... spacing, shadows, transitions ... */
}
```

### Dark Mode & Glassmorphism
```css
[data-theme="dark"] {
  --bg-base: #0a0a0f;
  /* ... dark mode colors ... */
  --glass-bg: rgba(18, 18, 26, 0.35);
  --glass-blur: 4px;
}

@media (min-width: 768px) {
  [data-theme="dark"] .glass-panel {
    background: var(--glass-bg) !important;
    backdrop-filter: blur(var(--glass-blur));
  }
}
```
