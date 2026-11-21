document.addEventListener('DOMContentLoaded', () => {
  const speedButtons = document.querySelectorAll('.speed-btn');
  const speedBadge = document.getElementById('speed-badge');
  const extVersion = document.getElementById('ext-version');
  const stepDownBtn = document.getElementById('step-down');
  const stepUpBtn = document.getElementById('step-up');
  const resetSpeedBtn = document.getElementById('reset-speed');

  // Display extension version
  if (extVersion && chrome.runtime?.getManifest) {
    const manifest = chrome.runtime.getManifest();
    extVersion.textContent = `v${manifest.version}`;
  }

  function updateUI(activeSpeed) {
    const rounded = Math.round(activeSpeed * 10) / 10;
    const formattedSpeed = rounded.toFixed(1) + 'x';
    speedBadge.textContent = formattedSpeed;

    speedButtons.forEach(btn => {
      const btnSpeed = parseFloat(btn.getAttribute('data-speed'));
      if (Math.abs(btnSpeed - rounded) < 0.001) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function applySpeed(newSpeed) {
    const rounded = Math.round(newSpeed * 10) / 10;
    const clamped = Math.max(0.2, Math.min(4.0, rounded));

    // Save to storage
    chrome.storage.local.set({ playbackSpeed: clamped }, () => {
      updateUI(clamped);

      // Send message to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_SPEED', speed: clamped }, (response) => {
            if (chrome.runtime.lastError) {
              console.debug('Could not send message to tab:', chrome.runtime.lastError.message);
            }
          });
        }
      });
    });
  }

  // Load initial speed from storage
  chrome.storage.local.get(['playbackSpeed'], (result) => {
    const currentSpeed = result.playbackSpeed !== undefined ? result.playbackSpeed : 1;
    updateUI(currentSpeed);
  });

  // Handle button clicks
  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const newSpeed = parseFloat(btn.getAttribute('data-speed'));
      applySpeed(newSpeed);
    });
  });

  if (stepDownBtn) {
    stepDownBtn.addEventListener('click', () => {
      chrome.storage.local.get(['playbackSpeed'], (result) => {
        const currentSpeed = result.playbackSpeed !== undefined ? result.playbackSpeed : 1;
        applySpeed(currentSpeed - 0.1);
      });
    });
  }

  if (stepUpBtn) {
    stepUpBtn.addEventListener('click', () => {
      chrome.storage.local.get(['playbackSpeed'], (result) => {
        const currentSpeed = result.playbackSpeed !== undefined ? result.playbackSpeed : 1;
        applySpeed(currentSpeed + 0.1);
      });
    });
  }

  if (resetSpeedBtn) {
    resetSpeedBtn.addEventListener('click', () => {
      applySpeed(1.0);
    });
  }
});
