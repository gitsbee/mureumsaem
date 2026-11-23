import { storageKey } from '../storage';
const key = storageKey('study-sound');

export function readStudySound(fallback = { enabled: true, volume: 70 }) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (typeof value?.enabled === 'boolean' && Number.isFinite(value.volume)) {
      return { enabled: value.enabled, volume: Math.max(0, Math.min(100, value.volume)) };
    }
  } catch { /* Use the default when storage is unavailable. */ }
  return fallback;
}

export function saveStudySound(value: ReturnType<typeof readStudySound>) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the current choice in this view. */ }
}
