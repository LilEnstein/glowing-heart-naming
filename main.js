import './style.css';
import { initThreeJS, startHeartAnimation } from './heartScene.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Background WebGL
  const canvas = document.getElementById('webgl-canvas');
  initThreeJS(canvas);

  const uiContainer = document.getElementById('ui-container');
  const nameInput = document.getElementById('name-input');
  const sendBtn = document.getElementById('send-btn');
  const nameOverlay = document.getElementById('name-overlay');
  const floatingName = document.getElementById('floating-name');

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

    // 2. Instruct ThreeJS to form the heart
    startHeartAnimation();

    // 3. Typewriter effect for the floating name
    setTimeout(() => {
      nameOverlay.classList.remove('hidden');
      floatingName.textContent = '';
      floatingName.classList.add('typing');
      
      let index = 0;
      const typingSpeed = 150; // ms per char

      function typeChar() {
        if (index < name.length) {
          floatingName.textContent += name.charAt(index);
          index++;
          setTimeout(typeChar, typingSpeed);
        } else {
            // Typing finished, remove cursor class after brief delay
            setTimeout(() => {
                floatingName.classList.remove('typing');
            }, 1000);
        }
      }
      typeChar();

    }, 1500); // Wait for particles to somewhat gather
  }
});
