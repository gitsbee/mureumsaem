import Icon from '../components/Icon';
import { base } from '../hooks/useNavigation';

export const tabs = [
  { id: 'today', label: '오늘', icon: 'hourglass', path: '#/today' },
  { id: 'next', label: '다음', icon: 'calendar', path: '#/next' },
  { id: 'study', label: '물음샘', icon: 'book', path: '#/study' },
  { id: 'stories', label: '이야기', icon: 'comment', path: '#/stories' },
  { id: 'me', label: '나', icon: 'person', path: '#/me' },
] as const;
export type Tab = typeof tabs[number]['id'];

export default function Navigation({ tab, labels, mode }: { tab: Tab; labels: boolean; mode: 'student' | 'teacher' | 'guest' }) {
  const entries = mode === 'teacher' ? tabs.filter(item => item.id === 'stories' || item.id === 'me') : tabs;
  if (mode === 'guest') return <header className="harueum-guestbar">
    <a href={base + '#/study'} className="plain-button"><Icon name="hourglass" />하루이음 스터디</a>
    <a href={base + '#/me'} className="plain-button"><Icon name="login" />로그인</a>
  </header>;
  return <aside className="harueum-sidebar" data-labels={labels}>
    <a className="harueum-brand plain-button" href={base + (mode === 'teacher' ? '#/stories' : '#/today')}><Icon name="hourglass" />하루이음</a>
    <nav aria-label={mode === 'teacher' ? '그룹 관리 메뉴' : '주 메뉴'} style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}>
      {entries.map(item => <a key={item.id} className="harueum-tab plain-button" aria-current={item.id === tab ? 'page' : undefined}
        href={base + item.path} aria-label={mode === 'teacher' && item.id === 'stories' ? '그룹 관리' : item.label} onClick={() => window.scrollTo(0, 0)}>
        <Icon name={item.icon} /><span>{mode === 'teacher' && item.id === 'stories' ? '그룹 관리' : item.label}</span>
      </a>)}
    </nav>
  </aside>;
}
