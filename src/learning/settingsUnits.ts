import { iconMarkup } from '../design/icons';
import { subjects, type Subject } from './daily';

const labels = { screen: '화면', input: '입력', sound: '소리', support: '지원' };

export function groupStudySettings(root: HTMLElement, service: Subject | 'pulim') {
  const sections = [...root.querySelectorAll<HTMLElement>('.preferences-section')];
  const group = document.createElement('div');
  group.className = 'settings-units';
  group.setAttribute('role', 'tablist');
  group.setAttribute('aria-label', '설정 탭');
  const buttons = sections.map(section => {
    const key = section.getAttribute('aria-labelledby')!.slice('settings-'.length) as keyof typeof labels;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'plain-button nav-tab';
    button.textContent = labels[key] || (service === 'pulim' ? '물음샘' : subjects[service]);
    section.firstElementChild?.classList.add('sr-only');
    section.id = `settings-section-${key}`;
    button.id = `settings-tab-${key}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', section.id);
    section.setAttribute('role', 'tabpanel');
    section.tabIndex = 0;
    section.setAttribute('aria-labelledby', button.id);
    group.append(button);
    return button;
  });
  function select(index: number) {
    sections.forEach((section, position) => {
      const active = position === index;
      section.hidden = !active;
      buttons[position].tabIndex = active ? 0 : -1;
      buttons[position].setAttribute('aria-selected', String(active));
    });
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      const count = buttons.length;
      const next = { ArrowLeft: (index + count - 1) % count, ArrowRight: (index + 1) % count, Home: 0, End: count - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      buttons[next].focus();
    });
  });
  sections[0].before(group);
  select(0);
  const screen = sections[0];
  const controls = document.createElement('div');
  controls.innerHTML = '<label class="mix-toggle settings-toggle"><span>전체화면</span><input type="checkbox" role="switch" aria-describedby="fullscreen-status"></label><p id="fullscreen-status" class="help" role="status" hidden></p>';
  screen.append(controls);
  const toggle = controls.querySelector('input')!;
  const status = controls.querySelector('p')!;
  const sync = () => { toggle.checked = Boolean(document.fullscreenElement); };
  sync();
  document.addEventListener('fullscreenchange', sync);
  toggle.addEventListener('change', async () => {
    toggle.disabled = true;
    status.hidden = true;
    try {
      if (toggle.checked) await document.documentElement.requestFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      status.textContent = '이 브라우저에서는 전체화면을 사용할 수 없어요.';
      status.hidden = false;
    } finally {
      toggle.disabled = false;
      sync();
    }
  });
  return () => {
    document.removeEventListener('fullscreenchange', sync);
    sections.forEach((section, index) => section.setAttribute('aria-labelledby', buttons[index].id.replace('-tab-', '-')));
    controls.remove();
    group.remove();
  };
}

const modes = { system: '시스템', light: '라이트', dark: '다크', paper: '종이' };

const closeIcon = iconMarkup('close');
export const settingsHeader = `<header class="preferences-header"><h2 id="preferences-title">설정</h2>
  <form method="dialog"><button class="plain-button preferences-close" aria-label="닫기">${closeIcon}</button></form></header>`;

export function fillSettings(root: HTMLElement) {

  const service = root.querySelector('[aria-labelledby="settings-service"]')!;
  service.insertAdjacentHTML('beforebegin', `
    <section class="preferences-section" aria-labelledby="settings-screen"><h3 id="settings-screen">화면 및 테마</h3>
      <fieldset><legend class="sr-only">화면 테마</legend><div class="theme-options">
        ${Object.entries(modes).map(([value, label]) => `<label class="select-card"><input type="radio" name="theme" value="${value}"><span>${label}</span></label>`).join('')}
      </div></fieldset>
    </section>
    <section class="preferences-section" aria-labelledby="settings-input"><h3 id="settings-input">입력</h3>
      <label class="mix-toggle settings-toggle"><span>펜 전용</span><input id="pen-only" type="checkbox" role="switch"></label>
      <div class="volume-setting"><label for="pen-sensitivity">펜 압력 감도</label><output id="pen-sensitivity-value" for="pen-sensitivity">85%</output>
        <span class="range-track"><input id="pen-sensitivity" type="range" min="0" max="100" step="5" value="85"></span>
      </div>
      <label class="mix-toggle settings-toggle"><span>세벌식 390</span><input id="ime" type="checkbox" role="switch" aria-describedby="ime-help"></label>
      <p id="ime-help" class="help">영어 답안을 입력할 때 사용합니다. 물리 키보드를 영문 상태로 두세요.</p>
    </section>`);
  service.insertAdjacentHTML('beforebegin', `
    <section class="preferences-section" aria-labelledby="settings-sound"><h3 id="settings-sound">음향 및 소리</h3>
      <label class="mix-toggle settings-toggle"><span>효과음</span><input id="sound-enabled" type="checkbox" role="switch"></label>
      <div class="volume-setting"><label for="sound-volume">효과음 음량</label><output id="sound-volume-value" for="sound-volume">70%</output>
        <span class="range-track"><input id="sound-volume" type="range" min="0" max="100" step="5" value="70"></span>
      </div>
    </section>
    <section class="preferences-section" aria-labelledby="settings-support"><h3 id="settings-support">사용자 지원</h3>
      <div class="support-links"><button type="button" class="button secondary" data-support="help">${iconMarkup('book')}도움말</button>
      <button type="button" class="button secondary" data-support="about">${iconMarkup('info')}소개</button></div>
    </section>`);
}

export function alignSettings(root: HTMLElement) {
  const dialog = root.closest('dialog');
  const ranges = [...root.querySelectorAll<HTMLInputElement>('.range-track input')];
  const switches = [...root.querySelectorAll<HTMLInputElement>('.mix-toggle input')];
  function refresh() {
    const scale = window.devicePixelRatio || 1;
    if (dialog?.open && window.innerWidth > 620) {
      dialog.style.width = `${Math.round(Math.min(window.innerWidth - 28, 520) * scale) / scale}px`;
      dialog.style.removeProperty('translate');
      const { left, top } = dialog.getBoundingClientRect();
      dialog.style.translate = `${Math.round(left * scale) / scale - left}px ${Math.round(top * scale) / scale - top}px`;
    } else {
      dialog?.style.removeProperty('width');
      dialog?.style.removeProperty('translate');
    }
    ranges.forEach(updateRange);
    switches.forEach(input => {
      input.style.removeProperty('translate');
      const { x, y, width, height } = input.getBoundingClientRect();
      if (!width || !height) return;
      input.style.translate = `${(Math.round(x * scale) / scale - x).toFixed(4)}px ${(Math.round(y * scale) / scale - y).toFixed(4)}px`;
    });
  }
  function updateRange(input: HTMLInputElement) {
    const { width } = input.getBoundingClientRect();
    if (!width) return;
    const track = input.parentElement!;
    const fraction = (input.valueAsNumber - Number(input.min)) / (Number(input.max) - Number(input.min));
    const scale = window.devicePixelRatio || 1;
    const progress = 14 + Math.max(0, width - 28) * fraction;
    track.style.setProperty('--range-progress', `${Math.round(progress * scale) / scale}px`);
    track.classList.toggle('has-value', fraction > 0);
  }
  const abort = new AbortController();
  ranges.forEach(input => input.addEventListener('input', () => updateRange(input), { signal: abort.signal }));
  const sizes = new ResizeObserver(refresh);
  [...ranges, ...switches].forEach(input => sizes.observe(input));
  if (dialog) sizes.observe(dialog);
  const visibility = new MutationObserver(refresh);
  if (dialog) visibility.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  visibility.observe(root, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', refresh, { signal: abort.signal });
  refresh();
  return () => { abort.abort(); sizes.disconnect(); visibility.disconnect(); switches.forEach(input => input.style.removeProperty('translate')); };
}
