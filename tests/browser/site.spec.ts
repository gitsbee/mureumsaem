import { test, expect, type Page, type Locator } from '@playwright/test';

const password = 'test-password-2026';
async function signup(page: Page, handle: string) {
  const email = `${handle}-${Date.now()}@example.com`;
  await page.goto('./');
  await page.getByRole('link', { name: '로그인', exact: true }).click();
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveCount(0);
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await expect(page.getByLabel('이메일', { exact: true })).toHaveAttribute('autocomplete', 'username');
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByLabel('가입 이메일', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByLabel('핸들', { exact: true }).fill(handle);
  await page.getByLabel('닉네임', { exact: true }).fill(handle);
  await page.getByRole('button', { name: '가입 완료', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '프로필 편집', exact: true })).toBeVisible();
  await openWall(page);
  return email;
}
async function openWall(page: Page) {
  await page.getByRole('link', { name: '물음샘', exact: true }).click();
  await page.getByRole('link', { name: '담벼락', exact: true }).click();
}
async function openProfile(page: Page) {
  await page.getByRole('button', { name: '계정 메뉴' }).click();
  await page.getByRole('button', { name: '프로필', exact: true }).click();
}
async function expectFlat(control: Locator) {
  await expect(control).toHaveCSS('border-top-width', '0px');
  await expect(control).toHaveCSS('box-shadow', 'none');
  await expect(control).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
}
async function post(page: Page, body: string) {
  await page.getByRole('button', { name: '새 글 쓰기', exact: true }).click();
  const composer = page.getByRole('dialog', { name: '새 글 쓰기', exact: true });
  await composer.getByLabel('게시할 글', { exact: true }).fill(body);
  await composer.getByRole('button', { name: '게시하기', exact: true }).click();
  await expect(composer.getByText('글을 게시했어요.', { exact: true })).toBeVisible();
  await composer.getByRole('button', { name: '닫기', exact: true }).click();
}
async function menu(card: Locator, item: string) {
  await card.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
  await card.getByRole('button', { name: item, exact: true }).click();
}
async function quote(page: Page, card: Locator, body = '') {
  await card.getByRole('button', { name: /^리포스트 \d+$/ }).click();
  const composer = page.getByRole('dialog', { name: /리포스트 (작성|수정)/ });
  await composer.getByLabel('리포스트에 덧붙일 글', { exact: true }).fill(body);
  await composer.getByRole('button', { name: /^(리포스트하기|리포스트 저장)$/ }).click();
  await expect(composer).toHaveCount(0);
}
async function cancelQuote(page: Page, card: Locator) {
  await card.getByRole('button', { name: /^리포스트 \d+$/ }).click();
  const composer = page.getByRole('dialog', { name: '리포스트 수정', exact: true });
  page.once('dialog', dialog => dialog.accept());
  await composer.getByRole('button', { name: '리포스트 취소', exact: true }).click();
  await expect(composer).toHaveCount(0);
}
test.beforeAll(async () => {
  const response = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-postpost/databases/(default)/documents', { method: 'DELETE' });
  expect(response.ok).toBeTruthy();
});

test('desktop navigation, private reactions, activity, exploration, inline search and menus', async ({ browser }) => {
  const first = await browser.newContext(); const second = await browser.newContext();
  const author = await first.newPage(); const reader = await second.newPage();
  try {
    await signup(author, 'writer');
    await post(author, '첫 번째 이야기 #일상 #React');
    const original = author.getByRole('article', { name: 'writer의 글', exact: true });
    await expect(original.getByText('@writer', { exact: true })).toBeVisible();
    expect(await original.locator('.post-body').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBe(17);
    expect(await author.getByRole('navigation', { name: '서비스' }).getByRole('link').allTextContents()).toEqual(['', '', '']);
    const header = author.locator('.pulim-header');
    const profileMenu = header.getByRole('button', { name: '계정 메뉴', exact: true });
    await expect(profileMenu).toHaveText('');
    await expect(header.getByText('writer', { exact: true })).toBeHidden();
    await profileMenu.click();
    await expect(header.getByText('writer', { exact: true })).toBeVisible();
    await expectFlat(header.getByRole('button', { name: '프로필', exact: true }));
    await author.keyboard.press('Escape');
    await author.screenshot({ path: 'test-results/feed-desktop.png', fullPage: true });
    await signup(reader, 'reader');
    const foreign = reader.getByRole('article', { name: 'writer의 글', exact: true });
    await foreign.getByRole('button', { name: '좋아요 0', exact: true }).click();
    await expect(foreign.getByRole('button', { name: '좋아요 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await menu(original, '반응한 사람');
    const people = author.getByRole('dialog', { name: '반응한 사람 · 작성자만 공개' });
    await expect(people.getByText('@reader', { exact: true })).toBeVisible();
    await people.getByRole('link').filter({ hasText: '@reader' }).click();
    await expect(author.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
    await author.getByRole('button', { name: '이전 화면으로', exact: true }).click();
    await expect(author.getByRole('heading', { name: '담벼락', exact: true, level: 1 })).toBeVisible();

    await quote(reader, foreign);
    const shared = reader.getByRole('article', { name: 'reader의 리포스트', exact: true });
    await expect(shared).toBeVisible();
    await expect(original.getByRole('button', { name: '리포스트 1', exact: true })).toBeVisible();
    await cancelQuote(reader, foreign);
    await expect(shared).toHaveCount(0);
    await quote(reader, foreign);
    await expect(shared).toBeVisible();
    await shared.getByRole('link', { name: '원문 보기', exact: true }).click();
    const detail = reader.getByRole('dialog', { name: '포스트 보기', exact: true });
    await expect(detail.getByText('첫 번째 이야기 #일상 #React', { exact: true })).toBeVisible();
    await reader.keyboard.press('Escape');

    await foreign.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
    await expectFlat(foreign.getByRole('button', { name: '게시물 정보', exact: true }));
    await expectFlat(foreign.getByRole('button', { name: '링크 복사', exact: true }));
    const bounds = await foreign.getByRole('button', { name: '링크 복사', exact: true }).locator('svg').evaluate(el => { const box = (el as SVGSVGElement).getBBox(); return { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height }; });
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(24); expect(bounds.bottom).toBeLessThanOrEqual(24);
    await reader.keyboard.press('Escape');

    await openProfile(reader);
    await reader.getByRole('button', { name: '계정 메뉴' }).click();
    await reader.getByRole('button', { name: '내 활동', exact: true }).click();
    await expect(reader.getByRole('heading', { name: '내 활동', exact: true })).toBeVisible();
    await reader.getByRole('button', { name: '좋아요', exact: true }).click();
    await expect(reader.getByRole('article', { name: 'writer의 글', exact: true })).toHaveCount(1);
    await openWall(reader);
    await reader.getByRole('link', { name: '검색', exact: true }).click();
    await expect(reader.getByRole('heading', { name: '담벼락 검색', exact: true })).toBeVisible();
    await reader.locator('.discovery .tags button').filter({ hasText: '#일상' }).click();
    await expect(reader.getByRole('searchbox', { name: '검색어' })).toHaveValue('#일상');
    await expect(reader.getByRole('dialog')).toHaveCount(0);
    await reader.getByRole('searchbox', { name: '검색어' }).fill('@writer');
    await expect(foreign).toBeVisible();
    await openWall(reader);

    await menu(original, '수정');
    await original.getByLabel('글 수정', { exact: true }).fill('수정한 이야기 #기록');
    await original.getByRole('button', { name: '저장', exact: true }).click();
    await expect(foreign.getByText('수정한 이야기 #기록', { exact: true })).toBeVisible();
    await openProfile(reader);
    await reader.getByRole('button', { name: '계정 메뉴' }).click();
    await reader.getByRole('button', { name: '내 활동', exact: true }).click();
    await reader.getByRole('button', { name: '좋아요', exact: true }).click();
    await expect(reader.getByText('수정한 이야기 #기록', { exact: true })).toBeVisible();
    await original.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
    author.once('dialog', dialog => dialog.accept());
    await original.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(original).toHaveCount(0);
    await expect(reader.getByText('수정한 이야기 #기록', { exact: true })).toHaveCount(0);
    await openWall(reader);
    await expect(shared.getByText('삭제되었거나 찾을 수 없는 원문입니다.')).toBeVisible();
    await expect(shared.getByRole('link', { name: '원문 보기', exact: true })).toHaveCount(0);
  } finally { await first.close(); await second.close(); }
});

test('mobile two-step signup, email-only login, back navigation and persistent dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = await signup(page, 'phone');
  const nav = page.getByRole('navigation', { name: '서비스' });
  await expect(nav.getByRole('link')).toHaveCount(3);
  expect(await nav.getByRole('link').evaluateAll(items => items.map(item => item.getAttribute('aria-label')))).toEqual(['물음샘', '수학', '영어']);
  await post(page, '모바일 글 #테스트');
  await openProfile(page);
  await expect(page.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
  const editor = page.locator('.profile-editor');
  const addLink = editor.getByRole('button', { name: '링크 추가', exact: true });
  const save = editor.getByRole('button', { name: '프로필 저장', exact: true });
  const formWidth = await editor.locator('form').evaluate(el => el.getBoundingClientRect().width);
  expect((await addLink.boundingBox())?.width).toBe(formWidth);
  expect((await save.boundingBox())?.width).toBe(formWidth);
  await expect(save.locator('svg')).toHaveCount(1);
  const [prefix, handleInput] = await Promise.all([
    editor.locator('.handle-input span').boundingBox(), editor.getByLabel('핸들', { exact: true }).boundingBox(),
  ]);
  expect(prefix!.y + prefix!.height / 2).toBeCloseTo(handleInput!.y + handleInput!.height / 2);
  await page.getByRole('button', { name: '이전 화면으로', exact: true }).click();
  await expect(page.getByRole('heading', { name: '담벼락', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '계정 메뉴' }).click();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await openWall(page);
  await page.getByRole('link', { name: '검색', exact: true }).click();
  await page.getByRole('link', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('button', { name: '닫기', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '이전 화면으로', exact: true }).click();
  await expect(page.getByRole('heading', { name: '담벼락 검색', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '로그인', exact: true }).click();
  await page.getByLabel('이메일', { exact: true }).fill('@phone');
  expect(await page.getByLabel('이메일', { exact: true }).evaluate(el => (el as HTMLInputElement).checkValidity())).toBeFalsy();
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('이메일 또는 비밀번호');
  expect(await page.locator('body').innerText()).not.toContain(email);
  await page.getByRole('button', { name: '비밀번호를 잊었나요?', exact: true }).click();
  await page.getByRole('button', { name: '재설정 메일 받기', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('재설정 메일');
  await page.getByRole('button', { name: '이전 화면으로', exact: true }).click();
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로필', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('main').getByText('@phone', { exact: true })).toBeVisible();
  await page.locator('.pulim-header').getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('dialog', { name: '설정', exact: true }).getByText('다크', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await nav.getByRole('link').allTextContents()).toEqual(['', '', '']);
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(21, 21, 21)');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).color)).toBe('rgb(244, 244, 244)');
  expect(await page.locator('.pulim-header').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(21, 21, 21)');
  await openWall(page);
  await page.getByRole('link', { name: '검색', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: '검색어' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('searchbox', { name: '검색어' }).fill('@phone');
  await expect(page.getByRole('article').filter({ hasText: '모바일 글 #테스트' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.locator('.post-body').first().evaluate(el => getComputedStyle(el).color)).toBe('rgb(244, 244, 244)');
  await expect(page.locator('.post').first()).toHaveCSS('background-color', 'rgb(32, 32, 32)');
  await page.screenshot({ path: 'test-results/search-dark-mobile.png', fullPage: true });
  await openWall(page);
  await page.screenshot({ path: 'test-results/feed-dark-mobile.png', fullPage: true });
});


test('quote text and independent comment threads survive original deletion safely', async ({ browser }) => {
  const ownerContext = await browser.newContext(); const readerContext = await browser.newContext(); const anonContext = await browser.newContext();
  const owner = await ownerContext.newPage(); const reader = await readerContext.newPage(); const anon = await anonContext.newPage();
  try {
    await signup(owner, 'comment_writer'); await post(owner, '댓글 기능 원문');
    await signup(reader, 'comment_reader');
    const original = owner.getByRole('article', { name: 'comment_writer의 글', exact: true });
    const foreign = reader.getByRole('article', { name: 'comment_writer의 글', exact: true });
    await quote(reader, foreign, '리포스트에 덧붙인 생각 #의견');
    const shared = reader.getByRole('article', { name: 'comment_reader의 리포스트', exact: true });
    await expect(shared.getByText('리포스트에 덧붙인 생각 #의견', { exact: true })).toBeVisible();
    await expect(shared.locator('.post-badges').getByText('리포스트', { exact: true })).toBeVisible();
    await shared.getByRole('button', { name: '좋아요 0', exact: true }).click();
    await expect(shared.getByRole('button', { name: '좋아요 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(foreign.getByRole('button', { name: '좋아요 0', exact: true })).toBeVisible();
    await shared.getByRole('button', { name: '싫어요 0', exact: true }).click();
    await expect(shared.getByRole('button', { name: '싫어요 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const repostAction = shared.getByRole('button', { name: '원문 리포스트 1', exact: true });
    await expect(repostAction).toHaveAttribute('aria-pressed', 'true');
    await expect(repostAction.locator('svg')).toHaveCSS('fill', 'none');
    await repostAction.click();
    await expect(reader.getByRole('dialog', { name: '리포스트 수정' })).toBeVisible();
    await reader.keyboard.press('Escape');
    await foreign.getByRole('button', { name: '댓글 0', exact: true }).click();
    const readerDetail = reader.getByRole('dialog', { name: '포스트 보기', exact: true });
    const readerComments = readerDetail.getByRole('region', { name: '댓글', exact: true });
    await readerComments.getByLabel('댓글 내용', { exact: true }).fill('원문 댓글');
    await readerComments.getByRole('button', { name: '댓글 등록', exact: true }).click();
    const ownComment = readerComments.getByRole('article', { name: 'comment_reader의 댓글', exact: true });
    await expect(ownComment.getByText('원문 댓글', { exact: true })).toBeVisible();
    await ownComment.getByRole('button', { name: '댓글 메뉴', exact: true }).click();
    await ownComment.getByRole('button', { name: '수정', exact: true }).click();
    await ownComment.getByLabel('댓글 수정', { exact: true }).fill('수정한 댓글');
    await ownComment.getByRole('button', { name: '저장', exact: true }).click();
    await expect(ownComment.getByText('수정한 댓글', { exact: true })).toBeVisible();
    await original.getByRole('button', { name: '댓글 1', exact: true }).click();
    const ownerDetail = owner.getByRole('dialog', { name: '포스트 보기', exact: true });
    const ownerComments = ownerDetail.getByRole('region', { name: '댓글', exact: true });
    const otherComment = ownerComments.getByRole('article', { name: 'comment_reader의 댓글', exact: true });
    await expect(otherComment.getByRole('button', { name: '댓글 메뉴', exact: true })).toHaveCount(0);
    await ownerComments.getByLabel('댓글 내용', { exact: true }).fill('작성자의 댓글');
    await ownerComments.getByRole('button', { name: '댓글 등록', exact: true }).click();
    await expect(readerComments.getByText('작성자의 댓글', { exact: true })).toBeVisible();
    await ownComment.getByRole('button', { name: '댓글 메뉴', exact: true }).click();
    reader.once('dialog', dialog => dialog.accept());
    await ownComment.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(otherComment).toHaveCount(0);
    await readerComments.getByLabel('댓글 내용', { exact: true }).fill('남겨 둘 원문 댓글');
    await readerComments.getByRole('button', { name: '댓글 등록', exact: true }).click();
    await reader.keyboard.press('Escape'); await owner.keyboard.press('Escape');
    await shared.getByRole('button', { name: '댓글 0', exact: true }).click();
    await readerDetail.getByRole('region', { name: '댓글', exact: true }).getByLabel('댓글 내용', { exact: true }).fill('리포스트만의 댓글');
    await readerDetail.getByRole('button', { name: '댓글 등록', exact: true }).click();
    await expect(original.getByRole('button', { name: '댓글 2', exact: true })).toBeVisible();
    await anon.goto('./#/wall');
    await anon.getByRole('article', { name: 'comment_writer의 글', exact: true }).getByRole('button', { name: '댓글 2', exact: true }).click();
    const anonDetail = anon.getByRole('dialog', { name: '포스트 보기', exact: true });
    await expect(anonDetail.getByText('남겨 둘 원문 댓글', { exact: true })).toBeVisible();
    await expect(anonDetail.getByLabel('댓글 내용', { exact: true })).toHaveCount(0);
    await original.getByRole('button', { name: '게시물 메뉴', exact: true }).click();
    owner.once('dialog', dialog => dialog.accept());
    await original.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(anonDetail.getByText('삭제되었거나 찾을 수 없는 게시물입니다.')).toBeVisible();
    await expect(anonDetail.getByText('남겨 둘 원문 댓글', { exact: true })).toHaveCount(0);
    await expect(readerDetail.getByText('리포스트에 덧붙인 생각 #의견', { exact: true })).toBeVisible();
    await expect(readerDetail.getByText('리포스트만의 댓글', { exact: true })).toBeVisible();
    await expect(readerDetail.getByText('삭제되었거나 찾을 수 없는 원문입니다.')).toBeVisible();
    await reader.setViewportSize({ width: 390, height: 844 });
    await reader.evaluate(() => localStorage.setItem('muleumsaem:theme', 'dark')); await reader.reload();
    await expect(reader.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(readerDetail.getByText('리포스트만의 댓글', { exact: true })).toBeVisible();
    expect((await readerDetail.boundingBox())?.width).toBe(390);
    expect(await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await reader.screenshot({ path: 'test-results/repost-comments-mobile.png', fullPage: true });
  } finally { await ownerContext.close(); await readerContext.close(); await anonContext.close(); }
});


test('one study document, shared dark theme and synchronized practice records', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 720 }, colorScheme: 'light' });
  await context.addInitScript(() => {
    if (location.protocol.startsWith('http')) localStorage.setItem('pulleem:guest:math:math-forge:theme', 'dark');
  });
  const second = await browser.newContext();
  const author = await context.newPage();
  const other = await second.newPage();
  let unblockMath!: () => void;
  const mathGate = new Promise<void>(resolve => { unblockMath = resolve; });
  await author.route('**/src/learning/engines/math.js*', async route => {
    await mathGate;
    await route.continue();
  });
  try {
    const email = await signup(author, 'study_user');
    const bar = author.locator('.pulim-header');
    const signature = () => bar.locator('.header-inner').evaluate(element => {
      const css = getComputedStyle(element);
      return [css.height, css.width, css.fontFamily, getComputedStyle(element.parentElement!).backgroundColor];
    });
    await expect(bar).toBeVisible();
    const originalBar = await signature();
    await author.evaluate(() => document.querySelector('.pulim-header')?.setAttribute('data-persistent', 'yes'));
    await author.getByRole('link', { name: '수학', exact: true }).click();
    await expect(author.getByRole('heading', { name: '수학', exact: true })).toBeVisible();
    await expect(author.locator('html')).toHaveCSS('background-color', 'rgb(21, 21, 21)');
    await expect(bar).toHaveAttribute('data-persistent', 'yes');
    expect(await signature()).toEqual(originalBar);
    await expect(author.locator('iframe')).toHaveCount(0);
    unblockMath();
    const math = author.locator('.study-math');
    const start = math.locator('#quick-practice');
    await expect(start).toHaveText(/오늘의 문제/);
    await expect(author.getByRole('button', { name: '설정', exact: true })).toHaveCount(1);
    expect(await author.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await author.screenshot({ path: 'test-results/pulim-math-dark.png' });
    await start.click();
    await expect(math.locator('#daily-navigation')).toBeVisible();
    await expect(author.locator('.app-header:visible, .session-header:visible')).toHaveCount(1);
    await expect(math.locator('#session-view .katex').first()).toBeVisible();
    await math.getByRole('link', { name: '연습 나가기' }).click();
    await author.getByRole('button', { name: '설정', exact: true }).click();
    const preferences = math.getByRole('dialog', { name: '설정', exact: true });
    await preferences.getByText('종이', { exact: true }).click();
    await expect(author.locator('html')).toHaveAttribute('data-theme', 'paper');
    await preferences.getByRole('button', { name: '닫기' }).click();
    await author.getByRole('link', { name: '영어', exact: true }).click();

    const english = author.locator('.study-english');
    await expect(english.getByRole('heading', { name: '오늘의 학습', level: 1 })).toBeVisible();
    await expect(author.locator('html')).toHaveAttribute('data-theme', 'paper');
    await expect(author.locator('.app-header:visible, .session-header:visible')).toHaveCount(1);
    expect(await author.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await author.getByRole('button', { name: '설정', exact: true }).click();
    const englishPreferences = english.getByRole('dialog', { name: '설정', exact: true });
    await englishPreferences.getByText('다크', { exact: true }).click();
    await englishPreferences.getByRole('button', { name: '닫기' }).click();
    await author.screenshot({ path: 'test-results/pulim-english-dark.png' });
    expect(await signature()).toEqual(originalBar);
    await english.getByRole('button', { name: '1구간 시작', exact: true }).click();
    await expect(author.locator('.app-header:visible, .session-header:visible')).toHaveCount(1);
    await english.getByRole('button', { name: '정답 확인', exact: true }).click();
    await english.getByRole('button', { name: '쉬움', exact: true }).click();
    await english.getByRole('button', { name: '연습 나가기' }).click();
    await english.locator('.mode-options input[value="choice"] + span').click();
    await english.getByRole('button', { name: '1구간 시작', exact: true }).click();
    const firstOption = english.locator('.choice-option').first();
    const chosenAnswer = await firstOption.locator('.choice-text').innerText();
    await firstOption.click();
    await author.reload();
    await expect(author.locator('html')).toHaveAttribute('data-theme', 'dark');

    await other.goto('./#/me');
    await other.getByLabel('이메일', { exact: true }).fill(email);
    await other.getByLabel('비밀번호', { exact: true }).fill(password);
    await other.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(other.getByRole('heading', { name: '프로필', level: 1 })).toBeVisible();
    await other.getByRole('button', { name: '계정 메뉴' }).click();
    await expect(other.getByRole('button', { name: '내 기록', exact: true })).toHaveCount(0);
    await other.getByRole('button', { name: '프로필', exact: true }).click();
    const records = other.getByRole('region', { name: '내 정보 관리' });
    const mathDownload = other.waitForEvent('download');
    await records.getByRole('button', { name: '기록 내보내기' }).click();
    const backup = await mathDownload;
    expect(backup.suggestedFilename()).toContain('물음샘-수학');
    await records.locator('input[type=file]').setInputFiles((await backup.path())!);
    await expect(records.getByRole('status')).toHaveText('학습 기록을 가져왔습니다.');
    await records.getByLabel('학습 기록 과목').selectOption('english');
    const englishDownload = other.waitForEvent('download');
    await records.getByRole('button', { name: '기록 내보내기' }).click();
    expect((await englishDownload).suggestedFilename()).toContain('물음샘-영어');
    other.once('dialog', dialog => dialog.accept());
    await records.locator('input[type=file]').setInputFiles({
      name: '영어-백업.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ version: 1, subject: 'english', records: {
        stars: { 0: true }, modeProgress: { recall: { 0: 'correct' } },
      } })),
    });
    await expect(records.getByRole('status')).toHaveText('학습 기록을 가져왔습니다.');
    await other.getByRole('link', { name: '영어', exact: true }).click();
    await expect(other.locator('.study-english')).toBeVisible();
    await other.getByRole('button', { name: '기록', exact: true }).click();
    const syncedRecords = other.locator('.record-panel').filter({
      has: other.getByRole('heading', { name: '동기화된 풀이 기록', exact: true }),
    });
    await expect(syncedRecords.getByText('as part of', { exact: true })).toHaveCount(2);
    const attempt = syncedRecords.getByRole('listitem').filter({ hasText: '영어 · 선택' });
    await attempt.getByText('풀이 상세', { exact: true }).click();
    await expect(attempt.getByText(`내 답안 · ${chosenAnswer}`, { exact: true })).toBeVisible();
  } finally {
    unblockMath();
    await context.close();
    await second.close();
  }
});

test('English restores the vocabulary layout and uses Forge control roles on desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('./#/english');
  const english = page.locator('.study-english');
  const gridColumns = (selector: string) => english.locator(selector).first().evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').length);
  await expect(english.getByRole('heading', { name: '오늘의 학습' })).toBeVisible();
  expect(await gridColumns('.scope-options')).toBe(4);
  const colors = await english.locator('.mode-options .select-card > span').evaluateAll(elements =>
    elements.map(element => getComputedStyle(element).getPropertyValue('--rest-edge').trim()));
  expect(new Set(colors).size).toBe(3);
  await expect(english.locator('.mode-options .ui-strong').first()).toHaveCSS('font-weight', '700');
  await expect(english.locator('.home-metrics dt').first()).toHaveCSS('font-weight', '400');

  const segment = english.locator('.segment-card').first();
  const action = segment.getByRole('button', { name: '1구간 시작', exact: true });
  await expect(action).toHaveCSS('border-top-width', '0px');
  await expect(action).toHaveCSS('box-shadow', 'none');
  await expect(segment.locator('.segment-tags .icon').first()).toHaveCSS('width', '18px');
  await expect(action.locator('.icon')).toHaveCSS('width', '24px');
  const tagColors = await segment.locator('.segment-tags .context-chip').evaluateAll(items =>
    items.map(item => getComputedStyle(item).backgroundColor));
  expect(new Set(tagColors).size).toBe(4);
  await segment.locator('summary').click();
  await expect.poll(() => gridColumns('.segment-words')).toBeGreaterThan(1);
  const card = segment.locator('.word-flip').first();
  await expect(card.locator('.word-meaning')).toBeHidden();
  await card.click();
  await expect(card.locator('.word-meaning')).toBeVisible();
  await page.screenshot({ path: 'test-results/pulim-english-layout-desktop.png' });

  await page.setViewportSize({ width: 320, height: 720 });
  expect(await gridColumns('.scope-options')).toBe(2);
  expect(await gridColumns('.segment-words')).toBe(1);
  await english.locator('.mode-options input[value="choice"] + span').click();
  await action.click();
  const choice = english.locator('.choice-option').first();
  await expect(choice).toHaveCSS('display', 'grid');
  await choice.click();
  await expect(english.locator('.choice-correct')).toBeVisible();
  await expect(english.locator('.choice-correct')).toHaveCSS('opacity', '1');
  await english.getByRole('button', { name: '연습 나가기', exact: true }).click();
  await expect(english.locator('.saved-round .context-chip')).toHaveCount(3);
  await english.locator('.mode-options input[value="type"] + span').click();
  await action.click();
  const submit = english.getByRole('button', { name: '정답 확인', exact: true });
  await expect(submit).toHaveCSS('border-top-width', '2px');
  expect(await submit.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');
  const actionPositions = await english.locator('.type-actions > button').evaluateAll(buttons =>
    buttons.map(button => Math.round(button.getBoundingClientRect().top)));
  expect(new Set(actionPositions).size).toBe(1);
  await english.getByRole('button', { name: '정답 보기', exact: true }).click();
  await expect(english.locator('.verdict.is-wrong')).toBeVisible();
  await page.screenshot({ path: 'test-results/pulim-english-layout-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('one header, two control styles and shared support at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('./');
  const header = page.locator('.pulim-header');
  const tabs = header.getByRole('navigation', { name: '화면 메뉴' });
  await expect(tabs.getByRole('link', { name: '홈', exact: true })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('link', { name: '담벼락', exact: true }).click();
  await expect(tabs.getByRole('link', { name: '담벼락', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('main').getByRole('link', { name: '담벼락', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await expect(tabs.getByRole('link', { name: '홈', exact: true }).locator('svg')).toHaveCount(1);
  await expect(tabs.getByRole('link', { name: '담벼락', exact: true }).locator('svg')).toHaveCount(1);
  await tabs.getByRole('link', { name: '홈', exact: true }).click();
  await expect(page.getByRole('heading', { name: '무엇을 연습할까요?' })).toBeVisible();
  await expect(page.locator('.subject-card')).toHaveCount(4);
  await page.getByRole('button', { name: '7', exact: true }).click();
  await expect(page.locator('.home-demo').getByRole('status')).toContainText('정답이에요');
  await page.locator('.home-demo').getByRole('button', { name: '영어', exact: true }).click();
  await page.getByRole('button', { name: '알아내다', exact: true }).click();
  await expect(page.locator('.home-demo').getByRole('status')).toContainText('정답이에요');

  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  expect(await header.evaluate(el => el.getBoundingClientRect().top)).toBe(0);
  const searchTab = tabs.getByRole('link', { name: '검색', exact: true });
  await expectFlat(searchTab);
  await searchTab.click();
  await expect(searchTab).toHaveAttribute('aria-current', 'page');

  const gear = tabs.getByRole('button', { name: '설정', exact: true });
  await expectFlat(gear);
  await expect(gear.locator('svg use')).toHaveAttribute('href', '#ico-settings');
  await gear.click();
  const settings = page.getByRole('dialog', { name: '설정', exact: true });
  const units = settings.getByRole('tablist', { name: '설정 탭' });
  await expect(units.getByRole('tab', { name: '화면', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(settings.getByRole('switch', { name: '전체화면' })).toBeVisible();
  await expect(units.getByRole('tab').allTextContents()).resolves.toEqual(['화면', '입력', '소리', '지원', '물음샘']);
  await units.getByRole('tab', { name: '입력', exact: true }).click();
  await settings.getByRole('switch', { name: '펜 전용' }).check();
  await settings.getByRole('switch', { name: '세벌식 390' }).check();
  await settings.getByRole('slider', { name: '펜 압력 감도' }).press('End');

  await units.getByRole('tab', { name: '소리', exact: true }).click();
  const volume = settings.getByRole('slider', { name: '효과음 음량' });
  const progress = () => volume.evaluate(el => ({
    fill: parseFloat(getComputedStyle(el.parentElement!).getPropertyValue('--range-progress')),
    width: el.getBoundingClientRect().width,
  }));
  await volume.focus();
  await page.keyboard.press('End');
  const end = await progress();
  expect(Math.abs(end.fill - (end.width - 14))).toBeLessThanOrEqual(1);
  await page.keyboard.press('Home');
  expect((await progress()).fill).toBe(14);
  await settings.getByRole('switch', { name: '효과음' }).uncheck();
  await units.getByRole('tab', { name: '물음샘', exact: true }).click();
  await expect(settings.getByRole('link', { name: '로그인', exact: true })).toBeVisible();
  await units.getByRole('tab', { name: '지원', exact: true }).click();
  await settings.getByRole('button', { name: '소개', exact: true }).click();
  const about = page.getByRole('dialog', { name: '소개', exact: true });
  const introTabs = about.getByRole('tablist');
  await expect(introTabs.getByRole('tab')).toHaveCount(3);
  await introTabs.getByRole('tab', { name: '물음샘' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(about.getByRole('tabpanel', { name: '수학' })).toContainText('문제를 만드는 방식');
  await page.keyboard.press('End');
  await expect(about.getByRole('tabpanel', { name: '영어' })).toContainText('단어장');
  await page.keyboard.press('Escape');
  await expect(about).toBeHidden();
  await expect(settings).toBeVisible();
  await expect(settings.getByRole('button', { name: '소개', exact: true })).toBeFocused();
  await settings.getByRole('button', { name: '닫기', exact: true }).click();

  await page.getByRole('link', { name: '도움말', exact: true }).click();
  await expectFlat(page.getByRole('button', { name: '이전 화면으로', exact: true }));
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveCount(3);

  for (const [subject, engine] of [['수학', 'math'], ['영어', 'english']]) {
    await header.getByRole('link', { name: subject, exact: true }).click();
    await expect(page.locator('.study-' + engine)).toBeVisible();
    if (engine === 'english') {
      const gaps = await page.locator('.study-english .home-overview > .home-session').evaluateAll(cards =>
        cards.slice(1).map((card, index) => card.getBoundingClientRect().top - cards[index].getBoundingClientRect().bottom));
      expect(gaps).toEqual([16, 16]);
    }
    await header.getByRole('button', { name: '기록', exact: true }).click();
    const ranking = page.locator('[data-ranking]');
    await expect(ranking.getByRole('heading', { name: subject + ' 온라인 랭킹' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await gear.click();
    await expect(settings.getByRole('switch', { name: '전체화면' })).toBeVisible();
    await units.getByRole('tab', { name: '소리', exact: true }).click();
    await expect(settings.getByRole('switch', { name: '효과음' })).not.toBeChecked();
    await expect(volume).toHaveValue('0');
    await units.getByRole('tab', { name: '입력', exact: true }).click();
    await expect(settings.getByRole('switch', { name: '펜 전용', exact: true })).toBeChecked();
    await expect(settings.getByRole('switch', { name: '세벌식 390', exact: true })).toBeChecked();
    await expect(settings.getByRole('slider', { name: '펜 압력 감도' })).toHaveValue('100');
    await units.getByRole('tab', { name: '지원', exact: true }).click();
    await settings.getByRole('button', { name: '도움말', exact: true }).click();
    const help = page.getByRole('dialog', { name: '도움말', exact: true });
    await expect(help.getByRole('tab', { name: subject })).toHaveAttribute('aria-selected', 'true');
    await expect(help.getByRole('tab')).toHaveCount(3);
    await expectFlat(help.getByRole('button', { name: '닫기', exact: true }));
    await help.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(settings.getByRole('button', { name: '도움말', exact: true })).toBeFocused();
    await settings.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(page.locator('.app-header:visible, .session-header:visible')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('legacy browser data moves to the new namespace and stays independent of resets', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('test:legacy')) {
      sessionStorage.setItem('test:legacy', '1');
      localStorage.setItem('pulim:theme', 'dark');
      localStorage.setItem('pulleem:guest:english:amgi-v1', JSON.stringify({ stars: { 0: true } }));
      sessionStorage.setItem('pulleem:guest:math:math-forge:active-ink', 'legacy-ink');
    }
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('muleumsaem:guest:english:amgi-v1') || '{}'))).toEqual({ stars: { 0: true } });
  expect(await page.evaluate(() => sessionStorage.getItem('muleumsaem:guest:math:math-forge:active-ink'))).toBe('legacy-ink');
  await page.evaluate(() => localStorage.removeItem('muleumsaem:guest:english:amgi-v1'));
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('muleumsaem:guest:english:amgi-v1'))).toBeNull();
});

test('a question can be attached from practice and a reader can report, hide and block', async ({ browser }) => {
  const authorContext = await browser.newContext();
  const readerContext = await browser.newContext();
  try {
    const author = await authorContext.newPage();
    const reader = await readerContext.newPage();
    await signup(author, 'question_author');
    await author.getByRole('link', { name: '수학', exact: true }).click();
    await author.locator('.study-math #quick-practice').click();
    await author.getByRole('button', { name: '이 문제로 질문하기' }).click();
    const composer = author.getByRole('dialog', { name: '담벼락에 질문하기' });
    await expect(composer.getByText('[수학 문제]', { exact: false })).toBeVisible();
    await composer.getByLabel('게시할 글').fill('이 문제의 첫 단계가 궁금해요.');
    await composer.getByRole('button', { name: '게시하기' }).click();
    await expect(composer.getByRole('status')).toHaveText('글을 게시했어요.');
    await composer.getByRole('button', { name: '닫기' }).click();

    await signup(reader, 'moderation_reader');
    const card = reader.getByRole('article', { name: 'question_author의 글' });
    await expect(card.getByText('이 문제의 첫 단계가 궁금해요.', { exact: false })).toBeVisible();
    await menu(card, '신고');
    const report = reader.getByRole('dialog', { name: '게시물 신고' });
    await report.getByLabel('신고 이유').selectOption('other');
    await report.getByRole('button', { name: '신고 보내기' }).click();
    await expect(report.getByRole('status')).toHaveText('신고를 접수했어요.');
    await report.getByRole('button', { name: '닫기' }).click();
    await menu(card, '이 글 숨기기');
    await expect(card).toHaveCount(0);
    await openProfile(reader);
    await reader.getByRole('button', { name: '숨김 해제' }).click();
    await openWall(reader);
    await expect(card).toBeVisible();
    reader.once('dialog', dialog => dialog.accept());
    await menu(card, '작성자 차단');
    await expect(card).toHaveCount(0);
    await openProfile(reader);
    await reader.getByRole('button', { name: '차단 해제' }).click();
    await openWall(reader);
    await expect(card).toBeVisible();
  } finally {
    await Promise.all([authorContext.close(), readerContext.close()]);
  }
});

test('a guest keeps an attached English question through sign-in', async ({ browser }) => {
  const authorContext = await browser.newContext();
  const guestContext = await browser.newContext();
  try {
    const email = await signup(await authorContext.newPage(), 'guest_question');
    const guest = await guestContext.newPage();
    await guest.goto('./#/english');
    const english = guest.locator('.study-english');
    await english.getByRole('button', { name: '1구간 시작', exact: true }).click();
    await english.getByRole('button', { name: '이 문제로 질문하기' }).click();
    const question = guest.getByRole('dialog', { name: '담벼락에 질문하기' });
    await question.getByLabel('이메일', { exact: true }).fill(email);
    await question.getByLabel('비밀번호', { exact: true }).fill(password);
    await question.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(question.getByText('[영어 문제] ‘as part of’의 뜻은 무엇인가요?', { exact: false })).toBeVisible();
    await question.getByRole('button', { name: '문제 첨부 빼기' }).click();
    await expect(question.getByText('[영어 문제]', { exact: false })).toHaveCount(0);
  } finally {
    await Promise.all([authorContext.close(), guestContext.close()]);
  }
});
