import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, type Firestore, type Timestamp, type Transaction } from 'firebase/firestore';
import { db } from '../firebase';

type Limit = { seq: number; first: Timestamp | null; second: Timestamp | null; third: Timestamp | null };
const empty: Limit = { seq: 0, first: null, second: null, third: null };
const windowMs = 90 * 86400000;
const ref = (store: Firestore, uid: string) => doc(store, 'users', uid, 'harueum', 'changeLimit');

export function useSettingLimit(uid: string) {
  const [limit, setLimit] = useState<Limit>();
  useEffect(() => {
    if (db && uid) return onSnapshot(ref(db, uid), snap => setLimit((snap.data() as Limit | undefined) ?? empty), () => setLimit(undefined));
  }, [uid]);
  if (!limit) return '변경 한도를 확인하는 중이에요.';
  const active = [limit.first, limit.second, limit.third].filter(time => time && time.toMillis() > Date.now() - windowMs);
  if (active.length < 3) return '최근 90일 기준 ' + (3 - active.length) + '회 변경할 수 있어요.';
  return '다음 변경 가능 시점 ' + new Date(active.at(-1)!.toMillis() + windowMs).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export async function registerChange(store: Firestore, txn: Transaction, uid: string, kind: 'account' | 'school') {
  const target = ref(store, uid);
  const previous = ((await txn.get(target)).data() as Limit | undefined) ?? empty;
  const oldest = previous.third;
  if (oldest && oldest.toMillis() + windowMs > Date.now()) throw new Error('최근 90일 안에 이미 세 번 변경했어요.');
  const seq = previous.seq + 1;
  txn.set(target, { seq, first: serverTimestamp(), second: previous.first, third: previous.second });
  txn.set(doc(store, 'users', uid, 'settingsHistory', String(seq)), {
    at: serverTimestamp(), account: kind === 'account', school: kind === 'school',
  });
}
