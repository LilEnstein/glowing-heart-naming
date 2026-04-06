import './style.css';
import { initThreeJS, startHeartAnimation } from './heartScene.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Background WebGL
  const canvas = document.getElementById('webgl-canvas');
  initThreeJS(canvas);

  const uiContainer = document.getElementById('ui-container');
  const nameInput = document.getElementById('name-input');
  const sendBtn = document.getElementById('send-btn');

  // Check URL parameters for direct share view
  const urlParams = new URLSearchParams(window.location.search);
  const paramName = urlParams.get('name');

  if (paramName) {
    // Direct view mode
    triggerHeart(decodeURIComponent(paramName));
  }

  // Event Listeners for UI
  sendBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
      // Optional: Update URL without reloading to make it shareable immediately
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?name=${encodeURIComponent(name)}`;
      window.history.pushState({path: newUrl}, '', newUrl);
      
      triggerHeart(name);
    }
  });

  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendBtn.click();
    }
  });

  function triggerHeart(name) {
    // 1. Fade out UI
    uiContainer.classList.add('fade-out');

    // 2. Instruct ThreeJS to form the heart and render the 3D text
    startHeartAnimation(name);
  }
});
