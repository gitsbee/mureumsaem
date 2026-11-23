import { useId, useState, type FormEvent } from 'react';
import { changeVisibility, reportContent, reportReasons, useVisibility, type ReportReason, type ReportTarget } from '../moderation';
import { errorMessage } from '../model';
import { useOriginalPost } from '../hooks/useOriginalPost';
import Icon from './Icon';
import Identity from './Identity';
import Modal from './Modal';

export function ReportDialog({ uid, target, onClose }: { uid: string; target: ReportTarget; onClose: () => void }) {
  const field = useId();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !reason) return;
    setBusy(true);
    setError('');
    try {
      const sent = await reportContent(uid, target, reason, note);
      setMessage(sent ? '신고를 접수했어요.' : '이미 신고한 내용이에요.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <Modal title={target.commentId ? '댓글 신고' : '게시물 신고'} onClose={() => { if (!busy) onClose(); }}>
    {message ? <p role="status">{message}</p> : <form className="report-form" onSubmit={submit}>
      <label htmlFor={field + "-reason"}>신고 이유</label>
      <select value={reason} id={field + "-reason"} required disabled={busy} onChange={event => setReason(event.target.value as ReportReason)}>
        <option value="">선택해 주세요</option>
        {Object.entries(reportReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <label htmlFor={field + "-note"}>추가 설명 (선택)</label>
      <textarea id={field + "-note"} value={note} onChange={event => setNote(event.target.value)} maxLength={500} disabled={busy} />
      <button className="button primary" disabled={!reason || busy}><Icon name="flag" />{busy ? '보내는 중…' : '신고 보내기'}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>}
  </Modal>;
}

function HiddenPostName({ id }: { id: string }) {
  const { post } = useOriginalPost(id);
  return <span>{post && !post.deleted && post.body ? post.body.slice(0, 55) : '숨긴 게시물'}</span>;
}

export function VisibilitySettings({ uid }: { uid: string }) {
  const { hidden, blocked, loading, error } = useVisibility();
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  async function restore(kind: 'hiddenPosts' | 'blockedAuthors', id: string) {
    setBusy(true);
    setFailure('');
    try { await changeVisibility(uid, kind, id, false); }
    catch (cause) { setFailure(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <section className="panel">
    <h2>숨김 및 차단</h2>
    <p>숨김과 차단은 로그인한 계정에 적용됩니다.</p>
    {loading && <p role="status">목록을 불러오는 중…</p>}
    {(failure || error) && <p role="alert" className="error">{failure || error}</p>}
    {!loading && !hidden.size && !blocked.size && <p>숨긴 글이나 차단한 계정이 없어요.</p>}
    {Boolean(hidden.size) && <ul className="learning-list" aria-label="숨긴 글">{[...hidden].map(id =>
      <li key={id}><HiddenPostName id={id} /><button className="plain-button" disabled={busy} onClick={() => void restore('hiddenPosts', id)}><Icon name="eye" />숨김 해제</button></li>
    )}</ul>}
    {Boolean(blocked.size) && <ul className="learning-list" aria-label="차단한 계정">{[...blocked].map(id =>
      <li key={id}><Identity uid={id} fallback="차단한 계정" linked={false} /><button className="plain-button" disabled={busy} onClick={() => void restore('blockedAuthors', id)}><Icon name="close" />차단 해제</button></li>
    )}</ul>}
  </section>;
}

export function BlockAuthorButton({ uid, authorId, onError }: { uid: string; authorId: string; onError: (value: string) => void }) {
  const { blocked, loading } = useVisibility();
  const active = blocked.has(authorId);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (!active && !confirm('이 계정의 글과 댓글을 숨기고 새 댓글, 반응, 리포스트를 서로 제한할까요?')) return;
    setBusy(true);
    onError('');
    try { await changeVisibility(uid, 'blockedAuthors', authorId, !active); }
    catch (cause) { onError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <button type="button" className="plain-button" disabled={loading || busy} onClick={() => void toggle()}>
    <Icon name={active ? 'close' : 'block'} />{active ? '차단 해제' : '작성자 차단'}
  </button>;
}
