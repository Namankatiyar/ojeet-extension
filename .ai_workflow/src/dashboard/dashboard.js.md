# dashboard.js - Full Page Browser Logic

## Technical Details
- **Role:** Main logic for the notes dashboard.
- **Features:**
  - **Dynamic Rendering:** Three views (All Notes, By Video, Screenshots).
  - **Image Processing:** Zoom, Rotate, Fullscreen modal, and **Context-Aware Download** for screenshots.
  - **Data Management:** Atomic deletes, clear-all, and intelligent asset naming logic.
  - **Naming Logic:** Filenames formatted as `VideoName-[timestamp].webp` with full character sanitization.
  - **Zip Export:** Uses **JSZip** to export all notes as JSON + screenshots grouped into folders named after their source video.
  - **Real-time Search:** Filters both note text and video titles.

## Code Snippets

### Download Button in Note Card
```javascript
function createNoteCard(note, compact = false) {
    // ...
    ${hasScreenshot ? `<button class="download-btn" title="Download Screenshot" data-image-id="${note.imageId}">...</button>` : ''}
    // ...
}
```

### Context-Aware Download
- Logic to extract video title and timestamp to generate readable filenames.
- Implementation handles multi-hour timestamps (`1h2m3s`) and character sanitization.
- Replaces generic `ojeet-screenshot-[id].webp`.

### Zip Export
```javascript
async function handleExport() {
    const zip = new JSZip();
    zip.file('notes.json', JSON.stringify(jsonData, null, 2));
    for (const note of notesWithScreenshots) {
        const folderName = sanitizeFilename(video?.title || 'Ungrouped');
        zip.folder(folderName).file(fileName, base64, { base64: true });
    }
    const content = await zip.generateAsync({ type: 'blob' });
    // trigger download...
}
```
