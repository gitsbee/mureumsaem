import { useRef, useState } from 'react';
import { koreanDay, subjects, type Subject } from '../learning/daily';
import { withRecordTools } from '../learning/recordTools';
import Icon from './Icon';

export default function ProfileRecords({ account }: { account: string }) {
  const [subject, setSubject] = useState<Subject>('math');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function run(operation: 'export' | 'import' | 'reset', file?: File) {
    if (busy) return;
    if (operation === 'reset' && !confirm(`이 브라우저의 ${subjects[subject]} 학습 기록을 초기화할까요?`)) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await withRecordTools(subject, account, async tools => {
        if (operation === 'export') {
          const content = await tools.exportRecords();
          const url = URL.createObjectURL(new Blob([JSON.stringify(content)], { type: 'application/json' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = `물음샘-${subjects[subject]}-${koreanDay()}.json`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
          setNotice('학습 기록 백업을 내려받았습니다.');
        } else if (operation === 'import' && file) {
          if (file.size > 40 * 1024 * 1024) throw new Error();
          if (subject === 'english' && !confirm('이 브라우저의 영어 학습 기록을 선택한 백업으로 바꿀까요?')) return;
          await tools.importRecords(await file.text());
          setNotice('학습 기록을 가져왔습니다.');
        } else if (operation === 'reset') {
          await tools.resetRecords();
          setNotice('학습 기록을 초기화했습니다.');
        }
      });
    } catch {
      setError(operation === 'import' ? '백업을 가져오지 못했습니다. 과목과 파일을 확인해 주세요.' : '기록을 처리하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel profile-records" aria-labelledby="profile-records-title">
    <h2 id="profile-records-title">내 정보 관리</h2>
    <label htmlFor="profile-records-subject">학습 기록 과목</label>
    <select id="profile-records-subject" value={subject} disabled={busy} onChange={event => {
      setSubject(event.target.value as Subject); setNotice(''); setError('');
    }}>
      <option value="math">수학</option><option value="english">영어</option>
    </select>
    <p className="muted">이 브라우저의 학습 기록을 관리합니다. 동기화된 풀이 결과와 온라인 랭킹은 유지됩니다.</p>
    <p className="muted">{subject === 'math'
      ? '문제공방에서 받은 기존 백업도 가져올 수 있어요. 초기화해도 오늘의 도전 결과는 유지됩니다.'
      : '영어 백업에는 학습 진도, 오답, 북마크, 인정 답안이 포함됩니다. 진행 중인 문제는 포함되지 않습니다.'}</p>
    <div className="actions">
      <button type="button" className="button secondary" disabled={busy} onClick={() => void run('export')}><Icon name="download" />기록 내보내기</button>
      <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}><Icon name="upload" />기록 가져오기</button>
      <button type="button" className="button danger" disabled={busy} onClick={() => void run('reset')}><Icon name="trash" />기록 초기화</button>
    </div>
    <input ref={input} type="file" accept=".json,application/json" hidden onChange={event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) void run('import', file);
    }} />
    {notice && <p role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
