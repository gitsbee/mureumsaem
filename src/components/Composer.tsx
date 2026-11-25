import { storageKey } from '../storage';
import Icon from './Icon';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MAX_POST_LENGTH, validatePost } from '../validation.mjs';
import { extractTags } from '../content.mjs';
import { errorMessage } from '../model';

type Draft = { body: string; context: string; id: string | null };
export default function Composer({ user, onBusy, question = '', alwaysExpanded = false }: { user: User; onBusy: (value: boolean) => void; alwaysExpanded?: boolean; question?: string }) {
  const key = storageKey(`draft:${user.uid}`);
  const initial = useRef<Draft | null>(null);
  if (!initial.current) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || '{}');
      const savedContext = typeof saved.context === 'string' ? saved.context : '';
      initial.current = {
        body: typeof saved.body === 'string' ? saved.body : '',
        context: question || savedContext,
        id: (!question || question === savedContext) && typeof saved.id === 'string' && !saved.id.includes('/') ? saved.id : null,
      };
    } catch { initial.current = { body: '', context: question, id: null }; }
  }
  const [body, setBody] = useState(initial.current.body);
  const [context, setContext] = useState(initial.current.context);
  const publishedBody = [context, body.trim()].filter(Boolean).join('\n\n');
  const textLimit = MAX_POST_LENGTH - (context ? context.length + 2 : 0);
  const [expanded, setExpanded] = useState(Boolean(initial.current.body));
  const id = useRef(initial.current.id);
  const [busy, setBusy] = useState(false); const [slow, setSlow] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(initial.current.body ? '이 탭에 저장된 초안을 복원했어요.' : '');
  const [storageError, setStorageError] = useState(false);
  function save(value: string, attached: string) {
    try { if (value || attached) sessionStorage.setItem(key, JSON.stringify({ body: value, context: attached, id: id.current })); else sessionStorage.removeItem(key); setStorageError(false); }
    catch { setStorageError(true); }
  }
  useEffect(() => { save(body, context); }, [body, context]); // UID별 컴포넌트가 새로 마운트된다.
  useEffect(() => {
    if (!body) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [body]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!db || busy) return;
    const invalid = validatePost(publishedBody); if (invalid) { setError(invalid); return; }
    if (!navigator.onLine) { setError('오프라인입니다. 초안을 보관했어요. 연결 후 다시 게시해 주세요.'); return; }
    const ref = id.current ? doc(db, 'posts', id.current) : doc(collection(db, 'posts'));
    id.current = ref.id; save(body, context); setBusy(true); onBusy(true); setError(''); setNotice('');
    const timer = window.setTimeout(() => setSlow(true), 8000);
    try {
      await runTransaction(db, async transaction => {
        const existing = await transaction.get(ref);
        if (existing.exists()) {
          if (existing.data().authorId !== user.uid || existing.data().body !== publishedBody) throw new Error('Post conflict');
          return;
        }
        transaction.set(ref, { body: publishedBody, authorId: user.uid, authorName: user.displayName?.trim().slice(0, 30) || '작성자', createdAt: serverTimestamp(), kind: 'post', originalId: null, tags: extractTags(publishedBody), deleted: false });
      });
      id.current = null; setBody(''); setContext(''); save('', ''); setExpanded(false); setNotice('글을 게시했어요.');
    } catch (e) { setError(errorMessage(e)); }
    finally { clearTimeout(timer); setSlow(false); setBusy(false); onBusy(false); }
  }
  if (!expanded && !alwaysExpanded) return <section className="panel composer" aria-label="새 글 작성"><div className="section-heading"><h2>나의 이야기</h2><button className="button primary" onClick={() => setExpanded(true)}><Icon name="plus" />새 글 쓰기</button></div>{body && <p className="muted">작성 중인 초안이 있어요.</p>}<p className="notice" role="status">{notice}</p></section>;
  return <section className="panel composer" aria-labelledby="composer-title">
    <div className="section-heading"><h2 id="composer-title">글 쓰기</h2>{!alwaysExpanded && <button className="button secondary" type="button" disabled={busy} onClick={() => setExpanded(false)}><Icon name="up" />접기</button>}</div>
    <form onSubmit={submit}>
      {context && <div className="question-context">
        <p className="attempt-prompt">{context}</p>
        <button type="button" className="plain-button" disabled={busy} onClick={() => { id.current = null; setContext(''); }}><Icon name="close" />문제 첨부 빼기</button>
      </div>}
      <label className="sr-only" htmlFor="body">게시할 글</label><textarea id="body" value={body} onChange={e => { id.current = null; setBody(e.target.value); setNotice(''); }} placeholder="무슨 생각을 하고 있나요? #태그도 남겨보세요." maxLength={textLimit} required disabled={busy} />
      <div className="composer-footer"><span className="muted">{publishedBody.length.toLocaleString()} / {MAX_POST_LENGTH.toLocaleString()}</span><div className="actions"><button className="button secondary" type="button" disabled={busy || !body} onClick={() => { if (confirm('저장된 초안을 지울까요?')) { id.current = null; setBody(''); setNotice(''); } }}><Icon name="trash" />초안 지우기</button><button className="button primary" disabled={busy || !body.trim() || publishedBody.length > MAX_POST_LENGTH}><Icon name="post" />{busy ? '게시 확인 중…' : '게시하기'}</button></div></div>
    </form>
    <p className="muted">광장 전체 회원 · #태그 최대 10개 · 탭 초안 자동 저장</p>
    {slow && <p role="status">서버 응답을 기다리고 있어요. 초안은 유지됩니다. 중복 게시를 막기 위해 완료를 기다려 주세요.</p>}
    {storageError && <p className="error" role="alert">브라우저 저장소를 사용할 수 없어 초안을 자동 보관하지 못했습니다.</p>}
    {error && <p className="error" role="alert">{error}</p>}<p className="notice" role="status">{notice}</p>
  </section>;
}
