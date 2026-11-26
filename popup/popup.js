document.addEventListener('DOMContentLoaded', () => {
  const speedButtons = document.querySelectorAll('.speed-btn');
  const speedBadge = document.getElementById('speed-badge');
  const extVersion = document.getElementById('ext-version');
  const stepDownBtn = document.getElementById('step-down');
  const stepUpBtn = document.getElementById('step-up');
  const resetSpeedBtn = document.getElementById('reset-speed');

  const toggleSettingsBtn = document.getElementById('toggle-settings');
  const togglePipBtn = document.getElementById('toggle-pip');
  const settingsPanel = document.getElementById('settings-panel');
  const resetHotkeysBtn = document.getElementById('reset-hotkeys');
  const hotkeyButtons = document.querySelectorAll('.hotkey-btn');

  const DEFAULT_HOTKEYS = {
    speedUp: { code: 'ArrowUp', altKey: true, ctrlKey: false, shiftKey: false, label: 'Alt + ↑' },
    speedDown: { code: 'ArrowDown', altKey: true, ctrlKey: false, shiftKey: false, label: 'Alt + ↓' },
    reset: { code: 'KeyR', altKey: true, ctrlKey: false, shiftKey: false, label: 'Alt + R' },
    pip: { code: 'KeyP', altKey: true, ctrlKey: false, shiftKey: false, label: 'Alt + P' }
  };

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

  function updateHotkeysUI(hotkeys) {
    hotkeyButtons.forEach(btn => {
      const action = btn.getAttribute('data-action');
      if (hotkeys[action] && hotkeys[action].label) {
        btn.textContent = hotkeys[action].label;
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
              console.debug('Could not send message to tab, using scripting fallback:', chrome.runtime.lastError.message);
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id, allFrames: true },
                func: (s) => document.querySelectorAll('video').forEach(v => v.playbackRate = s),
                args: [clamped]
              }).catch(err => console.debug('Scripting fallback error:', err));
            }
          });
        }
      });
    });
  }

  // Load initial speed and hotkeys from storage
  chrome.storage.local.get(['playbackSpeed', 'hotkeys'], (result) => {
    const currentSpeed = result.playbackSpeed !== undefined ? result.playbackSpeed : 1;
    updateUI(currentSpeed);

    const hotkeys = result.hotkeys || DEFAULT_HOTKEYS;
    updateHotkeysUI(hotkeys);
  });

  // Toggle settings panel
  if (toggleSettingsBtn && settingsPanel) {
    toggleSettingsBtn.addEventListener('click', () => {
      settingsPanel.classList.toggle('hidden');
    });
  }

  // Handle PiP button click
  if (togglePipBtn) {
    togglePipBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;
        const tab = tabs[0];

        // Guard against restricted chrome:// or edge:// pages
        const isRestricted = !tab.url ||
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('devtools://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:') ||
          tab.url.startsWith('view-source:');

        if (isRestricted) {
          console.warn('PiP cannot be injected on restricted pages:', tab.url);
          return;
        }

        // Send message to content script first
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_PIP' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script might not be injected or ready, fallback to executeScript
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                try {
                  if (!document.pictureInPictureEnabled) return;
                  if (document.pictureInPictureElement) {
                    return document.exitPictureInPicture().catch(() => {});
                  }
                  const videos = Array.from(document.querySelectorAll('video')).filter(v => {
                    if (v.disablePictureInPicture) return false;
                    const r = v.getBoundingClientRect();
                    const s = window.getComputedStyle(v);
                    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
                  });
                  if (videos.length === 0) return;
                  let target = videos.find(v => !v.paused && !v.ended && v.readyState >= 2) ||
                               videos.find(v => !v.paused && !v.ended && v.readyState >= 1) ||
                               videos.sort((a, b) => {
                                 const aR = a.getBoundingClientRect();
                                 const bR = b.getBoundingClientRect();
                                 return (bR.width * bR.height) - (aR.width * aR.height);
                               })[0];
                  if (target && target.readyState > 0) {
                    target.requestPictureInPicture().catch(e => console.debug('PiP error:', e));
                  }
                } catch (e) {
                  console.debug('PiP error:', e);
                }
              }
            }).catch(err => console.debug('executeScript fallback error:', err));
          }
        });
      });
    });
  }

  // Handle speed button clicks
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

  // Hotkey recording logic
  let activeKeydownListener = null;

  function stopRecording() {
    if (activeKeydownListener) {
      window.removeEventListener('keydown', activeKeydownListener, true);
      activeKeydownListener = null;
    }
    hotkeyButtons.forEach(b => b.classList.remove('recording'));
  }

  // Cancel recording on click outside buttons
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hotkey-btn')) {
      stopRecording();
      chrome.storage.local.get(['hotkeys'], (result) => {
        updateHotkeysUI(result.hotkeys || DEFAULT_HOTKEYS);
      });
    }
  });

  hotkeyButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (btn.classList.contains('recording')) return;

      stopRecording();

      btn.classList.add('recording');
      btn.textContent = 'Нажмите клавиши...';

      const action = btn.getAttribute('data-action');

      const handleKeydown = (e) => {
        // Allow Escape to cancel recording
        if (e.key === 'Escape' || e.code === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          stopRecording();
          chrome.storage.local.get(['hotkeys'], (result) => {
            updateHotkeysUI(result.hotkeys || DEFAULT_HOTKEYS);
          });
          return;
        }

        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key) || 
            ['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        stopRecording();

        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');

        let keyName = e.key;
        if (e.code.startsWith('Key')) {
          keyName = e.code.replace('Key', '').toUpperCase();
        } else if (e.code.startsWith('Digit')) {
          keyName = e.code.replace('Digit', '');
        } else if (e.code === 'ArrowUp') keyName = '↑';
        else if (e.code === 'ArrowDown') keyName = '↓';
        else if (e.code === 'ArrowLeft') keyName = '←';
        else if (e.code === 'ArrowRight') keyName = '→';
        else if (e.code === 'Space') keyName = 'Space';
        else if (e.key.length === 1) keyName = e.key.toUpperCase();
        else keyName = e.code;

        parts.push(keyName);
        const label = parts.join(' + ');

        const newHotkey = {
          code: e.code,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          label: label
        };

        chrome.storage.local.get(['hotkeys'], (result) => {
          const hotkeys = result.hotkeys || { ...DEFAULT_HOTKEYS };

          // Prevent conflict / duplicates: clear conflicting actions
          for (const [existingAction, existingHk] of Object.entries(hotkeys)) {
            if (existingAction !== action && existingHk) {
              if (existingHk.code === newHotkey.code &&
                  !!existingHk.altKey === !!newHotkey.altKey &&
                  !!existingHk.ctrlKey === !!newHotkey.ctrlKey &&
                  !!existingHk.shiftKey === !!newHotkey.shiftKey) {
                // Clear conflict
                hotkeys[existingAction] = { code: '', altKey: false, ctrlKey: false, shiftKey: false, label: '—' };
              }
            }
          }

          hotkeys[action] = newHotkey;
          chrome.storage.local.set({ hotkeys }, () => {
            updateHotkeysUI(hotkeys);
          });
        });
      };

      activeKeydownListener = handleKeydown;
      window.addEventListener('keydown', handleKeydown, true);
    });
  });

  if (resetHotkeysBtn) {
    resetHotkeysBtn.addEventListener('click', () => {
      stopRecording();
      chrome.storage.local.set({ hotkeys: DEFAULT_HOTKEYS }, () => {
        updateHotkeysUI(DEFAULT_HOTKEYS);
      });
    });
  }
});
