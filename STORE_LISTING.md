# Chrome Web Store — Publishing Info

## Extension name

Motivation Counter

---

## Short description (132 chars max)

Replace new tab with a real-time motivation counter. Track your age, countdown to a date, or to the end of the year.

---

## Detailed description

This extension replaces your new tab page with a real-time counter designed to keep you mindful of time.

Choose from three display modes:
- Age counter — see exactly how long you have been alive, updated in real time with millisecond precision
- Until end of year — a countdown to December 31, showing how much of the year remains
- Until date — a countdown to any date you choose

Every new tab also shows a daily quote from a curated collection of over 1500 quotes. A new quote appears each day and stays consistent throughout the day. The quote feature can be turned off in settings.

Customize the counter size — small, medium, or large — to suit your preference.

All settings are accessible via the gear icon in the bottom-right corner:
- Switch display mode
- Set a target date for countdown
- Change your date of birth
- Toggle the daily quote on or off
- Adjust counter size

Privacy:
Your birth date and preferences are stored only on your device using browser local storage. No data is sent to external servers or third parties. The extension requires no special permissions and works completely offline.

Technical details:
Built with Manifest V3 for modern Chrome browsers. The interface automatically adapts to your system's dark or light theme. The extension is lightweight and does not affect browser performance.

This is an independent implementation inspired by Alex MacCaw's original 2013 extension concept, rewritten for current web standards and expanded with new counter modes.

---

## Single purpose description (for Chrome Web Store review)

This extension has a single purpose: to replace the new tab page with a real-time motivational counter that helps users stay mindful of time through age tracking and countdowns.

---

## Privacy practices (Data use disclosures)

- Does not collect any user data
- Does not transmit any data to external servers
- Birth date and settings are stored locally via localStorage on the user's device only
- No analytics, tracking, or third-party scripts

---

## Permissions justification

- `chrome_url_overrides: newtab` — Required to replace the new tab page (the core function of the extension)
- No other permissions requested
- No host permissions
- No external network requests of any kind

---

## Screenshots guide

Chrome Web Store allows up to 5 screenshots. Required size: **1280×800** (or 640×400).

### Recommended set (priority order):

| # | What to show | Mode / State |
|---|---|---|
| 1 | Counter — age mode, light | Default state, no quote |
| 2 | Counter — age mode, dark | Dark mode, with daily quote |
| 3 | Counter — countdown to date | "Until date" mode with a target date |
| 4 | Settings panel open | All three modes visible, counter size buttons |
| 5 | Counter — countdown to year end | "Until end of year" mode |

**Tip:** Screenshots 1 and 2 are the most important — they show the core experience. Settings screenshot (4) helps users understand the features before installing. You do not need to screenshot every state of the menu.

---

## Packaging (ZIP for Chrome Web Store)

Run from the repo root:

```bash
zip -r motivation-counter-v$(cat manifest.json | grep '"version"' | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/').zip \
  manifest.json \
  dashboard.html \
  app/app.js \
  app/daily-quote.js \
  app/quotes.js \
  css/style.css \
  icons/ \
  LICENSE
```

### What's included
| Path | Why |
|------|-----|
| `manifest.json` | Extension config |
| `dashboard.html` | New tab UI |
| `app/app.js` | Application logic |
| `app/daily-quote.js` | Daily quote selection logic |
| `app/quotes.js` | Curated quote collection (1554 quotes) |
| `css/style.css` | Styles |
| `icons/` | All icon files |
| `LICENSE` | Required by store guidelines |

### What's excluded (must NOT be in ZIP)
| Path | Why |
|------|-----|
| `node_modules/` | Dev tooling only |
| `package.json` / `package-lock.json` | Dev tooling only |
| `app/app.test.js` | Tests, not part of extension |
| `images/` | Store screenshots — upload separately in the dashboard |
| `.git/`, `.idea/`, `.claude/` | Dev metadata |
| `*.md`, `TASKS.md` | Docs, not part of extension |
| `.DS_Store` | macOS metadata |

---

## Pre-publish checklist

- [ ] Version in `manifest.json` is `1.1.0`
- [ ] `npm test` — all 26 tests pass
- [ ] No `console.log` in `app/app.js`, `app/daily-quote.js`, `app/quotes.js`
- [ ] All icon files present: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
- [ ] `tab-icon-32.png` present (used as favicon in dashboard.html)
- [ ] ZIP contains only the files listed above
- [ ] Screenshots uploaded: at minimum #1 and #2 from the table above
- [ ] Store description updated
