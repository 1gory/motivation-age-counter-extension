# Release runbook

Use this every time you publish a new version to the Chrome Web Store.
Going top-to-bottom guarantees nothing is forgotten (this is why
`package.json` drifted to 1.0.4 while `manifest.json` was already at 1.2.0 —
there was no single checklist tying the two together).

---

## Why there are two version numbers

- **`manifest.json` → `"version"`** — the *real* extension version that Chrome
  Web Store uses. **Must be bumped every release.**
- **`package.json` → `"version"`** — for the dev tooling (vitest) only. Chrome
  never sees it, but we keep it in sync so the repo has one source of truth
  and `git log` / GitHub releases stay coherent.

**Rule: both numbers must be identical.** The pre-publish checklist enforces this.

---

## Semantic versioning we use

`MAJOR.MINOR.PATCH`

| Bump  | When                                                                 | Example       |
|-------|----------------------------------------------------------------------|---------------|
| PATCH | Bug fix, copy tweak, style polish, no new user-visible feature        | 1.3.0 → 1.3.1 |
| MINOR | New feature, new setting, new mode (backward-compatible)              | 1.3.0 → 1.4.0 |
| MAJOR | Breaking change (rename of localStorage keys, removed feature, etc.)  | 1.3.0 → 2.0.0 |

**Tooltip rule:** only MINOR/MAJOR releases get a `WHATS_NEW` entry. PATCH
releases are silent — no in-app tip.

---

## Step-by-step release checklist

Walk through every line. Do not skip; if a step does not apply, write "n/a"
in the PR description so future-you can see it was considered.

### 1. Code is ready
- [ ] All feature work merged into `main`
- [ ] `npm test` — all tests pass
- [ ] Manually opened the extension (`chrome://extensions` → Reload), tried
      every changed surface in both light and dark theme
- [ ] No `console.log` left in `app/*.js` (except tests)

### 2. Version bump
- [ ] Decide PATCH / MINOR / MAJOR (see table above)
- [ ] Bump `manifest.json` → `"version"`
- [ ] Bump `package.json` → `"version"` to the **same** value
- [ ] Run `npm install` if package.json changed (refreshes package-lock.json)

### 3. What's new tooltip
- [ ] If MINOR or MAJOR → add an entry in `app/whats-new.js` keyed by the new
      version with `{ title, body }`:
  ```js
  '1.4.0': {
    title: "What's new",
    body: 'Short one-sentence description of the headline feature.',
  },
  ```
- [ ] Body should be ≤ 130 chars (it lives in a 260px-wide bubble)
- [ ] Reload the extension locally, clear `localStorage.lastSeenVersion` in
      DevTools, and verify the tooltip appears near the gear

### 4. Store listing copy (`STORE_LISTING.md`)
- [ ] Update the **Detailed description** if a user-visible feature was added,
      changed, or removed
- [ ] If you added a new `app/*.js` module, add it to the `zip -r ...`
      command in the **Packaging** section
- [ ] Re-read the **Single purpose description** — does it still match?
- [ ] If you added a new permission, update **Permissions justification**

### 5. Screenshots (Chrome Web Store)
Required size: **1280×800**, JPG. Up to 5 slots.

For every changed UI surface:
- [ ] Identify which numbered screenshot it affects (see the table in
      `STORE_LISTING.md` → *Screenshots guide*)
- [ ] Take the new screenshot (full-page screenshot of the new tab in Chrome,
      then crop or resize to 1280×800)
- [ ] Replace the file in `images/screenshots/screenshot_1280x800_N.jpg`
- [ ] Keep the file name — the README and store listing refer to it

**Quick resize recipe** (macOS, `sips`):
```bash
SRC=/path/to/raw-screenshot.png
DST=images/screenshots/screenshot_1280x800_4.jpg
sips --resampleHeight 800 "$SRC" --out /tmp/r.png
sips --cropToHeightWidth 800 1280 /tmp/r.png --out /tmp/c.png
sips -s format jpeg -s formatOptions 85 /tmp/c.png --out "$DST"
```

Don't forget the small tile if the visual identity changed:
- [ ] `images/screenshots/screenshot_440x280_1.jpg` (small promo tile)

### 6. README
- [ ] If a feature is shown in the README, update the matching paragraph and
      screenshot reference

### 7. Tests
- [ ] If new logic was added (URL builder, version comparator, etc.), add
      tests in `app/app.test.js`
- [ ] `npm test` — still green

### 8. Commit + tag
- [ ] `git add` only the files that should ship (see *What's included* in
      `STORE_LISTING.md`)
- [ ] Commit message: `Release X.Y.Z: <one-line summary>`
- [ ] Tag: `git tag vX.Y.Z`
- [ ] Push: `git push && git push --tags`

### 9. Build ZIP
Run from the repo root:
```bash
VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
zip -r motivation-counter-v${VERSION}.zip \
  manifest.json \
  dashboard.html \
  app/app.js \
  app/daily-quote.js \
  app/quotes.js \
  app/search-engines.js \
  app/whats-new.js \
  css/style.css \
  icons/ \
  LICENSE
```

Verify the ZIP contents:
```bash
unzip -l motivation-counter-v${VERSION}.zip
```

**Must NOT be inside:** `node_modules/`, `package.json`, `app/app.test.js`,
`images/`, `.git/`, `.idea/`, `.claude/`, any `*.md`, `.DS_Store`,
`ai-tasks/`.

### 10. Chrome Web Store dashboard
- [ ] Upload the ZIP under "Package"
- [ ] Replace any changed screenshots in the listing
- [ ] Update the description text if `STORE_LISTING.md` changed
- [ ] Hit "Submit for review"

### 11. After publish
- [ ] Wait for the email confirming the update is live (usually a few hours
      to a couple of days)
- [ ] Open the listing URL and verify the version number, screenshots, and
      description match expectations
- [ ] Delete the local ZIP (`rm motivation-counter-v*.zip`) so it does not
      drift out of sync next release

---

## When in doubt: ask Claude

If you give Claude the sentence "release X.Y.Z", Claude should re-read this
file and walk through every numbered step. If Claude skips a step, it is a
bug in Claude — point at this file and tell Claude to redo from step N.
