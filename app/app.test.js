import { describe, it, expect } from 'vitest';
import { calculateAge, calculateCountdown, endOfYear, incrementTabCount, TemplateEngine, MILLISECONDS_PER_YEAR, parseLocalDate, formatLocalDate, parseLocalTime, parseLocalDateTime, formatLocalTime, formatCountdownLabel, normalizeLegacyDob, parseStoredDate, dobError } from './app.js';
import { hashDay, getQuoteOfTheDay } from './daily-quote.js';
import { SEARCH_ENGINES, DEFAULT_ENGINE, buildSearchUrl } from './search-engines.js';
import { getWhatsNew, isFirstInstall, WHATS_NEW } from './whats-new.js';
import { CHANGELOG, RELEASES_URL, recentReleases } from './changelog.js';
import { readFileSync } from 'node:fs';

describe('MILLISECONDS_PER_YEAR', () => {
  it('equals 365.2425 days in milliseconds (Gregorian year)', () => {
    expect(MILLISECONDS_PER_YEAR).toBe(365.2425 * 24 * 60 * 60 * 1000);
  });

  it('is approximately 31.5 million seconds', () => {
    expect(MILLISECONDS_PER_YEAR / 1000).toBeCloseTo(31_556_952, 0);
  });
});

describe('calculateAge', () => {
  it('returns correct integer year for a round anniversary', () => {
    const dob = new Date('2000-01-01T00:00:00Z');
    // Exactly 25 Gregorian years later
    const now = new Date(dob.getTime() + 25 * MILLISECONDS_PER_YEAR);
    const { yearPart } = calculateAge(dob, now);
    expect(yearPart).toBe('25');
  });

  it('returns decimal part with exactly 9 digits', () => {
    const dob = new Date('1990-06-15T00:00:00Z');
    const now = new Date('2025-03-20T12:30:00Z');
    const { decimalPart } = calculateAge(dob, now);
    expect(decimalPart).toHaveLength(9);
  });

  it('yearPart is a string of integer digits', () => {
    const dob = new Date('1985-01-01T00:00:00Z');
    const now = new Date('2025-01-01T00:00:00Z');
    const { yearPart } = calculateAge(dob, now);
    expect(yearPart).toMatch(/^\d+$/);
    expect(parseInt(yearPart, 10)).toBeGreaterThanOrEqual(39);
  });

  it('uses current time when now is not provided', () => {
    const dob = new Date('2000-01-01T00:00:00Z');
    const { yearPart } = calculateAge(dob);
    expect(parseInt(yearPart, 10)).toBeGreaterThan(20);
  });

  it('handles a dob of today resulting in near-zero age', () => {
    const now = new Date();
    const dob = new Date(now.getTime() - 1000); // 1 second ago
    const { yearPart } = calculateAge(dob, now);
    expect(yearPart).toBe('0');
  });
});

describe('TemplateEngine', () => {
  it('replaces a single variable', () => {
    const fn = TemplateEngine.compile('Hello, {{name}}!');
    expect(fn({ name: 'world' })).toBe('Hello, world!');
  });

  it('replaces multiple variables', () => {
    const fn = TemplateEngine.compile('{{year}}.{{milliseconds}}');
    expect(fn({ year: '25', milliseconds: '123456789' })).toBe('25.123456789');
  });

  it('leaves unmatched variables as empty string', () => {
    const fn = TemplateEngine.compile('{{missing}}');
    expect(fn({})).toBe('');
  });

  it('handles empty data object', () => {
    const fn = TemplateEngine.compile('{{a}} {{b}}');
    expect(fn()).toBe(' ');
  });

  it('does not replace non-template text', () => {
    const fn = TemplateEngine.compile('no variables here');
    expect(fn({})).toBe('no variables here');
  });

  it('ignores variables with dots or special chars (only word chars matched)', () => {
    const fn = TemplateEngine.compile('{{a.b}}');
    expect(fn({ 'a.b': 'x' })).toBe('{{a.b}}');
  });
});

describe('calculateCountdown', () => {
  it('returns time remaining as years with 9 decimal digits', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const target = new Date('2027-01-01T00:00:00Z');
    const { yearPart, decimalPart } = calculateCountdown(target, now);
    expect(parseInt(yearPart, 10)).toBe(0);
    expect(decimalPart).toHaveLength(9);
  });

  it('returns zero when target is in the past', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const target = new Date('2025-01-01T00:00:00Z');
    const { yearPart, decimalPart } = calculateCountdown(target, now);
    expect(yearPart).toBe('0');
    expect(decimalPart).toBe('000000000');
  });
});

describe('endOfYear', () => {
  it('returns Dec 31 of the current year', () => {
    const now = new Date('2026-04-14T10:00:00');
    const eoy = endOfYear(now);
    expect(eoy.getFullYear()).toBe(2026);
    expect(eoy.getMonth()).toBe(11);
    expect(eoy.getDate()).toBe(31);
  });

  it('is always in the future relative to a mid-year date', () => {
    const now = new Date('2026-06-15T00:00:00');
    expect(endOfYear(now) > now).toBe(true);
  });
});

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD to a Date at LOCAL midnight', () => {
    const d = parseLocalDate('2030-01-01');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2030);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('keeps the local calendar day regardless of timezone (no UTC shift)', () => {
    // new Date('2030-12-31') would be UTC midnight; in negative-UTC zones its
    // local getDate() rolls back to the 30th. parseLocalDate must stay on the 31st.
    const d = parseLocalDate('2030-12-31');
    expect(d.getFullYear()).toBe(2030);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(31);
  });

  it('returns null for malformed or non-string input', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('not-a-date')).toBeNull();
    expect(parseLocalDate('2030/01/01')).toBeNull();
    expect(parseLocalDate('2030-1-1')).toBeNull();
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate(20300101)).toBeNull();
  });

  it('returns null for an impossible calendar date', () => {
    expect(parseLocalDate('2030-02-31')).toBeNull();
  });
});

describe('formatLocalDate', () => {
  it('formats a local-midnight Date back to YYYY-MM-DD without UTC shift', () => {
    const d = new Date(2030, 11, 31); // local Dec 31
    expect(formatLocalDate(d)).toBe('2030-12-31');
  });

  it('round-trips with parseLocalDate', () => {
    for (const s of ['2030-01-01', '2026-12-31', '1999-06-15']) {
      expect(formatLocalDate(parseLocalDate(s))).toBe(s);
    }
  });

  it('returns empty string for invalid input', () => {
    expect(formatLocalDate(new Date('invalid'))).toBe('');
    expect(formatLocalDate('2030-01-01')).toBe('');
    expect(formatLocalDate(null)).toBe('');
  });
});

describe('parseLocalTime', () => {
  it('parses HH:MM', () => {
    expect(parseLocalTime('18:30')).toEqual({ hours: 18, minutes: 30 });
    expect(parseLocalTime('00:00')).toEqual({ hours: 0, minutes: 0 });
    expect(parseLocalTime('23:59')).toEqual({ hours: 23, minutes: 59 });
  });

  it('accepts the HH:MM:SS form some browsers emit, ignoring seconds', () => {
    expect(parseLocalTime('18:30:45')).toEqual({ hours: 18, minutes: 30 });
  });

  it('returns null for out-of-range values', () => {
    expect(parseLocalTime('24:00')).toBeNull();
    expect(parseLocalTime('12:60')).toBeNull();
  });

  it('returns null for malformed or non-string input', () => {
    expect(parseLocalTime('')).toBeNull();
    expect(parseLocalTime('6:30')).toBeNull();
    expect(parseLocalTime('18-30')).toBeNull();
    expect(parseLocalTime(null)).toBeNull();
    expect(parseLocalTime(1830)).toBeNull();
  });
});

describe('parseLocalDateTime', () => {
  it('combines date and time into a LOCAL Date', () => {
    const d = parseLocalDateTime('2030-06-05', '18:30');
    expect(d.getFullYear()).toBe(2030);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('falls back to local midnight when time is omitted or blank', () => {
    for (const t of [undefined, null, '']) {
      const d = parseLocalDateTime('2030-06-05', t);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getDate()).toBe(5);
    }
  });

  it('returns null when the date is invalid, whatever the time', () => {
    expect(parseLocalDateTime('2030-02-31', '10:00')).toBeNull();
    expect(parseLocalDateTime('nope', '10:00')).toBeNull();
  });

  it('returns null when a time is supplied but malformed', () => {
    expect(parseLocalDateTime('2030-06-05', '25:00')).toBeNull();
    expect(parseLocalDateTime('2030-06-05', 'noon')).toBeNull();
  });

  it('does not shift the calendar day in any timezone', () => {
    // The 1.4.1 regression: new Date('2030-12-31T23:30') style parsing could
    // land on Jan 1 in positive-UTC zones. Component construction cannot.
    const d = parseLocalDateTime('2030-12-31', '23:30');
    expect(d.getDate()).toBe(31);
    expect(d.getMonth()).toBe(11);
  });
});

describe('formatLocalTime', () => {
  it('formats local hours and minutes zero-padded', () => {
    expect(formatLocalTime(new Date(2030, 5, 5, 9, 5))).toBe('09:05');
    expect(formatLocalTime(new Date(2030, 5, 5, 18, 30))).toBe('18:30');
    expect(formatLocalTime(new Date(2030, 5, 5, 0, 0))).toBe('00:00');
  });

  it('round-trips with parseLocalDateTime', () => {
    for (const t of ['00:00', '09:05', '18:30', '23:59']) {
      expect(formatLocalTime(parseLocalDateTime('2030-06-05', t))).toBe(t);
    }
  });

  it('returns empty string for invalid input', () => {
    expect(formatLocalTime(new Date('invalid'))).toBe('');
    expect(formatLocalTime(null)).toBe('');
    expect(formatLocalTime('2030-06-05')).toBe('');
  });
});

describe('formatCountdownLabel', () => {
  it('renders date only when no time is set', () => {
    const label = formatCountdownLabel(new Date(2030, 5, 5, 0, 0), false);
    expect(label).toBe('UNTIL JUN 5, 2030');
  });

  it('appends the time when one is set', () => {
    const label = formatCountdownLabel(new Date(2030, 5, 5, 18, 30), true);
    // Intl may separate AM/PM with a narrow no-break space, so match loosely.
    expect(label).toMatch(/^UNTIL JUN 5, 2030, 6:30\sPM$/);
  });

  it('renders midnight as 12:00 AM rather than hiding it', () => {
    const label = formatCountdownLabel(new Date(2030, 5, 5, 0, 0), true);
    expect(label).toMatch(/^UNTIL JUN 5, 2030, 12:00\sAM$/);
  });

  it('defaults to the date-only form', () => {
    expect(formatCountdownLabel(new Date(2030, 5, 5, 18, 30))).toBe('UNTIL JUN 5, 2030');
  });

  it('returns empty string for invalid input', () => {
    expect(formatCountdownLabel(new Date('invalid'), true)).toBe('');
    expect(formatCountdownLabel(null, false)).toBe('');
  });
});

describe('normalizeLegacyDob', () => {
  it('re-anchors a UTC-midnight timestamp to local midnight of the same day', () => {
    // How every pre-1.5.0 build stored a DOB of 1990-06-15.
    const legacy = Date.parse('1990-06-15T00:00:00Z');
    const normalized = new Date(normalizeLegacyDob(legacy));
    expect(normalized.getFullYear()).toBe(1990);
    expect(normalized.getMonth()).toBe(5);
    expect(normalized.getDate()).toBe(15);
    expect(normalized.getHours()).toBe(0);
    expect(normalized.getMinutes()).toBe(0);
  });

  it('agrees with what parseLocalDate would produce for the same day', () => {
    for (const day of ['1990-06-15', '2000-01-01', '1975-12-31']) {
      const legacy = Date.parse(`${day}T00:00:00Z`);
      expect(normalizeLegacyDob(legacy)).toBe(parseLocalDate(day).getTime());
    }
  });

  it('is idempotent — a second pass must not walk the date back a day', () => {
    // The migration is guarded by a storage key, but the function has to be
    // safe on its own: reading the UTC components of an already-local midnight
    // would land on the previous day in every positive-UTC timezone.
    for (const day of ['1990-06-15', '2000-01-01', '1955-03-14']) {
      const once = normalizeLegacyDob(Date.parse(`${day}T00:00:00Z`));
      expect(normalizeLegacyDob(once)).toBe(once);
      expect(normalizeLegacyDob(normalizeLegacyDob(once))).toBe(once);
    }
  });

  it('returns null for an unusable timestamp', () => {
    expect(normalizeLegacyDob(NaN)).toBeNull();
    expect(normalizeLegacyDob(1e20)).toBeNull();
  });
});

describe('dobError', () => {
  const now = new Date(2026, 9, 6, 15, 0);

  it('accepts a date of birth in the past', () => {
    expect(dobError(new Date(1990, 4, 15), now)).toBeNull();
  });

  it('accepts a time of birth earlier today', () => {
    expect(dobError(new Date(2026, 9, 6, 9, 30), now)).toBeNull();
  });

  it('asks for a date when there is none', () => {
    expect(dobError(null, now)).toMatch(/date of birth/i);
  });

  it('asks for a date when the value is an Invalid Date', () => {
    expect(dobError(new Date(NaN), now)).toMatch(/date of birth/i);
  });

  it('rejects a date in the future', () => {
    expect(dobError(new Date(2030, 0, 1), now)).toMatch(/future/i);
  });

  it('rejects a time later today', () => {
    expect(dobError(new Date(2026, 9, 6, 18, 0), now)).toMatch(/future/i);
  });

  it('rejects the years a date passes through while it is being typed', () => {
    for (const year of [1, 19, 199]) {
      const partial = new Date(2000, 4, 15);
      partial.setFullYear(year);
      expect(dobError(partial, now)).toMatch(/1900/);
    }
  });

  it('accepts 1900 itself', () => {
    expect(dobError(new Date(1900, 0, 1), now)).toBeNull();
  });
});

describe('parseStoredDate', () => {
  it('parses a stored millisecond timestamp string', () => {
    const ms = Date.UTC(2000, 0, 1);
    expect(parseStoredDate(String(ms)).getTime()).toBe(ms);
  });

  it('accepts a number as well as a string', () => {
    expect(parseStoredDate(0).getTime()).toBe(0);
  });

  it('handles the negative timestamps of pre-1970 births', () => {
    const ms = Date.UTC(1955, 2, 14);
    expect(ms).toBeLessThan(0);
    expect(parseStoredDate(String(ms)).getTime()).toBe(ms);
  });

  it('rejects partially numeric junk instead of truncating it', () => {
    expect(parseStoredDate('1e20')).toBeNull();
    expect(parseStoredDate('12abc')).toBeNull();
    expect(parseStoredDate('12.5')).toBeNull();
  });

  it('returns null for a timestamp beyond the Date range instead of an Invalid Date', () => {
    // Regression: an out-of-range value used to survive the isNaN(parseInt)
    // check and later blew up toISOString(), taking the settings panel with it.
    expect(parseStoredDate('99999999999999999999')).toBeNull();
    expect(parseStoredDate(String(8.64e15 + 1))).toBeNull();
  });

  it('returns null for missing or junk values', () => {
    expect(parseStoredDate(null)).toBeNull();
    expect(parseStoredDate(undefined)).toBeNull();
    expect(parseStoredDate('')).toBeNull();
    expect(parseStoredDate('oops')).toBeNull();
  });
});

describe('countdown-date target alignment (regression: no off-by-one)', () => {
  it('counts down to the exact local calendar day picked, not a UTC-shifted day', () => {
    const target = parseLocalDate('2030-01-01');
    // "Now" is the local midnight of the day before the target.
    const now = new Date(2029, 11, 31, 0, 0, 0, 0);
    const { yearPart, decimalPart } = calculateCountdown(target, now);
    expect(yearPart).toBe('0');
    expect(decimalPart).toHaveLength(9);

    // The remaining duration must be exactly one calendar day (86,400,000 ms),
    // proving the target landed on Jan 1 local — not Dec 31 (which would be <= 0).
    expect(target - now).toBe(86400000);
  });

  it('the countdown label day matches the parsed target day', () => {
    const target = parseLocalDate('2030-01-01');
    // The same value the UI feeds toLocaleDateString for the "UNTIL ..." label.
    expect(target.getMonth()).toBe(0);
    expect(target.getDate()).toBe(1);
  });
});

describe('incrementTabCount', () => {
  const makeStorage = (initial = {}) => {
    const data = { ...initial };
    return {
      getItem: (k) => (k in data ? data[k] : null),
      setItem: (k, v) => { data[k] = String(v); },
    };
  };

  it('starts at 1 when no value is stored', () => {
    const storage = makeStorage();
    expect(incrementTabCount(storage)).toBe(1);
    expect(storage.getItem('tabsOpened')).toBe('1');
  });

  it('increments an existing count', () => {
    const storage = makeStorage({ tabsOpened: '41' });
    expect(incrementTabCount(storage)).toBe(42);
    expect(storage.getItem('tabsOpened')).toBe('42');
  });

  it('recovers from a corrupted (non-numeric) value', () => {
    const storage = makeStorage({ tabsOpened: 'oops' });
    expect(incrementTabCount(storage)).toBe(1);
  });

  it('treats negative values as zero before incrementing', () => {
    const storage = makeStorage({ tabsOpened: '-5' });
    expect(incrementTabCount(storage)).toBe(1);
  });
});

describe('hashDay', () => {
  it('is deterministic — same input always yields same result', () => {
    expect(hashDay('2026-01-01')).toBe(hashDay('2026-01-01'));
    expect(hashDay('2000-06-15')).toBe(hashDay('2000-06-15'));
  });

  it('produces different values for different dates', () => {
    expect(hashDay('2026-01-01')).not.toBe(hashDay('2026-01-02'));
    expect(hashDay('2026-01-01')).not.toBe(hashDay('2026-02-01'));
  });

  it('is always non-negative', () => {
    const dates = ['2026-01-01', '2000-12-31', '1999-06-15', '2099-01-01'];
    for (const d of dates) {
      expect(hashDay(d)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getQuoteOfTheDay', () => {
  const quotes = [
    { text: 'Alpha', author: 'Plato' },
    { text: 'Beta', author: 'Aristotle', year: 350 },
    { text: 'Gamma', author: 'Socrates' },
  ];

  it('returns an object with text and author', () => {
    const q = getQuoteOfTheDay(quotes);
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('author');
  });

  it('is stable for the same date across calls', () => {
    const d = new Date('2026-04-14T00:00:00Z');
    expect(getQuoteOfTheDay(quotes, d)).toEqual(getQuoteOfTheDay(quotes, d));
  });

  it('returns different quotes for different dates (over 365 days)', () => {
    const seen = new Set();
    for (let i = 0; i < 365; i++) {
      // Local calendar days — the unit the quote rotates on.
      seen.add(getQuoteOfTheDay(quotes, new Date(2026, 0, 1 + i)).text);
    }
    // With 3 quotes, all 3 should appear within a year
    expect(seen.size).toBe(quotes.length);
  });

  it('rotates on the LOCAL calendar day, not the UTC one', () => {
    // Two instants inside the same local day but straddling UTC midnight.
    // Using toISOString() here used to flip the quote in the middle of the
    // user's afternoon (UTC-8) or before breakfast (UTC+3).
    const earlyMorning = new Date(2026, 5, 15, 0, 30);
    const lateEvening = new Date(2026, 5, 15, 23, 30);
    expect(getQuoteOfTheDay(quotes, earlyMorning)).toEqual(getQuoteOfTheDay(quotes, lateEvening));
  });

  it('changes once the local day rolls over', () => {
    const lastMinute = new Date(2026, 5, 15, 23, 59);
    const firstMinute = new Date(2026, 5, 16, 0, 1);
    expect(getQuoteOfTheDay(quotes, lastMinute)).not.toEqual(
      getQuoteOfTheDay(quotes, firstMinute)
    );
  });

  it('works with a single-quote array', () => {
    const single = [{ text: 'Only one', author: 'Nobody' }];
    const q = getQuoteOfTheDay(single);
    expect(q.text).toBe('Only one');
  });

  it('handles quotes without year field', () => {
    const q = getQuoteOfTheDay([{ text: 'No year', author: 'Someone' }]);
    expect(q.year).toBeUndefined();
  });

  it('covers at least 360 unique quotes across a year with 1000+ quotes', async () => {
    const { QUOTES } = await import('./quotes.js');
    expect(QUOTES.length).toBeGreaterThanOrEqual(1000);

    const seen = new Set();
    for (let i = 0; i < 365; i++) {
      seen.add(getQuoteOfTheDay(QUOTES, new Date(2026, 0, 1 + i)).text);
    }
    // With 1000+ quotes, every day should yield a unique quote
    expect(seen.size).toBe(365);
  });
});

describe('buildSearchUrl', () => {
  it('returns null for empty or whitespace-only queries', () => {
    expect(buildSearchUrl('google', '')).toBeNull();
    expect(buildSearchUrl('google', '   ')).toBeNull();
    expect(buildSearchUrl('google', null)).toBeNull();
    expect(buildSearchUrl('google', undefined)).toBeNull();
  });

  it('builds a Google URL with encoded query', () => {
    expect(buildSearchUrl('google', 'hello world')).toBe(
      'https://www.google.com/search?q=hello%20world'
    );
  });

  it('trims surrounding whitespace before encoding', () => {
    expect(buildSearchUrl('google', '  cats  ')).toBe(
      'https://www.google.com/search?q=cats'
    );
  });

  it('encodes special characters (&, =, +, /)', () => {
    const url = buildSearchUrl('duckduckgo', 'a&b=c+d/e');
    expect(url).toBe('https://duckduckgo.com/?q=a%26b%3Dc%2Bd%2Fe');
  });

  it('supports every defined engine', () => {
    for (const key of Object.keys(SEARCH_ENGINES)) {
      const url = buildSearchUrl(key, 'q');
      expect(url).toContain(SEARCH_ENGINES[key].url);
      expect(url.endsWith('q')).toBe(true);
    }
  });

  it('falls back to the default engine for unknown keys', () => {
    const url = buildSearchUrl('unknown-engine', 'foo');
    expect(url.startsWith(SEARCH_ENGINES[DEFAULT_ENGINE].url)).toBe(true);
  });

  it('handles Cyrillic characters via percent-encoding', () => {
    expect(buildSearchUrl('yandex', 'кот')).toBe(
      'https://yandex.com/search/?text=%D0%BA%D0%BE%D1%82'
    );
  });
});

describe('isFirstInstall', () => {
  it('is true when no stored version exists', () => {
    expect(isFirstInstall(null)).toBe(true);
    expect(isFirstInstall(undefined)).toBe(true);
    expect(isFirstInstall('')).toBe(true);
  });
  it('is false when a stored version exists', () => {
    expect(isFirstInstall('1.2.0')).toBe(false);
  });
});

describe('getWhatsNew', () => {
  const map = {
    '1.3.0': { title: 'A', body: 'a' },
    '1.4.0': { title: 'B', body: 'b' },
  };

  it('returns null when current version is missing from the map', () => {
    expect(getWhatsNew('1.2.5', '1.2.0', map)).toBeNull();
  });

  it('returns null when seen version matches current', () => {
    expect(getWhatsNew('1.3.0', '1.3.0', map)).toBeNull();
  });

  it('returns the entry when version is in the map and not yet seen', () => {
    expect(getWhatsNew('1.3.0', '1.2.0', map)).toEqual({ title: 'A', body: 'a' });
  });

  it('returns the latest entry only — does not aggregate prior versions', () => {
    expect(getWhatsNew('1.4.0', '1.2.0', map)).toEqual({ title: 'B', body: 'b' });
  });

  it('returns null when no current version is provided', () => {
    expect(getWhatsNew(null, '1.2.0', map)).toBeNull();
  });
});

describe('CHANGELOG', () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  const toNumbers = (v) => v.split('.').map(Number);
  const isNewer = (a, b) => {
    const [x, y] = [toNumbers(a), toNumbers(b)];
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };

  it('starts with the version in manifest.json, so no release ships without notes', () => {
    expect(CHANGELOG[0].version).toBe(manifest.version);
  });

  it('is ordered newest first with no duplicates', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(isNewer(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBe(true);
    }
  });

  it('gives every entry a valid date that never goes forward in time', () => {
    for (let i = 0; i < CHANGELOG.length; i++) {
      expect(CHANGELOG[i].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parseLocalDate(CHANGELOG[i].date)).not.toBeNull();
      if (i > 0) expect(CHANGELOG[i].date <= CHANGELOG[i - 1].date).toBe(true);
    }
  });

  it('gives every entry at least one short note', () => {
    for (const { notes } of CHANGELOG) {
      expect(notes.length).toBeGreaterThan(0);
      for (const note of notes) expect(note.length).toBeLessThanOrEqual(90);
    }
  });

  it('links to the GitHub releases page', () => {
    expect(RELEASES_URL).toBe('https://github.com/1gory/motivation-age-counter-extension/releases');
  });
});

describe('recentReleases', () => {
  it('returns the ten newest releases by default', () => {
    const list = recentReleases();
    expect(list).toHaveLength(Math.min(10, CHANGELOG.length));
    expect(list[0]).toBe(CHANGELOG[0]);
  });

  it('honours a smaller count', () => {
    expect(recentReleases(3).map(r => r.version)).toEqual(CHANGELOG.slice(0, 3).map(r => r.version));
  });

  it('returns everything when there are fewer entries than asked for', () => {
    const short = [{ version: '1.0.0', date: '2026-01-01', notes: ['x'] }];
    expect(recentReleases(10, short)).toEqual(short);
  });
});

describe('WHATS_NEW', () => {
  it('keeps every tooltip body within the 130-character bubble', () => {
    for (const { body } of Object.values(WHATS_NEW)) {
      expect(body.length).toBeLessThanOrEqual(130);
    }
  });
});
