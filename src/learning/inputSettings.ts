import { storageKey } from '../storage';
const key = storageKey('study-inputs');
let current: { penOnly: boolean; sensitivity: number; ime: boolean } | undefined;

function readInputs(account: string) {
  try {
    const shared = localStorage.getItem(key);
    if (shared) return JSON.parse(shared) as NonNullable<typeof current>;
    const prefix = storageKey(account + ':');
    const saved = localStorage.getItem(prefix + 'math:math-forge:pen-sensitivity');
    const sensitivity = saved === null ? 85 : Number(saved);
    return {
      penOnly: localStorage.getItem(prefix + 'math:math-forge:pen-only') === 'true',
      sensitivity: Number.isFinite(sensitivity) ? Math.max(0, Math.min(100, sensitivity)) : 85,
      ime: Boolean(JSON.parse(localStorage.getItem(prefix + 'english:amgi-v1') || 'null')?.ime),
    };
  } catch {
    return current ?? { penOnly: false, sensitivity: 85, ime: false };
  }
}

export function bindStudyInputs(root: HTMLElement, account: string) {
  const pen = root.querySelector<HTMLInputElement>('#pen-only')!;
  const pressure = root.querySelector<HTMLInputElement>('#pen-sensitivity')!;
  const output = root.querySelector<HTMLOutputElement>('#pen-sensitivity-value')!;
  const ime = root.querySelector<HTMLInputElement>('#ime')!;
  const abort = new AbortController();
  const options = { signal: abort.signal };
  function sync() {
    const { penOnly, sensitivity, ime: enabled } = readInputs(account);
    pen.checked = penOnly;
    pressure.value = String(sensitivity);
    output.value = pressure.value + '%';
    ime.checked = enabled;
  }
  function save() {
    current = { penOnly: pen.checked, sensitivity: pressure.valueAsNumber, ime: ime.checked };
    output.value = pressure.value + '%';
    try { localStorage.setItem(key, JSON.stringify(current)); } catch { /* Keep it for this session. */ }
  }
  pen.addEventListener('change', save, options);
  ime.addEventListener('change', save, options);
  pressure.addEventListener('input', save, options);
  window.addEventListener('storage', event => { if (event.key === key) sync(); }, options);
  sync();
  return () => abort.abort();
}
