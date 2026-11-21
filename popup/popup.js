document.addEventListener('DOMContentLoaded', () => {
  const speedButtons = document.querySelectorAll('.speed-btn');
  const speedBadge = document.getElementById('speed-badge');

  function updateUI(activeSpeed) {
    const formattedSpeed = Number(activeSpeed).toFixed(1) + 'x';
    speedBadge.textContent = formattedSpeed;

    speedButtons.forEach(btn => {
      const btnSpeed = parseFloat(btn.getAttribute('data-speed'));
      if (Math.abs(btnSpeed - parseFloat(activeSpeed)) < 0.001) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
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
      
      // Save to storage
      chrome.storage.local.set({ playbackSpeed: newSpeed }, () => {
        updateUI(newSpeed);

        // Send message to active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_SPEED', speed: newSpeed }, (response) => {
              if (chrome.runtime.lastError) {
                // Ignore errors on restricted/system pages
                console.debug('Could not send message to tab:', chrome.runtime.lastError.message);
              }
            });
          }
        });
      });
    });
  });
});
