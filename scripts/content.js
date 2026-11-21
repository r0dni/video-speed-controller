let currentSpeed = 1.0;
let currentHotkeys = {
  speedUp: { code: 'ArrowUp', altKey: true, ctrlKey: false, shiftKey: false },
  speedDown: { code: 'ArrowDown', altKey: true, ctrlKey: false, shiftKey: false },
  reset: { code: 'KeyR', altKey: true, ctrlKey: false, shiftKey: false }
};
let osdElement = null;
let osdTimeout = null;
let isRestoringRate = false;

// Apply speed to all video elements
function applySpeed(speed) {
  const rounded = Math.round(speed * 10) / 10;
  const clamped = Math.max(0.2, Math.min(4.0, rounded));
  currentSpeed = clamped;
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.playbackRate !== clamped) {
      video.playbackRate = clamped;
    }
  });
}

// Show glass OSD indicator
function showSpeedOSD(speed) {
  const rounded = Math.round(speed * 10) / 10;
  const text = rounded.toFixed(1) + 'x';

  if (!osdElement) {
    osdElement = document.createElement('div');
    osdElement.id = 'vsc-osd-badge';
    Object.assign(osdElement.style, {
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      background: 'rgba(15, 23, 42, 0.78)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(56, 189, 248, 0.4)',
      color: '#38bdf8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      borderRadius: '10px',
      padding: '8px 16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      opacity: '1',
      transition: 'opacity 0.3s ease'
    });
    document.documentElement.appendChild(osdElement);
  }

  osdElement.textContent = text;
  osdElement.style.opacity = '1';

  if (osdTimeout) {
    clearTimeout(osdTimeout);
  }

  osdTimeout = setTimeout(() => {
    if (osdElement) {
      osdElement.style.opacity = '0';
    }
  }, 1200);
}

// Load initial speed and hotkeys from storage
chrome.storage.local.get(['playbackSpeed', 'hotkeys'], (result) => {
  if (result.playbackSpeed !== undefined) {
    currentSpeed = result.playbackSpeed;
  }
  if (result.hotkeys) {
    currentHotkeys = result.hotkeys;
  }
  applySpeed(currentSpeed);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.playbackSpeed) {
      applySpeed(changes.playbackSpeed.newValue);
    }
    if (changes.hotkeys) {
      currentHotkeys = changes.hotkeys.newValue || currentHotkeys;
    }
  }
});

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SET_SPEED') {
    applySpeed(request.speed);
    sendResponse({ status: 'success' });
  }
});

// Bulletproof protection against YouTube rate resets
const handleVideoEvent = (event) => {
  if (event.target && event.target.tagName === 'VIDEO') {
    if (event.target.playbackRate !== currentSpeed) {
      event.target.playbackRate = currentSpeed;
    }
  }
};

document.addEventListener('play', handleVideoEvent, true);
document.addEventListener('playing', handleVideoEvent, true);
document.addEventListener('loadedmetadata', handleVideoEvent, true);

document.addEventListener('ratechange', (event) => {
  if (event.target && event.target.tagName === 'VIDEO') {
    if (isRestoringRate) return;
    if (Math.abs(event.target.playbackRate - currentSpeed) > 0.001) {
      isRestoringRate = true;
      event.target.playbackRate = currentSpeed;
      setTimeout(() => {
        isRestoringRate = false;
      }, 50);
    }
  }
}, true);

// Global hotkey listener
document.addEventListener('keydown', (e) => {
  const activeEl = document.activeElement;
  if (activeEl) {
    const tagName = activeEl.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || activeEl.isContentEditable) {
      return;
    }
  }

  const matchHotkey = (hk) => {
    if (!hk) return false;
    return e.code === hk.code &&
           !!e.altKey === !!hk.altKey &&
           !!e.ctrlKey === !!hk.ctrlKey &&
           !!e.shiftKey === !!hk.shiftKey;
  };

  let newSpeed = null;
  if (matchHotkey(currentHotkeys.speedUp)) {
    newSpeed = currentSpeed + 0.1;
  } else if (matchHotkey(currentHotkeys.speedDown)) {
    newSpeed = currentSpeed - 0.1;
  } else if (matchHotkey(currentHotkeys.reset)) {
    newSpeed = 1.0;
  }

  if (newSpeed !== null) {
    e.preventDefault();
    e.stopPropagation();

    const rounded = Math.round(newSpeed * 10) / 10;
    const clamped = Math.max(0.2, Math.min(4.0, rounded));

    chrome.storage.local.set({ playbackSpeed: clamped }, () => {
      applySpeed(clamped);
      showSpeedOSD(clamped);
    });
  }
}, true);

console.log("Video Speed Controller content script (v1.2.0) loaded and active");
