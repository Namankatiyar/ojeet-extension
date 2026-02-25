# components.css - Shared Visual Identity

## Technical Details
- **Role:** Central repository for all reusable UI components (buttons, badges, inputs).
- **Key Sections:**
  - **Confirmation Dialogs:** Shared styles for the "Delete" and "Clear All" modals.
  - **Note Cards:** Common design for notes in both popup and dashboard.
  - **Scrollbars:** Consistent translucent scrollbar styling for dark mode.
  - **Animations:** Standard `fadeIn` and `slideUp` keyframes.
- **Impact:** Reduces CSS bundle size and ensures visual parity across the extension.

## Code Snippets

### Shared Button System
```css
.confirm-btn {
  padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer;
  transition: all 0.2s ease;
}
.confirm-btn.primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: white; box-shadow: 0 4px 15px var(--accent-light);
}
```
