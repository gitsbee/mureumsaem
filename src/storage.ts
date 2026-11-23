export const isPreview = import.meta.env.VITE_PREVIEW === 'true';
const prefix = isPreview ? 'muleumsaem-dev:' : 'muleumsaem:';

export const storageKey = (name: string) => prefix + name;
export const inkNamespace = (account: string, subject: string) =>
  isPreview ? storageKey(account + ':' + subject) : 'pulleem:' + account + ':' + subject;

export function migrateBrowserStorage() {
  if (isPreview) return;
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[kind];
      const marker = storageKey('migration:v1');
      if (storage.getItem(marker)) continue;
      for (const legacy of ['pulim:', 'pulleem:', 'postpost:']) {
        for (const source of Object.keys(storage)) {
          if (!source.startsWith(legacy)) continue;
          const target = storageKey(source.slice(legacy.length));
          const value = storage.getItem(source);
          if (value !== null && storage.getItem(target) === null) storage.setItem(target, value);
        }
      }
      storage.setItem(marker, 'complete');
    } catch { /* Retry on the next load when browser storage is available. */ }
  }
}
