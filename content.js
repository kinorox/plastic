class PixelArtOverlay {
  constructor() {
    this.overlay = null;
    this.overlayImage = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.currentState = {
      imageData: null,
      opacity: 0.5,
      scale: 1,
      position: { x: 100, y: 100 },
      visible: false,
      hasImage: false
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

    // Assemble overlay
    this.overlay.appendChild(handle);
    this.overlay.appendChild(this.overlayImage);
    document.body.appendChild(this.overlay);

    // Setup drag functionality
    this.setupDragHandlers(handle);
  }

  setupDragHandlers(handle) {
    handle.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.overlay.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      
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
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };


  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message.action);
      switch (message.action) {
        case 'setImage':
          this.setImage(message.imageData, message.opacity, message.scale);
          break;
        case 'updateOpacity':
          this.updateOpacity(message.opacity);
          break;
        case 'updateScale':
          this.updateScale(message.scale);
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

  setImage(imageData, opacity, scale) {
    console.log('Setting image with data:', imageData.substring(0, 50) + '...');
    this.overlayImage.src = imageData;
    this.currentState.imageData = imageData;
    this.currentState.opacity = opacity;
    this.currentState.scale = scale;
    this.currentState.hasImage = true;
    this.currentState.visible = true;
    
    this.overlayImage.onload = () => {
      console.log('Image loaded, dimensions:', this.overlayImage.naturalWidth, 'x', this.overlayImage.naturalHeight);
      this.updateDisplay();
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
    this.saveState();
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
    this.currentState = {
      imageData: null,
      opacity: 0.5,
      scale: 1,
      position: { x: 100, y: 100 },
      visible: false,
      hasImage: false
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