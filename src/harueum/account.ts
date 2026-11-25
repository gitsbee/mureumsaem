import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { errorMessage } from '../model';

export const accountOptions = {
  student: { high1: '고1', high2: '고2', high3: '고3', repeat: 'N수생', relearn: '재학습' },
  teacher: { school: '학교', academy: '학원', study: '스터디그룹' },
};
export type AccountType = keyof typeof accountOptions;
export type Enrollment = { type: AccountType; stage: string; schoolYear: number; policyVersion: string };
export type Release = { groups: boolean; groupStories: boolean; plaza: boolean; policyVersion: string; termsUrl: string; privacyUrl: string };
const closed: Release = { groups: false, groupStories: false, plaza: false, policyVersion: '', termsUrl: '', privacyUrl: '' };

function policyLink(value: unknown) {
  if (typeof value !== 'string') return '';
  try { return new URL(value).protocol === 'https:' ? value : ''; }
  catch { return ''; }
}

export function useRelease() {
  const [release, setRelease] = useState(closed);
  useEffect(() => {
    if (!db) return;
    let active = true;
    void getDoc(doc(db, 'harueumConfig', 'release')).then(snapshot => {
      if (!active) return;
      const data = snapshot.data();
      if (!data) return;
      setRelease({
        groups: data.groups === true,
        groupStories: data.groups === true && data.groupStories === true,
        plaza: data.groups === true && data.groupStories === true && data.plaza === true,
        policyVersion: typeof data.policyVersion === 'string' ? data.policyVersion : '',
        termsUrl: policyLink(data.termsUrl),
        privacyUrl: policyLink(data.privacyUrl),
      });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return release;
}

export function useEnrollment(uid?: string) {
  const [state, setState] = useState<{ uid: string; data: Enrollment | null; error: string }>();
  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(doc(db, 'users', uid, 'harueum', 'account'), snapshot => {
      setState({ uid, data: snapshot.exists() ? snapshot.data() as Enrollment : null, error: '' });
    }, cause => setState({ uid, data: null, error: errorMessage(cause) }));
  }, [uid]);
  const current = state?.uid === uid ? state : undefined;
  return { data: current?.data ?? null, loading: Boolean(db && uid && !current), error: current?.error ?? '' };
}

export function schoolYear() {
  const [year, month] = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit',
  }).format().split('-').map(Number);
  return month < 3 ? year - 1 : year;
}

export async function saveEnrollment(uid: string, type: AccountType, stage: string, policyVersion: string) {
  if (!db || !policyVersion || !Object.hasOwn(accountOptions[type], stage)) throw new Error('계정 유형과 약관 확인 정보를 확인해 주세요.');
  await setDoc(doc(db, 'users', uid, 'harueum', 'account'), {
    type, stage, schoolYear: schoolYear(), policyVersion,
    ageConfirmed: true, termsAccepted: true, privacyAccepted: true, acceptedAt: serverTimestamp(),
  });
}
