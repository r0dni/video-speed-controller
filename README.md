# Video Speed Controller

<p align="center">
  <img src="assets/logo.jpg" alt="Video Speed Controller Logo" width="160" height="160" style="border-radius: 16px;">
</p>

A lightweight and powerful Google Chrome extension (Manifest V3) for controlling HTML5 video playback speed across websites.

## Features

- **Speed Presets**: Quick access to speeds ranging from **0.5x to 2.5x** (0.5x, 0.7x, 1.0x, 1.2x, 1.5x, 1.7x, 2.0x, 2.5x).
- **Persistent Storage**: Automatically saves your preferred playback speed using `chrome.storage.local`.
- **Anti-Reset Protection**: Prevents video speeds from resetting when switching videos in playlists or loading new media elements.
- **Universal Support**: Works on all HTML5 video elements across `<all_urls>`.

## Local Installation (Developer Mode)

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `video-speed-controller` directory.
