import { describe, it, expect } from 'vitest';
import { calculateAge, calculateCountdown, endOfYear, incrementTabCount, TemplateEngine, MILLISECONDS_PER_YEAR, parseLocalDate, formatLocalDate } from './app.js';
import { hashDay, getQuoteOfTheDay } from './daily-quote.js';
import { SEARCH_ENGINES, DEFAULT_ENGINE, buildSearchUrl } from './search-engines.js';
import { getWhatsNew, isFirstInstall } from './whats-new.js';

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
    const base = new Date('2026-01-01T00:00:00Z');
    for (let i = 0; i < 365; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      seen.add(getQuoteOfTheDay(quotes, d).text);
    }
    // With 3 quotes, all 3 should appear within a year
    expect(seen.size).toBe(quotes.length);
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
    const base = new Date('2026-01-01T00:00:00Z');
    for (let i = 0; i < 365; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      seen.add(getQuoteOfTheDay(QUOTES, d).text);
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
