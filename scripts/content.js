// Apply speed to all video elements
function applySpeed(speed) {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    video.playbackRate = speed;
  });
}

// Read speed from storage on load and apply
chrome.storage.local.get(['playbackSpeed'], (result) => {
  const speed = result.playbackSpeed !== undefined ? result.playbackSpeed : 1;
  applySpeed(speed);
});

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SET_SPEED') {
    applySpeed(request.speed);
    sendResponse({ status: 'success' });
  }
});

// Intercept 'play' event in capture phase to ensure new videos in playlists don't reset speed
document.addEventListener('play', (event) => {
  if (event.target && event.target.tagName === 'VIDEO') {
    chrome.storage.local.get(['playbackSpeed'], (result) => {
      const speed = result.playbackSpeed !== undefined ? result.playbackSpeed : 1;
      if (event.target.playbackRate !== speed) {
        event.target.playbackRate = speed;
      }
    });
  }
}, true);

console.log("Video Speed Controller content script loaded and active");
