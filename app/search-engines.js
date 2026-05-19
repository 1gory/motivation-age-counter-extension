export const SEARCH_ENGINES = {
  google:     { name: 'Google',     url: 'https://www.google.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  bing:       { name: 'Bing',       url: 'https://www.bing.com/search?q=' },
  yandex:     { name: 'Yandex',     url: 'https://yandex.com/search/?text=' },
  yahoo:      { name: 'Yahoo',      url: 'https://search.yahoo.com/search?p=' },
  brave:      { name: 'Brave',      url: 'https://search.brave.com/search?q=' },
};

export const DEFAULT_ENGINE = 'google';

export function buildSearchUrl(engineKey, query) {
  const trimmed = String(query ?? '').trim();
  if (!trimmed) return null;
  const engine = SEARCH_ENGINES[engineKey] || SEARCH_ENGINES[DEFAULT_ENGINE];
  return engine.url + encodeURIComponent(trimmed);
}
