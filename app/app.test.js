import { describe, it, expect } from 'vitest';
import { calculateAge, calculateCountdown, endOfYear, TemplateEngine, MILLISECONDS_PER_YEAR } from './app.js';
import { hashDay, getQuoteOfTheDay } from './daily-quote.js';

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
