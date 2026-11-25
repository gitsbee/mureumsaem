import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { earned } from '../../workers/learning/score.mjs';
import { storageKey } from '../storage';
import { flushAttempts, type Attempt } from './store';

type Session = { id: string; attempts: string[]; points: number; xp: number };
type Reply = { status: 'accepted' | 'mismatch'; xp: number; points: number };
type View = { uid: string; session: Session; status: Reply['status'] | 'pending' | 'error'; reply?: Reply };
const endpoint = import.meta.env.VITE_LEARNING_WORKER_URL?.trim();

export function useVerification(user: User | null) {
  const current = useRef<{ uid: string; attempts: Map<string, Attempt> } | undefined>(undefined);
  const [views, setViews] = useState<View[]>([]);
  const pendingPrefix = user ? storageKey('verification:' + user.uid + ':') : '';
  useEffect(() => {
    if (!pendingPrefix || !user) return;
    try {
      const pending: View[] = Object.keys(localStorage).filter(key => key.startsWith(pendingPrefix)).flatMap(key => {
        const session = JSON.parse(localStorage.getItem(key) ?? 'null') as Session | null;
        return session ? [{ uid: user.uid, session, status: 'error' as const }] : [];
      });
      setViews(items => [...items, ...pending.filter(item => !items.some(saved => saved.session.id === item.session.id))]);
    } catch { /* The current session still supports retry. */ }
  }, [pendingPrefix, user]);
  async function request(route: string, body: unknown) {
    if (!endpoint || !user) throw new Error('Unavailable');
    return fetch(new URL(route, endpoint), { method: 'POST', headers: {
      Authorization: 'Bearer ' + await user.getIdToken(), 'Content-Type': 'application/json',
    }, body: JSON.stringify(body) });
  }
  async function verify(session: Session) {
    if (!user) return;
    const uid = user.uid;
    const show = (status: View['status'], reply?: Reply) => setViews(items => [
      ...items.filter(item => item.session.id !== session.id), { uid, session, status, reply },
    ]);
    const key = pendingPrefix + session.id;
    try { localStorage.setItem(key, JSON.stringify(session)); } catch { /* The current session still supports retry. */ }
    show('pending');
    try {
      await flushAttempts(uid);
      const response = await request('/verify', session);
      if (!response.ok) throw new Error('Unavailable');
      const reply: Reply = await response.json();
      if (!['accepted', 'mismatch'].includes(reply.status)) throw new Error('Invalid response');
      try { localStorage.removeItem(key); } catch { /* A retry returns the same outcome. */ }
      show(reply.status, reply);
    } catch { show('error'); }
  }
  return {
    begin() {
      if (user && endpoint) current.current = { uid: user.uid, attempts: new Map() };
    },
    track(attempt: Attempt) {
      if (current.current?.uid === user?.uid) current.current?.attempts.set(attempt.id, attempt);
    },
    end() {
      const active = current.current;
      current.current = undefined;
      if (!active || active.uid !== user?.uid || !active.attempts.size) return;
      const totals = earned([...active.attempts.values()].map(item => item.result));
      void verify({ id: crypto.randomUUID(), attempts: [...active.attempts.keys()], ...totals });
    },
    panel: views.filter(item => item.uid === user?.uid).map(view => <VerificationStatus key={view.session.id} view={view}
      retry={() => void verify(view.session)} dismiss={() => {
        try { localStorage.removeItem(pendingPrefix + view.session.id); } catch { /* Dismiss for this visit. */ }
        setViews(items => items.filter(item => item.session.id !== view.session.id));
      }}
      appeal={reason => request('/appeal', { id: view.session.id, reason })} />),
  };
}

function VerificationStatus({ view, retry, dismiss, appeal }: { view: View; retry: () => void; dismiss: () => void; appeal: (reason: string) => Promise<Response> }) {
  const [showAppeal, setShowAppeal] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <section className="panel harueum-section" aria-label="학습 결과">
    {view.status === 'accepted' ? <div className="harueum-columns"><strong>획득 점수 {view.reply?.points}</strong><strong>획득 XP {view.reply?.xp}</strong></div>
      : view.status === 'pending' ? <p role="status">이번 학습 결과를 확인 중이에요.</p>
      : view.status === 'error' ? <><p role="status">학습 결과를 확인하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.</p><button className="button secondary" onClick={retry}>다시 시도</button></>
      : <>
        <p role="status">검증을 통과하지 못해 기록에 반영되지 않았어요</p>
        <details><summary>더 보기</summary><p>서버와 브라우저가 계산한 획득 점수 또는 XP가 일치하지 않았어요. 같은 행위를 반복하면 운영 정책에 따라 이용 정지 등의 조치가 있을 수 있어요. 직접 조작하지 않았다면 알 수 없는 프로그램이나 확장 프로그램을 확인하고, 필요하면 이의 제기로 알려 주세요.</p></details>
        <button className="button secondary" onClick={() => setShowAppeal(value => !value)}>이의 제기</button>
        {showAppeal && <form className="harueum-form" onSubmit={async event => {
          event.preventDefault();
          const reason = String(new FormData(event.currentTarget).get('reason') || '').trim();
          if (!reason || busy) return;
          setBusy(true);
          try {
            const response = await appeal(reason);
            if (response.ok) { setMessage('이의를 접수했어요.'); setShowAppeal(false); }
            else setMessage(response.status === 429 ? '오늘 접수 한도에 도달했어요.' : '접수하지 못했어요. 다시 시도해 주세요.');
          } catch { setMessage('접수하지 못했어요. 다시 시도해 주세요.'); }
          finally { setBusy(false); }
        }}><label>간단한 사유<textarea name="reason" required maxLength={300} placeholder="개인 연락처는 입력하지 마세요." /></label><button className="button primary" disabled={busy}>보내기</button></form>}
        {message && <p role="status">{message}</p>}
      </>}
    {view.status !== 'pending' && <button className="plain-button" onClick={dismiss}>닫기</button>}
  </section>;
}
