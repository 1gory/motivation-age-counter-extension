# Motivation Counter Extension

A modernized version of Alex MacCaw's iconic "Motivation" Chrome extension, updated for current browser standards and expanded with new counter modes.

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/motivation-counter/jgebglhbeenjoehfkglemcfaimddnggl)** &nbsp;·&nbsp; **[GitHub](https://github.com/1gory/motivation-age-counter-extension)** &nbsp;·&nbsp; **[Privacy Policy](https://1gory.github.io/motivation-age-counter-extension/privacy-policy.html)**

![Extension Preview](images/screenshot_1280x800_1.jpg)
![Extension Preview](images/screenshot_1280x800_2.jpg)
![Extension Preview](images/screenshot_1280x800_3.jpg)

## Credits & Attribution

**This extension is based on the original work by [Alex MacCaw](https://github.com/maccman).**

The original "Motivation" extension was created in 2013 and became beloved by thousands of users for its simple yet profound concept. This version exists to preserve and extend that experience as Chrome's extension platform has evolved.

All credit for the original concept, design, and implementation belongs to Alex MacCaw.

## What It Does

- Replaces your new tab page with a real-time counter
- Three display modes (switchable in settings):
  - **Age counter** — shows your age in years with millisecond precision
  - **Until end of year** — countdown to December 31
  - **Until date** — countdown to any date you choose
- Daily quote — a new quote each day from a curated collection
- Clean, minimalist design that adapts to light and dark mode
- Completely private — all data stays in your browser

## Settings

Click the ⚙ icon in the bottom-right corner to:
- Switch display mode
- Set a target date for countdown
- Change your date of birth
- Toggle the daily quote
- Adjust counter size (S / M / L)

## Privacy & Technical Details

- No data collection, analytics, or external connections
- All data stored locally via `localStorage`
- Works completely offline
- Built with Manifest V3 for modern Chrome browsers
- Vanilla JavaScript, no external libraries

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/motivation-counter/jgebglhbeenjoehfkglemcfaimddnggl)
2. Click "Add to Chrome"
3. Enter your birth date when prompted

### Manual Installation
1. Download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

## Development

```bash
npm test   # run test suite
```

## Legal & Disclaimer

This project is a technical modernization of Alex MacCaw's original work, created for users who wish to continue using this extension. We claim no ownership of the original concept, design, or intellectual property.

If you are Alex MacCaw or represent his interests and have any concerns about this project, please contact us immediately.

## License

This modernized implementation is provided under the MIT License for the technical updates only. All rights to the original concept and design remain with Alex MacCaw.

---

*Made with respect and gratitude for Alex MacCaw's original vision.*
