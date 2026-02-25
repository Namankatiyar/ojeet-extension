# 📌 Refined Development Brief — “All Notes” Page Improvements

## 1. Responsive Image Grid (Fully Fluid Layout)

### Objective  
The image grid on the **All Notes** page must dynamically adapt to screen width without fixed breakpoints.

### Layout Rules

- Use a **fully fluid CSS Grid layout** (not breakpoint-based).
- Implement using `grid-template-columns: repeat(auto-fit, minmax(Xpx, 1fr))`.
- Define a **minimum card width** such that:
  - On screens around **1366×768**, the layout displays **no more than 2 cards per row**.
- The layout must naturally expand to 3, 4, or more columns on larger screens depending on available space.
- Cards must never overflow horizontally.
- No layout shift when resizing window.

### Constraints

- Card height is **fixed**.
- Card vertical resizing is **not allowed**.
- The download button must **never be clipped** at 100% zoom.
- All content must fit inside the card boundaries at all times.

---

## 2. Image Card Title Behavior

### Objective  
Ensure title text utilizes available horizontal space efficiently without breaking layout.

### Title Rules

- Title must:
  - Be **single-line only**
  - Use `text-overflow: ellipsis`
  - Dynamically shrink until it reaches the button group
- Title must **not wrap to two lines**
- No vertical expansion allowed

### Layout Structure

The card header must use a layout similar to:
[ Title (flex-grow: 1) ]   [ External ] [ Download ] [ Delete ]

### Implementation Requirements

- Use a **flex container** for the header.
- Title:
  - `flex: 1`
  - `min-width: 0` (critical to allow ellipsis inside flex)
- Buttons:
  - Fixed-size icons
  - Horizontally stacked
  - `flex-shrink: 0`
- Maintain a **clear, consistent gap** between:
  - Title and first button
  - Buttons themselves
- Buttons must **always remain fully visible**
- Title must truncate *before* overlapping buttons.

---

## 3. Button Visibility Guarantee

The following buttons must always be visible regardless of screen size:

1. External Link  
2. Download  
3. Delete  

### Requirements

- Buttons must:
  - Be fixed-size icons
  - Never wrap
  - Never shrink
  - Never get clipped
- No conditional hiding.
- No responsive hiding.
- No overflow.

---

## 4. Download Filename Logic

### Objective  
Downloaded images must use meaningful filenames instead of generic ones.

### Available Data

Each image already stores:
- Video title
- Exact timestamp

### Required Format
VideoName-[12m34s].webp

### Rules

- Timestamp format: `[XmYs]`
- Remove invalid filename characters from video title:
  - `/ \ : * ? " < > |`
- Replace spaces with `_` or preserve (define explicitly in implementation).
- Ensure `.webp` extension is preserved.
- Ensure filename is safe across Windows/macOS/Linux.

### Example

If:
- Video title: `Integration Techniques / Advanced`
- Timestamp: `12m34s`

Output filename:
Integration_Techniques_Advanced-[12m34s].webp

---

# Summary of Non-Negotiables

- Fully fluid grid.
- Max 2 columns on 1366px width.
- Fixed-height cards.
- No vertical resizing.
- Title single-line with ellipsis.
- Buttons always visible.
- Download filename formatted as `VideoName-[timestamp].webp`.