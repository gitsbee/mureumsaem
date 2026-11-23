import Icon from '../components/Icon';
import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { dateLabel, errorMessage } from '../model';
import Identity from '../components/Identity';
import { DAILY_SIZE, subjects, type Subject } from './daily';
import { attemptCollection, scoreCollection, type Attempt } from './store';

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
  return <section className="panel record-panel">
    <h2>{fixedSubject ? '동기화된 풀이 기록' : '풀이 기록'}</h2>
    {!uid ? <><p>로그인하면 수학과 영어 풀이 결과를 다른 기기에서도 볼 수 있어요.</p><button className="button secondary" onClick={onLogin}><Icon name="login" />로그인</button></> : <>
      {!fixedSubject && <div className="filter-tabs" aria-label="기록 과목">
        {(['all', 'math', 'english'] as const).map(value => <button className="button secondary" key={value} aria-pressed={subject === value}
          onClick={() => setSubject(value)}>{value === 'all' ? '전체' : subjects[value]}</button>)}
      </div>}
      <p className="muted">불러온 기록 {visible.length}개 · 정답 {visible.filter(item => item.result === 'correct').length}개</p>
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

export function Leaderboard({ day, subject, uid }: { day: string; subject: Subject; uid?: string }) {
  const [entries, setEntries] = useState<{ uid: string; score: number }[]>([]);
  const [loading, setLoading] = useState(Boolean(db));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;
    return onSnapshot(query(scoreCollection(day, subject), orderBy('score', 'desc'), limit(25)), snapshot => {
      setEntries(snapshot.docs.map(item => ({ uid: item.id, score: item.data().score })));
      setLoading(false);
    }, error => { setError(errorMessage(error)); setLoading(false); });
  }, [day, subject]);

  return <section className="panel record-panel">
    <h2>{subjects[subject]} 온라인 랭킹</h2>
    <p className="muted">{day} 한국 시간 · 오늘의 첫 풀이 정답 수 · 상위 25명</p>
    <p className="muted">점수 공개에 동의한 계정의 브라우저 채점 결과입니다. 동점은 공동 순위입니다.</p>
    {loading && <p role="status">랭킹을 불러오는 중…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {!loading && !error && !entries.length && <p>아직 점수를 공개한 사람이 없어요.</p>}
    <ol className="learning-list">
      {entries.map(entry => <li key={entry.uid}>
        <span>{entries.findIndex(other => other.score === entry.score) + 1}위</span>
        <Identity uid={entry.uid} fallback="물음샘 학습자" />
        <strong>{entry.score} / {DAILY_SIZE}{entry.uid === uid ? ' · 나' : ''}</strong>
      </li>)}
    </ol>
  </section>;
}
