import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, deleteDoc, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { errorMessage, type Post } from './model';

export const reportReasons = {
  spam: '도배 또는 스팸', abuse: '괴롭힘 또는 혐오', privacy: '개인정보 노출', other: '기타',
} as const;
export type ReportReason = keyof typeof reportReasons;
export type ReportTarget = { postId: string; commentId?: string };
const empty = new Set<string>();
const Visibility = createContext({ hidden: empty, blocked: empty, loading: false, error: '' });

export function ModerationProvider({ uid, children }: { uid?: string; children: ReactNode }) {
  const [hidden, setHidden] = useState<{ uid: string; ids: Set<string> } | null>(null);
  const [blocked, setBlocked] = useState<{ uid: string; ids: Set<string> } | null>(null);
  const [failure, setFailure] = useState<{ uid: string; message: string } | null>(null);
  const ownHidden = hidden?.uid === uid ? hidden?.ids : null;
  const ownBlocked = blocked?.uid === uid ? blocked?.ids : null;
  const error = failure?.uid === uid ? failure?.message || '' : '';
  useEffect(() => {
    if (!uid || !db) return;
    const failed = (cause: unknown) => setFailure({ uid, message: errorMessage(cause) });
    const stopHidden = onSnapshot(collection(db, 'users', uid, 'hiddenPosts'), snap => setHidden({ uid, ids: new Set(snap.docs.map(item => item.id)) }), failed);
    const stopBlocked = onSnapshot(collection(db, 'users', uid, 'blockedAuthors'), snap => setBlocked({ uid, ids: new Set(snap.docs.map(item => item.id)) }), failed);
    return () => { stopHidden(); stopBlocked(); };
  }, [uid]);
  return <Visibility.Provider value={{ hidden: ownHidden ?? empty, blocked: ownBlocked ?? empty, loading: Boolean(uid && db && (!ownHidden || !ownBlocked) && !error), error }}>{children}</Visibility.Provider>;
}

export function useVisibility() {
  const state = useContext(Visibility);
  return { ...state, canSee: (post: Pick<Post, 'id' | 'authorId'>) => !state.hidden.has(post.id) && !state.blocked.has(post.authorId) };
}

export function changeVisibility(uid: string, kind: 'hiddenPosts' | 'blockedAuthors', id: string, active: boolean) {
  if (!db) return Promise.reject(new Error('연결을 확인해 주세요.'));
  const ref = doc(db, 'users', uid, kind, id);
  return active ? setDoc(ref, { createdAt: serverTimestamp() }) : deleteDoc(ref);
}

export function reportContent(uid: string, target: ReportTarget, reason: ReportReason, note: string) {
  if (!db) return Promise.reject(new Error('연결을 확인해 주세요.'));
  const area = doc(db, 'users', uid, 'reports', target.postId);
  const ref = target.commentId ? doc(area, 'reportedComments', target.commentId) : area;
  return runTransaction(db, async transaction => {
    if ((await transaction.get(ref)).exists()) return false;
    transaction.set(ref, { reason, note: note.trim(), createdAt: serverTimestamp() });
    return true;
  });
}
