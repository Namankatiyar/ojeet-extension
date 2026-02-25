# popup.html - Popup Entry Point

## Technical Details
- **Structure:** Dense 380px layout optimized for browser extension constraints.
- **Components:** Logo header, permission banner, search/filter controls, and a scrollable notes list.
- **Integration:** Uses `<script type="module" src="popup.js"></script>` to enable shared library reuse.

## Code Snippets

### Filter Section
```html
<div class="filter-section">
  <select id="videoFilter">
    <option value="all">All Videos</option>
  </select>
</div>
```
