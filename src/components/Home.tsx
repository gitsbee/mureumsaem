import { useState } from 'react';
import { base } from '../hooks/useNavigation';
import type { IconName } from '../design/icons';
import Icon from './Icon';

const cards = [
  { icon: 'math', title: '수학', description: '단원과 난이도를 고르고 풀이 여백에 직접 써 보세요.', action: '수학 연습하기', path: 'math', tone: 'info' },
  { icon: 'english', title: '영어', description: '단어의 뜻을 떠올리거나 직접 입력하고, 어려웠던 단어는 다시 연습해 보세요.', action: '영어 연습하기', path: 'english', tone: 'violet' },
  { icon: 'post', title: '담벼락', description: '막힌 문제를 질문하고 다른 사람의 풀이에 의견을 나눠 보세요.', action: '담벼락 둘러보기', path: 'wall', tone: 'success' },
  { icon: 'records', title: '기록 관리', description: '프로필에서 수학과 영어 학습 기록을 백업하거나 복원할 수 있어요.', action: '프로필 열기', path: 'me', tone: 'review' },
] satisfies { icon: IconName; title: string; description: string; action: string; path: string; tone: string }[];

const examples = {
  math: { label: '수학', question: '제곱하면 49가 되는 양수는?', options: ['−7', '7', '14'], answer: 1, explanation: '7 × 7 = 49이고 7은 양수예요.' },
  english: { label: '영어', question: '“figure out”에 가장 가까운 뜻은?', options: ['잊어버리다', '돌아가다', '알아내다'], answer: 2, explanation: '“figure out”은 생각해서 어떤 사실이나 방법을 알아낸다는 뜻이에요.' },
} as const;

export default function Home() {
  const [subject, setSubject] = useState<keyof typeof examples>('math');
  const [choice, setChoice] = useState<number | null>(null);
  const example = examples[subject];
  return <>
    <section className="home-hero">
      <div className="home-hero-copy">
        <h1>물음샘</h1>
        <p className="home-headline">오늘 배운 것,<br />어디까지 풀 수 있을까?</p>
        <p>수학은 손으로 풀고 영어는 기억에서 꺼내 보세요. 막힌 문제는 담벼락에 함께 펼쳐 놓을 수 있어요.</p>
      </div>
      <div className="home-symbols" aria-hidden="true">
        <span><Icon name="math" /></span><span><Icon name="english" /></span>
      </div>
      <div className="actions">
        <a className="button primary action-start" href={base + '#/math'}><Icon name="next" />오늘의 학습</a>
        <a className="button secondary" href={base + '#/wall'}><Icon name="post" />담벼락 보기</a>
      </div>
    </section>
    <section className="home-section" aria-labelledby="home-study">
      <h2 id="home-study">무엇을 연습할까요?</h2>
      <div className="subject-grid">
        {[cards.slice(0, 2), cards.slice(2)].map(column => <div className="subject-column" key={column[0].path}>
          {column.map(card => <article className="panel subject-card" key={card.path}>
            <h3><span className="context-chip" data-tone={card.tone}><Icon name={card.icon} />{card.title}</span></h3>
            <p>{card.description}</p>
            <a className="button secondary" data-tone={card.tone} href={base + '#/' + card.path}><Icon name="next" />{card.action}</a>
          </article>)}
        </div>)}
      </div>
    </section>
    <section className="home-section home-intro" aria-labelledby="home-intro-title">
      <h2 id="home-intro-title">풀어 보고, 다시 익혀요</h2>
      <p>물음샘은 공부한 내용을 직접 써먹어 보는 곳이에요. 먼저 답을 떠올리고, 채점과 해설을 보고, 틀린 문제를 기록에서 꺼내 다시 풀 수 있어요.</p>
      <div className="panel home-demo">
        <h3>한 문제 맛보기</h3>
        <div className="filter-tabs" role="group" aria-label="맛보기 과목">
          {(['math', 'english'] as const).map(key => <button type="button" className="plain-button nav-tab" aria-pressed={subject === key} key={key}
            onClick={() => { setSubject(key); setChoice(null); }}><Icon name={key} />{examples[key].label}</button>)}
        </div>
        <p>{example.question}</p>
        <div className="actions" role="group" aria-label="답 선택">
          {example.options.map((option, index) => <button type="button" className="button secondary" key={option}
            aria-pressed={index === choice} onClick={() => setChoice(index)}><Icon name={index === choice ? (index === example.answer ? 'check' : 'close') : 'target'} />{option}</button>)}
        </div>
        <p role="status">{choice === null ? '' : choice === example.answer ? `정답이에요. ${example.explanation}` : '다른 답을 골라 보세요.'}</p>
      </div>
    </section>
  </>;
}
