import { getQuoteOfTheDay } from './daily-quote.js';
import { QUOTES } from './quotes.js';
import { SEARCH_ENGINES, DEFAULT_ENGINE, buildSearchUrl } from './search-engines.js';
import { getWhatsNew, isFirstInstall } from './whats-new.js';

export const MILLISECONDS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000; // Gregorian year

export function calculateAge(dob, now = new Date()) {
  const duration = now - dob;
  const years = duration / MILLISECONDS_PER_YEAR;
  const [yearPart, decimalPart] = years.toFixed(9).split('.');
  return { yearPart, decimalPart };
}

export function calculateCountdown(target, now = new Date()) {
  const duration = target - now;
  if (duration <= 0) return { yearPart: '0', decimalPart: '000000000' };
  const years = duration / MILLISECONDS_PER_YEAR;
  const [yearPart, decimalPart] = years.toFixed(9).split('.');
  return { yearPart, decimalPart };
}

export function endOfYear(now = new Date()) {
  return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
}

// Parses a 'YYYY-MM-DD' string into a Date at LOCAL midnight.
// `new Date('YYYY-MM-DD')` parses as UTC midnight, which shifts the calendar
// day in negative-UTC timezones; building from components keeps it local so the
// countdown target aligns with the local label (toLocaleDateString) and endOfYear.
// Returns null for malformed input.
export function parseLocalDate(str) {
  if (typeof str !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  const date = new Date(year, month, day);
  if (isNaN(date)) return null;
  // Reject overflow dates (e.g. 2030-02-31) that the Date constructor silently
  // normalizes into the following month.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

// Formats a Date as a 'YYYY-MM-DD' string using its LOCAL calendar components.
// Inverse of parseLocalDate; avoids the UTC shift of Date.toISOString().slice(0,10)
// when populating a <input type="date"> from a local-midnight Date.
export function formatLocalDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parses an 'HH:MM' string (the value an <input type="time"> produces) into
// its components. Some browsers append ':SS' when a step is configured, so
// seconds are tolerated and discarded. Returns null for malformed input.
export function parseLocalTime(str) {
  if (typeof str !== 'string') return null;
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(str.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

// Combines a 'YYYY-MM-DD' date with an optional 'HH:MM' time into a LOCAL Date.
// A missing or empty time means local midnight — the pre-1.5.0 behaviour, which
// is what users who leave the "Set time" toggle off still get.
// Returns null if either part is malformed.
export function parseLocalDateTime(dateStr, timeStr) {
  const date = parseLocalDate(dateStr);
  if (!date) return null;
  if (timeStr == null || timeStr === '') return date;
  const time = parseLocalTime(timeStr);
  if (!time) return null;
  date.setHours(time.hours, time.minutes, 0, 0);
  return date;
}

// Formats a Date's LOCAL wall-clock time as 'HH:MM' for an <input type="time">.
// Inverse of the time half of parseLocalDateTime.
export function formatLocalTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Builds the "UNTIL ..." heading for countdown-date mode. The time is only
// shown when the user explicitly set one, so the common date-only case stays
// as terse as it was before.
export function formatCountdownLabel(date, hasTime = false) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!hasTime) return `UNTIL ${day}`.toUpperCase();
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `UNTIL ${day}, ${time}`.toUpperCase();
}

// Reads a millisecond timestamp out of localStorage.
// parseInt alone is not enough: a value like '1e20' parses to a finite number
// that Date cannot represent, yielding an Invalid Date that only blows up later
// (toISOString throws, which used to take the whole settings panel down).
export function parseStoredDate(raw) {
  if (raw == null) return null;
  const str = String(raw).trim();
  // Must be an integer end to end. parseInt would happily read '1e20' as 1 and
  // '12abc' as 12, silently turning corrupted storage into a plausible date.
  // The leading '-' matters: any date of birth before 1970 is negative.
  if (!/^-?\d+$/.test(str)) return null;
  const ms = Number(str);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return isNaN(date) ? null : date;
}

// Explains why a date of birth cannot be saved, or returns null if it can.
// The Save button used to bail out silently on a bad value, which read as a
// button that does nothing.
export function dobError(dob, now = new Date()) {
  if (!(dob instanceof Date) || isNaN(dob)) return 'Pick your date of birth first.';
  if (dob > now) return "Date of birth can't be in the future.";
  return null;
}

// Migrates a pre-1.5.0 date of birth.
// Those builds stored the DOB as UTC midnight of the picked calendar day
// (`input.valueAsDate` / `new Date('YYYY-MM-DD')`), which sits hours away from
// the local midnight the user meant — the same off-by-one fixed for countdown
// targets in 1.4.1. Re-anchors to local midnight of that same calendar day.
// Returns null if the stored value is unusable.
export function normalizeLegacyDob(timestamp) {
  const utc = new Date(timestamp);
  if (isNaN(utc)) return null;
  // Already sitting on a local midnight, so either it has been migrated or the
  // reader is in UTC and there was nothing to migrate. Returning it unchanged
  // keeps this safe to apply twice: otherwise a second pass would read the
  // UTC components of a local midnight and walk the date back a day.
  if (utc.getHours() === 0 && utc.getMinutes() === 0
      && utc.getSeconds() === 0 && utc.getMilliseconds() === 0) {
    return utc.getTime();
  }
  const year = utc.getUTCFullYear();
  const local = new Date(year, utc.getUTCMonth(), utc.getUTCDate());
  // Years below 100 would be remapped into the 1900s by the Date constructor.
  local.setFullYear(year);
  return isNaN(local) ? null : local.getTime();
}

// Bumps the lifetime "tabs opened" counter by one and returns the new total.
// Called once per dashboard load (each new tab instantiates a fresh App).
export function incrementTabCount(storage) {
  const prev = parseInt(storage.getItem('tabsOpened'), 10);
  const next = (Number.isFinite(prev) && prev >= 0 ? prev : 0) + 1;
  storage.setItem('tabsOpened', String(next));
  return next;
}

export class TemplateEngine {
  static compile(template) {
    return (data = {}) => template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] ?? '');
  }
}

export class App {
  constructor(element) {
    this.element = element;
    this.rafId = null;
    this.dob = null;
    this.yearEl = null;
    this.msEl = null;
    this.showQuote = true;
    this.showSearch = true;
    this.searchEngine = DEFAULT_ENGINE;
    this.searchNewTab = false;
    this.showUpdateTips = true;
    this.mode = 'age'; // 'age' | 'countdown-year' | 'countdown-date'
    this.countdownDate = null; // Date object for countdown-date mode
    this.countdownHasTime = false; // whether the user set a time of day on it
    this.dobHasTime = false; // whether the user set a time of birth
    this.counterSize = 'medium'; // 'small' | 'medium' | 'large'
    this.themeMode = 'auto'; // 'auto' | 'light' | 'dark'
    this.lightVariant = 'classic'; // 'classic' | 'warm' | 'mist'
    this.darkVariant = 'classic'; // 'classic' | 'midnight' | 'graphite'
    this.font = 'sans'; // 'sans' | 'serif' | 'mono'
    this.darkMql = null;
    this.darkMqlHandler = null;
    this.tabsOpened = 0;

    this.load();
    this.loadConfig();

    if (typeof localStorage !== 'undefined') {
      this.tabsOpened = incrementTabCount(localStorage);
    }
    this.element.addEventListener('submit', this.handleSubmit.bind(this));

    this.renderCounterOrChoose();

    this.setupSettings();
    this.maybeShowWhatsNew();
  }

  getExtensionVersion() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        return chrome.runtime.getManifest().version;
      }
    } catch {}
    return null;
  }

  maybeShowWhatsNew() {
    if (typeof document === 'undefined') return;
    const current = this.getExtensionVersion();
    if (!current) return;
    const seen = localStorage.getItem('lastSeenVersion');

    // First-time install: silently mark current version, do not show tip.
    if (isFirstInstall(seen)) {
      localStorage.setItem('lastSeenVersion', current);
      return;
    }

    if (!this.showUpdateTips) return;

    const entry = getWhatsNew(current, seen);
    if (!entry) return;

    this.showTooltip(entry);
    localStorage.setItem('lastSeenVersion', current);
  }

  showTooltip({ title, body }) {
    const el = document.getElementById('whats-new');
    const titleEl = document.getElementById('whats-new-title');
    const bodyEl = document.getElementById('whats-new-body');
    const closeBtn = document.getElementById('whats-new-close');
    if (!el || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.textContent = body;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('whats-new--visible'));

    const dismiss = () => {
      el.classList.remove('whats-new--visible');
      clearTimeout(autoHide);
      setTimeout(() => { el.hidden = true; }, 200);
    };
    closeBtn?.addEventListener('click', dismiss, { once: true });
    const autoHide = setTimeout(dismiss, 5000);
  }

  // True when there is something to count. Countdown modes stand on their own:
  // requiring a date of birth for them used to trap anyone who only wanted a
  // countdown behind the "When were you born?" form on every new tab.
  hasCounter() {
    if (this.mode === 'countdown-year') return true;
    if (this.mode === 'countdown-date') return Boolean(this.countdownDate);
    return Boolean(this.dob);
  }

  renderCounterOrChoose() {
    if (this.hasCounter()) {
      this.renderAgeLoop();
    } else {
      this.renderChoose();
    }
  }

  load() {
    const stored = parseStoredDate(localStorage.getItem('dob'));
    if (!stored) return;

    // A missing 'dobHasTime' key means the DOB predates 1.5.0 and is stored at
    // UTC midnight. Re-anchor it to local midnight once; the key doubles as the
    // migration marker so this runs exactly once per profile.
    if (localStorage.getItem('dobHasTime') === null) {
      const normalized = normalizeLegacyDob(stored.getTime());
      this.dob = normalized === null ? stored : new Date(normalized);
      this.dobHasTime = false;
      this.save();
      return;
    }

    this.dob = stored;
    this.dobHasTime = localStorage.getItem('dobHasTime') === '1';
  }

  loadConfig() {
    this.showQuote = localStorage.getItem('showQuote') !== '0';
    this.showSearch = localStorage.getItem('showSearch') === '1';
    const storedEngine = localStorage.getItem('searchEngine');
    this.searchEngine = SEARCH_ENGINES[storedEngine] ? storedEngine : DEFAULT_ENGINE;
    this.searchNewTab = localStorage.getItem('searchNewTab') === '1';
    this.showUpdateTips = localStorage.getItem('showUpdateTips') !== '0';
    const storedMode = localStorage.getItem('mode');
    this.mode = ['age', 'countdown-year', 'countdown-date'].includes(storedMode) ? storedMode : 'age';
    const storedSize = localStorage.getItem('counterSize');
    this.counterSize = ['small', 'medium', 'large'].includes(storedSize) ? storedSize : 'medium';
    this.themeMode = localStorage.getItem('themeMode') || 'auto';
    this.lightVariant = localStorage.getItem('lightVariant') || 'classic';
    this.darkVariant = localStorage.getItem('darkVariant') || 'classic';
    this.font = localStorage.getItem('font') || 'sans';
    this.applyCounterSize();
    this.applyTheme();
    this.applyFont();
    this.countdownDate = parseStoredDate(localStorage.getItem('countdownDate'));
    this.countdownHasTime = this.countdownDate !== null
      && localStorage.getItem('countdownHasTime') === '1';

    // Repairs a combination older builds could persist: countdown-date selected
    // with no target stored, which rendered an age counter under a countdown
    // mode — or, for someone without a date of birth, no counter at all.
    if (this.mode === 'countdown-date' && !this.countdownDate) {
      this.mode = 'age';
    }
  }

  saveConfig() {
    localStorage.setItem('showQuote', this.showQuote ? '1' : '0');
    localStorage.setItem('showSearch', this.showSearch ? '1' : '0');
    localStorage.setItem('searchEngine', this.searchEngine);
    localStorage.setItem('searchNewTab', this.searchNewTab ? '1' : '0');
    localStorage.setItem('showUpdateTips', this.showUpdateTips ? '1' : '0');
    localStorage.setItem('mode', this.mode);
    localStorage.setItem('counterSize', this.counterSize);
    localStorage.setItem('themeMode', this.themeMode);
    localStorage.setItem('lightVariant', this.lightVariant);
    localStorage.setItem('darkVariant', this.darkVariant);
    localStorage.setItem('font', this.font);
    if (this.countdownDate) {
      localStorage.setItem('countdownDate', this.countdownDate.getTime().toString());
      localStorage.setItem('countdownHasTime', this.countdownHasTime ? '1' : '0');
    } else {
      localStorage.removeItem('countdownDate');
      localStorage.removeItem('countdownHasTime');
    }
  }

  save() {
    if (this.dob) {
      localStorage.setItem('dob', this.dob.getTime().toString());
      localStorage.setItem('dobHasTime', this.dobHasTime ? '1' : '0');
    }
  }

  handleSubmit(event) {
    event.preventDefault();

    const input = this.element.querySelector('input[type="date"]');
    // Parsed from the string rather than read via valueAsDate: the latter
    // returns UTC midnight, a different instant from the local midnight the
    // user picked, which skews the age by the timezone offset.
    const dob = parseLocalDate(input?.value);
    if (!dob) return;

    this.dob = dob;
    this.dobHasTime = false;
    this.save();
    this.renderAgeLoop();
  }

  renderChoose() {
    this.element.innerHTML = this.getTemplate('dob')();
    const input = this.element.querySelector('input[type="date"]');
    if (input) {
      input.max = formatLocalDate(new Date());
    }
  }

  getLabel() {
    if (this.mode === 'countdown-year') {
      return `UNTIL DEC 31, ${new Date().getFullYear()}`;
    }
    if (this.mode === 'countdown-date' && this.countdownDate) {
      return formatCountdownLabel(this.countdownDate, this.countdownHasTime);
    }
    return 'AGE';
  }

  renderAgeLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.element.innerHTML = this.getTemplate('age')({ label: this.getLabel(), year: '', milliseconds: '' });
    this.yearEl = this.element.querySelector('.year');
    this.msEl = this.element.querySelector('.milliseconds');

    if (this.showSearch) {
      this.renderSearch();
    }

    if (this.showQuote) {
      this.renderQuote();
    }

    this.updateSettingsUI();

    const tick = () => {
      let result;
      if (this.mode === 'countdown-year') {
        result = calculateCountdown(endOfYear());
      } else if (this.mode === 'countdown-date' && this.countdownDate) {
        result = calculateCountdown(this.countdownDate);
      } else if (this.dob) {
        result = calculateAge(this.dob);
      } else {
        result = { yearPart: '0', decimalPart: '000000000' };
      }
      if (this.yearEl) this.yearEl.textContent = result.yearPart;
      if (this.msEl) this.msEl.textContent = result.decimalPart;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  renderSearch() {
    const engine = SEARCH_ENGINES[this.searchEngine] || SEARCH_ENGINES[DEFAULT_ENGINE];
    const html = this.getTemplate('search')({ engineName: engine.name });
    this.element.insertAdjacentHTML('beforeend', html);
    const form = this.element.querySelector('.web-search');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.web-search-input');
      const url = buildSearchUrl(this.searchEngine, input?.value);
      if (!url) return;
      if (this.searchNewTab) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(url);
      }
    });
  }

  refreshSearch() {
    const existing = this.element.querySelector('.web-search');
    if (existing) existing.remove();
    if (this.showSearch && this.hasCounter()) {
      const quote = this.element.querySelector('.daily-quote');
      this.renderSearch();
      if (quote) this.element.appendChild(quote);
    }
  }

  renderQuote() {
    const quote = getQuoteOfTheDay(QUOTES);
    const yearStr = quote.year ? `, ${quote.year}` : '';
    const html = this.getTemplate('quote')({
      text: quote.text,
      author: quote.author,
      year: yearStr,
    });
    this.element.insertAdjacentHTML('beforeend', html);
  }

  applyCounterSize() {
    document.body.classList.remove('size-small', 'size-medium', 'size-large');
    document.body.classList.add(`size-${this.counterSize}`);
  }

  resolveScheme() {
    if (this.themeMode === 'light' || this.themeMode === 'dark') return this.themeMode;
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme() {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const themeClasses = [
      'theme-light-classic', 'theme-light-warm', 'theme-light-mist',
      'theme-dark-classic', 'theme-dark-midnight', 'theme-dark-graphite',
    ];
    body.classList.remove(...themeClasses);
    const scheme = this.resolveScheme();
    const variant = scheme === 'dark' ? this.darkVariant : this.lightVariant;
    body.classList.add(`theme-${scheme}-${variant}`);

    if (typeof window !== 'undefined' && window.matchMedia) {
      if (this.darkMql && this.darkMqlHandler) {
        this.darkMql.removeEventListener('change', this.darkMqlHandler);
      }
      if (this.themeMode === 'auto') {
        this.darkMql = window.matchMedia('(prefers-color-scheme: dark)');
        this.darkMqlHandler = () => this.applyTheme();
        this.darkMql.addEventListener('change', this.darkMqlHandler);
      } else {
        this.darkMql = null;
        this.darkMqlHandler = null;
      }
    }
  }

  applyFont() {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('font-sans', 'font-serif', 'font-mono');
    document.body.classList.add(`font-${this.font}`);
  }

  updateSettingsUI() {
    const checkbox = document.getElementById('settings-quote-toggle');
    if (checkbox) checkbox.checked = this.showQuote;

    const searchToggle = document.getElementById('settings-search-toggle');
    if (searchToggle) searchToggle.checked = this.showSearch;
    const engineSelect = document.getElementById('settings-search-engine');
    if (engineSelect) engineSelect.value = this.searchEngine;
    const newTabToggle = document.getElementById('settings-search-newtab');
    if (newTabToggle) newTabToggle.checked = this.searchNewTab;
    document.querySelectorAll('.settings-search-options').forEach(el => {
      el.hidden = !this.showSearch;
    });

    const updateTipsToggle = document.getElementById('settings-updatetips-toggle');
    if (updateTipsToggle) updateTipsToggle.checked = this.showUpdateTips;

    const radios = document.querySelectorAll('input[name="mode"]');
    radios.forEach(r => { r.checked = r.value === this.mode; });

    this.syncCountdownRow(this.mode);

    const cdDate = document.getElementById('settings-countdown-date');
    if (cdDate && this.countdownDate) cdDate.value = formatLocalDate(this.countdownDate);
    const cdTimeToggle = document.getElementById('settings-countdown-time-toggle');
    if (cdTimeToggle) cdTimeToggle.checked = this.countdownHasTime;
    const cdTime = document.getElementById('settings-countdown-time');
    if (cdTime && this.countdownDate && this.countdownHasTime) {
      cdTime.value = formatLocalTime(this.countdownDate);
    }
    this.syncTimeRow('settings-countdown-time-row', this.countdownHasTime);

    const dobTimeToggle = document.getElementById('settings-dob-time-toggle');
    if (dobTimeToggle) dobTimeToggle.checked = this.dobHasTime;
    const dobTime = document.getElementById('settings-dob-time');
    if (dobTime && this.dob && this.dobHasTime) {
      dobTime.value = formatLocalTime(this.dob);
    }
    this.syncTimeRow('settings-dob-time-row', this.dobHasTime);

    document.querySelectorAll('[data-theme-mode]').forEach(btn => {
      btn.classList.toggle('size-option--active', btn.dataset.themeMode === this.themeMode);
    });
    document.querySelectorAll('[data-light-variant]').forEach(btn => {
      btn.classList.toggle('swatch--active', btn.dataset.lightVariant === this.lightVariant);
    });
    document.querySelectorAll('[data-dark-variant]').forEach(btn => {
      btn.classList.toggle('swatch--active', btn.dataset.darkVariant === this.darkVariant);
    });
    document.querySelectorAll('[data-font]').forEach(btn => {
      btn.classList.toggle('font-option--active', btn.dataset.font === this.font);
    });

    const tabCountEl = document.getElementById('settings-tabcount-value');
    if (tabCountEl) tabCountEl.textContent = this.tabsOpened.toLocaleString();
  }

  // The countdown target inputs only make sense while "Until date" is picked.
  // Driven by the selected radio rather than this.mode, because the radio can
  // legitimately be ahead of the committed mode while a target is being chosen.
  syncCountdownRow(selectedMode) {
    const row = document.getElementById('settings-countdown-options');
    if (row) row.hidden = selectedMode !== 'countdown-date';
  }

  syncTimeRow(rowId, visible) {
    const row = document.getElementById(rowId);
    if (row) row.hidden = !visible;
  }

  setupSettings() {
    const btn = document.getElementById('settings-btn');
    const overlay = document.getElementById('settings-overlay');
    const closeBtn = document.getElementById('settings-close');
    const doneBtn = document.getElementById('settings-done');
    const saveBtn = document.getElementById('settings-save');
    const dobInput = document.getElementById('settings-dob');
    const dobTimeInput = document.getElementById('settings-dob-time');
    const dobTimeToggle = document.getElementById('settings-dob-time-toggle');
    const dobErrorEl = document.getElementById('settings-dob-error');
    const quoteCheckbox = document.getElementById('settings-quote-toggle');
    const cdInput = document.getElementById('settings-countdown-date');
    const cdTimeInput = document.getElementById('settings-countdown-time');
    const cdTimeToggle = document.getElementById('settings-countdown-time-toggle');
    const sizeOptions = document.querySelectorAll('.size-option[data-size]');

    if (!btn || !overlay) return;

    // Populate current dob. Bounds are local calendar days: deriving them from
    // toISOString() put "today" out of reach in far-eastern timezones.
    const today = formatLocalDate(new Date());
    if (dobInput && this.dob) {
      dobInput.value = formatLocalDate(this.dob);
    }
    if (dobInput) {
      dobInput.max = today;
    }
    if (cdInput) {
      cdInput.min = today;
    }
    this.updateSettingsUI();

    const setDobError = (message) => {
      if (dobErrorEl) {
        dobErrorEl.textContent = message || '';
        dobErrorEl.hidden = !message;
      }
      if (message) dobInput?.setAttribute('aria-invalid', 'true');
      else dobInput?.removeAttribute('aria-invalid');
    };

    btn.addEventListener('click', () => {
      // Re-sync on open so a half-finished selection from last time (e.g. the
      // "Until date" radio clicked but no target picked) does not linger.
      this.updateSettingsUI();
      // Likewise a date or time of birth typed but never saved: the "Set time"
      // switch is reset to the saved state, so the fields have to match it.
      if (dobInput) dobInput.value = this.dob ? formatLocalDate(this.dob) : '';
      if (dobTimeInput) {
        dobTimeInput.value = this.dob && this.dobHasTime ? formatLocalTime(this.dob) : '';
      }
      setDobError(null);
      overlay.hidden = false;
    });

    const closePanel = () => { overlay.hidden = true; };
    closeBtn?.addEventListener('click', closePanel);
    doneBtn?.addEventListener('click', closePanel);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) closePanel();
    });

    // DOB save — date and optional time commit together, on the Save button.
    saveBtn?.addEventListener('click', () => {
      const wantsTime = Boolean(dobTimeToggle?.checked && dobTimeInput?.value);
      const newDob = parseLocalDateTime(dobInput?.value, wantsTime ? dobTimeInput.value : '');
      const error = dobError(newDob);
      if (error) {
        setDobError(error);
        dobInput?.focus();
        return;
      }
      setDobError(null);
      this.dob = newDob;
      this.dobHasTime = wantsTime;
      this.save();
      closePanel();
      this.renderCounterOrChoose();
    });

    dobInput?.addEventListener('input', () => setDobError(null));
    dobTimeInput?.addEventListener('input', () => setDobError(null));

    dobTimeToggle?.addEventListener('change', () => {
      this.syncTimeRow('settings-dob-time-row', dobTimeToggle.checked);
      if (dobTimeToggle.checked && dobTimeInput && !dobTimeInput.value) {
        dobTimeInput.value = formatLocalTime(this.dob) || '00:00';
      }
    });

    // Search toggle / engine / target
    const searchToggle = document.getElementById('settings-search-toggle');
    const engineSelect = document.getElementById('settings-search-engine');
    const newTabToggle = document.getElementById('settings-search-newtab');

    searchToggle?.addEventListener('change', () => {
      this.showSearch = searchToggle.checked;
      this.saveConfig();
      this.refreshSearch();
      this.updateSettingsUI();
    });

    engineSelect?.addEventListener('change', () => {
      this.searchEngine = SEARCH_ENGINES[engineSelect.value] ? engineSelect.value : DEFAULT_ENGINE;
      this.saveConfig();
      this.refreshSearch();
    });

    newTabToggle?.addEventListener('change', () => {
      this.searchNewTab = newTabToggle.checked;
      this.saveConfig();
    });

    const updateTipsToggle = document.getElementById('settings-updatetips-toggle');
    updateTipsToggle?.addEventListener('change', () => {
      this.showUpdateTips = updateTipsToggle.checked;
      this.saveConfig();
    });

    // Quote toggle
    quoteCheckbox?.addEventListener('change', () => {
      this.showQuote = quoteCheckbox.checked;
      this.saveConfig();
      const existing = this.element.querySelector('.daily-quote');
      if (this.showQuote && !existing && this.hasCounter()) {
        this.renderQuote();
      } else if (!this.showQuote && existing) {
        existing.remove();
      }
    });

    // Reads the countdown target out of its inputs into state. Returns false
    // when there is nothing usable yet, leaving state untouched.
    const readCountdownTarget = () => {
      const wantsTime = Boolean(cdTimeToggle?.checked && cdTimeInput?.value);
      const target = parseLocalDateTime(cdInput?.value, wantsTime ? cdTimeInput.value : '');
      if (!target) return false;
      this.countdownDate = target;
      this.countdownHasTime = wantsTime;
      return true;
    };

    // Mode radio buttons
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const selected = radio.value;
        this.syncCountdownRow(selected);

        // "Until date" cannot be applied without a target. Nothing is committed
        // until there is one: assigning this.mode before this check meant the
        // next saveConfig() persisted a countdown mode with no date behind it.
        if (selected === 'countdown-date' && !readCountdownTarget()) {
          cdInput?.focus();
          try { cdInput?.showPicker?.(); } catch {}
          return;
        }

        this.mode = selected;
        this.saveConfig();
        this.renderCounterOrChoose();
      });
    });

    // Counter size buttons
    const updateSizeButtons = () => {
      sizeOptions.forEach(btn => {
        btn.classList.toggle('size-option--active', btn.dataset.size === this.counterSize);
      });
    };
    updateSizeButtons();

    sizeOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        this.counterSize = btn.dataset.size;
        this.saveConfig();
        this.applyCounterSize();
        updateSizeButtons();
      });
    });

    // Tabs (Counter / Appearance)
    const activeTab = localStorage.getItem('settingsTab') || 'counter';
    const setActiveTab = (name) => {
      document.querySelectorAll('[data-tab]').forEach(btn => {
        const active = btn.dataset.tab === name;
        btn.classList.toggle('settings-tab--active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('[data-tab-panel]').forEach(panel => {
        panel.classList.toggle('settings-tab-panel--active', panel.dataset.tabPanel === name);
      });
      // The panels share one scroll box, so a position left over from the
      // other tab would open this one halfway down.
      const scroller = document.querySelector('.settings-tab-panels');
      if (scroller) scroller.scrollTop = 0;
      localStorage.setItem('settingsTab', name);
    };
    setActiveTab(activeTab);
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    // Theme mode (Auto / Light / Dark)
    document.querySelectorAll('[data-theme-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.themeMode = btn.dataset.themeMode;
        this.saveConfig();
        this.applyTheme();
        this.updateSettingsUI();
      });
    });

    // Light variant
    document.querySelectorAll('[data-light-variant]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.lightVariant = btn.dataset.lightVariant;
        this.saveConfig();
        this.applyTheme();
        this.updateSettingsUI();
      });
    });

    // Dark variant
    document.querySelectorAll('[data-dark-variant]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.darkVariant = btn.dataset.darkVariant;
        this.saveConfig();
        this.applyTheme();
        this.updateSettingsUI();
      });
    });

    // Font preset
    document.querySelectorAll('[data-font]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.font = btn.dataset.font;
        this.saveConfig();
        this.applyFont();
        this.updateSettingsUI();
      });
    });

    // Countdown target inputs apply as soon as they hold something valid.
    // Picking a date is also what promotes the mode when "Until date" was
    // selected but had nothing to count down to yet.
    const applyCountdownTarget = () => {
      if (!readCountdownTarget()) return;
      const dateRadio = document.querySelector('input[name="mode"][value="countdown-date"]');
      if (dateRadio?.checked) this.mode = 'countdown-date';
      this.saveConfig();
      if (this.mode === 'countdown-date') this.renderAgeLoop();
    };

    cdInput?.addEventListener('change', applyCountdownTarget);
    cdTimeInput?.addEventListener('change', applyCountdownTarget);

    cdTimeToggle?.addEventListener('change', () => {
      this.syncTimeRow('settings-countdown-time-row', cdTimeToggle.checked);
      // Seed the field so switching the toggle on shows a concrete value
      // instead of an empty picker.
      if (cdTimeToggle.checked && cdTimeInput && !cdTimeInput.value) {
        cdTimeInput.value = formatLocalTime(this.countdownDate) || '00:00';
      }
      applyCountdownTarget();
    });
  }

  getTemplate(name) {
    const templateElement = document.getElementById(`${name}-template`);
    return TemplateEngine.compile(templateElement.innerHTML);
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

// Self-initialize in browser (module scripts are deferred, DOM is ready)
if (typeof document !== 'undefined') {
  const appElement = document.getElementById('app');
  if (appElement) new App(appElement);
}
