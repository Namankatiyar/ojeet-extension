# popup.css - Popup Interface Styles

## Technical Details
- **Role:** Styles for the quick-access browser popup.
- **Key Constraints:** Fixed dimensions (380x600px).
- **Features:**
  - **Dense Layout:** Optimizes space for vertical list browsing.
  - **Integration:** Imports `components.css` to reuse button and note card designs from the dashboard.
  - **Glassmorphism:** Applied to the header and settings modals.

## Code Snippets

### Shared Style Integration
```css
/* Popup Styles - Using Ojeet Theme System */
@import url('../styles/theme.css');
@import url('../styles/components.css');
```
