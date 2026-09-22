/**
 * Deterministic daily quote selection with yearly seeded shuffle.
 *
 * Strategy: shuffle all quotes once per year using the year as a seed,
 * then pick by day-of-year index. Guarantees zero repeats within a calendar year.
 */

/**
 * djb2 hash of a string, always non-negative (32-bit unsigned).
 * @param {string} str
 * @returns {number}
 */
export function hashDay(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep 32-bit unsigned
  }
  return hash;
}

/**
 * Mulberry32 seeded PRNG — fast, good distribution, no dependencies.
 * @param {number} seed
 * @returns {() => number} function returning [0, 1)
 */
function makePrng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with a seeded PRNG (non-mutating).
 * @param {Array} arr
 * @param {number} seed
 * @returns {Array}
 */
function seededShuffle(arr, seed) {
  const a = arr.slice();
  const rand = makePrng(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/**
 * Returns the quote of the day.
 * Within a given calendar year, every day produces a distinct quote.
 * Different years use different shuffles.
 *
 * The day is the user's LOCAL calendar day. Deriving it from toISOString()
 * instead pinned the rotation to UTC midnight, so the "quote of the day"
 * changed at 03:00 for a reader in UTC+3 and mid-afternoon in UTC-8.
 *
 * @param {Array<{text: string, author: string, year?: number}>} quotes
 * @param {Date} [date]
 * @returns {{text: string, author: string, year?: number}}
 */
export function getQuoteOfTheDay(quotes, date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Day-of-year index (0-based). Date.UTC is used purely as a calendar-aware
  // day counter here — both operands are local components, so no zone shift.
  const yearStartMs = Date.UTC(year, 0, 1);
  const todayMs = Date.UTC(year, month, day);
  const dayOfYear = Math.floor((todayMs - yearStartMs) / 86400000);

  // Shuffle quotes deterministically for this year
  const yearSeed = hashDay(String(year));
  const shuffled = seededShuffle(quotes, yearSeed);

  return shuffled[dayOfYear % shuffled.length];
}
