import type { Post } from '../model';
import { postLink } from '../data';
import Identity from './Identity';
import Icon from './Icon';

export default function OriginalReference({ original, status = 'ready', linked = true }: {
  original: Post | null;
  status?: 'loading' | 'ready' | 'error' | 'hidden';
  linked?: boolean;
}) {
  const available = original && !original.deleted;
  const preview = <>
    <span className="original-heading">
      <span className="original-label"><Icon name="post" />원문</span>
      {available && linked && <Icon name="chevron-right" />}
    </span>
    {available ? <>
      <Identity uid={original.authorId} fallback={original.authorName} linked={false} />
      <p className="original-excerpt">{original.body}</p>
    </> : <p className="muted">{status === 'loading' ? '원문을 불러오는 중…' : status === 'error'
      ? '원문을 불러오지 못했어요.' : status === 'hidden' ? '숨김 또는 차단한 원문입니다.' : '삭제되었거나 찾을 수 없는 원문입니다.'}</p>}
  </>;

  return available && linked
    ? <a className="original-reference original-link" href={postLink(original.id)} aria-label="원문 보기">{preview}</a>
    : <div className="original-reference">{preview}</div>;
}
