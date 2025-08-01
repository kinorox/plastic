document.addEventListener('DOMContentLoaded', function() {
  const imageInput = document.getElementById('imageInput');
  const opacitySlider = document.getElementById('opacitySlider');
  const opacityValue = document.getElementById('opacityValue');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleValue = document.getElementById('scaleValue');
  const toggleButton = document.getElementById('toggleOverlay');
  const removeButton = document.getElementById('removeOverlay');

  let overlayVisible = false;
  let hasImage = false;

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

  // Handle image upload
  imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const imageData = e.target.result;
        hasImage = true;
        toggleButton.disabled = false;
        removeButton.disabled = false;
        
        overlayVisible = true;
        toggleButton.textContent = 'Hide Overlay';
        
        sendMessageToContent({
          action: 'setImage',
          imageData: imageData,
          opacity: opacitySlider.value / 100,
          scale: scaleSlider.value / 100
        });
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
    toggleButton.disabled = true;
    removeButton.disabled = true;
    toggleButton.textContent = 'Show Overlay';
    imageInput.value = '';
    
    sendMessageToContent({ action: 'removeOverlay' });
  });

  // Send message to content script
  function sendMessageToContent(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    });
  }

  // Load saved state
  chrome.storage.local.get(['overlayState'], function(result) {
    if (result.overlayState) {
      const state = result.overlayState;
      if (state.hasImage) {
        hasImage = true;
        overlayVisible = state.visible;
        toggleButton.disabled = false;
        removeButton.disabled = false;
        toggleButton.textContent = overlayVisible ? 'Hide Overlay' : 'Show Overlay';
        opacitySlider.value = state.opacity * 100;
        opacityValue.textContent = Math.round(state.opacity * 100) + '%';
        scaleSlider.value = state.scale * 100;
        scaleValue.textContent = Math.round(state.scale * 100) + '%';
      }
    }
  });
});