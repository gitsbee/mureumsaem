import { storageKey } from '../storage';
import { fillSettings } from './settingsUnits';
import { createStudyRuntime } from './engines/runtime';
import type { Subject } from './daily';

const fields = ['progress', 'wrong', 'hints', 'stars', 'extra', 'modeProgress', 'segmentProgress'] as const;
const storedFields = [...fields, 'draft', 'drafts', 'segmentDrafts', 'range'] as const;
const modes = ['flash', 'recall', 'choice', 'type'];
const outcomes = ['correct', 'wrong', 'seen', 'hinted', 'medium', 'easy', 'hard'];

function entries(value: unknown): [string, unknown][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError();
  return Object.entries(value);
}

function wordMap(value: unknown, valid: (item: unknown) => boolean) {
  return entries(value).every(([index, item]) => /^\d{1,5}$/.test(index) && valid(item));
}

function readEnglishBackup(text: string) {
  const file = JSON.parse(text);
  if (file?.version !== 1 || file.subject !== 'english') throw new TypeError();
  const validOutcome = (value: unknown) => typeof value === 'string' && outcomes.includes(value);
  if (!entries(file.records).every(([field, value]) => {
    switch (field) {
      case 'progress': return wordMap(value, validOutcome);
      case 'wrong':
      case 'hints': return wordMap(value, item => typeof item === 'number' && Number.isSafeInteger(item) && item >= 0);
      case 'stars': return wordMap(value, item => typeof item === 'boolean');
      case 'extra': return wordMap(value, item => Array.isArray(item) && item.every(answer => typeof answer === 'string'));
      case 'modeProgress': return entries(value).every(([mode, data]) => modes.includes(mode) && wordMap(data, validOutcome));
      case 'segmentProgress': return entries(value).every(([segment, data]) => /^(recall|choice|type)\|(all|wrong|stars|hints)\|\d+\|\d+$/.test(segment) && wordMap(data, validOutcome));
      default: return false;
    }
  })) throw new TypeError();
  return file.records;
}

export async function withRecordTools<T>(subject: Subject, account: string, action: (tools: {
  exportRecords: () => Promise<unknown>;
  importRecords: (content: string) => Promise<unknown>;
  resetRecords: () => Promise<void>;
}) => Promise<T>): Promise<T> {
  if (subject === 'english') {
    const key = storageKey(account + ':english:amgi-v1');
    const read = () => JSON.parse(localStorage.getItem(key) || '{}');
    return action({
      async exportRecords() {
        const state = read();
        return { version: 1, subject, records: Object.fromEntries(fields.filter(field => field in state).map(field => [field, state[field]])) };
      },
      async importRecords(content) {
        const records = readEnglishBackup(content);
        const state = read();
        for (const field of fields) delete state[field];
        localStorage.setItem(key, JSON.stringify({ ...state, ...records }));
      },
      async resetRecords() {
        const state = read();
        for (const field of storedFields) delete state[field];
        localStorage.setItem(key, JSON.stringify(state));
      },
    });
  }
  const [{ default: mount }, { default: markup }] = await Promise.all([
    import('./engines/math'), import('./engines/math.html?raw'),
  ]);
  const root = document.createElement('div');
  root.innerHTML = markup;
  fillSettings(root.querySelector('.preferences-dialog')!);
  const runtime = createStudyRuntime(root, {
    account, subject, vocabulary: undefined, recordsOnly: true,
    report() {}, updateView() {}, getTheme: () => 'light', setTheme() {},
  });
  try { return await action(mount(runtime)!); }
  finally { runtime.destroy(); }
}
