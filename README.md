# OJEET - YouTube Lecture Notes 📝

**OJEET** is a powerful Chrome extension designed to supercharge your learning from YouTube lectures. Capture screenshots, save timestamps, and take notes instantly without interrupting your flow.

![OJEET Screenshot](icons/icon128.png)

## ✨ Key Features

- **📸 Instant Screenshots**: Capture lecture slides instantly with `Alt+S`.
- **⏱️ Smart Timestamps**: Save important moments with `Alt+T` to revisit later.
- **📝 Contextual Notes**: Add notes attached to specific timestamps and screenshots (`Alt+N`).
- **📊 Full-Page Dashboard**: Organize and review all your notes, videos, and screenshots in a beautiful, dedicated dashboard.
- **🖼️ Interactive Gallery**: View screenshots in full detail with Zoom (up to 400%) and Rotation controls.
- **🎨 Modern UI**: Sleek dark mode interface with glassmorphism effects and customizable Cyan theming.
- **⚡ Custom Keybinds**: Configure your own keyboard shortcuts to match your workflow.

## 🚀 Installation

### From Source (Developer Mode)
1. Clone this repository:
   ```bash
   git clone https://github.com/Namankatiyar/ojeet-extension.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `ojeet-extension` directory.

## 📖 Usage

### Keyboard Shortcuts
Default shortcuts (fully customizable in Settings):
- **Take Screenshot**: `Alt + S`
- **Save Timestamp**: `Alt + T`
- **Open Note Editor**: `Alt + N`

### The Dashboard
Click the **Dashboard** icon in the extension popup to open the full-page view. Here you can:
- Filter notes by specific video.
- Search through your notes text.
- View a gallery of all your captured screenshots.
- Export your data to JSON for backup.

## 🛠️ Development

### Project Structure
```
ojeet-extension/
├── src/
│   ├── background/      # Service worker & offscreen capture
│   ├── content/         # Scripts injected into YouTube
│   ├── dashboard/       # Full-page dashboard UI
│   ├── popup/           # Extension popup UI
│   ├── styles/          # Shared styles & theme
│   └── lib/             # Shared utilities
├── icons/               # App icons
├── manifest.json        # Extension configuration
└── theme.css            # Design system variables
```

### Tech Stack
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Styling**: Custom CSS variables, Glassmorphism
- **Storage**: `chrome.storage.local`
- **Build**: No build step required (runs natively in browser)

## 🔒 Privacy & Permissions

OJEET runs entirely on your device. All notes and screenshots are stored locally in your browser using `chrome.storage`. No data is sent to external servers.

- **Storage**: Required to save your notes and images locally.
- **ActiveTab**: To capture screenshots of the current video.