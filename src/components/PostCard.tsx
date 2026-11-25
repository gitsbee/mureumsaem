import { changeVisibility, useVisibility } from '../moderation';
import { ReportDialog } from './Moderation';
import { useEffect, useId, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { readPost, dateLabel, errorMessage, type Post, type Reaction, type ReactionKind } from '../model';
import { deletePost, editPost, postLink, reactTo } from '../data';
import { validatePost, validateRepost } from '../validation.mjs';
import { extractTags } from '../content.mjs';
import { useOriginalPost } from '../hooks/useOriginalPost';
import { useProfile } from '../hooks/useProfile';
import Modal from './Modal';
import Identity from './Identity';
import Icon from './Icon';
import PostMenu from './PostMenu';
import OriginalReference from './OriginalReference';
import RepostComposer from './RepostComposer';
import { navigate } from '../hooks/useNavigation';

export default function PostCard({ post, user, onLogin, onTag, onComments }: { post: Post; user: User | null; onLogin: () => void; onTag: (tag: string) => void; onComments?: () => void }) {
  const visibility = useVisibility();
  const [reportOpen, setReportOpen] = useState(false);
  const editId = useId();
  const isRepost = post.kind === 'repost';
  const original = useOriginalPost(isRepost ? post.originalId : null);
  const originalVisible = original.post && visibility.canSee(original.post);
  const repostTarget = isRepost ? (originalVisible ? original.post : null) : post;
  const repostTargetId = isRepost ? post.originalId : post.id;
  const canRepost = repostTarget?.kind === 'post' && !repostTarget.deleted;
  const { profile: mine } = useProfile(user?.uid);
  const { profile: author } = useProfile(post.authorId);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [repostCount, setRepostCount] = useState(0); const [ownRepost, setOwnRepost] = useState<Post | null>(null);
  const [repostsLoaded, setRepostsLoaded] = useState(false); const [repostOpen, setRepostOpen] = useState(false); const [commentCount, setCommentCount] = useState(0);
  const [own, setOwn] = useState<ReactionKind | null>(null);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(false); const [info, setInfo] = useState(false);
  const [body, setBody] = useState(post.body); const [people, setPeople] = useState<Reaction[] | null>(null);
  useEffect(() => { setBody(post.body); }, [post.body]);
  useEffect(() => { if (editing) document.getElementById(editId)?.focus(); }, [editing, editId]);
  useEffect(() => {
    setCounts({ likes: 0, dislikes: 0 }); setOwn(null); setPeople(null); setError(''); setCommentCount(0);
    if (!db || post.deleted) return;
    const stopComments = onSnapshot(doc(db, 'posts', post.id, 'stats', 'comments'), snapshot => setCommentCount(snapshot.data()?.count || 0), error => setError(errorMessage(error)));
    const parent = doc(db, 'posts', post.id);
    const stopStats = onSnapshot(doc(parent, 'stats', 'reactions'), snapshot => {
      setCounts({ likes: snapshot.data()?.likes || 0, dislikes: snapshot.data()?.dislikes || 0 });
    }, e => setError(errorMessage(e)));
    const stopOwn = user ? onSnapshot(doc(parent, 'reactions', user.uid), snapshot => setOwn(snapshot.data()?.kind || null), e => setError(errorMessage(e))) : () => {};
    return () => { stopStats(); stopOwn(); stopComments(); };
  }, [post.id, post.deleted, user?.uid]);
  useEffect(() => {
    setRepostCount(0); setOwnRepost(null); setRepostsLoaded(false);
    if (!db || !repostTargetId || !canRepost) return;
    return onSnapshot(query(collection(db, 'posts'), where('originalId', '==', repostTargetId)), snapshot => {
      const active = snapshot.docs.filter(item => item.data().kind === 'repost' && !item.data().deleted);
      setRepostCount(active.length);
      setOwnRepost(active.map(readPost).find(item => item?.authorId === user?.uid) || null);
      setRepostsLoaded(true);
    }, e => setError(errorMessage(e)));
  }, [repostTargetId, canRepost, user?.uid]);
  async function act(action: () => Promise<void>, message: string) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  function reaction(kind: ReactionKind) {
    if (!user || !mine) { onLogin(); return; }
    void act(() => reactTo(post, { ...user, displayName: mine.name } as User, kind), own === kind ? '반응을 취소했어요.' : '반응을 반영했어요.');
  }
  async function showPeople() {
    if (!db || user?.uid !== post.authorId) return;
    await act(async () => {
      const result = await getDocs(collection(db!, 'posts', post.id, 'reactions'));
      setPeople(result.docs.map(item => ({ uid: item.id, name: item.data().name, kind: item.data().kind })));
    }, '');
  }
  function submitEdit(event: FormEvent) {
    event.preventDefault(); const invalid = post.kind === 'repost' ? validateRepost(body) : validatePost(body);
    if (invalid) { setError(invalid); return; }
    void act(async () => { await editPost(post, body); setEditing(false); }, '글을 수정했어요.');
  }
  if (post.deleted) return <article className="panel post"><p>삭제된 게시물입니다.</p></article>;
  return <article className="panel post" aria-label={`${author?.name || post.authorName}의 ${post.kind === 'repost' ? '리포스트' : '글'}`}>
    <div className="post-heading"><div className="post-author"><Identity uid={post.authorId} fallback={post.authorName} /><a className="post-time" href={postLink(post.id)}>{dateLabel(post.createdAt)}{post.updatedAt ? ' · 수정됨' : ''}</a></div><div className="post-badges">{isRepost && <span className="context-chip" data-tone="violet"><Icon name="repeat" />리포스트</span>}{user?.uid === post.authorId && <span className="context-chip" data-tone="info"><Icon name="person" />내 글</span>}</div></div>
    {editing ? <form onSubmit={submitEdit}><label htmlFor={editId}>글 수정</label><textarea id={editId} value={body} onChange={event => setBody(event.target.value)} maxLength={2000} required={post.kind === 'post'} disabled={busy} /><div className="actions"><button className="button primary" disabled={busy}><Icon name="save" />저장</button><button className="button secondary" type="button" disabled={busy} onClick={() => { setEditing(false); setBody(post.body); }}><Icon name="close" />취소</button></div></form> : <>{post.body && <p className="post-body">{post.body}</p>}<div className="tags">{extractTags(post.body).map(tag => <button key={tag} className="plain-button tag-link" onClick={() => onTag(tag)}>#{tag}</button>)}</div></>}
    {isRepost && <OriginalReference original={originalVisible ? original.post : null} status={original.post && !originalVisible ? 'hidden' : original.status} />}
    <div className="post-actions">
      <div className="reaction-actions"><button className="plain-button reaction-button" disabled={busy} aria-label={`좋아요 ${counts.likes}`} title="좋아요" aria-pressed={own === 'like'} onClick={() => reaction('like')}><Icon name="like" filled={own === 'like'} /><span aria-hidden="true">{counts.likes}</span></button><button className="plain-button reaction-button" disabled={busy} aria-label={`싫어요 ${counts.dislikes}`} title="싫어요" aria-pressed={own === 'dislike'} onClick={() => reaction('dislike')}><Icon name="dislike" filled={own === 'dislike'} /><span aria-hidden="true">{counts.dislikes}</span></button><button className="plain-button reaction-button repost-action" disabled={busy || !canRepost || !repostsLoaded} aria-label={`${isRepost ? '원문 ' : ''}리포스트 ${repostCount}`} title={!canRepost ? '리포스트할 수 없는 원문' : isRepost ? (ownRepost ? '원문 리포스트 수정' : '원문 리포스트하기') : (ownRepost ? '리포스트 수정' : '리포스트')} aria-pressed={Boolean(ownRepost)} onClick={() => user && mine ? setRepostOpen(true) : onLogin()}><Icon name="repeat" /><span aria-hidden="true">{repostCount}</span></button><button className="plain-button reaction-button" aria-label={`댓글 ${commentCount}`} title="댓글" onClick={() => onComments ? onComments() : navigate(postLink(post.id))}><Icon name="comment" /><span aria-hidden="true">{commentCount}</span></button></div>
      <PostMenu><button className="plain-button" onClick={() => setInfo(true)}><Icon name="info" />게시물 정보</button><button className="plain-button" onClick={() => void act(async () => { await navigator.clipboard.writeText(postLink(post.id)); }, '링크를 복사했어요.')} disabled={busy}><Icon name="link" />링크 복사</button>{user?.uid !== post.authorId && <>
        <button className="plain-button" onClick={() => user ? setReportOpen(true) : onLogin()}><Icon name="flag" />신고</button>
        <button className="plain-button" disabled={busy} onClick={() => user ? void act(() => changeVisibility(user.uid, 'hiddenPosts', post.id, true), '') : onLogin()}><Icon name="eye-off" />이 글 숨기기</button>
        <button className="plain-button" disabled={busy} onClick={() => {
          if (!user) { onLogin(); return; }
          if (confirm('이 계정의 글과 댓글을 숨기고 새 댓글, 반응, 리포스트를 서로 제한할까요?')) void act(() => changeVisibility(user.uid, 'blockedAuthors', post.authorId, true), '');
        }}><Icon name="block" />작성자 차단</button>
      </>}{user?.uid === post.authorId && <><button className="plain-button" disabled={busy} onClick={showPeople}><Icon name="users" />반응한 사람</button><button className="plain-button" disabled={busy} onClick={() => setEditing(true)}><Icon name="edit" />수정</button><button className="plain-button danger" disabled={busy} onClick={() => { if (confirm('이 게시물을 삭제할까요? 본문은 복구할 수 없습니다.')) void act(() => deletePost(post), '삭제했어요.'); }}><Icon name="trash" />삭제</button></>}</PostMenu>
    </div>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {repostOpen && repostTarget && user && mine && <RepostComposer original={repostTarget} existing={ownRepost} user={{ ...user, displayName: mine.name } as User} onClose={() => setRepostOpen(false)} onSaved={message => { setNotice(message); setRepostOpen(false); }} />}
    {reportOpen && user && <ReportDialog uid={user.uid} target={{ postId: post.id }} onClose={() => setReportOpen(false)} />}
    {info && <Modal title="게시물 정보" onClose={() => setInfo(false)}><dl className="post-info"><dt>작성자</dt><dd><Identity uid={post.authorId} fallback={post.authorName} /></dd><dt>작성일</dt><dd>{dateLabel(post.createdAt)}</dd>{post.updatedAt && <><dt>수정일</dt><dd>{dateLabel(post.updatedAt)}</dd></>}<dt>유형</dt><dd>{post.kind === 'repost' ? '리포스트' : '일반 글'}</dd><dt>공개 범위</dt><dd>광장 전체 회원</dd></dl></Modal>}
    {people !== null && user?.uid === post.authorId && <Modal title="반응한 사람 · 작성자만 공개" onClose={() => setPeople(null)}>{people.length ? <ul className="people">{people.map(person => <li key={person.uid}><Identity uid={person.uid} fallback={person.name} /><span className="muted"><Icon name={person.kind === 'like' ? 'like' : 'dislike'} filled />{person.kind === 'like' ? '좋아요' : '싫어요'}</span></li>)}</ul> : <p>아직 반응이 없습니다.</p>}</Modal>}
  </article>;
}
