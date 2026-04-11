# Chrome Web Store — Publishing Info

## Short description (132 chars max)

Replace new tab with your real-time age display. Mindful living reminder inspired by memento mori philosophy.

---

## Detailed description

This extension replaces your new tab page with a real-time display of your current age.
The extension calculates and shows your age with millisecond precision, updating continuously as time passes. You enter your birth date once, and every new tab displays how long you've been alive.

What it does:
- Replaces the default new tab page with an age counter
- Shows your age in years with decimal precision (e.g., 25.187429105)
- Updates in real-time without requiring page refresh
- Stores your birth date locally in your browser
- Works offline and requires no permissions

Privacy:
Your birth date is stored only on your device using Chrome's local storage. No data is sent to external servers or third parties. The extension requires no special permissions and works completely offline.

Technical details:
Built with Manifest V3 for modern Chrome browsers. The interface automatically adapts to your system's dark or light theme. The extension is lightweight and does not affect browser performance.

This is an independent implementation inspired by Alex MacCaw's original 2013 extension concept, rewritten for current web standards and privacy requirements.

---

## Single purpose description (for Chrome Web Store review)

This extension has a single purpose: to replace the new tab page with a real-time display of the user's age for mindful time awareness.

---

## Privacy practices (Data use disclosures)

- Does not collect any user data
- Does not transmit any data to external servers
- Birth date is stored locally via localStorage on the user's device only
- No analytics, tracking, or third-party scripts

## Permissions justification

- chrome_url_overrides: newtab — Required to replace the new tab page (the core function of the extension)
- No other permissions requested

---

## Packaging (ZIP for Chrome Web Store)

Run from the repo root. The output file name should include the version from `manifest.json`.

```bash
zip -r motivation-age-counter-v$(cat manifest.json | grep '"version"' | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/').zip \
  manifest.json \
  dashboard.html \
  app/app.js \
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
| `css/style.css` | Styles |
| `icons/` | All 6 icon files |
| `LICENSE` | Required by store guidelines |

### What's excluded (must NOT be in ZIP)
| Path | Why |
|------|-----|
| `node_modules/` | Dev tooling only |
| `package.json` / `package-lock.json` | Dev tooling only |
| `app/app.test.js` | Tests, not part of extension |
| `images/` | Store screenshots — upload separately in the dashboard |
| `.git/`, `.idea/`, `.claude/` | Dev metadata |
| `*.md` files | Docs, not part of extension |
| `.DS_Store` | macOS metadata |

### Pre-publish checklist
- [ ] Version in `manifest.json` matches the release
- [ ] Run `npm test` — all pass
- [ ] No `console.log` in `app/app.js`
- [ ] All icon files present in `icons/`
- [ ] ZIP contains only the files listed above
