import { useId, useState } from 'react';
import type { Subject } from '../learning/daily';

export type SupportKind = 'about' | 'help';
export type Service = 'pulim' | Subject;
export const supportTitles = { about: '소개', help: '도움말' };

const services = [
  { id: 'pulim', label: '물음샘' },
  { id: 'math', label: '수학' },
  { id: 'english', label: '영어' },
] as const;

const content = {
  about: {
    pulim: [
      ['하루이음 스터디', '시간표와 시험 계획, 수학·영어 연습, 그룹 이야기를 한곳에서 이용해요. 고등학생부터 N수생까지, 흩어진 하루를 하나로 잇습니다.'],
      ['내 기록과 온라인 랭킹', '한 계정으로 기기마다 풀이 결과와 제출한 답안을 확인할 수 있어요. 수학에서는 문제와 풀이 시간도 함께 저장돼요. 진행 중인 문제와 필기는 사용하던 브라우저에 남아요.'],
    ],
    math: [
      ['문제를 만드는 방식', '문제 유형과 답의 구조를 바탕으로 조건과 계수를 만들어요. 같은 유형에서도 물어보는 값과 답안 형식이 달라질 수 있어요.'],
      ['학습과 복습', 'A 기본에서 개념을 익히고 B 유형에서 개념을 연결해 보세요. 오늘의 문제를 풀거나 기록에서 오답과 보관 문제를 복습할 수 있어요.'],
    ],
    english: [
      ['단어를 떠올리고 입력해 보는 연습', '단어장과 범위를 고른 뒤 플래시카드나 암기, 선택, 스펠 방식으로 학습할 수 있어요. 어려웠던 단어는 기록에서 다시 복습할 수 있어요.'],
    ],
  },
  help: {
    pulim: [
      ['계정과 기록', '상단 프로필 아이콘에서 로그인하세요. 로그인한 뒤 수학과 영어의 기록 탭에서 기기 간 연동된 결과를 확인할 수 있어요. 프로필에서는 핸들, 소개, 학습 기록 백업을 관리할 수 있어요.'],
      ['담벼락 이용하기', '새 글 쓰기로 풀이를 공유하세요. 검색창에서 본문, @핸들, #태그를 찾을 수 있어요. 글과 댓글은 모두 공개돼요. 게시물과 댓글 메뉴에서 신고할 수 있고, 숨긴 글과 차단한 계정은 프로필에서 관리할 수 있어요.'],
    ],
    math: [
      ['연습 시작하기', '과목과 단원을 고르세요. 믹스로 여러 단원을 선택할 수 있고, 추천 유형을 바꾸거나 원하는 유형을 직접 검색해서 연습할 수 있어요.'],
      ['오늘의 문제', '오늘의 문제에서 세 문제를 풀어요. 원형 표시를 눌러 문제를 옮길 수 있고, 완료 후 다시 복습할 수 있어요.'],
      ['답안과 풀이 여백', '답을 고르거나 입력한 뒤 정답 확인을 누르세요. 풀이 여백에서는 펜, 지우개, 되돌리기와 전체 화면을 사용할 수 있어요. 설정에서 펜 전용과 압력 감도를 조절할 수 있어요.'],
      ['공유, 보관과 복습', '공유로 문제와 풀이를 전달하거나 보관해 나중에 이어 풀 수 있어요. 기록에서 오답을 복습하고 유형별 성적을 확인하세요. 필기나 보관한 문제를 옮기려면 기록 관리에서 내보내기와 가져오기를 사용하세요.'],
    ],
    english: [
      ['학습 범위 설정하기', '단어장과 학습 방식을 선택하고 구간 간격이나 수동 범위를 정해 연습하세요.'],
      ['단축키', '[는 힌트, ]는 정답 보기, 역슬래시 또는 원화 키는 별표예요. 채점한 뒤 스페이스로 다음 문제를 열 수 있어요.'],
      ['학습 기록과 이어 풀기', '기록에서 오답과 보관한 단어를 확인하세요. 진행 중인 학습은 같은 브라우저에서 이어 풀 수 있어요.'],
    ],
  },
};

export default function Support({ kind, initialService = 'pulim' }: { kind: SupportKind; initialService?: Service }) {
  const [service, setService] = useState(initialService);
  const id = useId();
  return <>
    <div className="section-tabs" role="tablist" aria-label={`${supportTitles[kind]} 서비스`}>
      {services.map(({ id: key, label }, index) => <button key={key} type="button"
        id={`${id}-tab-${key}`} className="plain-button nav-tab" role="tab" aria-selected={service === key}
        aria-controls={`${id}-panel-${key}`} tabIndex={service === key ? 0 : -1} onClick={() => setService(key)}
        onKeyDown={event => {
          const last = services.length - 1;
          const next = {
            ArrowRight: (index + 1) % services.length,
            ArrowLeft: (index + last) % services.length,
            Home: 0,
            End: last,
          }[event.key];
          if (next === undefined) return;
          event.preventDefault();
          const nextService = services[next].id;
          setService(nextService);
          document.getElementById(`${id}-tab-${nextService}`)?.focus();
        }}>{label}</button>)}
    </div>
    {services.map(({ id: key }) => <div key={key} id={`${id}-panel-${key}`} role="tabpanel" tabIndex={0}
      aria-labelledby={`${id}-tab-${key}`} className="support-content" hidden={service !== key}>
      {content[kind][key].map(([heading, copy]) => <section key={heading}>
        <h3>{heading}</h3><p>{copy}</p>
      </section>)}
    </div>)}
  </>;
}
