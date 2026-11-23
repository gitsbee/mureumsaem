import { ModerationProvider, useVisibility } from './moderation';
import { VisibilitySettings } from './components/Moderation';
import { isPreview } from './storage';
import ProfileRecords from './components/ProfileRecords';
import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from './firebase';
import { errorMessage } from './model';
import { extractTags, matchesSearch } from './content.mjs';
import { useFeed } from './hooks/useFeed';
import { useProfile } from './hooks/useProfile';
import { useAuthorProfiles } from './hooks/useAuthorProfiles';
import { useActivity, usePopularity, type ActivityKind } from './hooks/useSignals';
import { base, goBack, navigate, useNavigation } from './hooks/useNavigation';
import { useTheme } from './hooks/useTheme';
import AccountForm from './components/AccountForm';
import Composer from './components/Composer';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';
import Support, { supportTitles, type Service, type SupportKind } from './components/Support';
import Settings from './components/Settings';
import Home from './components/Home';
import Icon from './components/Icon';
import Modal from './components/Modal';
import Header from './learning/Header';
import StudyScreen, { warmStudy, type StudyView, type StudyAction } from './learning/StudyScreen';
import { LearningRecords, Leaderboard } from './learning/LearningRecords';
import { koreanDay, subjects, type Subject } from './learning/daily';
import { flushAttempts, queueAttempt, type Attempt } from './learning/store';
import PageHeading from './components/PageHeading';
import PublicProfile, { ProfileSummary } from './components/PublicProfile';
import ProfileEditor from './components/ProfileEditor';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, value => { setUser(value); setAuthLoading(false); setAuthError(''); },
      error => { setAuthError(errorMessage(error)); setAuthLoading(false); });
  }, []);
  return <ModerationProvider uid={user?.uid}><Application user={user} authLoading={authLoading} authError={authError} /></ModerationProvider>;
}

function Application({ user, authLoading, authError }: { user: User | null; authLoading: boolean; authError: string }) {
  const route = useNavigation(); const { theme, setTheme } = useTheme();
  const visibility = useVisibility();
  const own = useProfile(user?.uid);
  const [registrationPending, setRegistrationPending] = useState(false);
  const [question, setQuestion] = useState('');
  const [posting, setPosting] = useState(false); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [mine, setMine] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [support, setSupport] = useState<{ kind: SupportKind; service: Service } | null>(null);
  const [activityKind, setActivityKind] = useState<ActivityKind | 'all'>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const [day, setDay] = useState(koreanDay);
  const [studyView, setStudyView] = useState<{ subject: Subject; view: StudyView } | null>(null);
  const [studyAction, setStudyAction] = useState<{ subject: Subject; name: StudyAction; id: number } | null>(null);
  useEffect(() => {
    setStudyView(null);
    setStudyAction(null);
    if (route.subject) warmStudy(route.subject);
  }, [route.subject]);
  const [sync, setSync] = useState('');
  const listing = !route.hub && !route.subject && !route.records && !route.ranking
    && !route.support && !route.me && !route.profileHandle && !route.settings;
  useEffect(() => {
    const closeOverlays = () => { setSettingsOpen(false); setSupport(null); };
    window.addEventListener('popstate', closeOverlays);
    return () => window.removeEventListener('popstate', closeOverlays);
  }, []);
  useEffect(() => {
    const refresh = () => setDay(koreanDay());
    const timer = window.setInterval(refresh, 5_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const account = user?.uid;
  const upload = useCallback(() => {
    if (!account) return;
    void flushAttempts(account).then(() => setSync(''), () => {
      setSync('풀이 기록을 아직 서버에 저장하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.');
    });
  }, [account]);
  useEffect(() => {
    setSync('');
    if (!account) return;
    upload();
    window.addEventListener('online', upload);
    return () => window.removeEventListener('online', upload);
  }, [account, upload]);
  const record = useCallback((attempt: Attempt) => {
    if (!account) return;
    try { queueAttempt(account, attempt); upload(); }
    catch { setSync('이 브라우저에 풀이 기록을 임시 저장할 수 없어요. 저장소 설정을 확인해 주세요.'); }
  }, [account, upload]);
  const feed = useFeed(listing); const authors = useAuthorProfiles(listing ? feed.posts : []);
  const popular = usePopularity(feed.posts, route.explore); const activity = useActivity(feed.posts, user?.uid, route.activity);
  const actor = user && own.profile ? { ...user, displayName: own.profile.name } as User : user;
  useEffect(() => { setMine(false); setError(''); }, [account]);
  useEffect(() => { if (route.search) searchRef.current?.focus(); }, [route.search]);
  function profile() { navigate(`${base}#/me`); }
  function compose() { setQuestion(''); if (user && own.profile) navigate(`${base}#/compose`); else profile(); }
  function askOnWall(subject: Subject, prompt: string) {
    setQuestion(`[${subjects[subject]} 문제]\n${prompt.trim().slice(0, 1200)}`);
    navigate(`${base}#/compose`);
  }
  function tagSearch(tag: string) { setSearch(`#${tag}`); navigate(`${base}#/search`); }
  async function logout() {
    if (!auth || posting) return;
    try { await signOut(auth); navigate(base); } catch (error) { setError(errorMessage(error)); }
  }
  const shownActivity = activity.items.filter(item => visibility.canSee(item.post) && (activityKind === 'all' || item.kind === activityKind));
  const source = route.explore ? popular : feed.posts;
  const visible = source.filter(post => !post.deleted && visibility.canSee(post) && (!mine || route.explore || post.authorId === user?.uid) && (!route.search || matchesSearch({ ...post, authorName: authors.get(post.authorId)?.name || post.authorName, authorHandle: authors.get(post.authorId)?.handle || '' }, search)));
  const tags = [...feed.posts.filter(post => !post.deleted && visibility.canSee(post)).flatMap(post => extractTags(post.body))].reduce((map, tag) => map.set(tag, (map.get(tag) || 0) + 1), new Map<string, number>());
  const topTags = [...tags].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const composer = actor && own.profile && !registrationPending ? <Composer key={actor.uid} user={actor} onBusy={setPosting} question={question} alwaysExpanded /> : null;
  const card = (post: typeof feed.posts[number], key?: string) => <PostCard key={key || post.id} post={post} user={user} onLogin={profile} onTag={tagSearch} />;
  const settings = <Settings theme={theme} setTheme={setTheme} signedIn={Boolean(user)} account={account || 'guest'}
    openSupport={kind => setSupport({ kind, service: 'pulim' })} />;
  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>본문으로 건너뛰기</a>
    <Header subject={route.subject} user={user} name={own.profile?.name || user?.displayName || undefined} loggedOut={logout}
      pulimTab={route.support ? undefined : route.hub ? 'home' : route.search ? 'search' : listing && !route.activity ? 'wall' : undefined}
      onSettings={() => setSettingsOpen(true)}
      view={studyView && studyView.subject === route.subject ? studyView.view : undefined}
      onStudyAction={name => {
        if (route.subject) setStudyAction({ subject: route.subject, name, id: Date.now() });
      }} />
    <main id="main" tabIndex={-1} className={route.subject ? "study-main" : "application-main setup-view"}>
      {isPreview && <p className="connection" role="status">개발 미리보기</p>}
      {(error || authError || visibility.error) && <p className="error" role="alert">{error || authError || visibility.error}</p>}
      {sync && <div className="connection sync-status" role="status">{sync} <button className="button secondary" onClick={upload}><Icon name="repeat" />동기화 다시 시도</button></div>}
      {route.subject && authLoading ? <section className="setup-view">
        <header className="page-intro"><h1>{subjects[route.subject]}</h1></header>
      </section> : route.subject ? <StudyScreen key={route.subject + ':' + (account || 'guest')}
        subject={route.subject} account={account || 'guest'} theme={theme} setTheme={setTheme} onAttempt={record} onQuestion={askOnWall}
        action={studyAction?.subject === route.subject ? studyAction : null}
        day={day}
        onSupport={(kind, service) => setSupport({ kind, service })}
        onView={view => setStudyView({ subject: route.subject!, view })} /> : route.hub ? <Home /> : route.records || route.ranking ? <>
        <PageHeading title={route.records ? '내 기록' : '온라인 랭킹'} back />
        {route.ranking ? <Leaderboard key={route.ranking + day} day={day} subject={route.ranking} uid={account} /> : authLoading ?
          <p role="status">계정 확인 중…</p> : <LearningRecords key={account || 'guest'} uid={account} onLogin={profile} />}
      </> : route.support ? <><PageHeading title={supportTitles[route.support]} back /><Support key={route.support} kind={route.support} /></> :
        route.settings ? <><PageHeading title="설정" back /><section className="panel settings-panel">{settings}</section></> : route.me ? <>
        {authLoading ? <p role="status">계정 확인 중…</p> : !user || registrationPending ? <>
          {auth ? <AccountForm onPending={setRegistrationPending}
            onClose={() => { setRegistrationPending(false); goBack(); }}
            onSuccess={() => { setRegistrationPending(false); navigate(`${base}#/me`, true); }} />
            : <p className="error">연결 설정을 확인해 주세요.</p>}
          {!registrationPending && <ProfileRecords key="guest-records" account="guest" />}
        </> : <>
          <PageHeading title="프로필" back />
          {own.loading ? <p role="status">프로필을 불러오는 중…</p> : own.error ? <p className="error" role="alert">{own.error}</p> : <>
            {own.profile && <ProfileSummary profile={own.profile} compact />}
            <ProfileEditor key={user.uid} user={user} profile={own.profile} />
          </>}
          <VisibilitySettings key={user.uid} uid={user.uid} />
          <ProfileRecords key={user.uid + '-records'} account={user.uid} />
        </>}
      </> : route.profileHandle ? <><PageHeading title="프로필" back /><PublicProfile key={route.profileHandle} handle={route.profileHandle} viewerId={account} /></> : route.activity ? <>
        <PageHeading title="내 활동" back />{!user ? <section className="panel"><p>로그인하면 내 활동을 볼 수 있어요.</p><button className="button secondary" onClick={profile}><Icon name="login" />로그인</button></section> : <><div className="filter-tabs activity-filters" aria-label="활동 종류">{(['all', 'like', 'dislike', 'repost'] as const).map(kind => <button className="plain-button nav-tab" key={kind} aria-pressed={activityKind === kind} onClick={() => setActivityKind(kind)}>{kind === 'all' ? '전체' : kind === 'like' ? '좋아요' : kind === 'dislike' ? '싫어요' : '리포스트'}</button>)}</div>{activity.loading && <p role="status">활동을 불러오는 중…</p>}{activity.error && <p className="error" role="alert">{activity.error}</p>}{shownActivity.map(item => <section key={`${item.kind}:${item.id}`} className="activity-item"><p className="activity-label"><Icon name={item.kind === 'like' ? 'like' : item.kind === 'dislike' ? 'dislike' : 'repeat'} />{item.kind === 'like' ? '좋아요한 글' : item.kind === 'dislike' ? '싫어요한 글' : '리포스트한 글'}</p>{card(item.post)}</section>)}{!activity.loading && shownActivity.length === 0 && <section className="panel empty"><p>아직 표시할 활동이 없어요.</p></section>}{feed.more && <button className="button secondary load-more" onClick={feed.loadMore} disabled={feed.loading}><Icon name="more" />이전 게시물 활동 더 확인하기</button>}</>}
      </> : <>
        <PageHeading title={route.search ? '담벼락 검색' : route.explore ? '탐색' : '담벼락'} />
        {!route.search && <div className="wall-actions"><button className="button primary action-start" onClick={compose}><Icon name="plus" />새 글 쓰기</button></div>}
        {route.search && <section className="expanding-search" aria-label="게시물 검색"><div className="search-field"><Icon name="search" /><input ref={searchRef} type="search" aria-label="검색어" placeholder="본문, @핸들 또는 #태그" value={search} onChange={event => setSearch(event.target.value)} /><button className="plain-button" aria-label="검색어 지우기" onClick={() => setSearch('')}><Icon name="close" /></button></div><p className="muted">현재 불러온 글에서 검색합니다.</p></section>}
        {(route.search || route.explore) && topTags.length > 0 && <section className="discovery" aria-label="자주 쓰인 태그"><div className="tags">{topTags.map(([tag, count]) => <button className="plain-button tag-link" key={tag} onClick={() => tagSearch(tag)}>#{tag}<span className="tag-count">{count}</span></button>)}</div></section>}
        {!route.explore && <div className="feed-toolbar"><div className="filter-tabs" aria-label="목록 필터"><button className="plain-button nav-tab" aria-pressed={!mine} onClick={() => setMine(false)}>모든 글</button><button className="plain-button nav-tab" aria-pressed={mine} disabled={!user} onClick={() => setMine(true)}>내 글</button></div><span className="muted">최신순</span></div>}
        {!auth || !db ? <section className="panel"><h2>연결을 준비하고 있어요.</h2></section> : <>{feed.cached && <p className="connection" role="status">서버 연결 확인 중</p>}{feed.error ? <section className="panel"><p className="error" role="alert">{feed.error}</p><button className="button secondary" onClick={feed.retry}><Icon name="repeat" />다시 불러오기</button></section> : <>{feed.loading && <p role="status">불러오는 중…</p>}<div className="posts">{!visibility.loading && visible.map(post => card(post))}</div>{!visibility.loading && !feed.loading && visible.length === 0 && <section className="panel empty"><h2>{feed.cached ? '서버 연결을 기다리고 있어요.' : route.search || mine ? '조건에 맞는 글이 없어요.' : '첫 번째 글을 남겨보세요.'}</h2></section>}{feed.more && <button className="button secondary load-more" disabled={feed.loading || feed.cached} onClick={feed.loadMore}><Icon name="more" />이전 글 50개 더 불러오기</button>}<p className="feed-scope muted">불러온 글 {feed.posts.filter(post => !post.deleted && visibility.canSee(post)).length}개</p></>}</>}
      </>}
      {!route.subject && <footer><span>© {new Date().getFullYear()} 물음샘</span><div className="footer-links"><a href={`${base}About/`}>소개</a><a href={`${base}#/help`}>도움말</a></div></footer>}
    </main>
    {route.compose && (composer || question) && <Modal title={question ? '담벼락에 질문하기' : '새 글 쓰기'} onClose={() => {
      if (!posting) { setQuestion(''); goBack(); }
    }}>{composer || (auth ? !user || registrationPending ? <AccountForm onPending={setRegistrationPending}
      onSuccess={() => setRegistrationPending(false)} onClose={() => { setQuestion(''); goBack(); }} />
      : own.loading ? <p role="status">프로필을 불러오는 중…</p> : own.error ? <p role="alert">{own.error}</p>
      : <ProfileEditor user={user} profile={own.profile} /> : <p>질문을 작성하려면 계정 연결이 필요해요.</p>)}</Modal>}
    {route.postId && <PostDetail key={route.postId} id={route.postId} user={user} onClose={goBack} onLogin={profile} onTag={tagSearch} />}
    {settingsOpen && !route.settings && <Modal title="설정" onClose={() => setSettingsOpen(false)} preferences>{settings}</Modal>}
    {support && <Modal title={supportTitles[support.kind]} onClose={() => setSupport(null)} preferences>
      <Support key={support.kind + support.service} kind={support.kind} initialService={support.service} />
    </Modal>}
  </>;
}
