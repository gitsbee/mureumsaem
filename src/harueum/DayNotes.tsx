import { useEffect, useId, useState, type FormEvent } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { db } from '../firebase';
import { errorMessage } from '../model';

export default function DayNotes({ uid, day, onClose }: { uid: string; day: string; onClose: () => void }) {
  const fieldId = useId();
  const [body, setBody] = useState('');
  const [initial, setInitial] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;
    let active = true;
    void getDoc(doc(db, 'users', uid, 'dayNotes', day)).then(snap => {
      if (!active) return;
      const saved = snap.data()?.body || '';
      setInitial(saved);
      setBody(saved);
    }, cause => {
      if (active) { setLoadFailed(true); setError(errorMessage(cause)); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid, day]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!db || busy || loading || loadFailed) return;
    setBusy(true); setError('');
    try {
      await setDoc(doc(db, 'users', uid, 'dayNotes', day), { body, updatedAt: serverTimestamp() });
      onClose();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <Modal title="오늘의 개인 필기" onClose={() => { if (!busy && (initial === body || confirm('저장하지 않은 필기를 닫을까요?'))) onClose(); }}>
    <p className="muted">{day} · 나만 볼 수 있어요.</p>
    <form className="harueum-form" onSubmit={save}>
      <div className="filter-tabs" aria-label="필기 보기">
        <button type="button" className="plain-button nav-tab" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}><Icon name="edit" />편집</button>
        <button type="button" className="plain-button nav-tab" aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}><Icon name="eye" />미리보기</button>
      </div>
      {mode === 'edit' ? <div><label htmlFor={fieldId}>필기</label><textarea id={fieldId} disabled={loading || loadFailed || busy} maxLength={8000} value={body} placeholder="# 제목&#10;- 정리할 내용"
        onChange={event => setBody(event.target.value)} /></div> :
        <div className="harueum-preserve">{body.split('\n').map((line, index) => {
          if (line.startsWith('## ')) return <h4 key={index}>{line.slice(3)}</h4>;
          if (line.startsWith('# ')) return <h3 key={index}>{line.slice(2)}</h3>;
          if (line.startsWith('- ')) return <p key={index}>• {line.slice(2)}</p>;
          return <p key={index}>{line || '\u00a0'}</p>;
        })}</div>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy || loading || loadFailed || initial === body}><Icon name="save" />필기 저장</button>
    </form>
  </Modal>;
}
