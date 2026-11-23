import type { User } from 'firebase/auth';
import { base, navigate } from '../hooks/useNavigation';
import Icon from '../components/Icon';
import PostMenu from '../components/PostMenu';
import { warmStudy, type StudyAction, type StudyView } from './StudyScreen';
import type { Subject } from './daily';

const services = [
  { key: 'pulleem', label: '물음샘', path: '' },
  { key: 'math', label: '수학', path: '#/math' },
  { key: 'english', label: '영어', path: '#/english' },
] as const;

const tools = [
  { key: 'practice', label: '연습', icon: 'book' },
  { key: 'history', label: '기록', icon: 'records' },
  { key: 'inspection', label: '점검', icon: 'search' },
] as const;

export default function Header({ user, name, loggedOut, subject, view, pulimTab, onSettings, onStudyAction }: {
  user: User | null;
  name?: string;
  loggedOut: () => void;
  subject: Subject | null;
  view?: StudyView;
  pulimTab?: 'home' | 'wall' | 'search';
  onSettings: () => void;
  onStudyAction: (action: StudyAction) => void;
}) {
  const active = subject || 'pulleem';
  return <header className="app-header pulim-header" hidden={view?.session}>
    <div className="header-inner">
      <nav aria-label="서비스" className="service-nav">
        {services.map(({ key, label, path }) =>
          <a key={key} className="plain-button nav-tab" href={base + path} aria-label={label} title={label}
            aria-current={active === key ? 'page' : undefined}
            onPointerEnter={() => { if (key !== 'pulleem') warmStudy(key); }}
            onFocus={() => { if (key !== 'pulleem') warmStudy(key); }}
            onClick={event => {
              if (!(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) window.scrollTo(0, 0);
            }}><Icon name={key} /></a>)}
      </nav>
      <nav aria-label="화면 메뉴" className="page-nav">
        {subject ? tools.filter(item => subject === 'math' || item.key !== 'inspection').map(item =>
          <button type="button" className="header-link plain-button nav-tab" key={item.key}
            aria-label={item.label} title={item.label}
            aria-current={(view?.tab || 'practice') === item.key ? 'page' : undefined}
            onClick={() => onStudyAction(item.key)}><Icon name={item.icon} /><span>{item.label}</span></button>
        ) : <>
          <a className="plain-button nav-tab" href={base} aria-label="홈" title="홈"
            aria-current={pulimTab === 'home' ? 'page' : undefined}><Icon name="home" /><span>홈</span></a>
          <a className="plain-button nav-tab" href={base + '#/wall'} aria-label="담벼락" title="담벼락"
            aria-current={pulimTab === 'wall' ? 'page' : undefined}><Icon name="post" /><span>담벼락</span></a>
          <a className="plain-button nav-tab" href={base + '#/search'} aria-label="검색" title="검색"
            aria-current={pulimTab === 'search' ? 'page' : undefined}><Icon name="search" /><span>검색</span></a>
        </>}
        <button type="button" className="plain-button settings-button" aria-label="설정" title="설정"
          onClick={subject ? () => onStudyAction('settings') : onSettings}><Icon name="settings" /></button>
      </nav>
      <div className="account-entry">
        {user ? <PostMenu label="계정 메뉴" icon="person" iconOnly>
          {name && <p className="account-menu-name">{name}</p>}
          <button className="plain-button" type="button" onClick={() => navigate(base + '#/me')}><Icon name="person" />프로필</button>
          <button className="plain-button" type="button" onClick={() => navigate(base + '#/activity')}><Icon name="activity" />내 활동</button>
          <button className="plain-button" type="button" onClick={loggedOut}><Icon name="logout" />로그아웃</button>
        </PostMenu> : <a className="plain-button account-icon" href={base + '#/me'} aria-label="로그인" title="로그인"><Icon name="person" /></a>}
      </div>
    </div>
  </header>;
}
