import { useEffect, useState, type FormEvent } from 'react';
import { collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, limit, serverTimestamp, setDoc, writeBatch, where, type Timestamp, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { useVisibility } from '../moderation';
import { errorMessage } from '../model';
import Icon from '../components/Icon';
import Identity from '../components/Identity';
import { schoolYear, type Enrollment } from './account';
import { useSchool } from './School';

const groups = { class: '학급', study: '스터디' } as const;
type Kind = keyof typeof groups;
type Group = { id: string; name: string; kind: Kind; owner: string; transferredAt?: Timestamp };
type GroupPost = { id: string; body: string; authorId: string; hidden: boolean };
const codePattern = /^[a-f0-9]{32}$/;
const groupRef = (id: string) => doc(db!, 'harueumGroups', id);
const countRef = (uid: string) => doc(db!, 'users', uid, 'harueum', 'ownedGroups');
const personalRef = (uid: string, id: string) => doc(db!, 'users', uid, 'harueumMemberships', id);

function useRows<T>(path: string, sorted = false) {
  const [state, setState] = useState<{ path: string; rows: T[]; error: string }>();
  useEffect(() => {
    if (!db || !path) return;
    const ref = collection(db, path);
    const source = sorted ? path.endsWith('/posts')
      ? query(ref, where('hidden', '==', false), orderBy('createdAt', 'desc'), limit(30))
      : query(ref, orderBy('createdAt', 'desc'), limit(30))
      : ref;
    return onSnapshot(source, snapshot => setState({
      path, rows: snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as T), error: '',
    }), cause => setState({ path, rows: [], error: errorMessage(cause) }));
  }, [path, sorted]);
  return state?.path === path ? state : { rows: [] as T[], error: '' };
}

function GroupComments({ uid, group, post }: { uid: string; group: string; post: string }) {
  const path = `harueumGroups/${group}/posts/${post}/comments`;
  const comments = useRows<GroupPost>(path, true);
  const { blocked } = useVisibility();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get('body') ?? '').trim();
    if (!body) return;
    setBusy(true);
    setError('');
    try {
      await setDoc(doc(collection(db, path)), { body, authorId: uid, createdAt: serverTimestamp() });
      form.reset();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!db) return;
    try { await deleteDoc(doc(db, path, id)); }
    catch (cause) { setError(errorMessage(cause)); }
  }
  return <div className="harueum-comments">
    {comments.rows.filter(comment => !blocked.has(comment.authorId)).map(comment => <div key={comment.id}><Identity uid={comment.authorId} fallback="그룹원" />
      <p className="harueum-preserve">{comment.body}</p>
      {comment.authorId === uid && <button className="plain-button" onClick={() => void remove(comment.id)}><Icon name="trash" />내 댓글 삭제</button>}
    </div>)}
    <form className="harueum-form" onSubmit={submit}>
      <label>댓글<input name="body" required maxLength={1000} /></label>
      <button className="button secondary" disabled={busy}><Icon name="comment" />등록</button>
    </form>
    {(error || comments.error) && <p className="error" role="alert">{error || comments.error}</p>}
  </div>;
}

function GroupRoom({ group, uid, stories, onBack }: { group: Group; uid: string; stories: boolean; onBack: () => void }) {
  const owner = group.owner === uid;
  const { blocked } = useVisibility();
  const path = 'harueumGroups/' + group.id;
  const requests = useRows<{ id: string }>(owner ? path + '/requests' : '');
  const posts = useRows<GroupPost>(stories ? path + '/posts' : '', true);
  const [confirmTime, setConfirmTime] = useState<number>();
  const noticeRef = doc(groupRef(group.id), 'transferNotices', uid);
  useEffect(() => onSnapshot(doc(groupRef(group.id), 'transferNotices', uid), snap => {
    setConfirmTime(snap.data()?.transfer?.toMillis());
  }, () => setConfirmTime(undefined)), [group.id, uid]);
  const transferTime = group.transferredAt?.toMillis();
  const needsConfirmation = !owner && transferTime !== undefined && transferTime !== confirmTime;
  const [transferOpen, setTransferOpen] = useState(false);
  const [openComments, setOpenComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function perform(action: () => Promise<void>, message = '') {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); }
    catch (cause) { setError(cause instanceof Error && !('code' in cause) ? cause.message : errorMessage(cause)); }
    finally { setBusy(false); }
  }
  function review(person: string, accept: boolean) {
    if (!db) return;
    const store = db;
    void perform(async () => {
      const batch = writeBatch(store);
      if (accept) {
        batch.set(doc(groupRef(group.id), 'members', person), { policy: 1, joinedAt: serverTimestamp() });
        batch.set(personalRef(person, group.id), { joinedAt: serverTimestamp() });
      }
      batch.delete(doc(groupRef(group.id), 'requests', person));
      await batch.commit();
    });
  }
  function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy || !owner) return;
    const store = db;
    const handle = String(new FormData(event.currentTarget).get('handle') ?? '').trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z][a-z0-9_]{2,19}$/.test(handle)) { setError('이양 대상의 핸들을 확인해 주세요.'); return; }
    if (!confirm('@' + handle + '에게 그룹장 권한을 즉시 이양할까요? 현재 그룹장 권한은 종료됩니다.')) return;
    void perform(async () => {
      const lookup = await getDoc(doc(store, 'handles', handle));
      const nextOwner = lookup.data()?.uid;
      if (!nextOwner || nextOwner === uid) throw new Error('이양 가능한 그룹원을 지정해 주세요.');
      const batch = writeBatch(store);
      batch.update(groupRef(group.id), { owner: nextOwner, transferredAt: serverTimestamp() });
      batch.set(countRef(uid), { count: increment(-1), group: group.id, at: serverTimestamp() }, { merge: true });
      batch.set(countRef(nextOwner), { count: increment(1), group: group.id, at: serverTimestamp() }, { merge: true });
      await batch.commit();
      setTransferOpen(false);
    }, '그룹장 권한을 이양했어요.');
  }
  async function leave() {
    if (!db || !confirm('이 그룹에서 나갈까요? 그룹의 글을 볼 수 없게 됩니다.')) return;
    const store = db;
    await perform(async () => {
      const batch = writeBatch(store);
      batch.delete(doc(groupRef(group.id), 'members', uid));
      batch.delete(personalRef(uid, group.id));
      await batch.commit();
      onBack();
    });
  }
  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get('body') ?? '').trim();
    if (!body) return;
    if (/https?:|www\.|(?:^|\s)@[a-z0-9_]/i.test(body)) { setError('그룹 이야기에는 웹 주소와 외부 연락처를 넣을 수 없어요.'); return; }
    const store = db;
    await perform(async () => {
      await setDoc(doc(collection(store, path, 'posts')), { authorId: uid, body, hidden: false, createdAt: serverTimestamp() });
      form.reset();
    });
  }
  function report(postId = 'group') {
    if (!db) return;
    const reason = prompt('운영자에게 전달할 신고 사유를 적어 주세요. 개인정보는 입력하지 마세요.')?.trim();
    if (!reason) return;
    if (reason.length > 500) { setError('신고 사유는 500자까지 입력할 수 있어요.'); return; }
    const store = db;
    void perform(() => setDoc(doc(store, 'users', uid, 'harueumGroupReports', group.id + '_' + postId), {
      groupId: group.id, target: postId, reason, createdAt: serverTimestamp(),
    }), '운영자에게 신고를 보냈어요.');
  }
  return <>
    <div className="actions"><button className="plain-button" onClick={onBack}><Icon name="back" />그룹 목록</button>
      <button className="plain-button" onClick={() => report()} disabled={busy}><Icon name="flag" />그룹 신고</button>
      {!owner && <button className="plain-button" onClick={() => void leave()} disabled={busy}><Icon name="logout" />그룹 나가기</button>}
    </div>
    <section className="panel harueum-section">
      <h2 className="harueum-heading"><Icon name={group.kind === 'class' ? 'book' : 'target'} />{group.name}</h2>
      <span className="context-chip"><Icon name="users" />{groups[group.kind]} · 가입한 그룹</span>
      {owner && <p className="harueum-preserve">초대 코드 <code>{group.id}</code></p>}
      {owner && <button className="plain-button" onClick={() => setTransferOpen(value => !value)}><Icon name="users" />그룹장 이양</button>}
      {owner && transferOpen && <form className="harueum-form" onSubmit={transfer}>
        <label>대상 그룹원 핸들<input name="handle" required maxLength={21} placeholder="@handle" /></label>
        <button className="button secondary" disabled={busy}><Icon name="check" />이양 확인</button>
      </form>}
      {owner && requests.rows.length > 0 && <section><h3>가입 요청</h3>
        {requests.rows.map(person => <div className="harueum-action" key={person.id}><Identity uid={person.id} fallback="가입 신청자" />
          <button className="button primary" disabled={busy} onClick={() => review(person.id, true)}><Icon name="check" />승인</button>
          <button className="button secondary" disabled={busy} onClick={() => review(person.id, false)}><Icon name="close" />거절</button>
        </div>)}
      </section>}
    </section>
    {needsConfirmation && <section className="panel harueum-section">
      <h3>그룹장이 변경되었어요</h3>
      <p>새 그룹장은 회원이 변경 안내를 확인한 뒤, 그룹에서 허용된 범위의 상세 통계만 볼 수 있어요. 확인을 미뤄도 그룹에 남을 수 있어요.</p>
      <button className="button secondary" disabled={busy} onClick={() => void perform(() => setDoc(noticeRef, {
        transfer: group.transferredAt, confirmedAt: serverTimestamp(),
      }), '이양 안내를 확인했어요.')}><Icon name="check" />이양 안내 확인</button>
    </section>}
    {stories ? <>
      <form className="panel harueum-form harueum-section" onSubmit={post}>
        <h3>그룹 이야기 쓰기</h3><span className="context-chip" data-tone="info"><Icon name="users" />승인된 그룹원에게 공개</span>
        <label>게시할 글<textarea name="body" maxLength={2000} required /></label>
        <button className="button primary" disabled={busy}><Icon name="edit" />게시하기</button>
      </form>
      <div className="harueum-group-list">
        {posts.rows.filter(item => !item.hidden && !blocked.has(item.authorId)).map(item => <article className="panel" key={item.id}>
          <Identity uid={item.authorId} fallback="그룹원" />
          <p className="harueum-preserve">{item.body}</p>
          <div className="actions">
            <button className="plain-button" aria-expanded={openComments === item.id} onClick={() => setOpenComments(current => current === item.id ? '' : item.id)}><Icon name="comment" />댓글</button>
            <button className="plain-button" onClick={() => report(item.id)} disabled={busy}><Icon name="flag" />글 신고</button>
            {(owner || item.authorId === uid) && <button className="plain-button" disabled={busy} onClick={() => {
              if (!db || !confirm('이 글을 그룹에서 숨길까요?')) return;
              const ref = doc(db, path, 'posts', item.id);
              void perform(() => setDoc(ref, { hidden: true, body: item.authorId === uid ? '' : item.body }, { merge: true }));
            }}><Icon name={item.authorId === uid ? 'trash' : 'eye-off'} />{item.authorId === uid ? '글 삭제' : '글 숨기기'}</button>}
          </div>
          {openComments === item.id && <GroupComments group={group.id} post={item.id} uid={uid} />}
        </article>)}
      </div>
    </> : <p className="muted">그룹 이야기 공개를 준비 중이에요.</p>}
    {(error || requests.error || posts.error) && <p className="error" role="alert">{error || requests.error || posts.error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
  </>;
}

export default function Groups({ uid, enrollment, enabled, stories }: { uid: string; enrollment: Enrollment | null; enabled: boolean; stories: boolean }) {
  const school = useSchool(uid);
  const membership = useRows<{ id: string }>(enabled ? 'users/' + uid + '/harueumMemberships' : '');
  const [joined, setJoined] = useState<Group[]>([]);
  const [selected, setSelected] = useState('');
  const [invitation, setInvitation] = useState<{ id: string; name: string; kind: Kind }>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const ids = membership.rows.map(item => item.id).sort().join(',');
  useEffect(() => {
    if (!db || !ids) return;
    const stops = ids.split(',').map(id => onSnapshot(groupRef(id), snap => {
      setJoined(current => [...current.filter(item => item.id !== id), ...(snap.exists() ? [{ ...snap.data(), id } as Group] : [])]);
    }, cause => setError(errorMessage(cause))));
    return () => stops.forEach(stop => stop());
  }, [ids]);
  const allowed: Kind[] = [];
  if (enrollment) {
    if (school && (enrollment.type === 'student' || enrollment.stage === 'school')) allowed.push('class');
    if (enrollment.type === 'student' || enrollment.stage === 'study') allowed.push('study');
  }
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error && !('code' in cause) ? cause.message : errorMessage(cause)); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy) return;
    const store = db;
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') ?? '').trim();
    const kind = String(values.get('kind')) as Kind;
    if (!name || !allowed.includes(kind)) return;
    void perform(async () => {
      const id = crypto.randomUUID().replaceAll('-', '');
      const info = { name, kind, ...(kind === 'class' && school ? { ...school, year: schoolYear() } : {}) };
      const batch = writeBatch(store);
      batch.set(groupRef(id), { ...info, owner: uid, createdAt: serverTimestamp() });
      batch.set(doc(store, 'harueumInvites', id), info);
      batch.set(doc(groupRef(id), 'members', uid), { policy: 1, joinedAt: serverTimestamp() });
      batch.set(personalRef(uid, id), { joinedAt: serverTimestamp() });
      batch.set(countRef(uid), { count: increment(1), group: id, at: serverTimestamp() }, { merge: true });
      await batch.commit();
      setCreating(false);
      setSelected(id);
    });
  }
  function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy) return;
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim().toLowerCase();
    if (!codePattern.test(code)) { setError('32자리 초대 코드를 확인해 주세요.'); return; }
    const store = db;
    void perform(async () => {
      setInvitation(undefined);
      const snap = await getDoc(doc(store, 'harueumInvites', code));
      if (!snap.exists()) throw new Error('그룹을 찾지 못했어요.');
      setInvitation({ ...(snap.data() as { name: string; kind: Kind }), id: code });
    });
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation || busy) return;
    const target = invitation;
    void perform(async () => {
      const ref = doc(groupRef(target.id), 'requests', uid);
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        const data: DocumentData = { policy: 1, createdAt: serverTimestamp() };
        await setDoc(ref, data);
      }
      setNotice('가입 요청을 보냈어요. 그룹장이 승인하면 내 그룹에 나타납니다.');
      setInvitation(undefined);
    });
  }
  if (!enabled) return <section className="panel"><h2>그룹</h2><p>그룹 이용을 준비 중이에요.</p></section>;
  const available = joined.filter(group => membership.rows.some(item => item.id === group.id));
  const active = available.find(group => group.id === selected);
  if (active) return <GroupRoom key={active.id} group={active} uid={uid} stories={stories} onBack={() => setSelected('')} />;
  return <>
    <section className="panel harueum-section">
      <h2 className="harueum-heading"><Icon name="users" />내 그룹</h2>
      {available.length === 0 && <p className="muted">아직 가입한 그룹이 없어요.</p>}
      <div className="harueum-group-list">{available.map(group => <button type="button" key={group.id} className="button secondary" onClick={() => setSelected(group.id)}>
        <Icon name={group.kind === 'study' ? 'target' : 'book'} />{group.name} · {groups[group.kind]}
      </button>)}</div>
      {allowed.length > 0 && <button className="plain-button" onClick={() => setCreating(value => !value)}><Icon name="plus" />새 그룹 만들기</button>}
      {creating && <form className="harueum-form" onSubmit={create}>
        <label>그룹 이름<input name="name" placeholder="개인정보가 포함되지 않은 이름" required maxLength={60} /></label>
        <label>그룹 유형<select name="kind">{allowed.map(kind => <option key={kind} value={kind}>{groups[kind]}</option>)}</select></label>
        <button className="button primary" disabled={busy}><Icon name="plus" />개설</button>
      </form>}
    </section>
    {enrollment ? <section className="panel">
      <h2>초대 코드로 가입</h2>
      <form className="harueum-form" onSubmit={find}><label>초대 코드<input name="code" autoComplete="off" required maxLength={32} /></label>
        <button className="button secondary" disabled={busy}><Icon name="search" />그룹 찾기</button>
      </form>
      {invitation && <form className="harueum-form harueum-section" onSubmit={apply}>
        <h3>{invitation.name} · {groups[invitation.kind]}</h3>
        <p>닉네임, 핸들, 그룹 이야기의 글과 댓글은 가입 기간 동안 승인된 그룹원에게 보입니다.</p>
        <label className="confirmation"><input type="checkbox" required />공유 범위를 확인했습니다.</label>
        <button className="button primary" disabled={busy}><Icon name="check" />가입 요청</button>
      </form>}
    </section> : <p>나 화면에서 계정 유형을 설정하면 초대 코드로 가입할 수 있어요.</p>}
    {(error || membership.error) && <p className="error" role="alert">{error || membership.error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
  </>;
}
