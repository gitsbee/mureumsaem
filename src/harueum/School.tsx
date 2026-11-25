import { useEffect, useState, type FormEvent } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { errorMessage } from '../model';
import Icon from '../components/Icon';

export type SchoolClass = { school: string; grade: number; room: number };
export function useSchool(uid: string) {
  const [saved, setSaved] = useState<SchoolClass | null>(null);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, 'users', uid, 'harueum', 'school'), snap => setSaved(snap.exists() ? snap.data() as SchoolClass : null), () => setSaved(null));
  }, [uid]);
  return saved;
}

export default function School({ uid }: { uid: string }) {
  const school = useSchool(uid);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setStatus('');
    try {
      await setDoc(doc(db, 'users', uid, 'harueum', 'school'), {
        school: String(form.get('school')).trim(), grade: Number(form.get('grade')), room: Number(form.get('room')), updatedAt: serverTimestamp(),
      });
      setStatus('학급 정보를 저장했어요.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <details className="panel harueum-section">
    <summary>학교·학급 설정</summary>
    <p>학급 그룹을 찾을 때만 사용합니다. 공개 프로필에는 표시하지 않습니다.</p>
    <form className="harueum-form" onSubmit={save} key={JSON.stringify(school)}>
      <label>학교 코드 <input name="school" defaultValue={school?.school} pattern="[0-9]{7}" inputMode="numeric" required /></label>
      <div className="harueum-columns">
        <label>학년 <input name="grade" type="number" min="1" max="3" defaultValue={school?.grade} required /></label>
        <label>반 <input name="room" type="number" min="1" max="50" defaultValue={school?.room} required /></label>
      </div>
      <button className="button primary" disabled={busy}><Icon name="save" />학급 저장</button>
      {error && <p className="error" role="alert">{error}</p>}
      {status && <p className="notice" role="status">{status}</p>}
    </form>
  </details>;
}
