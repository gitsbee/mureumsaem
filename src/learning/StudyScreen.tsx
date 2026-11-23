import { bindStudyInputs } from './inputSettings';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Leaderboard, LearningRecords } from './LearningRecords';
import type { Theme } from '../hooks/useTheme';
import { subjects, type Subject } from './daily';
import { readPracticeAttempt, type Attempt } from './store';
import { createStudyRuntime } from './engines/runtime';
import { alignSettings, fillSettings, groupStudySettings, settingsHeader } from './settingsUnits';
import type { SupportKind } from '../components/Support';

export type StudyTab = 'practice' | 'history' | 'inspection';
export type StudyView = { tab: StudyTab; session: boolean };
export type StudyAction = StudyTab | 'settings';

const loadMath = () => Promise.all([import('./engines/math'), import('./engines/math.html?raw')]);
const loadEnglish = () => Promise.all([
  import('./engines/english'), import('./engines/english.html?raw'), import('./vocabulary.json'),
]);

export function warmStudy(subject: Subject) {
  void (subject === 'math' ? loadMath() : loadEnglish()).catch(() => {});
}

export default function StudyScreen({ subject, account, theme, setTheme, onAttempt, onQuestion, onView, onSupport, day, action }: {
  subject: Subject;
  account: string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onQuestion: (subject: Subject, prompt: string) => void;
  onAttempt: (attempt: Attempt) => void;
  onView: (view: StudyView) => void;
  day: string;
  onSupport: (kind: SupportKind, subject: Subject) => void;
  action: { name: StudyAction; id: number } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef({ theme, setTheme, onAttempt, onQuestion, onView, onSupport });
  live.current = { theme, setTheme, onAttempt, onQuestion, onView, onSupport };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rankingTarget, setRankingTarget] = useState<HTMLElement | null>(null);
  const [isHistory, setHistory] = useState(false);
  const [retry, setRetry] = useState(0);
  const lastAction = useRef(0);

  useEffect(() => {
    const root = ref.current!;
    let mounted = true;
    let runtime: ReturnType<typeof createStudyRuntime> | undefined;
    let historyObserver: MutationObserver | undefined;
    let disposeSettings: (() => void) | undefined;
    const openSupport = (event: MouseEvent) => {
      const kind = (event.target as Element).closest<HTMLElement>('[data-support]')?.dataset.support;
      if (kind === 'help' || kind === 'about') live.current.onSupport(kind, subject);
    };
    root.addEventListener('click', openSupport);

    async function load() {
      try {
        const [engine, markup, words] = await (subject === 'math' ? loadMath() : loadEnglish());
        if (!mounted) return;
        root.innerHTML = markup.default;
        const dialog = root.querySelector<HTMLDialogElement>('.preferences-dialog')!;
        dialog.insertAdjacentHTML('afterbegin', settingsHeader);
        fillSettings(dialog);
        const ungroup = groupStudySettings(dialog, subject);
        const inputs = bindStudyInputs(dialog, account);
        const align = alignSettings(dialog);
        disposeSettings = () => { inputs(); align(); ungroup(); };
        const updateRanking = () => setRankingTarget(root.querySelector('[data-ranking]'));
        if (subject === 'english') {
          historyObserver = new MutationObserver(updateRanking);
          historyObserver.observe(root.querySelector('#app')!, { childList: true });
        }
        updateRanking();
        runtime = createStudyRuntime(root, {
          account, subject, vocabulary: words?.default,
          ask(prompt: string) { if (mounted) live.current.onQuestion(subject, prompt); },
          report(payload: unknown) {
            const attempt = readPracticeAttempt(payload, subject);
            if (mounted && attempt) live.current.onAttempt(attempt);
          },
          updateView(tab: StudyTab, session: boolean) {
            if (mounted) {
              setHistory(tab === 'history' && !session);
              live.current.onView({ tab, session });
            }
          },
          getTheme: () => live.current.theme,
          setTheme: (value: Theme) => live.current.setTheme(value),
        });
        engine.default(runtime);
        setStatus('ready');
      } catch (error) {
        if (!mounted) return;
        console.error('Study initialization failed', error);
        historyObserver?.disconnect();
        disposeSettings?.();
        disposeSettings = undefined;
        runtime?.destroy();
        root.replaceChildren();
        setStatus('error');
      }
    }

    void load();
    return () => {
      mounted = false;
      historyObserver?.disconnect();
      disposeSettings?.();
      root.removeEventListener('click', openSupport);
      runtime?.destroy();
      root.replaceChildren();
    };
  }, [subject, account, retry]);

  useEffect(() => {
    ref.current?.dispatchEvent(new Event('forge-themechange'));
  }, [theme]);

  useEffect(() => {
    if (!action || status !== 'ready' || lastAction.current === action.id) return;
    lastAction.current = action.id;
    const name = action.name;
    const selector = subject === 'math'
      ? name === 'settings' ? '[data-engine-header] [data-open-preferences]' : '#' + name + '-nav'
      : name === 'settings' ? '#home-settings' : `[data-engine-header] nav [data-view="${name === 'history' ? 'wrong' : 'home'}"]`;
    ref.current?.querySelector<HTMLElement>(selector)?.click();
  }, [action, status, subject]);

  return <>
    {status !== 'ready' && <section className="setup-view" aria-label={subjects[subject]}>
      <header className="page-intro"><h1>{subjects[subject]}</h1></header>
      {status === 'error' && <div className="home-session"><p role="alert">연습을 시작하지 못했습니다.</p>
        <button className="button secondary" onClick={() => { setStatus('loading'); setRetry(value => value + 1); }}>다시 시도</button></div>}
    </section>}
    {status === 'ready' && isHistory && rankingTarget && createPortal(
      <>
        <Leaderboard key={day} day={day} subject={subject} uid={account === 'guest' ? undefined : account} />
        {account !== 'guest' && <LearningRecords uid={account} fixedSubject={subject} />}
      </>, rankingTarget,
    )}
    <div ref={ref} className={`study-engine study-${subject}`} hidden={status !== 'ready'} />
  </>;
}
