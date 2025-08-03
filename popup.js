document.addEventListener('DOMContentLoaded', function() {
  const imageInput = document.getElementById('imageInput');
  const opacitySlider = document.getElementById('opacitySlider');
  const opacityValue = document.getElementById('opacityValue');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleValue = document.getElementById('scaleValue');
  const pixelSizeSlider = document.getElementById('pixelSizeSlider');
  const pixelSizeValue = document.getElementById('pixelSizeValue');
  const pixelizeToggle = document.getElementById('pixelizeToggle');
  const gridToggle = document.getElementById('gridToggle');
  const toggleButton = document.getElementById('toggleOverlay');
  const removeButton = document.getElementById('removeOverlay');
  const shareButton = document.getElementById('shareConfig');
  const loadButton = document.getElementById('loadConfig');

  let overlayVisible = false;
  let hasImage = false;
  let originalImageData = null;

  // Update opacity display
  opacitySlider.addEventListener('input', function() {
    const value = this.value;
    opacityValue.textContent = value + '%';
    if (hasImage) {
      sendMessageToContent({
        action: 'updateOpacity',
        opacity: value / 100
      });
    }
  });

  // Update scale display
  scaleSlider.addEventListener('input', function() {
    const value = this.value;
    scaleValue.textContent = value + '%';
    if (hasImage) {
      sendMessageToContent({
        action: 'updateScale',
        scale: value / 100
      });
    }
  });

  // Update pixel size display
  pixelSizeSlider.addEventListener('input', function() {
    const value = this.value;
    pixelSizeValue.textContent = value + 'px';
    if (hasImage && pixelizeToggle.checked) {
      updateImageWithPixelization();
    }
  });

  // Handle pixelization toggle
  pixelizeToggle.addEventListener('change', function() {
    if (hasImage) {
      updateImageWithPixelization();
    }
    updateGridVisibility();
  });

  // Handle grid toggle
  gridToggle.addEventListener('change', function() {
    updateGridVisibility();
  });

  // Handle image upload
  imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        originalImageData = e.target.result;
        hasImage = true;
        toggleButton.disabled = false;
        removeButton.disabled = false;
        shareButton.disabled = false;
        
        overlayVisible = true;
        toggleButton.textContent = 'Hide Overlay';
        
        updateImageWithPixelization();
      };
      reader.readAsDataURL(file);
    }
  });

  // Toggle overlay visibility
  toggleButton.addEventListener('click', function() {
    overlayVisible = !overlayVisible;
    if (overlayVisible) {
      toggleButton.textContent = 'Hide Overlay';
      sendMessageToContent({ action: 'showOverlay' });
    } else {
      toggleButton.textContent = 'Show Overlay';
      sendMessageToContent({ action: 'hideOverlay' });
    }
  });

  // Remove overlay
  removeButton.addEventListener('click', function() {
    hasImage = false;
    overlayVisible = false;
    originalImageData = null;
    toggleButton.disabled = true;
    removeButton.disabled = true;
    shareButton.disabled = true;
    toggleButton.textContent = 'Show Overlay';
    imageInput.value = '';
    
    sendMessageToContent({ action: 'removeOverlay' });
  });

  // Share configuration
  shareButton.addEventListener('click', function() {
    if (!hasImage) return;
    
    const config = {
      opacity: parseFloat(opacitySlider.value),
      scale: parseFloat(scaleSlider.value),
      pixelSize: parseInt(pixelSizeSlider.value),
      pixelizeEnabled: pixelizeToggle.checked,
      gridEnabled: gridToggle.checked,
      imageData: originalImageData
    };
    
    // Encode config as base64 to make it shareable
    const configString = JSON.stringify(config);
    const shareCode = btoa(configString);
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareCode).then(() => {
      shareButton.textContent = 'Copied!';
      setTimeout(() => {
        shareButton.textContent = 'Copy Share Code';
      }, 2000);
    }).catch(() => {
      // Fallback: show the code in a prompt
      prompt('Share this code with others:', shareCode);
    });
  });

  // Load shared configuration
  loadButton.addEventListener('click', function() {
    const shareCode = prompt('Paste the share code:');
    if (!shareCode) return;
    
    try {
      const configString = atob(shareCode);
      const config = JSON.parse(configString);
      
      // Validate required fields
      if (!config.imageData) {
        alert('Invalid share code: missing image data');
        return;
      }
      
      // Load the configuration
      originalImageData = config.imageData;
      hasImage = true;
      
      // Update UI controls
      opacitySlider.value = config.opacity || 50;
      opacityValue.textContent = Math.round(config.opacity || 50) + '%';
      scaleSlider.value = config.scale || 100;
      scaleValue.textContent = Math.round(config.scale || 100) + '%';
      pixelSizeSlider.value = config.pixelSize || 16;
      pixelSizeValue.textContent = (config.pixelSize || 16) + 'px';
      pixelizeToggle.checked = config.pixelizeEnabled || false;
      gridToggle.checked = config.gridEnabled || false;
      
      // Enable buttons
      toggleButton.disabled = false;
      removeButton.disabled = false;
      shareButton.disabled = false;
      toggleButton.textContent = 'Hide Overlay';
      overlayVisible = true;
      
      // Apply the loaded configuration
      updateImageWithPixelization();
      
    } catch (error) {
      alert('Invalid share code format');
      console.error('Error loading share code:', error);
    }
  });

  // Pixelization function
  function pixelateImage(imageData, pixelSize) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate pixelated dimensions
        const pixelatedWidth = Math.floor(img.width / pixelSize);
        const pixelatedHeight = Math.floor(img.height / pixelSize);
        
        // Set canvas to pixelated size
        canvas.width = pixelatedWidth;
        canvas.height = pixelatedHeight;
        
        // Draw image at small size (this creates the pixelation effect)
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, pixelatedWidth, pixelatedHeight);
        
        // Create final canvas at original size
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        finalCanvas.width = img.width;
        finalCanvas.height = img.height;
        
        // Scale up pixelated image using nearest neighbor
        finalCtx.imageSmoothingEnabled = false;
        finalCtx.drawImage(canvas, 0, 0, pixelatedWidth, pixelatedHeight, 0, 0, img.width, img.height);
        
        resolve(finalCanvas.toDataURL());
      };
      img.src = imageData;
    });
  }

  // Update image with or without pixelization
  function updateImageWithPixelization() {
    if (!originalImageData) return;
    
    if (pixelizeToggle.checked) {
      const pixelSize = parseInt(pixelSizeSlider.value);
      pixelateImage(originalImageData, pixelSize).then(pixelatedData => {
        sendMessageToContent({
          action: 'setImage',
          imageData: pixelatedData,
          opacity: opacitySlider.value / 100,
          scale: scaleSlider.value / 100,
          pixelSize: pixelSize,
          showGrid: gridToggle.checked,
          originalImageData: originalImageData
        });
      });
    } else {
      sendMessageToContent({
        action: 'setImage',
        imageData: originalImageData,
        opacity: opacitySlider.value / 100,
        scale: scaleSlider.value / 100,
        pixelSize: 0,
        showGrid: false,
        originalImageData: originalImageData
      });
    }
  }

  // Update grid visibility
  function updateGridVisibility() {
    if (hasImage) {
      sendMessageToContent({
        action: 'updateGrid',
        showGrid: gridToggle.checked && pixelizeToggle.checked,
        pixelSize: parseInt(pixelSizeSlider.value)
      });
    }
  }

  // Send message to content script
  function sendMessageToContent(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
        // If no response, the content script might not be loaded
        if (chrome.runtime.lastError) {
          // Try to inject the content script for sites not in manifest
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }, function() {
            chrome.scripting.insertCSS({
              target: { tabId: tabs[0].id },
              files: ['styles.css']
            }, function() {
              // Retry sending the message
              setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, message);
              }, 100);
            });
          });
        }
      });
    });
  }

  // Load saved state
  chrome.storage.local.get(['overlayState'], function(result) {
    if (result.overlayState) {
      const state = result.overlayState;
      if (state.hasImage) {
        hasImage = true;
        originalImageData = state.originalImageData;
        overlayVisible = state.visible;
        toggleButton.disabled = false;
        removeButton.disabled = false;
        shareButton.disabled = false;
        toggleButton.textContent = overlayVisible ? 'Hide Overlay' : 'Show Overlay';
        opacitySlider.value = state.opacity * 100;
        opacityValue.textContent = Math.round(state.opacity * 100) + '%';
        scaleSlider.value = state.scale * 100;
        scaleValue.textContent = Math.round(state.scale * 100) + '%';
        
        // Load pixelization settings
        if (state.pixelSize) {
          pixelSizeSlider.value = state.pixelSize;
          pixelSizeValue.textContent = state.pixelSize + 'px';
        }
        if (state.pixelizeEnabled) {
          pixelizeToggle.checked = state.pixelizeEnabled;
        }
        if (state.gridEnabled) {
          gridToggle.checked = state.gridEnabled;
        }
      }
    }
  });
});