# Image Viewer Modal – Detailed Engineering Specification

## Context

Design and implement a **minimal, dark-theme image viewer modal** for a browser extension web app.

The images are:
- User-captured screenshots of study material from YouTube.
- Moderate resolution (not ultra-high resolution).
- Loaded dynamically (no lazy loading required).

This viewer must prioritize clarity, precision interaction, and distraction-free study workflow.

---

# 1. Architecture & Environment

- Tech stack: **Vanilla JavaScript (no frameworks, no UI libraries)**
- Runs inside a **browser extension UI**
- Desktop-only (mouse + keyboard)
- Must not introduce layout shifts to the parent app
- Must not depend on third-party zoom libraries

---

# 2. Modal Behavior

### Opening
- Opens as a **full-viewport fixed overlay**
- Background must be darkened using a semi-transparent black backdrop (e.g., rgba(0,0,0,0.85))
- Image centered within viewport
- Fade-in animation optional but subtle (≤150ms)

### Closing
Viewer closes when:
- Close button clicked
- `Esc` key pressed

No click-outside-to-close unless explicitly required later.

---

# 3. Image Display Rules

### Default State
- Image must:
  - Fit entirely within viewport
  - Maintain aspect ratio
  - Never overflow on initial load
- Use contain-style scaling behavior
- No scrollbars at any time (overflow must be hidden at container level)

### Zoom-Out Behavior
If user zooms out below initial fit:
- Image may visually overflow beyond viewport
- Still **no scrollbars**
- User must be able to grab and reposition image

---

# 4. Zoom & Pan Mechanics

### Zoom Input
- Controlled **only via mouse scroll wheel**
- No zoom buttons

### Zoom Behavior
- Zoom must focus toward **cursor position**
- Smooth scaling (use transform scale with translate adjustments)
- Define reasonable limits:
  - Min scale: below fit allowed
  - Max scale: practical cap (e.g., 4x–6x)

### Cursor States
- Default: normal cursor
- When zoom level ≠ 1:
  - Cursor becomes `grab`
- While dragging:
  - Cursor becomes `grabbing`

### Panning
- Click + drag to reposition image
- No momentum
- Movement must be linear and precise
- Image should move within transform space (not scrollbars)

### Critical Constraint
- Absolutely no horizontal or vertical scrollbars at any zoom level.

---

# 5. Navigation Controls

### Overlay Arrow Buttons
- Positioned:
  - Left side (vertically centered)
  - Right side (vertically centered)
- Overlayed on top of image
- Minimal icon-only (chevron style)
- Semi-transparent base (e.g., white at 70% opacity)
- Must remain visible on light/white images

### Visibility Handling
If image background is white/light:
- Buttons must use subtle drop shadow or soft glow
- Ensure adequate contrast without heavy background blocks

### Keyboard Navigation
- `ArrowLeft` → previous image
- `ArrowRight` → next image
- Must update image without closing modal
- Reset zoom on image switch

---

# 6. Top Right Controls

Positioned at top-right corner:

1. Download button (icon-only)
2. Close button (icon-only, immediately next to download)

### Download Behavior
- Downloads original full-resolution image
- Direct file save (no new tab)
- Use anchor + download attribute

### Styling
- Minimal
- White or light grey
- Subtle drop shadow for visibility on bright images
- No hover animations required

---

# 7. State Management Rules

### On Image Change:
- Reset:
  - Zoom level to default
  - Pan offsets to center
- Remove residual transform values

### On Window Resize:
- Recalculate initial fit scale
- Recenter image
- Maintain current zoom level proportionally if feasible

---

# 8. Performance Constraints

- Use `transform: translate() scale()` only
- Avoid layout thrashing
- No reflow-heavy operations
- Use requestAnimationFrame if needed for smooth interaction
- No external libraries

---

# 9. UX Principles

- Zero clutter
- Study-focused
- No unnecessary animations
- No decorative effects
- Dark theme only
- High visual clarity for text-heavy screenshots

---

# 10. Explicit Non-Goals

- No mobile support
- No pinch zoom
- No lazy loading
- No UI framework
- No visible scrollbars
- No button hover effects
- No panning inertia