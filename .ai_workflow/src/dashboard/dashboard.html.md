# dashboard.html - Dashboard Entry Point

## Technical Details
- **Structure:** Semantic HTML5 layout with sidebar navigation, search header, and dynamic content area.
- **Modals:** Includes a dedicated screenshot viewer modal with zoom/rotate toolbars and a confirmation dialog.
- **Integration:** Uses `<script type="module" src="dashboard.js"></script>` to support modern ES imports.

## Code Snippets

### App Shell
```html
<main class="main-content">
  <header class="main-header">
    <input type="text" id="searchInput" placeholder="Search notes...">
  </header>
  <div class="content-area" id="contentArea">
    <!-- Dynamic content -->
  </div>
</main>
```
