import { useEffect, useId, useState, type FormEvent } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { errorMessage } from '../model';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { base } from '../hooks/useNavigation';
import DayNotes from './DayNotes';
import { useSchool } from './School';

const kinds = { class: '수업', lunch: '점심', exam: '시험', task: '과제', study: '학습', personal: '개인' } as const;
type Kind = keyof typeof kinds;
type Event = { id: string; day: string; start: string; end: string; title: string; note: string; kind: Kind; subject: '' | 'math' | 'english'; source?: 'timetable' | 'meal' | 'school'; period?: number };
const longDate = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'long' });
const dateValue = (day: string) => new Date(day + 'T00:00:00Z');
const increment = (day: string, n: number) => new Date(dateValue(day).valueOf() + n * 86_400_000).toISOString().slice(0, 10);
const monthStart = (day: string, n = 0) => {
  const date = dateValue(day.slice(0, 7) + '-01');
  date.setUTCMonth(date.getUTCMonth() + n);
  return date.toISOString().slice(0, 10);
};

function EventEditor({ item, day, uid, onClose }: { item: Event | null; day: string; uid: string; onClose: () => void }) {
  const id = useId();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || busy) return;
    const values = new FormData(event.currentTarget);
    const value = (key: string) => String(values.get(key) ?? '').trim();
    const [start, end, title] = ['start', 'end', 'title'].map(value);
    if (!title || Boolean(start) !== Boolean(end) || (start && end <= start)) {
      setError('제목을 쓰고 시작·종료 시각을 함께 입력해 주세요. 종료 시각은 시작보다 늦어야 합니다.');
      return;
    }
    const events = collection(db, 'users', uid, 'schedule');
    setBusy(true);
    setError('');
    try {
      await setDoc(item ? doc(events, item.id) : doc(events), {
        title, start, end, day: value('day'), kind: value('kind'), subject: value('subject'), note: value('note'), updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!db || !item || busy || !confirm('이 개인 일정을 삭제할까요?')) return;
    setBusy(true);
    try { await deleteDoc(doc(db, 'users', uid, 'schedule', item.id)); onClose(); }
    catch (cause) { setError(errorMessage(cause)); setBusy(false); }
  }
  return <Modal title={item ? '개인 일정 편집' : '개인 일정 추가'} onClose={() => { if (!busy) onClose(); }}>
    <form className="harueum-form" onSubmit={save}>
      <label htmlFor={id + 'title'}>일정 이름</label><input id={id + 'title'} name="title" required maxLength={80} defaultValue={item?.title} />
      <label htmlFor={id + 'day'}>날짜</label><input id={id + 'day'} type="date" name="day" required defaultValue={item?.day ?? day} />
      <div className="harueum-columns">
        <label>시작 시각 <input type="time" name="start" defaultValue={item?.start} /></label>
        <label>종료 시각 <input type="time" name="end" defaultValue={item?.end} /></label>
      </div>
      <label htmlFor={id + 'kind'}>종류</label><select id={id + 'kind'} name="kind" defaultValue={item?.kind ?? 'personal'}>
        {Object.entries(kinds).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select>
      <label htmlFor={id + 'subject'}>연결할 학습</label><select id={id + 'subject'} name="subject" defaultValue={item?.subject ?? ''}>
        <option value="">없음</option><option value="math">수학</option><option value="english">영어</option>
      </select>
      <label htmlFor={id + 'note'}>범위와 메모</label><textarea id={id + 'note'} name="note" defaultValue={item?.note} maxLength={4000} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        {item && <button className="button danger" type="button" onClick={() => void remove()} disabled={busy}><Icon name="trash" />삭제</button>}
        <button className="button primary" disabled={busy}><Icon name="save" />저장</button>
      </div>
    </form>
  </Modal>;
}

function AgendaCard({ item, now, today, isNext, overlaps, onEdit }: {
  item: Event; now: string; today: string; isNext: boolean; overlaps: boolean; onEdit: () => void;
}) {
  const current = !isNext && item.day === today && Boolean(item.start && item.start <= now && now < item.end);
  const days = Math.round((dateValue(item.day).valueOf() - dateValue(today).valueOf()) / 86_400_000);
  const timeLabel = item.start ? item.start + '–' + item.end : item.period ? item.period + '교시' : item.source === 'meal' ? '점심' : item.source === 'timetable' ? '시각 미제공' : '하루 종일';
  return <details className="panel harueum-event" data-current={current} key={String(current)} open={current || undefined}>
    <summary>
      <Icon name={item.kind === 'exam' ? 'target' : item.subject || 'calendar'} /><span className="harueum-event-name">{item.title}</span>
      <span className="harueum-tags">
        <span className="context-chip"><Icon name="clock" />{timeLabel}</span>
        <span className="context-chip" data-tone={item.source ? "info" : "review"}><Icon name={item.source ? "book" : "person"} />{item.source ? "학교" : "개인"}</span>
        <span className="context-chip" data-tone={item.kind === 'exam' ? 'review' : 'info'}><Icon name="calendar" />
          {item.kind === 'exam' && days >= 0 ? days === 0 ? 'D-Day' : 'D-' + days : kinds[item.kind]}
        </span>
        {current && <span className="context-chip" data-tone="info"><Icon name="clock" />진행 중</span>}
        {overlaps && <span className="context-chip" data-tone="review"><Icon name="info" />일정 겹침</span>}
      </span>
    </summary>
    {item.note && <p className="harueum-preserve">{item.note}</p>}
    <div className="actions">{item.source ? <span className="context-chip"><Icon name="eye" />읽기 전용</span> : <button type="button" className="plain-button" onClick={onEdit}><Icon name="edit" />일정 편집</button>}
      {item.subject && <a className="button primary" href={base + '#/' + item.subject}><Icon name="book" />{isNext ? '범위 복습' : '학습 열기'}</a>}
    </div>
  </details>;
}

export default function Planner({ uid, today, isNext }: { uid: string; today: string; isNext: boolean }) {
  const school = useSchool(uid);
  const [external, setExternal] = useState<{ key: string; items: Event[]; errors: string[] }>();
  const [selectedDay, setSelection] = useState<string | null>(null);
  const selection = selectedDay ?? today;
  const [notesDay, setNotesDay] = useState('');
  const [editing, setEditing] = useState<Event | null | undefined>(undefined);
  const [received, setReceived] = useState<{ key: string; items: Event[]; error: string }>();
  const [clock, setClock] = useState(Date.now);
  const start = isNext ? monthStart(selection) : selection;
  const end = isNext ? monthStart(selection, 1) : increment(selection, 1);
  const key = uid + ':' + start + ':' + end;
  const worker = import.meta.env.VITE_NEIS_WORKER_URL?.trim();
  const schoolCode = school?.school;
  const grade = school?.grade;
  const room = school?.room;
  const externalKey = key + ':' + schoolCode + ':' + grade + ':' + room;
  useEffect(() => {
    if (!worker || !schoolCode || !grade || !room) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const url = new URL('/v1/agenda', worker);
        url.search = new URLSearchParams({
          school: schoolCode, grade: String(grade), room: String(room), start, end: increment(end, -1),
        }).toString();
        const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
        if (!response.ok) throw new Error('School agenda unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) setExternal({ key: externalKey, items: data.events, errors: data.errors });
      } catch {
        if (!controller.signal.aborted) setExternal({ key: externalKey, items: [], errors: ['timetable', 'meal', 'school'] });
      }
    })();
    return () => controller.abort();
  }, [worker, schoolCode, grade, room, start, end, externalKey]);
  useEffect(() => {
    if (!db) return;
    const path = collection(db, 'users', uid, 'schedule');
    const view = query(path, where('day', '>=', start), where('day', '<', end), orderBy('day'));
    return onSnapshot(view, snap => {
      const items = snap.docs.map(item => ({ ...item.data(), id: item.id }) as Event)
        .sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start));
      setReceived({ key, items, error: '' });
    }, cause => setReceived({ key, items: [], error: errorMessage(cause) }));
  }, [uid, start, end, key]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(clock);
  const schoolData = external?.key === externalKey ? external : undefined;
  const personalRows = received?.key === key ? received.items : [];
  const schoolRows = schoolData?.items.filter(item => isNext ? item.source === 'school' : item.source !== 'school') ?? [];
  const rows = [...personalRows, ...schoolRows].sort((a, b) => a.day.localeCompare(b.day) ||
    (a.start || '24:00').localeCompare(b.start || '24:00') || (a.period ?? 99) - (b.period ?? 99));
  const shownDays = isNext
    ? Array.from(new Set([...(today >= start && today < end ? [today] : []), ...rows.map(item => item.day)])).sort()
    : [selection];
  const action = rows.find(item => item.subject && item.day === today && item.start <= now && now < item.end)
    ?? (isNext ? rows.find(item => item.subject && item.day >= today) : undefined);
  const sourceErrors = (schoolData?.errors ?? []).filter(source => isNext ? source === 'school' : source !== 'school')
    .map(source => ({ school: '학사일정', meal: '급식', timetable: '시간표' })[source]);
  const month = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', year: 'numeric', month: 'long' }).format(dateValue(selection));
  const choose = (step: number) => setSelection(day => isNext ? monthStart(day ?? today, step) : increment(day ?? today, step));
  return <>
    <h1 className="harueum-title">{isNext ? '다음' : '오늘'}</h1>
    <div className="harueum-period">
      <button className="plain-button" aria-label={isNext ? '지난달' : '전날'} onClick={() => choose(-1)}><Icon name="chevron-left" /></button>
      <h2>{isNext ? month : longDate.format(dateValue(selection))}</h2>
      <button className="plain-button" aria-label={isNext ? '다음 달' : '다음 날'} onClick={() => choose(1)}><Icon name="chevron-right" /></button>
    </div>
    {received?.key !== key && <p role="status">일정을 불러오는 중…</p>}
    {received?.key === key && received.error && <p className="error" role="alert">{received.error}</p>}
    {sourceErrors.length > 0 && <p className="error" role="status">학교 {sourceErrors.join('·')}을 불러오지 못했어요.</p>}
    {shownDays.map(day => <section className="harueum-agenda" key={day} aria-label={longDate.format(dateValue(day))}>
      <h3 className={isNext && day === today ? 'harueum-day-marker' : ''}>{day === today ? '오늘' : day === increment(today, -1) ? '어제' : day === increment(today, 1) ? '내일' : longDate.format(dateValue(day))}</h3>
      {rows.filter(item => item.day === day).map(item => <AgendaCard key={item.id} item={item} now={now} today={today} isNext={isNext}
        overlaps={Boolean(item.start && rows.some(other => other !== item && other.day === day && other.start && item.start < other.end && other.start < item.end))}
        onEdit={() => setEditing(item)} />)}
    </section>)}
    {received?.key === key && !received.error && !rows.length && <p className="muted">이 기간에 표시할 일정이 없어요.</p>}
    <div className="harueum-action panel">
      {action && <a href={base + '#/' + action.subject} className="button primary"><Icon name="book" />{action.title} · {isNext ? '범위 복습' : '학습 열기'}</a>}
      {!isNext && <button className="button secondary" onClick={() => setNotesDay(selection)}><Icon name="pen" />개인 필기</button>}
      <button className="button secondary" onClick={() => setEditing(null)}><Icon name="plus" />일정 추가</button>
      {selection !== today && <button className="plain-button" onClick={() => setSelection(null)}><Icon name="clock" />{isNext ? '이번 달로' : '오늘로'}</button>}
    </div>
    {notesDay && <DayNotes uid={uid} day={notesDay} onClose={() => setNotesDay('')} />}
    {editing !== undefined && <EventEditor item={editing} day={isNext && today >= start && today < end ? today : selection} uid={uid} onClose={() => setEditing(undefined)} />}
  </>;
}
