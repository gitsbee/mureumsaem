import { useState } from 'react';
import { accountOptions, type AccountType, type Release, type Enrollment } from './account';

export default function EnrollmentFields({ release, current }: { release: Release; current?: Enrollment | null }) {
  const [type, setType] = useState<AccountType>(current?.type ?? 'student');
  return <fieldset className="enrollment-fields">
    <legend>계정 유형과 가입 확인</legend>
    <label htmlFor="account-type">계정 유형</label>
    <select id="account-type" name="accountType" value={type} onChange={event => setType(event.target.value as AccountType)}>
      <option value="student">학생</option><option value="teacher">교사</option>
    </select>
    <label htmlFor="account-stage">{type === 'student' ? '학습 단계' : '관리할 그룹 유형'}</label>
    <select id="account-stage" name="accountStage" key={type} defaultValue={current?.type === type ? current.stage : ""} required>
      <option value="" disabled>선택해 주세요</option>
      {Object.entries(accountOptions[type]).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
    {type === 'teacher' && <p className="muted">교사 계정은 그룹 관리에 사용합니다. 실제 교사 자격이나 소속을 인증하지 않습니다.</p>}
    <label className="confirmation"><input type="checkbox" name="age" required /> 만 14세 이상입니다.</label>
    <label className="confirmation"><input type="checkbox" name="terms" required /> <a href={release.termsUrl} target="_blank" rel="noreferrer">이용약관 (새 탭)</a>에 동의합니다.</label>
    <label className="confirmation"><input type="checkbox" name="privacy" required /> <a href={release.privacyUrl} target="_blank" rel="noreferrer">개인정보 처리방침 (새 탭)</a>을 확인하고 동의합니다.</label>
  </fieldset>;
}
