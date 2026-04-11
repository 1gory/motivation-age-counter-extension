import { describe, it, expect } from 'vitest';
import { calculateAge, TemplateEngine, MILLISECONDS_PER_YEAR } from './app.js';

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
