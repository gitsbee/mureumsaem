import { ModerationProvider, useVisibility } from './moderation';
import { VisibilitySettings } from './components/Moderation';
import { isPreview, storageKey } from './storage';
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
import Navigation, { type Tab } from './harueum/Navigation';
import Planner from './harueum/Planner';
import Groups from './harueum/Groups';
import School from './harueum/School';
import StudyHome from './harueum/StudyHome';
import EnrollmentFields from './harueum/EnrollmentFields';
import { saveEnrollment, useEnrollment, useRelease, type AccountType } from './harueum/account';
import Icon from './components/Icon';
import Modal from './components/Modal';
import StudyScreen, { warmStudy, type StudyView, type StudyAction } from './learning/StudyScreen';
import { LearningRecords } from './learning/LearningRecords';
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
  const release = useRelease();
  const enrollment = useEnrollment(user?.uid);
  const [labels, setLabels] = useState(() => { try { return localStorage.getItem(storageKey('tab-labels')) === 'true'; } catch { return false; } });
  const [editingProfile, setEditingProfile] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState('');
  const [savingEnrollment, setSavingEnrollment] = useState(false);
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
    setStudyAction(route.subject && route.review ? { subject: route.subject, name: 'history', id: Date.now() } : null);
    if (route.subject) warmStudy(route.subject);
  }, [route.subject, route.review]);
  const [sync, setSync] = useState('');
  const teacher = Boolean(user && enrollment.data?.type === 'teacher');
  const student = Boolean(user && !teacher);
  const readyAccount = !authLoading && !enrollment.loading;
  const showStudy = !teacher && Boolean(route.subject || route.hub || (!user && route.start && !route.support));
  const showToday = student && (route.today || route.start && !route.support);
  const showGroups = Boolean(user && (route.groups || teacher && (route.start || route.next || route.today || route.hub || route.subject)));
  const plazaAccess = student && release.plaza && enrollment.data?.policyVersion === release.policyVersion;
  const listing = Boolean(plazaAccess && (route.wall || route.search || route.explore || route.compose || route.activity || route.postId));
  const focus = Boolean(showStudy && route.subject && studyView?.subject === route.subject && studyView.view.session);
  const currentTab: Tab = showStudy || route.records || route.ranking ? 'study' : showToday ? 'today' : route.next && !teacher ? 'next'
    : route.me || route.settings || route.activity || route.profileHandle ? 'me' : 'stories';
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
  const popular = usePopularity(feed.posts, listing && route.explore); const activity = useActivity(feed.posts, user?.uid, listing && route.activity);
  const actor = user && own.profile ? { ...user, displayName: own.profile.name } as User : user;
  useEffect(() => { setMine(false); setError(''); }, [account]);
  useEffect(() => { if (route.search) searchRef.current?.focus(); }, [route.search]);
  function profile() { navigate(`${base}#/me`); }
  function compose() { setQuestion(''); if (user && own.profile) navigate(`${base}#/compose`); else profile(); }
  function askOnWall(subject: Subject, prompt: string) {
    if (!plazaAccess) return;
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
  const showPolicy = Boolean(release.policyVersion && release.termsUrl && release.privacyUrl);
  const signInGate = <section className="panel"><h1>로그인이 필요해요</h1><p>물음샘 학습은 로그인 없이 이용할 수 있어요.</p><div className="actions">
    <a className="button primary" href={base + '#/me'}><Icon name="login" />로그인</a>
    <a className="button secondary" href={base + '#/study'}><Icon name="book" />물음샘</a>
  </div></section>;
  const enrollmentForm = showPolicy && <form className="panel harueum-form" onSubmit={async event => {
    event.preventDefault();
    if (!user || savingEnrollment) return;
    const form = new FormData(event.currentTarget);
    if (['age', 'terms', 'privacy'].some(key => form.get(key) !== 'on')) return;
    setSavingEnrollment(true); setEnrollmentError('');
    try { await saveEnrollment(user.uid, form.get('accountType') as AccountType, String(form.get('accountStage')), release.policyVersion); }
    catch (cause) { setEnrollmentError(errorMessage(cause)); }
    finally { setSavingEnrollment(false); }
  }}><h2>하루이음 계정 설정</h2><EnrollmentFields release={release} current={enrollment.data} />
    {enrollmentError && <p className="error" role="alert">{enrollmentError}</p>}
    <button className="button primary" disabled={savingEnrollment}><Icon name="save" />계정 설정 저장</button>
  </form>;
  const storyTabs = <nav className="filter-tabs harueum-story-tabs" aria-label="이야기 공간">
    <a className="plain-button nav-tab" href={base + '#/stories'} aria-current={showGroups ? 'page' : undefined}><Icon name="users" />그룹</a>
    {!teacher && <a className="plain-button nav-tab" href={base + '#/plaza'} aria-current={!showGroups ? 'page' : undefined}><Icon name="comment" />광장</a>}
  </nav>;
  return <div className="harueum-shell" data-member={Boolean(user && readyAccount)} data-focus={focus} data-labels={labels}>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>본문으로 건너뛰기</a>
    {readyAccount && !focus && <Navigation tab={currentTab} labels={labels} mode={user ? teacher ? 'teacher' : 'student' : 'guest'} />}
    {readyAccount && showStudy && route.subject && !focus && <nav className="harueum-studytools" aria-label="학습 메뉴">
      <a className="plain-button" href={base + '#/study'}><Icon name="back" />물음샘</a>
      {(['practice', 'history', ...(route.subject === 'math' ? ['inspection'] : [])] as const).map(name =>
        <button key={name} className="plain-button" type="button" aria-current={(studyView?.view.tab || 'practice') === name ? 'page' : undefined}
          onClick={() => setStudyAction({ subject: route.subject!, name: name as StudyAction, id: Date.now() })}>
          <Icon name={name === 'practice' ? 'book' : name === 'history' ? 'records' : 'search'} />{name === 'practice' ? '연습' : name === 'history' ? '기록' : '점검'}
        </button>)}
      <button className="plain-button" type="button" onClick={() => setStudyAction({ subject: route.subject!, name: 'settings', id: Date.now() })}><Icon name="settings" />설정</button>
    </nav>}
    <main id="main" tabIndex={-1} className={showStudy && route.subject ? "study-main" : "application-main setup-view"}>
      {isPreview && <p className="connection" role="status">개발 미리보기</p>}
      {(error || authError || visibility.error) && <p className="error" role="alert">{error || authError || visibility.error}</p>}
      {sync && <div className="connection sync-status" role="status">{sync} <button className="button secondary" onClick={upload}><Icon name="repeat" />동기화 다시 시도</button></div>}
      {!readyAccount ? <p role="status">계정 확인 중…</p> : route.support ? <>
        <PageHeading title={supportTitles[route.support]} back /><Support key={route.support} kind={route.support} />
      </> : showGroups ? <>
        <h1 className="harueum-title">{teacher ? '그룹 관리' : '이야기'}</h1>{storyTabs}
        <Groups key={account} uid={account!} enrollment={enrollment.data?.policyVersion === release.policyVersion ? enrollment.data : null} enabled={release.groups} stories={release.groupStories} />
      </> : showToday || student && route.next ?
        <Planner key={account + ':' + (route.next ? 'next' : 'today')} uid={account!} today={day} isNext={route.next} />
      : showStudy && route.subject ? <StudyScreen key={route.subject + ':' + (account || 'guest')}
        subject={route.subject} account={account || 'guest'} theme={theme} setTheme={setTheme} onAttempt={record} onQuestion={askOnWall}
        canShare={Boolean(plazaAccess)} action={studyAction?.subject === route.subject ? studyAction : null}
        onSupport={(kind, service) => setSupport({ kind, service })}
        onView={view => setStudyView({ subject: route.subject!, view })} />
      : showStudy ? <StudyHome uid={account} /> : student && (route.records || route.ranking) ? <>
        <PageHeading title="내 풀이 기록" back />
        <LearningRecords key={account} uid={account} onLogin={profile} />
      </> :        route.settings ? <><PageHeading title="설정" back /><section className="panel settings-panel">{settings}</section></> : route.me ? <>
        {authLoading ? <p role="status">계정 확인 중…</p> : !user || registrationPending ? <>
          {auth ? <AccountForm release={release} onPending={setRegistrationPending}
            onClose={() => { setRegistrationPending(false); goBack(); }}
            onSuccess={() => { setRegistrationPending(false); navigate(`${base}#/me`, true); }} />
            : <p className="error">연결 설정을 확인해 주세요.</p>}
        </> : <>
          <h1 className="harueum-title">{own.profile?.name || (teacher ? '관리 계정' : '나')}</h1>
          {own.loading ? <p role="status">프로필을 불러오는 중…</p> : own.error ? <p className="error" role="alert">{own.error}</p> : <>
            {own.profile && <ProfileSummary profile={own.profile} compact />}
            <button className="plain-button" onClick={() => setEditingProfile(value => !value)}><Icon name="edit" />{editingProfile ? '편집 닫기' : '프로필 편집'}</button>
            {(editingProfile || !own.profile) && <ProfileEditor key={user.uid} user={user} profile={own.profile} />}
          </>}
          {enrollment.error && <p className="error" role="alert">{enrollment.error}</p>}
          {enrollment.data ? <p className="muted">{teacher ? '교사 계정 · 그룹 관리' : '학생 계정'}</p> : null}
          {(!enrollment.data || enrollment.data.policyVersion !== release.policyVersion) && enrollmentForm}
          {(!teacher || enrollment.data?.stage === 'school') && <School key={user.uid} uid={user.uid} />}
          <section className="panel harueum-section"><h2 className="harueum-heading"><Icon name="settings" />설정</h2>
            {!teacher && <label className="ha-switch mix-toggle settings-toggle"><span>하단 메뉴 이름 표시</span>
              <input type="checkbox" role="switch" checked={labels} onChange={event => {
                const value = event.target.checked;
                setLabels(value);
                try { localStorage.setItem(storageKey('tab-labels'), String(value)); } catch { /* Session preference remains available. */ }
              }} />
            </label>}
            <div className="actions">
              <button className="button secondary" onClick={() => setSettingsOpen(true)}><Icon name="settings" />공통 설정</button>
              <button className="plain-button" onClick={() => void logout()}><Icon name="logout" />로그아웃</button>
            </div>
          </section>
          {!teacher && <>
            <section className="panel harueum-section"><h2 className="harueum-heading"><Icon name="activity" />내 활동</h2>
              <div className="actions"><a className="button secondary" href={base + '#/records'}><Icon name="records" />풀이 기록</a>
                <a className="button secondary" href={base + '#/groups'}><Icon name="users" />내 그룹</a>
                {plazaAccess && <a className="button secondary" href={base + '#/activity'}><Icon name="post" />광장 활동</a>}
              </div>
            </section>
            <VisibilitySettings key={user.uid} uid={user.uid} />
            <ProfileRecords key={user.uid + '-records'} account={user.uid} />
          </>}
        </>}
      </> : user && route.profileHandle ? <><PageHeading title="프로필" back /><PublicProfile key={route.profileHandle} handle={route.profileHandle} viewerId={account} /></> : listing && route.activity ? <>
        <PageHeading title="내 활동" back />{!user ? <section className="panel"><p>로그인하면 내 활동을 볼 수 있어요.</p><button className="button secondary" onClick={profile}><Icon name="login" />로그인</button></section> : <><div className="filter-tabs activity-filters" aria-label="활동 종류">{(['all', 'like', 'dislike', 'repost'] as const).map(kind => <button className="plain-button nav-tab" key={kind} aria-pressed={activityKind === kind} onClick={() => setActivityKind(kind)}>{kind === 'all' ? '전체' : kind === 'like' ? '좋아요' : kind === 'dislike' ? '싫어요' : '리포스트'}</button>)}</div>{activity.loading && <p role="status">활동을 불러오는 중…</p>}{activity.error && <p className="error" role="alert">{activity.error}</p>}{shownActivity.map(item => <section key={`${item.kind}:${item.id}`} className="activity-item"><p className="activity-label"><Icon name={item.kind === 'like' ? 'like' : item.kind === 'dislike' ? 'dislike' : 'repeat'} />{item.kind === 'like' ? '좋아요한 글' : item.kind === 'dislike' ? '싫어요한 글' : '리포스트한 글'}</p>{card(item.post)}</section>)}{!activity.loading && shownActivity.length === 0 && <section className="panel empty"><p>아직 표시할 활동이 없어요.</p></section>}{feed.more && <button className="button secondary load-more" onClick={feed.loadMore} disabled={feed.loading}><Icon name="more" />이전 게시물 활동 더 확인하기</button>}</>}
      </> : listing ? <>
        <h1 className="harueum-title">{route.search ? '광장 검색' : '이야기'}</h1>{storyTabs}
        {!route.search && <div className="wall-actions"><a className="plain-button" href={base + '#/search'}><Icon name="search" />검색</a><button className="button primary action-start" onClick={compose}><Icon name="edit" />새 글 쓰기</button></div>}
        {route.search && <section className="expanding-search" aria-label="게시물 검색"><div className="search-field"><Icon name="search" /><input ref={searchRef} type="search" aria-label="검색어" placeholder="본문, @핸들 또는 #태그" value={search} onChange={event => setSearch(event.target.value)} /><button className="plain-button" aria-label="검색어 지우기" onClick={() => setSearch('')}><Icon name="close" /></button></div><p className="muted">현재 불러온 글에서 검색합니다.</p></section>}
        {(route.search || route.explore) && topTags.length > 0 && <section className="discovery" aria-label="자주 쓰인 태그"><div className="tags">{topTags.map(([tag, count]) => <button className="plain-button tag-link" key={tag} onClick={() => tagSearch(tag)}>#{tag}<span className="tag-count">{count}</span></button>)}</div></section>}
        {!route.explore && <div className="feed-toolbar"><div className="filter-tabs" aria-label="목록 필터"><button className="plain-button nav-tab" aria-pressed={!mine} onClick={() => setMine(false)}>모든 글</button><button className="plain-button nav-tab" aria-pressed={mine} disabled={!user} onClick={() => setMine(true)}>내 글</button></div><span className="muted">최신순</span></div>}
        {!auth || !db ? <section className="panel"><h2>연결을 준비하고 있어요.</h2></section> : <>{feed.cached && <p className="connection" role="status">서버 연결 확인 중</p>}{feed.error ? <section className="panel"><p className="error" role="alert">{feed.error}</p><button className="button secondary" onClick={feed.retry}><Icon name="repeat" />다시 불러오기</button></section> : <>{feed.loading && <p role="status">불러오는 중…</p>}<div className="posts">{!visibility.loading && visible.map(post => card(post))}</div>{!visibility.loading && !feed.loading && visible.length === 0 && <section className="panel empty"><h2>{feed.cached ? '서버 연결을 기다리고 있어요.' : route.search || mine ? '조건에 맞는 글이 없어요.' : '첫 번째 글을 남겨보세요.'}</h2></section>}{feed.more && <button className="button secondary load-more" disabled={feed.loading || feed.cached} onClick={feed.loadMore}><Icon name="more" />이전 글 50개 더 불러오기</button>}<p className="feed-scope muted">불러온 글 {feed.posts.filter(post => !post.deleted && visibility.canSee(post)).length}개</p></>}</>}
      </> : user ? <><h1 className="harueum-title">이야기</h1>{storyTabs}<section className="panel"><h2>{teacher ? '그룹 관리' : '광장'}</h2>{release.plaza && student ? <p>광장을 이용하려면 <a href={base + '#/me'}>나 화면</a>에서 운영 문서를 확인해 주세요.</p> : <p>광장 공개를 준비 중이에요.</p>}</section></> : signInGate}
      {!focus && !route.subject && <footer><span>© {new Date().getFullYear()} 하루이음 스터디</span><div className="footer-links">{showPolicy && <><a href={release.termsUrl} target="_blank" rel="noreferrer">이용약관</a><a href={release.privacyUrl} target="_blank" rel="noreferrer">개인정보 처리방침</a></>}<a href={`${base}About/`}>소개</a><a href={`${base}#/help`}>도움말</a></div></footer>}
    </main>
    {listing && route.compose && (composer || question) && <Modal title={question ? '광장에 질문하기' : '새 글 쓰기'} onClose={() => {
      if (!posting) { setQuestion(''); goBack(); }
    }}>{composer || (auth ? !user || registrationPending ? <AccountForm release={release} onPending={setRegistrationPending}
      onSuccess={() => setRegistrationPending(false)} onClose={() => { setQuestion(''); goBack(); }} />
      : own.loading ? <p role="status">프로필을 불러오는 중…</p> : own.error ? <p role="alert">{own.error}</p>
      : <ProfileEditor user={user} profile={own.profile} /> : <p>질문을 작성하려면 계정 연결이 필요해요.</p>)}</Modal>}
    {listing && route.postId && <PostDetail key={route.postId} id={route.postId} user={user} onClose={goBack} onLogin={profile} onTag={tagSearch} />}
    {settingsOpen && !route.settings && <Modal title="설정" onClose={() => setSettingsOpen(false)} preferences>{settings}</Modal>}
    {support && <Modal title={supportTitles[support.kind]} onClose={() => setSupport(null)} preferences>
      <Support key={support.kind + support.service} kind={support.kind} initialService={support.service} />
    </Modal>}
  </div>;
}
