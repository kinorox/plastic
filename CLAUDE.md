# CLAUDE.md - Plastic Browser Extension

## Project Overview

**Plastic** is a browser extension designed to assist users in creating pixel art on websites like r/place by overlaying reference images with adjustable opacity and positioning. The extension provides a draggable, scalable overlay system that allows users to trace reference images while creating pixel art.

## Architecture

This is a Manifest V3 browser extension with the following key components:

### Core Files Structure
```
├── manifest.json         # Extension configuration and permissions
├── popup.html           # Extension popup interface
├── popup.js             # Popup logic and state management
├── content.js           # Content script for overlay functionality
├── styles.css           # Overlay styling
└── README.md           # User documentation
```

### Extension Architecture
- **Manifest V3**: Uses the latest extension manifest format
- **Content Script Injection**: Runs on all websites (`*://*/*`)
- **Popup Interface**: Provides user controls for the overlay
- **Storage API**: Persists overlay state across page reloads
- **Message Passing**: Communication between popup and content script

## Key Components

### 1. Manifest Configuration (`manifest.json`)
- **Name**: "Pixel Art Helper"
- **Version**: 1.0
- **Permissions**: 
  - `activeTab`: Access to current tab
  - `storage`: Persistent state storage
- **Content Scripts**: Injected into all pages with CSS and JS
- **Action**: Popup interface with default title and HTML

### 2. Content Script (`content.js`)
**Main Class**: `PixelArtOverlay`

**Key Features**:
- Creates a draggable overlay container with handle
- Manages image display with opacity and scaling
- Handles drag-and-drop positioning
- Persists state using chrome.storage.local
- Listens for messages from popup script

**State Management**:
```javascript
currentState = {
  imageData: null,        // Base64 encoded image
  opacity: 0.5,          // 0-1 opacity value
  scale: 1,              // Scale factor
  position: {x: 100, y: 100}, // Screen position
  visible: false,        // Visibility state
  hasImage: false        // Whether image is loaded
}
```

### 3. Popup Interface (`popup.html` + `popup.js`)
**Controls Provided**:
- File input for image upload
- Opacity slider (0-100%)
- Scale slider (10-200%)
- Show/Hide toggle button
- Remove overlay button

**Communication**: Uses `chrome.tabs.sendMessage()` to communicate with content script

### 4. Styling (`styles.css`)
- Overlay container styling with border and shadow effects
- Drag handle styling with hover effects
- Visual feedback during dragging

## Technical Implementation Details

### Image Handling
- Uses FileReader API to convert uploaded images to base64 data URLs
- Images are stored in extension's local storage for persistence
- Supports all standard image formats through HTML img element

### Drag and Drop System
- Custom drag implementation using mouse events
- Calculates drag offset to maintain relative positioning
- Updates position in real-time during drag operations
- Saves position to storage on drag completion

### State Persistence
- Automatically saves state changes to `chrome.storage.local`
- Restores overlay state when content script initializes
- Maintains image data, position, opacity, scale, and visibility across page reloads

### Cross-Site Compatibility
- Designed to work on any website through universal content script injection
- High z-index (999999) ensures overlay appears above page content
- Uses fixed positioning to maintain screen position regardless of page scrolling

## Usage Workflow

1. **Installation**: Load as unpacked extension in developer mode
2. **Navigation**: Visit target pixel art website
3. **Image Upload**: Click extension icon and upload reference image
4. **Positioning**: Use drag handle to position overlay over target area
5. **Adjustment**: Fine-tune opacity (30-70% recommended) and scale to match pixel grid
6. **Creation**: Hide overlay when selecting colors or placing pixels
7. **Persistence**: Settings and position are maintained across page reloads

## Browser Compatibility

- **Chrome 88+**: Full support
- **Edge 88+**: Full support  
- **Other Chromium-based browsers**: Compatible with Manifest V3 support

## Security Considerations

- **Permissions**: Minimal required permissions (activeTab, storage)
- **Content Security**: No eval() or unsafe scripting practices
- **Data Handling**: Images processed client-side, no external transmission
- **Injection Scope**: Universal injection required for cross-site functionality

## Development Notes

### Code Quality
- Clean, well-structured ES6+ JavaScript
- Consistent naming conventions and code organization
- Proper event listener cleanup and memory management
- Error handling for image loading failures

### Extension Best Practices
- Follows Manifest V3 standards
- Uses modern Chrome Extension APIs
- Implements proper message passing between components
- Maintains separation of concerns between popup and content script

### Future Enhancement Opportunities
- Grid snap functionality for precise pixel alignment
- Multiple overlay support
- Keyboard shortcuts for common actions
- Import/export overlay configurations
- Enhanced image editing tools (rotation, cropping)

## File Purposes Summary

| File | Purpose | Key Functionality |
|------|---------|------------------|
| `manifest.json` | Extension config | Permissions, content script injection, popup definition |
| `content.js` | Core overlay logic | Drag/drop, image display, state management, message handling |
| `popup.html` | User interface | File upload, sliders, buttons for overlay control |
| `popup.js` | Popup logic | UI event handling, message sending, state synchronization |
| `styles.css` | Visual styling | Overlay appearance, drag handle styling, visual feedback |
| `README.md` | Documentation | Installation guide, usage instructions, feature overview |

This extension demonstrates solid understanding of browser extension architecture, DOM manipulation, and user experience design for creative tools.