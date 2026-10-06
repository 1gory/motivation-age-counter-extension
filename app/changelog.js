// Release notes shown from the version number in the settings footer.
// Newest first. Every release gets an entry, patches included — a test checks
// that the first one matches manifest.json. Keep notes short and written for
// users; the full write-up lives on GitHub Releases.

export const RELEASES_URL = 'https://github.com/1gory/motivation-age-counter-extension/releases';

export const CHANGELOG = [
  {
    version: '1.6.0',
    date: '2026-10-06',
    notes: [
      'Release notes: click the version number in Settings.',
      'Date of birth now sits under Age counter and applies right away.',
      'Fixed the two "Set time" switches resetting each other.',
    ],
  },
  {
    version: '1.5.1',
    date: '2026-10-06',
    notes: [
      'Settings fit on laptop screens, with Done always in view.',
      'Escape closes Settings; switches work from the keyboard.',
      'A clear message when a date of birth cannot be used.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-09-22',
    notes: [
      'Optional time of day for the countdown target and date of birth.',
      'Countdowns no longer ask for a date of birth.',
      'The daily quote changes at your local midnight.',
    ],
  },
  {
    version: '1.4.1',
    date: '2026-05-31',
    notes: [
      'Fixed countdown dates landing a day off in some timezones.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-05-26',
    notes: [
      'See how many new tabs you have opened, at the bottom of Settings.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-19',
    notes: [
      'Optional search bar with six search engines.',
      'A short tip after updates that add something new.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-18',
    notes: [
      'Six color palettes, three fonts, and an automatic light/dark theme.',
      'Settings split into Counter and Appearance tabs.',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-04-14',
    notes: [
      'New progress-clock icon.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-14',
    notes: [
      'Three modes: age, countdown to a date, countdown to the end of the year.',
      'A new quote every day.',
      'Settings panel, including counter size.',
    ],
  },
  {
    version: '1.0.4',
    date: '2026-04-11',
    notes: [
      'Stability improvements under the hood.',
    ],
  },
];

export function recentReleases(count = 10, changelog = CHANGELOG) {
  return changelog.slice(0, count);
}
