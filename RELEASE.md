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

**Audit all five slots, not only the one obviously affected.** A new feature
that touches the counter, the quote, the search bar, or the settings panel
may also be visible in screenshots 1, 2, 3, or 5 even if you "only" added a
search bar. Lesson from 1.3.0: only screenshot 4 was refreshed but the
search bar was missing from 1, 2, 3, 5 too.

For every screenshot slot:
- [ ] Open `images/screenshots/screenshot_1280x800_N.jpg`, compare against
      the current UI in Chrome. If anything in the screenshot is now stale
      (theme, mode label, presence/absence of a feature), refresh it.
- [ ] Replace the file, keep the same file name (README and store listing
      reference it by path).
- [ ] Also audit the small promo tile
      `images/screenshots/screenshot_440x280_1.jpg`.

**Quick resize recipe** (macOS, `sips`):
```bash
SRC=/path/to/raw-screenshot.png
DST=images/screenshots/screenshot_1280x800_4.jpg
sips --resampleHeight 800 "$SRC" --out /tmp/r.png
sips --cropToHeightWidth 800 1280 /tmp/r.png --out /tmp/c.png
sips -s format jpeg -s formatOptions 85 /tmp/c.png --out "$DST"
```

### 6. README
- [ ] Search `README.md` for every mention of a feature this release touches
      (`grep -i 'search\|quote\|theme\|font'` for example). Update copy and
      screenshot captions.
- [ ] Update the feature list and any "version 1.x adds…" line if present.
- [ ] If you do not update README in the same PR, you must open a follow-up
      and link it from the release notes — do not silently skip.

### 6b. IDEAS.md / ai-tasks/
- [ ] Open `ai-tasks/IDEAS.md`. For every idea this release implements,
      append a `**Shipped in vX.Y.Z**` line at the top of that idea's
      section (or remove the section entirely). Reason: future-you needs to
      know what is still open at a glance, and shipped ideas blocking the
      list is the most common drift.
- [ ] If the release closes any other tasks documents in `ai-tasks/`,
      archive or delete them.

### 6c. GitHub Pages (docs/)
The project ships a landing page from the `docs/` folder on `main`
(GitHub Pages → Settings → Pages → source: `main` / `/docs`). It is easy to
forget because it lives outside the extension code and nothing breaks if it
goes stale.

- [ ] Open `docs/index.html`. Audit the **feature cards** and the **tagline**
      against the current `STORE_LISTING.md` — every user-visible feature this
      release touched (search bar, themes, fonts, sizes, new counter modes…)
      must be reflected. This is the same drift trap as the README.
- [ ] Update `docs/icon128.png` if the icon changed.
- [ ] If the Chrome Web Store listing URL or slug changed, fix the CWS links
      in both `docs/index.html` and `docs/privacy-policy.html`.
- [ ] If the privacy policy text changed, mirror it in `docs/privacy-policy.html`.
- [ ] After push, open `https://1gory.github.io/motivation-age-counter-extension/`
      and confirm the page reflects this release.

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
- [ ] Upload the ZIP under "Package".
- [ ] Replace **every** stale screenshot in the listing (not only the one
      you obviously changed — re-audit per step 5).
- [ ] Update the description text if `STORE_LISTING.md` changed.
- [ ] Fill the **What's new in this version** field (CWS shows it on the
      listing). Use 1–3 sentences from the GitHub release notes.
- [ ] Confirm Privacy practices if CWS asks (same answers as last time
      unless permissions changed).
- [ ] Hit **Submit for review**.

### 11. GitHub Release
The git tag is not enough — wrap it in a GitHub Release so users (and
Dependabot, and changelog aggregators) can see it.

- [ ] Open `https://github.com/<owner>/<repo>/releases/new`.
- [ ] Choose existing tag `vX.Y.Z` (do not create a new one — it is
      already on the right commit).
- [ ] Title: `vX.Y.Z — <one-line summary>`.
- [ ] Body: copy the "Highlights / Defaults / Under the hood / Install"
      sections from the previous release as a template, then update.
- [ ] Attach `motivation-counter-vX.Y.Z.zip` so people can sideload
      without waiting for CWS review.
- [ ] Tick **Set as the latest release**. Leave pre-release unchecked.
- [ ] Publish.

### 12. After publish
- [ ] Wait for the email confirming the CWS update is live (usually a few
      hours to a couple of days).
- [ ] Open the listing URL and verify the version number, screenshots, and
      description match expectations.
- [ ] Install the live version (not your unpacked dev build), open a new
      tab, and confirm the `WHATS_NEW` tooltip fires once. If it does not,
      open DevTools on the new tab and run
      `localStorage.removeItem('lastSeenVersion'); location.reload()` to
      simulate a first-update flow.
- [ ] Delete the local ZIP (`rm motivation-counter-v*.zip`) so it does not
      drift out of sync next release.

---

## Things we forgot before — do not forget again

A running log of mistakes from past releases. Read this before each release,
add to it after each release.

- **1.3.0** — only screenshot 4 was refreshed; the search bar was missing
  from screenshots 1, 2, 3, 5. Lesson: step 5 now says "audit all five
  slots, not only the obvious one."
- **1.3.0** — `package.json` was at 1.0.4 while `manifest.json` was at
  1.2.0. Lesson: step 2 enforces both must match.
- **1.3.0** — `README.md` was not updated for the new search/tooltip
  features. Lesson: step 6 now requires a grep pass and a follow-up issue
  if not done in the same PR.
- **1.3.0** — `ai-tasks/IDEAS.md` still listed ideas 1 and 3 as open after
  they shipped. Lesson: step 6b explicitly requires grooming.
- **1.3.0** — GitHub Release was not created automatically after the tag
  push. Lesson: step 11 is now its own checklist item.
- **pre-1.3.x** — the GitHub Pages landing page (`docs/index.html`) was
  completely forgotten across releases: it still advertised only age /
  countdown / quote / privacy and never mentioned the search bar or the
  theme / font / size customisation shipped in 1.3.0. Lesson: step 6c now
  audits `docs/` against `STORE_LISTING.md` every release.
- **1.3.0** — The CWS "What's new in this version" field was not filled.
  Lesson: step 10 calls it out.

## When in doubt: ask Claude

If you give Claude the sentence "release X.Y.Z", Claude should re-read this
file and walk through every numbered step. If Claude skips a step, it is a
bug in Claude — point at this file and tell Claude to redo from step N.
