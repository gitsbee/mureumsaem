import { iconMarkup } from "../../design/icons";
import { readStudySound, saveStudySound } from "../soundSettings";

export default function mountEnglish(runtime) {
  const { document, window, matchMedia, ResizeObserver, MutationObserver } = runtime;
const icon = name => iconMarkup(name, 'english');

const $ = selector => document.querySelector(selector);
const app = $('#app');
const studyModes = {
  flash: ['플래시카드', '단어와 뜻을 번갈아 보기', 'cards', 'info'],
  recall: ['암기', '뜻을 떠올리고 스스로 확인하기', 'history', 'review'],
  choice: ['선택', '뜻을 보기에서 고르기', 'check', 'info'],
  type: ['스펠', '영어를 보고 한국어 뜻 쓰기', 'keyboard', 'success'],
};

let words = [], view = 'home', mode = 'recall', session = [], position = 0;
const defaultRange = { from: 1, to: 20, size: 20, group: 0, manual: false, scope: 'all', shuffle: false };
let preferences = { ...defaultRange };
let outcomes = [], question, roundKey = null;
let state = {};
try { state = JSON.parse(window.studyBridge.local.getItem('amgi-v1')) || {}; } catch {}
state.stars ??= {};
state.wrong ??= {};
state.extra ??= {};
state.ime ??= false;
state.hints ??= {};
state.theme ??= 'system';
const sharedSound = readStudySound({ enabled: state.sound ?? true, volume: state.volume ?? 70 });
state.sound = sharedSound.enabled;
state.volume = sharedSound.volume;
state.progress ??= {};
state.drafts ??= {};
state.segmentDrafts ??= {};
state.segmentProgress ??= {};
state.modeProgress ??= {};
for (const key of ['flash','recall','choice','type']) state.modeProgress[key] ??= {};
state.modeProgress ??= { flash: {}, recall: {}, type: {} };
preferences = { ...defaultRange, ...state.range };
function save() {
  try { window.studyBridge.local.setItem('amgi-v1', JSON.stringify(state)); } catch {}
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const normalize = value => value.normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
const heading = (title, description = '') => `<div class="page-intro"><h1 tabindex="-1">${title}</h1>${description ? `<p>${description}</p>` : ''}</div>`;

function go(destination) {
  view = destination;
  render();
  window.scrollTo(0, 0);
  (app.querySelector('#answer:not([readonly])') ?? app.querySelector('#submit[aria-keyshortcuts]') ?? app.querySelector('h1, h2'))?.focus({ preventScroll: true });
}
document.querySelectorAll('.app-header [data-view]').forEach(button => {
  button.onclick = () => { if (words.length) go(button.dataset.view); };
});

function render() {
  document.body.classList.toggle('studying', view === 'session');
  runtime.updateView(view === 'wrong' ? 'history' : 'practice', view === 'session');
  const current = view === 'wrong' ? 'wrong' :
    view === 'overview' ? 'overview' : 'home';
  document.querySelectorAll('nav [data-view]').forEach(button => {
    if (button.dataset.view === current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'home') renderSetup();
  else if (view === 'session') renderSession();
  else if (view === 'complete') renderComplete();
  else renderCollection();
}

function selectedIndices(from, to, scope = preferences.scope) {
  return words.map((_, i) => i).filter(i => i + 1 >= from && i + 1 <= to &&
    (scope === 'all' || (scope === 'wrong' && state.wrong[i]) ||
    (scope === 'stars' && state.stars[i]) || (scope === 'hints' && state.hints[i])));
}
function segmentKey(kind, scope, from, to) { return `${kind}|${scope}|${from}|${to}`; }
function segmentStatuses(key, kind, indices) {
  return state.segmentProgress[key] ?? Object.fromEntries(indices.filter(i => state.modeProgress[kind]?.[i]).map(i => [i, state.modeProgress[kind][i]]));
}
const outcomeTones = {
  correct: 'success', seen: 'success', wrong: 'danger', hinted: 'review', medium: 'review', remaining: 'neutral',
};
const scopeTones = { all: 'success', wrong: 'danger', stars: 'review', hints: 'info' };

function chip(text, glyph, tone, label = text) {
  return `<span class="context-chip" data-tone="${tone}" title="${escapeHtml(label)}"
    aria-label="${escapeHtml(label)}">${glyph ? icon(glyph) : ''}${escapeHtml(text)}</span>`;
}

function segmentTags(kind, indices, status) {
  const keys = ['correct', kind === 'recall' ? 'medium' : 'hinted', 'wrong', 'remaining'];
  const icons = kind === 'recall' ? ['difficulty-low','difficulty-medium','difficulty-high','history'] : ['check','bulb','close','history'];
  const labels = kind === 'recall' ? ['쉬움','보통','어려움','미학습'] : ['정답','힌트 정답','오답','미학습'];
  return keys.map((key, index) => {
    const count = indices.filter(i => key === 'remaining' ? !status[i] : status[i] === key).length;
    return chip(count, icons[index], outcomeTones[key], `${labels[index]} ${count}개`);
  }).join('');
}
function renderSetup() {
  if (!['recall','choice','type'].includes(mode)) mode = 'recall';
  app.innerHTML = `<section class="setup-view">${heading('오늘의 학습')}<div class="home-overview">
    <section class="home-session home-status"><h2>현재 상태</h2>${homeMetrics()}</section>
    <section class="home-session home-current"><h2>진행 중인 문제</h2>${currentRoundMarkup()}</section>
    <section class="home-session range-settings"><h2>학습하기</h2><form id="setup-form" class="setup-form" novalidate>
      <fieldset><legend>연습 방식</legend><div class="mode-options">${['recall','choice','type'].map(key => { const [label, description, iconName, tone] = studyModes[key]; return `<label class="select-card" data-tone="${tone}"><input type="radio" name="mode" value="${key}" ${key === mode ? 'checked' : ''}><span>${icon(iconName)}<strong class="ui-strong">${label}</strong><span class="sr-only">${description}</span></span></label>`; }).join('')}</div></fieldset>
      <fieldset><legend>단어장</legend><div class="select-card unit-card word-list-card" data-tone="info"><span>${icon('book')}<span class="unit-copy"><strong class="ui-strong">1번 리스트</strong><small>${words.length}단어</small></span></span></div></fieldset>
      <fieldset><legend>학습 범위</legend><div class="scope-options">${[['all','전체 단어'],['wrong','틀린 단어'],['stars','북마크'],['hints','힌트 정답']].map(([key,label]) => `<label class="select-card" data-tone="${scopeTones[key]}"><input type="radio" name="scope" value="${key}" ${key === preferences.scope ? 'checked' : ''}><span>${icon(({all:'book',wrong:'repeat',stars:'star',hints:'bulb'})[key])}<span>${label}</span></span></label>`).join('')}</div>
        <div class="unit-heading"><h3>학습 구간</h3><div class="unit-heading-controls"><label class="mix-toggle"><span>믹스</span><input name="shuffle" type="checkbox" role="switch" ${preferences.shuffle ? 'checked' : ''}></label><label class="interval-control" id="generated-range" ${preferences.manual ? 'hidden' : ''}><span>구간 간격</span><input name="size" type="number" aria-label="구간 간격" min="1" max="${words.length}" value="${preferences.size}"></label></div></div>
        <div class="range-fields" id="manual-range" ${preferences.manual ? '' : 'hidden'}><label>시작 번호<input name="from" type="number" min="1" max="${words.length}" value="${preferences.from}"></label><label>끝 번호<input name="to" type="number" min="1" max="${words.length}" value="${preferences.to}"></label></div>
      </fieldset><p id="setup-error" class="error" role="alert"></p><div id="segment-list"></div>
    </form></section></div></section>`;
  app.querySelectorAll('[data-resume]').forEach(button => button.onclick = () => resumeRound(button.dataset.resume));
  const form = $('#setup-form');
  const drawSegments = () => {
    const p = preferences;
    if ((!p.manual && (!Number.isInteger(p.size) || p.size < 1 || p.size > words.length)) || (p.manual && (!Number.isInteger(p.from) || !Number.isInteger(p.to) || p.from < 1 || p.to > words.length || p.from > p.to))) {
      $('#segment-list').innerHTML = ''; $('#setup-error').textContent = `1번부터 ${words.length}번 사이의 올바른 범위를 입력해 주세요.`; return;
    }
    $('#setup-error').textContent = '';
    const ranges = p.manual ? [[p.from,p.to]] : Array.from({length:Math.ceil(words.length/p.size)},(_,i)=>[i*p.size+1,Math.min((i+1)*p.size,words.length)]);
    $('#segment-list').innerHTML = `${ranges.map(([from,to],n) => {
      const indices = selectedIndices(from,to); const key = segmentKey(mode,p.scope,from,to);
      const status = segmentStatuses(key,mode,indices), draft = state.segmentDrafts[key];
      const done = indices.length > 0 && indices.every(i => status[i]);
      const hasRecord = !!draft || indices.some(i => status[i]);
      return `<details class="segment-card" data-range="${from},${to}"><summary><span class="segment-heading ui-strong">${p.manual ? '직접 설정' : `${n+1}구간`}</span><span class="segment-tags">${segmentTags(mode,indices,status)}</span><span class="segment-actions">${hasRecord ? `<button type="button" class="plain-button" data-segment-reset="${key}" aria-label="${n+1}구간 학습 기록 초기화" title="구간 초기화">${icon('repeat')}</button>` : ''}${indices.length && (!done || draft) ? `<button type="button" class="plain-button" data-segment-start="${key}" aria-label="${n+1}구간 ${draft ? '이어서' : '시작'}" title="${draft ? '이어서 풀기' : '학습 시작'}">${icon('next')}</button>` : ''}</span></summary><div class="segment-words">${indices.length ? indices.map(i => `<button type="button" class="button secondary word-flip" aria-pressed="false" data-word="${i}"><span lang="en">${escapeHtml(words[i].en)}</span><span class="word-meaning">${escapeHtml(words[i].ko)}</span></button>`).join('') : '<p class="empty">이 범위에 해당하는 단어가 없어요.</p>'}</div></details>`;
    }).join('')}`;
    $('#segment-list').querySelectorAll('[data-word]').forEach(button => button.onclick = () => button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') !== 'true'));
    $('#segment-list').querySelectorAll('[data-segment-start]').forEach(button => button.onclick = event => {
      event.preventDefault(); event.stopPropagation(); const key = button.dataset.segmentStart;
      if (state.segmentDrafts[key]) { resumeRound(key); return; }
      const [,scope,a,b] = key.split('|'); let indices = selectedIndices(Number(a),Number(b),scope);
      if (preferences.shuffle) for(let i=indices.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [indices[i],indices[j]]=[indices[j],indices[i]]; }
      roundKey = key; mode = key.split('|')[0]; state.segmentProgress[key] ??= segmentStatuses(key, mode, indices); session = indices; startRound();
    });
    $('#segment-list').querySelectorAll('[data-segment-reset]').forEach(button => button.onclick = event => {
      event.preventDefault(); event.stopPropagation(); const key = button.dataset.segmentReset;
      const dialog = $('#segment-reset-dialog'); dialog.returnValue = ''; dialog.onclose = () => {
        if (dialog.returnValue !== 'reset') return;
        delete state.segmentDrafts[key]; state.segmentProgress[key] = {}; save(); renderSetup();
      }; dialog.showModal();
    });
  };
  form.oninput = () => {
    const f = form.elements; mode = f.mode.value;
    preferences = { ...preferences, scope:f.scope.value, manual:preferences.manual, shuffle:f.shuffle.checked, size:f.size.valueAsNumber, from:f.from.valueAsNumber, to:f.to.valueAsNumber };
    state.range = preferences; save(); $('#generated-range').hidden = preferences.manual; $('#manual-range').hidden = !preferences.manual; drawSegments();
  };
  form.onsubmit = e => e.preventDefault(); drawSegments();
}

function starMarkup(index) {
  const selected = Boolean(state.stars[index]);
  return `<button type="button" class="icon-button star" data-tone="review" data-star="${index}" aria-label="북마크" aria-pressed="${selected}">${icon('star')}</button>`;
}
function bindStars(update) {
  app.querySelectorAll('[data-star]').forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      const index = button.dataset.star;
      state.stars[index] = !state.stars[index];
      save();
      app.querySelectorAll(`[data-star="${index}"]`).forEach(star => star.setAttribute('aria-pressed', state.stars[index]));
      update?.();
    };
  });
}
function renderCollection() {
  const review = view === 'wrong';
  const groups = review ? [
    ['wrong', '복습할 단어'],
    ['bookmarks', '보관한 단어'],
    ['hints', '힌트 정답'],
  ] : [['overview', '단어장']];
  app.innerHTML = `<section class="history-view">
    ${heading(review ? '학습 기록' : '단어장', review ? '' : `1번 리스트 · ${words.length}단어`)}
    ${review ? '<div data-ranking></div>' : ''}
    <input id="search" class="search" placeholder="영어 또는 뜻 검색" aria-label="단어 검색" type="search">
    ${groups.map(([key, title]) => review ? `<details class="history-group" open>
      <summary>${title}</summary><div data-words="${key}"></div>
      ${key === 'hints' && Object.values(state.hints).some(Boolean) ? `<button class="button primary action-start wide review-start" id="practice-hints">${icon('repeat')} 복습 시작</button>` : ''}
    </details>` : '<div data-words="overview"></div>').join('')}
  </section>`;
  if ($('#practice-hints')) $('#practice-hints').onclick = () => {
    beginRound('type', words.map((_, index) => index).filter(index => state.hints[index]));
  };
  function drawGroup(key) {
    const query = $('#search').value.trim().toLowerCase();
    let matches = words.map((word, index) => ({ ...word, index }));
    if (key === 'wrong') matches = matches.filter(w => state.wrong[w.index]).sort((a, b) => state.wrong[b.index] - state.wrong[a.index]);
    if (key === 'hints') matches = matches.filter(w => state.hints[w.index]);
    if (key === 'bookmarks') matches = matches.filter(w => state.stars[w.index]);
    matches = matches.filter(w => w.en.toLowerCase().includes(query) || w.ko.includes(query));
    $(`[data-words="${key}"]`).innerHTML = matches.length ? matches.map(word => `
      <details class="review-item ${key === 'bookmarks' ? 'saved-problem saved-archive' : ''}">
        <summary>
          <span class="review-name">${icon(key === 'bookmarks' ? 'star' : review ? 'repeat' : 'book')} <span lang="en">${escapeHtml(word.en)}</span></span>
          <span class="review-stage">${key === 'wrong'
            ? chip(`오답 ${state.wrong[word.index]}회`, 'close', 'danger')
            : chip(`${word.index + 1}번`, 'list', 'neutral')}</span>
        </summary>
        <div class="review-body">
          <p>${escapeHtml(word.ko)}</p>
          <div class="word-card-footer">${wordStatuses(word.index)}${starMarkup(word.index)}</div>
        </div>
      </details>`).join('') :
      `<p class="empty">${query ? '검색 결과가 없어요.' : '아직 모아 둔 단어가 없어요.'}</p>`;
  }
  function bindCollectionStars() {
    bindStars(() => {
      if (!review) return;
      drawGroup('bookmarks');
      bindCollectionStars();
    });
  }
  function draw() {
    groups.forEach(([key]) => drawGroup(key));
    bindCollectionStars();
  }
  $('#search').oninput = draw;
  draw();
}

$('.brand-icon').outerHTML = icon('logo');
for (const [viewName, iconName] of [['home','book'],['wrong','history']]) {
  const button = $('nav [data-view="' + viewName + '"]');
  button.innerHTML = icon(iconName) + '<span>' + button.textContent + '</span>';
}
$('#home-settings').innerHTML = icon('settings');
document.querySelectorAll('[data-icon]').forEach(slot => { slot.innerHTML = icon(slot.dataset.icon); });
const settingsDialog = $('#preferences');
let returnFocus;
document.addEventListener('click', event => {
  const button = event.target.closest('[data-settings]');
  if (!button) return;
  returnFocus = document.activeElement;
  const theme = settingsDialog.querySelector(`[name="theme"][value="${runtime.getTheme()}"]`);
  if (theme) theme.checked = true;
  settingsDialog.showModal();
  settingsDialog.scrollTop = 0;
  settingsDialog.querySelector('.settings-units [aria-selected="true"]')?.focus();
});
settingsDialog.addEventListener('close', () => {
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
});
settingsDialog.querySelectorAll('[name="theme"]').forEach(button => {
  button.checked = button.value === runtime.getTheme();
  button.onchange = () => runtime.setTheme(button.value);
});
$('#sound-enabled').checked = state.sound;
$('#sound-volume').value = state.volume;
$('#sound-volume-value').textContent = state.volume + '%';
$('#manual-setting').checked = preferences.manual;
$('#manual-setting').onchange = event => { preferences.manual = event.target.checked; state.range = preferences; save(); if (view === 'home') renderSetup(); };
$('#sound-enabled').onchange = event => { state.sound = event.target.checked; saveStudySound({ enabled: state.sound, volume: state.volume }); };
$('#sound-volume').oninput = event => { state.volume = Number(event.target.value); $('#sound-volume-value').textContent = state.volume + '%'; saveStudySound({ enabled: state.sound, volume: state.volume }); };
$('#ime').onchange = () => h3Reset();

const recallLabels = { wrong: '어려움', medium: '보통', correct: '쉬움' };
const gradeLabels = { correct: '정답', hinted: '힌트 정답', wrong: '오답', remaining: '남은 개수' };

function cardNeedsReview(status) {
  return ['wrong', 'hinted', 'medium'].includes(status);
}
function latestStatus(index) {
  const results = ['recall', 'choice', 'type'].map(key => state.modeProgress[key][index]).filter(Boolean);
  if (results.length) return results.find(cardNeedsReview) || results[0];
  return state.progress[index] || (state.wrong[index] ? 'wrong' : state.hints[index] ? 'hinted' : state.modeProgress.flash[index] || '');
}
function homeMetrics() {
  const counts = { studied: 0, review: 0, unused: 0 };
  words.forEach((_, index) => {
    const status = latestStatus(index);
    counts[cardNeedsReview(status) ? 'review' : status ? 'studied' : 'unused']++;
  });
  return `<dl class="metrics home-metrics">
    <div class="metric tone-score"><dt>${icon('check')}학습한 카드</dt><dd><strong>${counts.studied}장</strong></dd></div>
    <div class="metric tone-review"><dt>${icon('history')}오답 및 힌트 카드</dt><dd><strong>${counts.review}장</strong></dd></div>
    <div class="metric tone-count"><dt>${icon('cards')}미학습 카드</dt><dd><strong>${counts.unused}장</strong></dd></div>
  </dl>`;
}
function wordStatuses(index) {
  return `<div class="word-statuses">${['recall', 'choice', 'type'].map(key => {
    const status = state.modeProgress[key][index];
    const label = (key === 'recall' ? recallLabels : gradeLabels)[status] || '기록 없음';
    const [name, , glyph] = studyModes[key];
    return chip(`${name} · ${label}`, glyph, outcomeTones[status] || 'neutral');
  }).join('')}</div>`;
}
function currentRoundMarkup() {
  const all = [...Object.entries(state.segmentDrafts).map(([key,draft]) => ({...draft,key})), ...Object.entries(state.drafts).map(([key,draft]) => ({...draft,key}))];
  const draft = all.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!draft || !words[draft.session[draft.position]]) return '<p class="secondary-copy">진행 중인 문제가 없어요.</p>';
  const i = draft.session[draft.position], label = studyModes[draft.mode]?.[0] || '학습';
  const parts = draft.key.split('|');
  const range = parts.length === 4 ? `${parts[2]}–${parts[3]}번` : `${Math.min(...draft.session)+1}–${Math.max(...draft.session)+1}번`;
  const [, , glyph, tone] = studyModes[draft.mode];
  return `<article class="saved-round"><dl class="range-list">
    <div class="metric"><dt>리스트</dt><dd>${chip('1번 리스트', 'book', 'info')}</dd></div>
    <div class="metric"><dt>범위</dt><dd>${chip(range, 'list', 'neutral')}</dd></div>
    <div class="metric"><dt>연습 방식</dt><dd>${chip(label, glyph, tone)}</dd></div>
  </dl><button class="button primary action-start wide" data-resume="${escapeHtml(draft.key)}">${icon('next')} 이어 풀기</button></article>`;
}
function persistRound() {
  const draft = { mode, session, position, outcomes, question, updatedAt: Date.now() };
  if (roundKey) { if (position < session.length) state.segmentDrafts[roundKey] = draft; else delete state.segmentDrafts[roundKey]; }
  else { if (position < session.length) state.drafts[mode] = draft; else delete state.drafts[mode]; }
  save();
}
function resumeRound(key) {
  const draft = state.segmentDrafts[key] || state.drafts[key]; if (!draft) return;
  roundKey = state.segmentDrafts[key] ? key : null;
  ({ mode, session, position, outcomes, question } = draft); persistRound(); go('session');
}
function beginRound(nextMode, nextSession) {
  const start = () => { roundKey = null; mode = nextMode; session = nextSession; startRound(); };
  if (!state.drafts[nextMode]) { start(); return; }
  const dialog = $('#replace-round'); dialog.onclose = () => { if (dialog.returnValue === 'replace') start(); };
  dialog.returnValue = ''; dialog.showModal();
}

let audioContext;
function playSound(outcome) {
  if (!state.sound || !state.volume || outcome === 'seen') return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = outcome === 'wrong' ? 240 : outcome === 'medium' || outcome === 'hinted' ? 440 : 660;
    gain.gain.setValueAtTime(Math.max(.0001, state.volume / 100 * .09), audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .16);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + .17);
  } catch {}
}
function startRound() {
  position = 0;
  outcomes = [];
  openQuestion();
}
function openQuestion() {
  question = { revealed: false, hints: 0, answer: '', phase: 'input' };
  persistRound();
  go(position === session.length ? 'complete' : 'session');
}
function next() {
  position++;
  openQuestion();
}
function comboCount() {
  let count = 0;
  for (let i = position - 1; i >= 0; i--) {
    if (outcomes[i] !== 'correct') break;
    count++;
  }
  if (outcomes[position] === 'correct') count++;
  return count;
}
function statsMarkup() {
  const labels = mode === 'recall' ? recallLabels : gradeLabels;
  const counts = { correct: 0, [mode === 'recall' ? 'medium' : 'hinted']: 0, wrong: 0, remaining: session.length };
  for (const outcome of outcomes) if (outcome) {
    if (Object.hasOwn(counts, outcome)) counts[outcome]++;
    counts.remaining--;
  }
  return Object.entries(counts).map(([key, count]) => {
    const label = key === 'remaining' ? gradeLabels.remaining : labels[key];
    const glyph = mode === 'recall' ? ({correct:'difficulty-low',medium:'difficulty-medium',wrong:'difficulty-high',remaining:'history'}[key]) : ({correct:'check',seen:'check',hinted:'bulb',wrong:'close',remaining:'history'}[key]);
    return chip(count, glyph, outcomeTones[key], `${label} ${count}개`);
  }).join('');
}
function recordOutcome(outcome) {
  const previous = outcomes[position];
  if (previous === outcome) return;
  const index = session[position];
  if (previous === 'wrong') state.wrong[index] = Math.max(0, (state.wrong[index] || 0) - 1);
  if (outcome === 'wrong') state.wrong[index] = (state.wrong[index] || 0) + 1;
  if (outcome === 'hinted') state.hints[index] = (state.hints[index] || 0) + 1;
  outcomes[position] = outcome;
  window.studyBridge.report({
    id: "english-" + crypto.randomUUID(),
    subject: "english",
    label: words[index].en,
    mode: studyModes[mode][0],
    result: outcome === "medium" ? "seen" : outcome,
    answer: mode === "choice" ? question.options?.[question.selected] : mode === "type" ? question.answer : undefined
  });
  state.modeProgress[mode][index] = outcome;
  if (roundKey) { state.segmentProgress[roundKey] ??= {}; state.segmentProgress[roundKey][index] = outcome; }
  $('#session-stats').innerHTML = statsMarkup();
  const combo = $('#combo');
  if (combo) {
    combo.innerHTML = icon('target') + ' ' + comboCount() + '콤보';
    combo.dataset.tone = comboCount() ? 'success' : 'neutral';
  }
  playSound(outcome);
  persistRound();
}

function renderSession() {
  const index = session[position], word = words[index];
  app.innerHTML = `<section class="session-view">
    <header class="session-header"><div class="session-header-inner">
      <button id="exit" class="plain-button exit-button" aria-label="연습 나가기" title="연습 나가기">${icon('close')}</button>
      <div class="session-context"><h1 tabindex="-1">${studyModes[mode][0]}</h1>
        <div class="session-context-info"><div class="session-tags">${chip('1번 리스트', 'book', 'info')}<div class="session-stats" id="session-stats" aria-live="polite">${statsMarkup()}</div><span class="context-chip combo" id="combo" data-tone="${comboCount() ? 'success' : 'neutral'}" title="연속 정답">${icon('target')} ${comboCount()}콤보</span></div></div></div>
      <div class="session-tools"><button class="plain-button settings-button" data-settings aria-label="화면 및 입력 설정" title="화면 및 입력 설정">${icon('settings')}</button></div>
    </div></header>
    <div class="session-status-dock" id="session-status-dock"></div>
    <div class="session-content"><div class="question-area">
      <div class="question-label">${chip(`${index + 1}번 단어`, 'cards', 'neutral')}</div>
      <p class="prompt question"><span lang="en">${escapeHtml(word.en)}</span>${mode === 'recall' && question.revealed ? ` - ${escapeHtml(word.ko)}` : ''}</p>
      <button type="button" id="ask-on-wall" class="plain-button study-wall-question">${icon('comment')}이 문제로 질문하기</button>
      <div id="interaction" class="vocabulary-answer"></div>
    </div></div>
  </section>`;
  const moveSessionTags = () => {
    const tags = $('.session-context-info');
    if (!tags) return;
    (matchMedia('(max-width: 620px) and (orientation: portrait)').matches ? $('#session-status-dock') : $('.session-context')).append(tags);
  };
  moveSessionTags();
  window.onresize = moveSessionTags;
  $('#exit').onclick = () => go('home');
  $('#ask-on-wall').onclick = () => window.studyBridge.ask(`‘${word.en}’의 뜻은 무엇인가요?`);
  if (mode === 'choice') { renderChoice(word, index); bindStars(); }
  else if (mode === 'type') {
    renderType(word, index);
    bindStars();
  } else renderCard(word, index);
}

function renderCard(word, index) {
  const flash = mode === 'flash';
  $('#interaction').innerHTML = `
    ${flash || !question.revealed ? `<button class="button primary action-start answer-face" id="flip" aria-pressed="${question.revealed}">${icon(question.revealed || flash ? 'eye' : 'check')} ${question.revealed ? escapeHtml(word.ko) : flash ? '뜻 보기' : '정답 확인'}</button>` : ''}
    <div class="session-actions recall-actions">${flash ? `
      <button class="button secondary action-skip" id="previous" ${position === 0 ? 'disabled' : ''}>${icon('chevron-left')} 이전</button>
      <button class="button primary" id="next">${icon('next')} 다음 문제</button>` : question.revealed ? `
      <div class="recall-levels">
        <button class="button recall-level" data-tone="danger" id="miss">${icon('difficulty-high')} <span class="ui-strong">어려움</span></button>
        <button class="button recall-level" data-tone="review" id="medium">${icon('difficulty-medium')} <span class="ui-strong">보통</span></button>
        <button class="button recall-level" data-tone="success" id="know">${icon('difficulty-low')} <span class="ui-strong">쉬움</span></button>
      </div>` : ''}
      ${starMarkup(index)}
    </div>`;
  bindStars();
  if ($('#flip')) $('#flip').onclick = () => {
    question.revealed = !question.revealed;
    if (flash && question.revealed) recordOutcome('seen');
    persistRound();
    renderSession();
    ($('#flip') || $('#miss'))?.focus();
  };
  if (flash) {
    $('#previous').onclick = () => { position--; openQuestion(); };
    $('#next').onclick = () => { recordOutcome('seen'); next(); };
  } else if (question.revealed) {
    $('#miss').onclick = () => { recordOutcome('wrong'); next(); };
    $('#medium').onclick = () => { recordOutcome('medium'); next(); };
    $('#know').onclick = () => { recordOutcome('correct'); next(); };
  }
}

function renderChoice(word, index) {
  if (!question.options) {
    const unique = [...new Set(words.map(w => w.ko).filter(ko => normalize(ko) !== normalize(word.ko)))];
    for (let i=unique.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [unique[i],unique[j]]=[unique[j],unique[i]]; }
    question.options = [word.ko, ...unique.slice(0,3)].sort(() => Math.random()-.5); persistRound();
  }
  const done = question.phase !== 'input';
  $('#interaction').innerHTML = `<div class="choice-list" role="group" aria-label="뜻 선택">${question.options.map((value,i) => `<button type="button" class="choice-option ${done && normalize(value) === normalize(word.ko) ? 'choice-correct' : done && question.selected === i ? 'choice-wrong' : ''}" data-choice="${i}" ${done ? 'disabled' : ''}><span class="choice-number ui-strong">${i+1}</span><span class="choice-text">${escapeHtml(value)}</span></button>`).join('')}</div><div id="feedback" aria-live="polite">${done ? `<div class="verdict ${outcomes[position] === 'wrong' ? 'is-wrong' : ''}">${icon(outcomes[position] === 'wrong' ? 'close' : 'check')} ${outcomes[position] === 'wrong' ? '오답' : '정답'} · ${escapeHtml(word.ko)}</div>` : ''}</div><div class="session-actions"><button class="button primary" id="choice-next" ${done ? '' : 'hidden'} aria-keyshortcuts="Space">${icon('next')} 다음 문제</button>${starMarkup(index)}</div>`;
  app.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => { question.selected=Number(button.dataset.choice); question.phase='done'; recordOutcome(normalize(question.options[question.selected]) === normalize(word.ko) ? 'correct' : 'wrong'); renderChoice(word,index); bindStars(); $('#choice-next').focus(); });
  if (done) $('#choice-next').onclick = next;
}

function renderType(word, index) {
  $('#interaction').innerHTML = `
    <form id="answer-form">
      <label for="answer">한국어 뜻</label>
      <input id="answer" class="answer-field" type="text" autocomplete="off" spellcheck="false">
      <p id="hint" class="help" role="status"></p>
      <div id="feedback" aria-live="polite"></div>
      <div class="session-actions type-actions">
        <button class="button primary action-start" id="submit">${icon('check')} 정답 확인</button>
        ${starMarkup(index)}
        <button type="button" class="icon-button hint-tool" data-tone="info" id="hint-button" aria-label="힌트" aria-keyshortcuts="[" title="힌트 ([)">${icon('bulb')}</button>
        <button type="button" class="icon-button answer-tool" data-tone="violet" id="show-answer" aria-label="정답 보기" aria-keyshortcuts="]" title="정답 보기 (])">${icon('eye')}</button>
      </div>
    </form>`;
  const input = $('#answer'), feedback = $('#feedback'), submit = $('#submit');
  let composing = false;
  input.value = question.answer;
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; });
  input.addEventListener('input', () => {
    question.answer = input.value;
    persistRound();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
  });
  attachIME(input);

  function drawHint() {
    let remaining = question.hints;
    $('#hint').textContent = remaining ? [...word.ko].map(letter => {
      if (!normalize(letter)) return letter;
      return remaining-- > 0 ? letter : '○';
    }).join('') : '';
  }
  const hintLength = [...word.ko].filter(letter => normalize(letter)).length;
  $('#hint-button').onclick = () => {
    question.hints++;
    if (question.hints >= hintLength) {
      finish('shown', 'wrong');
      return;
    }
    drawHint();
    persistRound();
    input.focus();
  };
  function drawGrade() {
    const phase = question.phase;
    const outcome = outcomes[position];
    const rewriting = phase === 'rewrite';
    const finished = ['wrong', 'shown', 'correct', 'rewritten', 'accepted'].includes(phase);
    input.readOnly = finished;
    $('#hint-button').disabled = finished || rewriting;
    $('#show-answer').disabled = finished || rewriting;
    if (finished) {
      submit.innerHTML = icon('next') + '<span>다음 문제</span>';
      submit.classList.remove('action-start');
      submit.setAttribute('aria-keyshortcuts', 'Space');
    } else {
      submit.innerHTML = icon('check') + ' 정답 확인';
      submit.classList.add('action-start');
      submit.removeAttribute('aria-keyshortcuts');
    }
    if (phase === 'input') { drawHint(); return; }
    $('#hint').textContent = '';
    const labels = {
      shown: '정답 확인함', wrong: '오답', correct: gradeLabels[outcome],
      rewritten: '다시 쓰기 완료', accepted: '인정 답안으로 저장했어요.',
    };
    const kind = ({ rewritten: 'correct', rewrite: 'wrong' })[phase] || outcome;
    const face = phase === 'accepted' ? labels[phase] :
      rewriting ? `<strong>${escapeHtml(word.ko)}</strong><p>정답을 보고 다시 써 보세요.</p>` :
        `${labels[phase]} · ${escapeHtml(word.ko)}`;
    feedback.innerHTML = `<div class="verdict is-${kind}">${icon(kind === 'wrong' ? 'close' : 'check')}<div>${face}</div></div>`;
    if (phase !== 'shown' && phase !== 'wrong') return;
    feedback.insertAdjacentHTML('beforeend', `<div class="feedback-actions">
      ${phase === 'wrong' ? '<button type="button" class="button secondary" id="accept">${iconMarkup("plus")} 인정 답안으로 추가</button>' : ''}
      <button type="button" class="button secondary" id="rewrite">${icon('repeat')} 정답 보고 다시 쓰기</button>
    </div>`);
    $('#rewrite').onclick = () => {
      question.phase = 'rewrite';
      question.answer = input.value = '';
      h3Reset();
      persistRound();
      drawGrade();
      input.focus({ preventScroll: true });
    };
    if ($('#accept')) $('#accept').onclick = () => {
      (state.extra[index] ??= []).push(question.answer.trim());
      finish('accepted', question.hints ? 'hinted' : 'correct');
    };
  }
  function finish(phase, outcome) {
    question.phase = phase;
    if (outcome) recordOutcome(outcome);
    else persistRound();
    drawGrade();
    submit.focus({ preventScroll: true });
  }
  $('#show-answer').onclick = () => finish('shown', 'wrong');
  $('#answer-form').onsubmit = event => {
    event.preventDefault();
    if (composing) return;
    if (input.readOnly) { next(); return; }
    question.answer = input.value;
    const normalized = normalize(input.value);
    if (!normalized) { $('#hint').textContent = '글자를 입력해 주세요.'; return; }
    const correct = [word.ko, ...(state.extra[index] || [])].some(value => normalize(value) === normalized);
    if (question.phase === 'rewrite') {
      if (correct) finish('rewritten');
      else {
        $('#hint').textContent = '정답과 한 번 더 비교해 보세요.';
        input.focus();
      }
      return;
    }
    if (correct) finish('correct', question.hints ? 'hinted' : 'correct');
    else finish('wrong', 'wrong');
  };
  if (question.phase === 'input' && question.hints > 0 && question.hints >= hintLength) {
    finish('shown', 'wrong');
  } else drawGrade();
}

document.addEventListener('keydown', event => {
  if (view !== 'session' || $('dialog[open]') || event.isComposing ||
      event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
  let button;
  if (event.code === 'BracketLeft' || event.key === '[') button = $('#hint-button');
  else if (event.code === 'BracketRight' || event.key === ']') button = $('#show-answer') ?? $('#flip');
  else if (['Backslash', 'IntlBackslash', 'IntlYen'].includes(event.code) ||
           ['\\', '₩', '￦'].includes(event.key)) button = app.querySelector('[data-star]');
  else if (event.code === 'Space' || event.key === ' ') {
    if ($('#submit')?.hasAttribute('aria-keyshortcuts')) button = $('#submit');
    else if ($('#choice-next') && !$('#choice-next').hidden) button = $('#choice-next');
  }
  if (!button) return;
  event.preventDefault();
  if (!event.repeat && !button.disabled) button.click();
}, true);

function renderComplete() {
  app.innerHTML = `<section class="setup-view">${heading('학습 완료')}
    <div class="complete-stats">${chip(studyModes[mode][0], studyModes[mode][2], studyModes[mode][3])}
      ${chip(`${session.length}개 단어`, 'cards', 'neutral')}</div>
    <div class="complete-stats">${statsMarkup()}</div>
    <div class="complete-actions">
      <button class="plain-button" id="back-home">${iconMarkup("back")} 학습 범위 선택</button>
      <button class="button primary action-start" id="repeat">${icon("repeat")} 같은 구간 다시 학습</button>
    </div></section>`;
  $('#back-home').onclick = () => go('home');
  $('#repeat').onclick = startRound;
}

const K390={"!":0x11bd,"'":0x1110,"/":0x1169,"0":0x110f,"1":0x11c2,"2":0x11bb,"3":0x11b8,"4":0x116d,"5":0x1172,"6":0x1163,"7":0x1168,"8":0x1174,"9":0x116e,";":0x1107,"<":"2",">":"3","A":0x11ae,"B":"!","C":0x11b1,"D":0x11b0,"E":0x11bf,"F":0x11a9,"G":"/","H":"'","I":"8","J":"4","K":"5","L":"6","M":"1","N":"0","O":"9","P":">","Q":0x11c1,"R":0x1164,"S":0x11ad,"T":";","U":"7","V":0x11b6,"W":0x11c0,"X":0x11b9,"Y":"<","Z":0x11be,"a":0x11bc,"b":0x116e,"c":0x1166,"d":0x1175,"e":0x1167,"f":0x1161,"g":0x1173,"h":0x1102,"i":0x1106,"j":0x110b,"k":0x1100,"l":0x110c,"m":0x1112,"n":0x1109,"o":0x110e,"p":0x1111,"q":0x11ba,"r":0x1162,"s":0x11ab,"t":0x1165,"u":0x1103,"v":0x1169,"w":0x11af,"x":0x11a8,"y":0x1105,"z":0x11b7};
const US_SH={Digit1:"!",Digit2:"@",Digit3:"#",Digit4:"$",Digit5:"%",Digit6:"^",Digit7:"&",Digit8:"*",Digit9:"(",Digit0:")",Minus:"_",Equal:"+",BracketLeft:"{",BracketRight:"}",Backslash:"|",Semicolon:":",Quote:'"',Comma:"<",Period:">",Slash:"?",Backquote:"~"};
const US_NO={Minus:"-",Equal:"=",BracketLeft:"[",BracketRight:"]",Backslash:"\\",Semicolon:";",Quote:"'",Comma:",",Period:".",Slash:"/",Backquote:"`"};
const usChar=(c,sh)=>{if(/^Key[A-Z]$/.test(c)){const l=c.slice(3);return sh?l:l.toLowerCase()}if(/^Digit[0-9]$/.test(c))return sh?US_SH[c]:c.slice(5);return sh?US_SH[c]:US_NO[c]};
const CJ_CHO="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ",CJ_JUNG="ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ",CJ_JONG=" ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
const H3C={"1100+1100":0x1101,"1103+1103":0x1104,"1107+1107":0x1108,"1109+1109":0x110a,"110c+110c":0x110d,
  "1169+1161":0x116a,"1169+1162":0x116b,"1169+1175":0x116c,"116e+1165":0x116f,"116e+1166":0x1170,"116e+1175":0x1171,"1173+1175":0x1174,
  "11a8+11a8":0x11a9,"11a8+11ba":0x11aa,"11ab+11bd":0x11ac,"11ab+11c2":0x11ad,"11af+11a8":0x11b0,"11af+11b7":0x11b1,"11af+11b8":0x11b2,"11af+11ba":0x11b3,"11af+11c0":0x11b4,"11af+11c1":0x11b5,"11af+11c2":0x11b6,"11b8+11ba":0x11b9,"11ba+11ba":0x11bb};
const h3c=(a,b)=>H3C[a.toString(16)+"+"+b.toString(16)]||0;
const H3={cho:0,jung:0,jong:0,hist:[],out:""};
const h3Render=()=>{const {cho,jung,jong}=H3;if(cho&&jung)return String.fromCharCode(0xAC00+((cho-0x1100)*21+(jung-0x1161))*28+(jong?jong-0x11A7:0));
  return (cho?CJ_CHO[cho-0x1100]:"")+(jung?CJ_JUNG[jung-0x1161]:"")+(jong?CJ_JONG[jong-0x11A7]:"")};
let imeInput=null;
function h3Reset(){H3.cho=H3.jung=H3.jong=0;H3.hist=[];H3.out=''}
function h3Put(val){let v=imeInput.value, end=imeInput.selectionStart;if(H3.out&&v.slice(0,end).endsWith(H3.out)){let start=end-H3.out.length;imeInput.setRangeText(val,start,end,'end')}else imeInput.setRangeText(val,end,imeInput.selectionEnd,'end');H3.out=val;imeInput.dispatchEvent(new Event('input',{bubbles:true}))}
function h3Jamo(code){const snap={cho:H3.cho,jung:H3.jung,jong:H3.jong};let fresh=false;if(code<0x1161){if(H3.cho&&!H3.jung&&!H3.jong&&h3c(H3.cho,code))H3.cho=h3c(H3.cho,code);else fresh=true;if(fresh){h3Reset();H3.cho=code}}else if(code<0x11a8){if(H3.jung&&!H3.jong&&h3c(H3.jung,code))H3.jung=h3c(H3.jung,code);else if(!H3.jung&&!H3.jong)H3.jung=code;else{fresh=true;h3Reset();H3.jung=code}}else{if(H3.jong&&h3c(H3.jong,code))H3.jong=h3c(H3.jong,code);else if(H3.cho&&H3.jung&&!H3.jong)H3.jong=code;else{fresh=true;h3Reset();H3.jong=code}}if(!fresh)H3.hist.push(snap);else H3.hist=[];h3Put(h3Render())}
function attachIME(inp){imeInput=inp;h3Reset();inp.addEventListener('keydown',e=>{if(inp.readOnly||!$('#ime').checked||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.keyCode===229)return;if(inp.selectionStart!==inp.selectionEnd||!inp.value.slice(0,inp.selectionStart).endsWith(H3.out))h3Reset();if(e.code==='Backspace'&&H3.out){e.preventDefault();if(H3.hist.length){Object.assign(H3,H3.hist.pop());h3Put(h3Render())}else{h3Put('');h3Reset()}return}let c=usChar(e.code||'',e.shiftKey);if(c===undefined){if(!/^Shift|CapsLock/.test(e.code))h3Reset();return}let v=K390[c];if(typeof v==='number'){e.preventDefault();h3Jamo(v)}else{h3Reset();if(typeof v==='string'){e.preventDefault();inp.setRangeText(v,inp.selectionStart,inp.selectionEnd,'end');inp.dispatchEvent(new Event('input',{bubbles:true}))}}});inp.addEventListener('blur',h3Reset)}

Promise.resolve(window.studyBridge.vocabulary).then(entries => {
  words = entries.map(([en, ko]) => ({ en, ko }));
  const legacy = state.draft;
  if (legacy && Object.hasOwn(studyModes, legacy.mode)) state.drafts[legacy.mode] ??= legacy;
  delete state.draft;
  for (const [key, draft] of Object.entries(state.drafts)) {
    const valid = draft && Object.hasOwn(studyModes, key) && draft.mode === key &&
      Array.isArray(draft.session) && Number.isInteger(draft.position) &&
      draft.position >= 0 && draft.position < draft.session.length &&
      draft.session.every(index => Number.isInteger(index) && words[index]) &&
      Array.isArray(draft.outcomes) && draft.question;
    if (!valid) delete state.drafts[key];
  }
  if (legacy && state.drafts[legacy.mode] === legacy) {
    legacy.outcomes.forEach((outcome, position) => {
      const index = legacy.session[position];
      if (outcome && words[index]) state.modeProgress[legacy.mode][index] ??= outcome;
    });
  }
  for (const [index, status] of Object.entries(state.progress)) {
    if (status === 'hinted') state.modeProgress.type[index] ??= status;
    if (status === 'seen') state.modeProgress.flash[index] ??= status;
  }
  save();
  render();
}).catch(() => {
  app.innerHTML = '<p class="page">단어 목록을 불러오지 못했어요. 새로고침해 주세요.</p>';
});

}
