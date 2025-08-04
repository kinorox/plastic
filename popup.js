document.addEventListener('DOMContentLoaded', function() {
  const imageInput = document.getElementById('imageInput');
  const opacitySlider = document.getElementById('opacitySlider');
  const opacityInput = document.getElementById('opacityInput');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleInput = document.getElementById('scaleInput');
  const pixelSizeSlider = document.getElementById('pixelSizeSlider');
  const pixelSizeInput = document.getElementById('pixelSizeInput');
  const pixelizeToggle = document.getElementById('pixelizeToggle');
  const gridToggle = document.getElementById('gridToggle');
  const customPaletteToggle = document.getElementById('customPaletteToggle');
  const paletteSection = document.getElementById('paletteSection');
  const colorPaletteInput = document.getElementById('colorPaletteInput');
  const loadWplaceColorsBtn = document.getElementById('loadWplaceColors');
  const loadRplaceColorsBtn = document.getElementById('loadRplaceColors');
  const clearPaletteBtn = document.getElementById('clearPalette');
  const autoMatchPixelSizeBtn = document.getElementById('autoMatchPixelSize');
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
    opacityInput.value = value;
    if (hasImage) {
      sendMessageToContent({
        action: 'updateOpacity',
        opacity: value / 100
      });
    }
  });

  // Update opacity from input
  opacityInput.addEventListener('input', function() {
    let value = parseInt(this.value);
    if (isNaN(value)) value = 50;
    value = Math.max(0, Math.min(100, value)); // Clamp between 0-100
    this.value = value;
    opacitySlider.value = value;
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
    scaleInput.value = value;
    if (hasImage) {
      sendMessageToContent({
        action: 'updateScale',
        scale: value / 100
      });
    }
  });

  // Update scale from input
  scaleInput.addEventListener('input', function() {
    let value = parseInt(this.value);
    if (isNaN(value)) value = 100;
    value = Math.max(10, Math.min(1000, value)); // Clamp between 10-1000
    this.value = value;
    scaleSlider.value = value;
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
    pixelSizeInput.value = value;
    if (hasImage && pixelizeToggle.checked) {
      updateImageWithPixelization();
    }
  });

  // Update pixel size from input
  pixelSizeInput.addEventListener('input', function() {
    let value = parseInt(this.value);
    if (isNaN(value)) value = 16;
    value = Math.max(1, Math.min(128, value)); // Clamp between 1-128
    this.value = value;
    pixelSizeSlider.value = value;
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

  // Handle custom palette toggle
  customPaletteToggle.addEventListener('change', function() {
    paletteSection.style.display = this.checked ? 'block' : 'none';
    if (hasImage && pixelizeToggle.checked) {
      updateImageWithPixelization();
    }
  });

  // Handle palette input changes
  colorPaletteInput.addEventListener('input', function() {
    if (hasImage && pixelizeToggle.checked && customPaletteToggle.checked) {
      updateImageWithPixelization();
    }
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
      customPaletteEnabled: customPaletteToggle.checked,
      customPalette: colorPaletteInput.value,
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
      opacityInput.value = Math.round(config.opacity || 50);
      scaleSlider.value = config.scale || 100;
      scaleInput.value = Math.round(config.scale || 100);
      pixelSizeSlider.value = config.pixelSize || 16;
      pixelSizeInput.value = config.pixelSize || 16;
      pixelizeToggle.checked = config.pixelizeEnabled || false;
      gridToggle.checked = config.gridEnabled || false;
      customPaletteToggle.checked = config.customPaletteEnabled || false;
      colorPaletteInput.value = config.customPalette || '';
      paletteSection.style.display = config.customPaletteEnabled ? 'block' : 'none';
      
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

  // Predefined color palettes
  const PREDEFINED_PALETTES = {
    wplace: [
      '#000000', '#3c3c3c', '#787878', '#d2d2d2', '#ffffff', '#600018', '#ed1c24', '#ff7f27', 
      '#f6aa09', '#f9dd3b', '#fffabc', '#0eb968', '#13e67b', '#87ff5e', '#0c816e', '#10aea6', 
      '#13e1be', '#28509e', '#4093e4', '#60f7f2', '#6b50f6', '#99b1fb', '#780c99', '#aa38b9', 
      '#e09ff9', '#cb007a', '#ec1f80', '#f38da9', '#684634', '#95682a', '#f8b277'
    ],
    rplace: [
      '#000000', '#00756F', '#009EAA', '#00A368', '#00CC78', '#2450A4', '#3690EA', '#51E9F4',
      '#6A5CFF', '#7EED56', '#94B3FF', '#B44AC0', '#BE0039', '#D4E4BC', '#DE107F', '#FF3881',
      '#FF4500', '#FF99AA', '#FFA800', '#FFFF00', '#FFB470', '#CD6155', '#A0522D', '#898D90',
      '#9C9C9C', '#D4D7D9', '#FFFFFF', '#6D001A', '#BF4F36', '#FFC0CB', '#FF69B4', '#00CED1'
    ]
  };

  // Load palette buttons
  loadWplaceColorsBtn.addEventListener('click', function() {
    colorPaletteInput.value = PREDEFINED_PALETTES.wplace.join(', ');
    if (hasImage && pixelizeToggle.checked && customPaletteToggle.checked) {
      updateImageWithPixelization();
    }
  });

  loadRplaceColorsBtn.addEventListener('click', function() {
    colorPaletteInput.value = PREDEFINED_PALETTES.rplace.join(', ');
    if (hasImage && pixelizeToggle.checked && customPaletteToggle.checked) {
      updateImageWithPixelization();
    }
  });

  clearPaletteBtn.addEventListener('click', function() {
    colorPaletteInput.value = '';
    if (hasImage && pixelizeToggle.checked && customPaletteToggle.checked) {
      updateImageWithPixelization();
    }
  });

  // Auto-match pixel size button
  autoMatchPixelSizeBtn.addEventListener('click', function() {
    autoMatchPixelSizeBtn.textContent = 'Detecting...';
    autoMatchPixelSizeBtn.disabled = true;
    
    // Send message to content script to detect pixel size
    sendMessageToContent({
      action: 'detectPixelSize'
    }, function(response) {
      if (response && response.pixelSize) {
        // Update both the pixel size slider and input
        pixelSizeSlider.value = response.pixelSize;
        pixelSizeInput.value = response.pixelSize;
        
        // Update the image if pixelization is enabled
        if (hasImage && pixelizeToggle.checked) {
          updateImageWithPixelization();
        }
        
        autoMatchPixelSizeBtn.textContent = `Matched: ${response.pixelSize}px`;
        autoMatchPixelSizeBtn.style.background = '#4CAF50';
        
        // Reset button after 2 seconds
        setTimeout(() => {
          autoMatchPixelSizeBtn.textContent = 'Auto-Match Site';
          autoMatchPixelSizeBtn.style.background = '#9C27B0';
          autoMatchPixelSizeBtn.disabled = false;
        }, 2000);
      } else {
        autoMatchPixelSizeBtn.textContent = 'Not Detected';
        autoMatchPixelSizeBtn.style.background = '#f44336';
        
        // Reset button after 2 seconds
        setTimeout(() => {
          autoMatchPixelSizeBtn.textContent = 'Auto-Match Site';
          autoMatchPixelSizeBtn.style.background = '#9C27B0';
          autoMatchPixelSizeBtn.disabled = false;
        }, 2000);
      }
    });
  });

  // Convert hex to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Find closest color in palette
  function findClosestColor(r, g, b, palette) {
    let minDistance = Infinity;
    let closestColor = palette[0];
    
    for (const hexColor of palette) {
      const paletteColor = hexToRgb(hexColor);
      const distance = Math.sqrt(
        Math.pow(r - paletteColor.r, 2) +
        Math.pow(g - paletteColor.g, 2) +
        Math.pow(b - paletteColor.b, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = hexColor;
      }
    }
    
    return hexToRgb(closestColor);
  }

  // Parse color palette from input
  function parseColorPalette(paletteText) {
    if (!paletteText.trim()) return [];
    
    return paletteText
      .split(',')
      .map(color => color.trim())
      .filter(color => /^#?[0-9A-Fa-f]{6}$/.test(color))
      .map(color => color.startsWith('#') ? color : '#' + color);
  }

  // Pixelization function
  function pixelateImage(imageData, pixelSize, useCustomPalette = false, customPalette = []) {
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
        
        // Apply color quantization if custom palette is enabled and has colors
        if (useCustomPalette && customPalette.length > 0) {
          const imageData = ctx.getImageData(0, 0, pixelatedWidth, pixelatedHeight);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const closestColor = findClosestColor(r, g, b, customPalette);
            data[i] = closestColor.r;
            data[i + 1] = closestColor.g;
            data[i + 2] = closestColor.b;
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
        
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
      const useCustomPalette = customPaletteToggle.checked;
      const customPalette = useCustomPalette ? parseColorPalette(colorPaletteInput.value) : [];
      
      pixelateImage(originalImageData, pixelSize, useCustomPalette, customPalette).then(pixelatedData => {
        sendMessageToContent({
          action: 'setImage',
          imageData: pixelatedData,
          opacity: opacitySlider.value / 100,
          scale: scaleSlider.value / 100,
          pixelSize: pixelSize,
          showGrid: gridToggle.checked,
          customPaletteEnabled: useCustomPalette,
          customPalette: colorPaletteInput.value,
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
  function sendMessageToContent(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
        // Handle response if callback provided
        if (callback && response) {
          callback(response);
        }
        
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
                chrome.tabs.sendMessage(tabs[0].id, message, callback);
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
        opacityInput.value = Math.round(state.opacity * 100);
        scaleSlider.value = state.scale * 100;
        scaleInput.value = Math.round(state.scale * 100);
        
        // Load pixelization settings
        if (state.pixelSize) {
          pixelSizeSlider.value = state.pixelSize;
          pixelSizeInput.value = state.pixelSize;
        }
        if (state.pixelizeEnabled) {
          pixelizeToggle.checked = state.pixelizeEnabled;
        }
        if (state.gridEnabled) {
          gridToggle.checked = state.gridEnabled;
        }
        if (state.customPaletteEnabled) {
          customPaletteToggle.checked = state.customPaletteEnabled;
          paletteSection.style.display = 'block';
        }
        if (state.customPalette) {
          colorPaletteInput.value = state.customPalette;
        }
      }
    }
  });
});