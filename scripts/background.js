function updateBadge(speed) {
  const numSpeed = speed !== undefined ? Number(speed) : 1;
  if (Math.abs(numSpeed - 1) < 0.001) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    const text = numSpeed.toFixed(1) + 'x';
    chrome.action.setBadgeText({ text: text });
    chrome.action.setBadgeBackgroundColor({ color: '#0284c7' });
    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ color: '#ffffff' });
    }
  }
}

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['playbackSpeed'], (result) => {
    updateBadge(result.playbackSpeed);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['playbackSpeed'], (result) => {
    const speed = result.playbackSpeed !== undefined ? result.playbackSpeed : 1;
    if (result.playbackSpeed === undefined) {
      chrome.storage.local.set({ playbackSpeed: 1 });
    }
    updateBadge(speed);
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.playbackSpeed) {
    updateBadge(changes.playbackSpeed.newValue);
  }
});
