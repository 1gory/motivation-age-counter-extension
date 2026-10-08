# Release — Motivation Counter

The common runbook is [`../RELEASE.md`](../RELEASE.md) (the shared
`~/Sites/extensions/` workspace, outside this repo). Walk it step by step; this
file holds only what is specific to this extension. Section numbers match the
common steps.

| | |
|---|---|
| Version lives in | `manifest.json`, `package.json`, `package-lock.json` |
| Version history | `app/changelog.js` + `app/whats-new.js` (tooltip) |
| Store listing | `STORE_LISTING.md` · ID `jgebglhbeenjoehfkglemcfaimddnggl` |
| Landing | `https://ipershin.me/motivation-counter/` (+ `/privacy/`) |
| GitHub | `1gory/motivation-age-counter-extension` · Pages **off**, keep it off |
| ZIP | `motivation-counter-vX.Y.Z.zip` |

---

### 1. Version
Run `npm install` after bumping `package.json` so the lock file follows.

### 2. Release notes and What's new tooltip
- [ ] Entry at the top of `CHANGELOG` in `app/changelog.js` (`version`,
      `date: 'YYYY-MM-DD'`, `notes`, each ≤ 90 chars). Users see the newest ten
      when they click the version number in Settings. `npm test` fails if the
      first entry does not match `manifest.json`.
- [ ] **MINOR or MAJOR only:** an entry in `app/whats-new.js` keyed by the new
      version, `{ title: "What's new", body }`, body ≤ 130 chars (a 260px
      bubble). PATCH releases get no tooltip.
- [ ] Reload locally, clear `localStorage.lastSeenVersion`, and check the
      tooltip appears near the gear.

### 3. Checks
- [ ] `npm test`; new logic → tests in `app/app.test.js`.
- [ ] Every changed surface in both light and dark theme.
- [ ] No `console.log` in `app/*.js`.

Driving the check from Claude Code: the chrome-devtools MCP refuses
`chrome-extension://` URLs (and does not list `chrome://newtab`), so serve the
repo with `python3 -m http.server 8765` and open
`http://127.0.0.1:8765/dashboard.html`. It is the same code; only
`chrome.runtime` is missing, so to see the tooltip reload with an init script
that stubs `chrome.runtime.getManifest`. That origin has its own `localStorage`,
so the test never touches the real extension's settings.

### 4. Store listing
- [ ] A new `app/*.js` module → add it to the ZIP command below and to the
      Packaging section of `STORE_LISTING.md`.

### 5. Screenshots
- [ ] `images/screenshots/screenshot_1280x800_{1..5}.jpg` and the promo tile
      `images/screenshots/screenshot_440x280_1.jpg`.

Resize recipe (macOS):
```bash
SRC=/path/to/raw-screenshot.png
DST=images/screenshots/screenshot_1280x800_4.jpg
sips --resampleHeight 800 "$SRC" --out /tmp/r.png
sips --cropToHeightWidth 800 1280 /tmp/r.png --out /tmp/c.png
sips -s format jpeg -s formatOptions 85 /tmp/c.png --out "$DST"
```

### 6. README and tasks
- [ ] `ai-tasks/IDEAS.md` — append `**Shipped in vX.Y.Z**` to each idea this
      release implements, or remove the section.

### 9. Build ZIP
```bash
VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
zip -r motivation-counter-v${VERSION}.zip \
  manifest.json \
  dashboard.html \
  app/app.js \
  app/changelog.js \
  app/daily-quote.js \
  app/quotes.js \
  app/search-engines.js \
  app/whats-new.js \
  css/style.css \
  icons/ \
  LICENSE
unzip -l motivation-counter-v${VERSION}.zip
```
**Must NOT be inside:** `app/app.test.js`, `images/`, `package.json`.

### 12. After publish
- [ ] With the live version, open a new tab: the What's new tooltip fires once.
      If not, in DevTools on the new tab:
      `localStorage.removeItem('lastSeenVersion'); location.reload()`.
- [ ] `rm motivation-counter-v*.zip`

---

## Open debt

- **1.6.0** — screenshots 3 and 4 are refreshed in the repo but not uploaded to
  the listing; the store still shows the old settings panel. Next release:
  upload `screenshot_1280x800_3.jpg` and `_4.jpg` first thing in step 10.

## Project lessons

Shared lessons are in `../RELEASE.md`.

- **1.5.0** — screenshots 3 and 4 were knowingly skipped (time on the countdown
  label, two new "Set time" toggles). Paid off in 1.5.1. Lesson: a deliberate
  skip still goes into Open debt above until it is paid.
