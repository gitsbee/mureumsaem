import Icon from '../components/Icon';
import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { dateLabel, errorMessage } from '../model';
import { subjects, type Subject } from './daily';
import { attemptCollection, type Attempt } from './store';

type SavedAttempt = Attempt & { createdAt: Timestamp | null };
const resultNames = { correct: '정답', wrong: '오답', seen: '학습', hinted: '힌트 정답' };

export function LearningRecords({ uid, onLogin, fixedSubject }: { uid?: string; onLogin?: () => void; fixedSubject?: Subject }) {
  const [items, setItems] = useState<SavedAttempt[]>([]);
  const [size, setSize] = useState(30);
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const [loading, setLoading] = useState(Boolean(uid && db));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid || !db) return;
    return onSnapshot(query(attemptCollection(uid), orderBy('createdAt', 'desc'), limit(size)), snapshot => {
      setItems(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as SavedAttempt));
      setLoading(false);
    }, error => { setError(errorMessage(error)); setLoading(false); });
  }, [uid, size]);

  const filter = fixedSubject ?? subject;
  const visible = items.filter(item => filter === 'all' || item.subject === filter);
  const elapsed = visible.reduce((sum, item) => sum + (item.elapsedMs || 0), 0);
  return <section className="panel record-panel">
    <h2>{fixedSubject ? '동기화된 풀이 기록' : '풀이 기록'}</h2>
    {!uid ? <><p>로그인하면 수학과 영어 풀이 결과를 다른 기기에서도 볼 수 있어요.</p><button className="button secondary" onClick={onLogin}><Icon name="login" />로그인</button></> : <>
      {!fixedSubject && <div className="filter-tabs" aria-label="기록 과목">
        {(['all', 'math', 'english'] as const).map(value => <button className="button secondary" key={value} aria-pressed={subject === value}
          onClick={() => setSubject(value)}>{value === 'all' ? '전체' : subjects[value]}</button>)}
      </div>}
      <p className="muted">불러온 기록 {visible.length}개 · 정답 {visible.filter(item => item.result === 'correct').length}개</p>
      {!loading && !error && elapsed > 0 && <p className="muted">불러온 기록의 풀이 시간 · {Math.floor(elapsed / 60_000)}분 {Math.floor(elapsed / 1000) % 60}초</p>}
      {loading && <p role="status">기록을 불러오는 중…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && visible.length === 0 && <p>표시할 풀이 기록이 없어요.</p>}
      <ul className="learning-list">
        {visible.map(item => <li key={item.id}>
          <div><p className="muted">{subjects[item.subject]} · {item.mode} · {dateLabel(item.createdAt)}</p><strong>{item.label}</strong>
            {(item.prompt || item.answer || item.elapsedMs !== undefined) && <details className="attempt-details">
              <summary>풀이 상세</summary>
              {item.prompt && <p className="attempt-prompt">{item.prompt}</p>}
              {item.answer && <p>내 답안 · {item.answer}</p>}
              {item.elapsedMs !== undefined && <p>걸린 시간 · {Math.round(item.elapsedMs / 1000).toLocaleString()}초</p>}
            </details>}
          </div>
          <span className={item.result === 'wrong' ? 'wrong-result' : 'correct-result'}>{resultNames[item.result]}</span>
        </li>)}
      </ul>
      {items.length === size && <button className="button secondary" onClick={() => setSize(value => value + 30)}><Icon name="more" />이전 기록 더 보기</button>}
    </>}
  </section>;
}
