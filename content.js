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
      gridEnabled: false
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

    // Setup drag functionality on handle and image
    this.setupDragHandlers(handle);
    this.setupDragHandlers(this.overlayImage);
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
    this.overlayImage.style.cursor = 'default';
    this.overlayImage.style.pointerEvents = 'none';
    
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };


  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message.action);
      switch (message.action) {
        case 'setImage':
          this.setImage(message.imageData, message.opacity, message.scale, message.pixelSize, message.showGrid, message.originalImageData);
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
      }
    });
  }

  setImage(imageData, opacity, scale, pixelSize = 0, showGrid = false, originalImageData = null) {
    console.log('Setting image with data:', imageData.substring(0, 50) + '...');
    this.overlayImage.src = imageData;
    this.currentState.imageData = imageData;
    this.currentState.originalImageData = originalImageData || imageData;
    this.currentState.opacity = opacity;
    this.currentState.scale = scale;
    this.currentState.pixelSize = pixelSize;
    this.currentState.pixelizeEnabled = pixelSize > 0;
    this.currentState.gridEnabled = showGrid;
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
      gridEnabled: false
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
}

// Initialize the overlay when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PixelArtOverlay();
  });
} else {
  new PixelArtOverlay();
}