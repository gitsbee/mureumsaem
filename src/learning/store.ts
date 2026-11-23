import { storageKey } from '../storage';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { type Subject } from './daily';

export type Result = 'correct' | 'wrong' | 'seen' | 'hinted';
export type Attempt = {
  id: string;
  subject: Subject;
  label: string;
  mode: string;
  result: Result;
  occurredAt: number;
  answer?: string;
  prompt?: string;
  elapsedMs?: number;
};
export const scoreCollection = (day: string, subject: Subject) =>
  collection(db!, 'pulleemDays', day, 'subjects', subject, 'scores');
export const attemptCollection = (uid: string) => collection(db!, 'users', uid, 'learning');

export function readPracticeAttempt(value: unknown, subject: Subject): Attempt | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<Attempt>;
  if (data.subject !== subject || typeof data.id !== 'string'
    || !new RegExp('^' + subject + '-[a-zA-Z0-9_-]{1,100}$').test(data.id)
    || typeof data.label !== 'string' || !data.label.trim()
    || typeof data.mode !== 'string' || !data.mode.trim()
    || !['correct', 'wrong', 'hinted', 'seen'].includes(data.result ?? '')) return null;
  const elapsed = data.elapsedMs;
  return {
    id: data.id, subject, label: data.label.trim().slice(0, 160), mode: data.mode.trim().slice(0, 24),
    result: data.result!, occurredAt: Date.now(),
    ...(typeof data.answer === 'string' && data.answer.trim() ? { answer: data.answer.trim().slice(0, 300) } : {}),
    ...(typeof data.prompt === 'string' && data.prompt.trim() ? { prompt: data.prompt.trim().slice(0, 1200) } : {}),
    ...(typeof elapsed === 'number' && Number.isInteger(elapsed) && elapsed >= 0 && elapsed <= 604_800_000 ? { elapsedMs: elapsed } : {}),
  };
}

const queuePrefix = (uid: string) => storageKey('pending:' + uid + ':');
export function queueAttempt(uid: string, attempt: Attempt) {
  localStorage.setItem(queuePrefix(uid) + attempt.id, JSON.stringify(attempt));
}

const running = new Map<string, Promise<void>>();
export function flushAttempts(uid: string) {
  if (!db) return Promise.resolve();
  const pending = running.get(uid);
  if (pending) return pending;
  const upload = (async () => {
    const prefix = queuePrefix(uid);
    let keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
    while (keys.length) {
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const { id, ...attempt } = JSON.parse(raw) as Attempt;
        const ref = doc(attemptCollection(uid), id);
        await runTransaction(db!, async transaction => {
          if (!(await transaction.get(ref)).exists()) transaction.set(ref, { ...attempt, createdAt: serverTimestamp() });
        });
        localStorage.removeItem(key);
      }
      keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
    }
  })().finally(() => running.delete(uid));
  running.set(uid, upload);
  return upload;
}
