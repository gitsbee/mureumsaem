import Icon from '../components/Icon';
import ProfileRecords from '../components/ProfileRecords';
import { base } from '../hooks/useNavigation';
import { LearningRecords } from '../learning/LearningRecords';

export default function StudyHome({ uid }: { uid?: string }) {
  return <>
    <h1 className="harueum-title">물음샘</h1>
    <section className="panel harueum-section">
      <h2 className="harueum-heading"><Icon name="book" />학습 시작</h2>
      <p>수학 문제를 직접 풀거나 영어 단어를 익혀 보세요.</p>
      <div className="harueum-columns study-start">
        <a className="button primary" href={base + '#/math'}><Icon name="math" />수학</a>
        <a className="button secondary" href={base + '#/english'}><Icon name="english" />영어</a>
        <a className="button secondary" data-tone="review" href={base + '#/math/history'}><Icon name="repeat" />수학 복습</a>
        <a className="button secondary" data-tone="review" href={base + '#/english/history'}><Icon name="star" />영어 복습</a>
      </div>
    </section>
    {uid ? <LearningRecords uid={uid} /> : <>
      <p className="muted">비로그인 학습 기록은 이 브라우저에 저장돼요. 로그인해도 기존 로컬 기록은 계정으로 옮겨지지 않습니다.</p>
      <ProfileRecords account="guest" />
    </>}
  </>;
}
