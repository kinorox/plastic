class PixelArtOverlay {
  constructor() {
    this.overlay = null;
    this.overlayImage = null;
    this.gridOverlay = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.currentState = {
      imageData: null,
      originalImageData: null,
      opacity: 0.5,
      scale: 1,
      position: { x: 100, y: 100 },
      visible: false,
      hasImage: false,
      pixelSize: 16,
      pixelizeEnabled: false,
      gridEnabled: false,
      customPaletteEnabled: false,
      customPalette: ''
    };
    
    this.init();
  }

  init() {
    this.createOverlay();
    this.loadState();
    this.setupMessageListener();
  }

  createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'pixel-art-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 100px;
      left: 100px;
      z-index: 999999;
      pointer-events: none;
      user-select: none;
      display: none;
      background: none;
      border: none;
      box-shadow: none;
    `;

    // Create draggable handle
    const handle = document.createElement('div');
    handle.id = 'pixel-art-handle';
    handle.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      width: 100%;
      height: 20px;
      background: rgba(0, 0, 0, 0.7);
      cursor: move;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-family: Arial, sans-serif;
      border-radius: 3px 3px 0 0;
    `;
    handle.textContent = '⋮⋮ Drag to move ⋮⋮';


    // Create image element
    this.overlayImage = document.createElement('img');
    this.overlayImage.style.cssText = `
      display: block;
      max-width: none;
      max-height: none;
      pointer-events: none;
      user-select: none;
    `;

    // Create grid overlay
    this.gridOverlay = document.createElement('div');
    this.gridOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      display: none;
      z-index: 1;
    `;

    // Assemble overlay
    this.overlay.appendChild(handle);
    this.overlay.appendChild(this.overlayImage);
    this.overlay.appendChild(this.gridOverlay);
    document.body.appendChild(this.overlay);

    // Setup drag functionality
    this.setupDragHandlers(handle);
  }

  setupDragHandlers(element) {
    element.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.overlay.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      
      // Enable pointer events during drag
      element.style.pointerEvents = 'auto';
      element.style.cursor = 'move';
      
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      e.preventDefault();
    });
  }

  handleMouseMove = (e) => {
    if (!this.isDragging) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    this.overlay.style.left = x + 'px';
    this.overlay.style.top = y + 'px';
    
    this.currentState.position = { x, y };
    this.saveState();
  };

  handleMouseUp = () => {
    this.isDragging = false;
    
    // Reset cursor and pointer events
    const handle = document.getElementById('pixel-art-handle');
    if (handle) {
      handle.style.cursor = 'move';
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };


  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message.action);
      switch (message.action) {
        case 'setImage':
          this.setImage(message.imageData, message.opacity, message.scale, message.pixelSize, message.showGrid, message.originalImageData, message.customPaletteEnabled, message.customPalette);
          break;
        case 'updateOpacity':
          this.updateOpacity(message.opacity);
          break;
        case 'updateScale':
          this.updateScale(message.scale);
          break;
        case 'updateGrid':
          this.updateGrid(message.showGrid, message.pixelSize);
          break;
        case 'showOverlay':
          this.showOverlay();
          break;
        case 'hideOverlay':
          this.hideOverlay();
          break;
        case 'removeOverlay':
          this.removeOverlay();
          break;
        case 'detectPixelSize':
          const detectedSize = this.detectSitePixelSize();
          sendResponse({ pixelSize: detectedSize });
          return true; // Keep message channel open for async response
      }
    });
  }

  setImage(imageData, opacity, scale, pixelSize = 0, showGrid = false, originalImageData = null, customPaletteEnabled = false, customPalette = '') {
    console.log('Setting image with data:', imageData.substring(0, 50) + '...');
    this.overlayImage.src = imageData;
    this.currentState.imageData = imageData;
    this.currentState.originalImageData = originalImageData || imageData;
    this.currentState.opacity = opacity;
    this.currentState.scale = scale;
    this.currentState.pixelSize = pixelSize;
    this.currentState.pixelizeEnabled = pixelSize > 0;
    this.currentState.gridEnabled = showGrid;
    this.currentState.customPaletteEnabled = customPaletteEnabled;
    this.currentState.customPalette = customPalette;
    this.currentState.hasImage = true;
    this.currentState.visible = true;
    
    this.overlayImage.onload = () => {
      console.log('Image loaded, dimensions:', this.overlayImage.naturalWidth, 'x', this.overlayImage.naturalHeight);
      this.updateDisplay();
      this.updateGrid(showGrid, pixelSize);
      this.showOverlay();
      this.saveState();
    };
    
    this.overlayImage.onerror = (e) => {
      console.error('Image failed to load:', e);
    };
  }

  updateOpacity(opacity) {
    this.currentState.opacity = opacity;
    this.updateDisplay();
    this.saveState();
  }

  updateScale(scale) {
    this.currentState.scale = scale;
    this.updateDisplay();
    this.updateGrid(this.currentState.gridEnabled, this.currentState.pixelSize);
    this.saveState();
  }

  updateGrid(showGrid, pixelSize) {
    this.currentState.gridEnabled = showGrid;
    this.currentState.pixelSize = pixelSize;
    
    if (showGrid && pixelSize > 0 && this.overlayImage.naturalWidth > 0) {
      this.createGrid(pixelSize);
      this.gridOverlay.style.display = 'block';
    } else {
      this.gridOverlay.style.display = 'none';
    }
    this.saveState();
  }

  createGrid(pixelSize) {
    const imgWidth = this.overlayImage.naturalWidth * this.currentState.scale;
    const imgHeight = this.overlayImage.naturalHeight * this.currentState.scale;
    const scaledPixelSize = pixelSize * this.currentState.scale;
    
    // Clear existing grid
    this.gridOverlay.innerHTML = '';
    
    // Set grid overlay size to match scaled image
    this.gridOverlay.style.width = imgWidth + 'px';
    this.gridOverlay.style.height = imgHeight + 'px';
    
    // Create vertical lines
    for (let x = 0; x <= imgWidth; x += scaledPixelSize) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: 0;
        width: 1px;
        height: ${imgHeight}px;
        background: rgba(255, 255, 255, 0.5);
        pointer-events: none;
      `;
      this.gridOverlay.appendChild(line);
    }
    
    // Create horizontal lines
    for (let y = 0; y <= imgHeight; y += scaledPixelSize) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        left: 0;
        top: ${y}px;
        width: ${imgWidth}px;
        height: 1px;
        background: rgba(255, 255, 255, 0.5);
        pointer-events: none;
      `;
      this.gridOverlay.appendChild(line);
    }
  }

  updateDisplay() {
    if (!this.overlayImage.src) return;
    
    this.overlayImage.style.opacity = this.currentState.opacity;
    this.overlayImage.style.transform = `scale(${this.currentState.scale})`;
    this.overlayImage.style.transformOrigin = 'top left';
  }
  

  showOverlay() {
    if (!this.currentState.hasImage) return;
    
    console.log('Showing overlay at position:', this.currentState.position);
    this.overlay.style.display = 'block';
    this.overlay.style.position = 'fixed';
    this.overlay.style.zIndex = '999999';
    this.overlay.style.left = this.currentState.position.x + 'px';
    this.overlay.style.top = this.currentState.position.y + 'px';
    this.currentState.visible = true;
    this.saveState();
    
    // Force a repaint
    this.overlay.offsetHeight;
    console.log('Overlay should be visible now');
  }

  hideOverlay() {
    this.overlay.style.display = 'none';
    this.currentState.visible = false;
    this.saveState();
  }

  removeOverlay() {
    this.overlay.style.display = 'none';
    this.overlayImage.src = '';
    this.gridOverlay.style.display = 'none';
    this.currentState = {
      imageData: null,
      originalImageData: null,
      opacity: 0.5,
      scale: 1,
      position: { x: 100, y: 100 },
      visible: false,
      hasImage: false,
      pixelSize: 16,
      pixelizeEnabled: false,
      gridEnabled: false,
      customPaletteEnabled: false,
      customPalette: ''
    };
    this.saveState();
  }

  saveState() {
    chrome.storage.local.set({
      overlayState: this.currentState
    });
  }

  loadState() {
    chrome.storage.local.get(['overlayState'], (result) => {
      if (result.overlayState) {
        this.currentState = { ...this.currentState, ...result.overlayState };
        
        if (this.currentState.hasImage && this.currentState.imageData) {
          this.overlayImage.src = this.currentState.imageData;
          this.overlayImage.onload = () => {
            this.updateDisplay();
            this.updateGrid(this.currentState.gridEnabled, this.currentState.pixelSize);
            this.overlay.style.left = this.currentState.position.x + 'px';
            this.overlay.style.top = this.currentState.position.y + 'px';
            
            if (this.currentState.visible) {
              this.showOverlay();
            }
          };
        }
      }
    });
  }

  detectSitePixelSize() {
    console.log('Detecting pixel size for site:', window.location.hostname);
    
    // Known site detection
    const knownSites = {
      'wplace.tk': 1,
      'wplace.space': 1,
      'wplace.org': 1,
      'ourworldofpixels.com': 16,
      'pixelplace.io': 1,
      'pixelcanvas.io': 1,
      'pxls.space': 1,
      'reddit.com': 1, // r/place
      'www.reddit.com': 1,
      'place.reddit.com': 1,
      'placenl.nl': 1,
      'pixels.pythondiscord.com': 1
    };
    
    const hostname = window.location.hostname.toLowerCase();
    for (const [site, pixelSize] of Object.entries(knownSites)) {
      if (hostname.includes(site)) {
        console.log(`Detected known site ${site} with pixel size ${pixelSize}`);
        return pixelSize;
      }
    }
    
    // Canvas-based detection
    const canvasPixelSize = this.detectCanvasPixelSize();
    if (canvasPixelSize) {
      console.log(`Detected canvas pixel size: ${canvasPixelSize}`);
      return canvasPixelSize;
    }
    
    // CSS Grid detection
    const gridPixelSize = this.detectCSSGridSize();
    if (gridPixelSize) {
      console.log(`Detected CSS grid pixel size: ${gridPixelSize}`);
      return gridPixelSize;
    }
    
    // DOM element pattern detection
    const domPixelSize = this.detectDOMPixelPattern();
    if (domPixelSize) {
      console.log(`Detected DOM pixel pattern size: ${domPixelSize}`);
      return domPixelSize;
    }
    
    console.log('Could not detect pixel size automatically');
    return null;
  }

  detectCanvasPixelSize() {
    const canvases = document.querySelectorAll('canvas');
    
    for (const canvas of canvases) {
      try {
        if (canvas.width > 100 && canvas.height > 100) {
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          
          // Sample a small area to detect pixel patterns
          const imageData = ctx.getImageData(0, 0, Math.min(50, canvas.width), Math.min(50, canvas.height));
          const data = imageData.data;
          
          // Look for repeating color patterns that indicate pixels
          const pixelSize = this.analyzePixelPattern(data, imageData.width, imageData.height);
          if (pixelSize) return pixelSize;
        }
      } catch (e) {
        // Canvas might be tainted or inaccessible
        continue;
      }
    }
    
    return null;
  }
  
  detectCSSGridSize() {
    // Look for CSS grid containers that might represent pixels
    const gridElements = document.querySelectorAll('[style*="grid"], .grid, .pixel-grid, .canvas-grid');
    
    for (const element of gridElements) {
      const computedStyle = window.getComputedStyle(element);
      const gridTemplateColumns = computedStyle.gridTemplateColumns;
      
      if (gridTemplateColumns && gridTemplateColumns !== 'none') {
        // Try to extract pixel size from grid template
        const match = gridTemplateColumns.match(/repeat\(\d+,\s*(\d+)px\)/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }
    
    return null;
  }
  
  detectDOMPixelPattern() {
    // Look for common pixel art game patterns
    const pixelSelectors = [
      '.pixel', '.tile', '.cell', '.square', 
      '[class*="pixel"]', '[class*="tile"]', '[class*="cell"]',
      '[data-x][data-y]', '[data-coord]'
    ];
    
    for (const selector of pixelSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 100) { // Likely a pixel grid
        const element = elements[0];
        const rect = element.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        
        if (size > 0 && size < 50) { // Reasonable pixel size
          return Math.round(size);
        }
      }
    }
    
    return null;
  }
  
  analyzePixelPattern(data, width, height) {
    // Simple pattern detection - look for repeating blocks of same color
    const blockSizes = [1, 2, 4, 8, 16, 32];
    
    for (const blockSize of blockSizes) {
      if (blockSize >= width || blockSize >= height) continue;
      
      let matches = 0;
      let total = 0;
      
      // Check if colors repeat in blockSize x blockSize patterns
      for (let y = 0; y < height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
          total++;
          
          // Get the color of the top-left pixel of this block
          const baseIndex = (y * width + x) * 4;
          const baseR = data[baseIndex];
          const baseG = data[baseIndex + 1];
          const baseB = data[baseIndex + 2];
          
          // Check if all pixels in this block are the same color
          let blockMatches = true;
          for (let by = 0; by < blockSize && blockMatches; by++) {
            for (let bx = 0; bx < blockSize && blockMatches; bx++) {
              const index = ((y + by) * width + (x + bx)) * 4;
              if (Math.abs(data[index] - baseR) > 10 || 
                  Math.abs(data[index + 1] - baseG) > 10 || 
                  Math.abs(data[index + 2] - baseB) > 10) {
                blockMatches = false;
              }
            }
          }
          
          if (blockMatches) matches++;
        }
      }
      
      // If more than 30% of blocks are uniform, this might be the pixel size
      if (total > 0 && (matches / total) > 0.3) {
        return blockSize;
      }
    }
    
    return null;
  }
}

// Initialize the overlay when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PixelArtOverlay();
  });
} else {
  new PixelArtOverlay();
}