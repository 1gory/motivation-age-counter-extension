export const WHATS_NEW = {
  '1.3.0': {
    title: "What's new",
    body: 'You can now enable a search bar and pick your engine. Open Settings to try it.',
  },
  '1.4.0': {
    title: "What's new",
    body: "See how many new tabs you've opened with the extension — check the count in Settings.",
  },
};

export function getWhatsNew(currentVersion, seenVersion, map = WHATS_NEW) {
  if (!currentVersion) return null;
  if (seenVersion === currentVersion) return null;
  const entry = map[currentVersion];
  if (!entry) return null;
  return entry;
}

export function isFirstInstall(seenVersion) {
  return !seenVersion;
}
