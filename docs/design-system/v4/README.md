# 물음샘 디자인 시스템 4

[서비스 배포본](https://gitsbee.github.io/Pulim/)과 [beta 9246edf](https://github.com/gitsbee/Pulim/tree/9246edfe3b9a341549e939e4ad557f586f171726)의 색상, 아이콘, 표면과 눌림을 기준으로 정리했습니다. v4는 중복 아이콘, 태그 대비, 토글과 슬라이더, 입력 글자 크기와 모서리 규칙을 통합합니다. 확정한 규칙은 밝은 테마에서만 눌림 글자색 전환, 모든 동작의 아이콘과 라벨 가운데 정렬, 태그 아이콘 필수, 수식 LaTeX 필수입니다.

## 브랜드

물음샘은 물음표와 물결을 결합한 심벌을 쓴다. 헤더와 워드마크는 `ico-brand`, 탭 아이콘은 [파비콘](../../../public/favicon.svg), 공유 카드는 [OG 이미지](../../../public/og.png)를 사용한다. 워드마크는 심벌과 ‘물음샘’ 텍스트를 조합한다.

| 토큰 | 값 | 적용 |
| --- | --- | --- |
| `--brand-teal` | `#17707a` | 심벌 타일과 브랜드 면 |
| `--brand-on-teal` | `#ffffff` | 청록 면 위의 문자와 심벌 |
| `--brand-ink` | 밝게·종이 `#17707a`, 어둡게 `#8ed1d8` | 워드마크와 헤더 심벌 |

판정, 주요 동작, 정보, 주의, 삭제에는 아래의 기존 역할 토큰을 사용한다.

## 새 화면 조립 순서

1. 제목, 본문, 문제·답안, 태그의 글자 역할을 고릅니다.
2. 동작, 지속 선택, 탐색, 상태 중 해당 요소의 역할을 고르고 아래의 컴포넌트를 적용합니다.
3. 역할의 색, 아이콘과 라벨을 연결합니다. 공용 간격은 4·8·12·16·24px 안에서 고릅니다.
4. 밝게·어둡게·종이에서 눌림, 선택, 포커스, 판정 상태를 확인합니다.

## 글자와 배치

| 역할 | 크기 | 굵기 | 줄 높이 |
|---|---:|---:|---:|
| 화면 제목 | 29px | 700 | 1.28 |
| 섹션 제목 | 22px | 700 | 1.28 |
| 지문·객관식 선택지·독립 수식 | 20px | 400 | 1.64 |
| 본문·버튼·입력·선택 카드 | 17px | 400 | 본문 1.55, 버튼·카드 1.3 |
| 태그·보조 정보 | 14px | 400 | 태그 1.3, 보조 정보 1.55 |

제목과 지문의 글자 크기는 화면 폭과 관계없이 위 값을 씁니다. 좁은 화면에서는 열을 줄이고 내용을 줄바꿈합니다. 밝게·어둡게는 원본 Noto Sans KR 계열, 종이는 Noto Serif KR 계열입니다. 설치된 글꼴과 원본 순서의 대체 글꼴을 사용합니다.

| 공용 간격 | 적용 |
|---:|---|
| 4px | 태그 안의 아이콘–라벨, 입력 레이블–필드처럼 밀접한 요소 |
| 8px | 버튼 안의 아이콘–라벨, 한 줄의 컨트롤, 선택지 사이 |
| 12px | 관련 요소의 세로 묶음, 입력·수식 안쪽 |
| 16px | 카드 안쪽, 카드 사이, 페이지 좌우 여백 |
| 24px | 서로 다른 섹션 사이 |

공용 모서리는 10px, 테두리와 조작 깊이는 2px입니다. 최소 높이는 일반 버튼·입력·선택지 52px, 아이콘 전용 도구·탐색 44px, 정보 태그 32px입니다. 52px은 원본 모드 버튼 높이입니다. 스위치는 행 전체가 조작 영역이고 오른쪽에 46 × 44px 트랙과 28px 손잡이를 사용합니다. 콘텐츠 최대 너비 740px, 지문 704px, 헤더 960px, 작은 대화상자 520px도 원본에서 가져왔습니다.

## 동작, 선택, 탐색

| 의도 | 클래스 | 기본 표시 |
|---|---|---|
| 연습 시작·채점·다음 문제 | `.pulim-control.pulim-control--primary` | 공용 초록 `#226440` 테두리, 초록 10% 면, 돌출 |
| 확인·보조 동작 | `.pulim-control` | 중립 테두리, 가장자리 색 10% 면, 돌출 |
| 보관·공유·삭제 | `.pulim-control` + `data-tone="save"`, `"share"`, `"danger"` 중 하나 | 노랑 `#8A661C`·파랑 `#315F91`·빨강 `#942339` 테두리, 각 색의 10% 면 |
| 건너뛰기 | `.pulim-control.pulim-control--skip` | 테마별 회색 테두리, 10% 면, 돌출 |
| 단원·모드 | `.pulim-control.pulim-select` | 색으로 구분하는 라디오 카드. A 기본 노랑, B 유형 초록 `#226440`, C 발전 파랑 |
| 객관식 답 | `.pulim-control.pulim-select.pulim-option` | 중립 라디오 카드. 순번은 선택을 돕는 라벨 |
| 헤더·탭·필터 | `.pulim-plain.pulim-tab` | 평면. 현재 항목은 2px 밑줄 |
| 도구 | `.pulim-control.pulim-control--tool` 또는 `.pulim-plain.pulim-plain--tool` | 과제에 작용하는 도구는 돌출, 헤더와 탐색 도구는 평면 |
| 입력 | `.pulim-input` | 평면, 2px 테두리, 서술형·숫자·여러 줄 입력 모두 17px |
| 태그·채점 배너 | `.pulim-tag`, `.pulim-verdict` | 평면. 아이콘 + 라벨 |
| 켜짐·꺼짐 | `.pulim-switch` | 초록 트랙과 손잡이 위치로 상태 표시 |

### 버튼 상태

| 상태 | 면·깊이 | 밝게·종이 글자 | 어둡게 글자 |
|---|---|---|---|
| 기본 | 역할별 기본 면, 아래쪽 2px 그림자 | 테마 기본 글자색 | 테마 기본 글자색 |
| 누르는 동안 | 역할색 채움, 위쪽 2px 안쪽 그림자, 아래로 2px 이동 | 흰색으로 전환 | 기본 글자색 유지 |
| 선택이 유지됨 | 눌림 면과 깊이 유지. 라디오의 `checked` 또는 실제 토글의 `aria-pressed="true"` | 흰색 유지 | 기본 글자색 유지 |
| 키보드 포커스 | 현재 상태 위에 2px 포커스 외곽선, 간격 4px | 현재 글자색 유지 | 현재 글자색 유지 |
| 비활성 | 그림자 제거, 60% 불투명도, 실행 불가 | 기본 면의 글자색 | 기본 면의 글자색 |
| 채점 완료 | 정답·오답은 상태 면과 테두리, 깊이 제거. 판정 문구를 함께 표시 | 판정 글자색 | 판정 글자색 |

- 시작·채점에도 공용 돌출·눌림 규칙을 적용합니다. 버튼의 기본 테두리와 눌림 면, 정답·난도·스위치·슬라이더가 같은 초록 `#226440`을 참조합니다.
- 일반 동작은 놓는 순간 기본 표시로 돌아옵니다. 반복 사용 가능한 토글만 상태를 유지합니다. 탐색에는 `aria-current`, 필터 토글에는 `aria-pressed`, 탭 위젯에는 `aria-selected`와 탭 키보드 동작을 씁니다.
- 어둡게의 중립·건너뛰기 눌림 면은 각각 원본 `#303030`과 `#343434`입니다. 밝게·종이의 건너뛰기 면에는 원본 회색 `#747474`와 흰색을 씁니다. 라임 단원을 선택할 때는 공용 색 혼합 비율로 면을 어둡게 해 글자 대비를 확보합니다.
- 포인터 호버에는 밑줄 또는 도구 윤곽선으로 반응합니다. 배경 채움은 눌림과 지속 선택에 할당합니다. 스위치 손잡이의 2px 그림자는 손잡이 조작 위치를 보여 줍니다.

### 아이콘과 태그

- 동작 버튼에는 가능한 한 의미를 나타내는 **24px 아이콘을 라벨 왼쪽**에 둡니다. 아이콘과 라벨 사이 8px을 포함한 전체 묶음을 가운데 정렬합니다. 아이콘은 `currentColor`를 상속합니다. 기존 아이콘으로 정확한 의미를 전달할 수 없는 동작은 라벨을 사용합니다.
- 이미 아이콘만으로 표현하는 도구에는 44px 조작 영역과 `aria-label`을 씁니다. 라벨 옆 SVG에는 `aria-hidden="true"`를 붙입니다.
- 모든 태그에는 **18px 아이콘 + 14px 라벨**을 씁니다. 과목은 `math/english`, 모드는 `foundation/application/challenge`, 난도는 `difficulty-low/medium/high`, 채점 상태는 `check/close`를 재사용합니다. 보관과 진도에는 각각 `archive`와 `records`를 씁니다. 단원별 심볼은 `pulim-icons.svg`에 있습니다.
- 정보 태그는 읽기 전용입니다. 같은 모양에서 동작이 필요하면 해당 역할의 버튼을 적용합니다. 색상과 아이콘 외에 텍스트로 상태를 표시합니다.

## 수식

문제·답안·풀이·해설에서 수식은 모두 LaTeX 문자열로 다루고, 풀림과 동일한 KaTeX 0.19.1로 표시합니다. 곱셈은 `\cdot`를 쓰고, 수학식 밖의 설명은 일반 텍스트로 렌더링합니다. 버튼의 문제 순번이나 학습 건수처럼 UI를 설명하는 숫자는 일반 텍스트입니다.

- 인라인 수식은 주변 글자 크기를 따릅니다. 독립 수식은 20px, 위아래 간격 4px, 왼쪽 정렬을 씁니다. 인라인과 독립 수식은 모두 부모의 배경 위에 표시합니다. 길이가 화면을 넘으면 수식 블록 안에서 가로로 이동합니다.
- `pulim-math.mjs`는 KaTeX에 HTML과 MathML 출력을 요청합니다. 복사한 일반 문자열을 HTML로 넣지 않으며, 잘못된 LaTeX는 읽을 수 있는 오류 문구를 표시합니다. 사용자가 입력한 문자열에는 `trust: false`를 적용합니다. 수식이 있는 라디오는 순번과 답안 자체가 모두 접근 가능한 이름으로 전달되는지 검사합니다.

```js
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { renderPulimMath } from './pulim-math.mjs';

renderPulimMath(katex, document.querySelector('#equation'), String.raw`3\cdot(5-2)`, {
  display: true,
});
```

## 파일 적용

`pulim-tokens.css`를 먼저, `pulim-components.css`를 다음에 불러오고 컨테이너에 `.pulim-ui`를 적용합니다. `html[data-theme]`에는 `light`, `dark`, `paper`를 넣습니다. 시스템 설정은 현재 OS 환경에 따라 `light` 또는 `dark`로 선택합니다.

```html
<main class="pulim-ui">
  <section class="pulim-panel pulim-stack">
    <h1 class="pulim-title">수학 연습</h1>
    <button type="button" class="pulim-control pulim-control--primary">
      <svg class="pulim-icon" viewBox="0 0 24 24" aria-hidden="true">
        <use href="pulim-icons.svg#ico-next"></use>
      </svg>
      <span>연습 시작</span>
    </button>
  </section>
</main>
```

원본 React 화면에서는 공통 아이콘을 [Icon.tsx](https://github.com/gitsbee/Pulim/blob/9246edfe3b9a341549e939e4ad557f586f171726/src/components/Icon.tsx)에서 재사용합니다. 토큰 JSON의 `mode` 그룹은 각 도구에서 밝게·어둡게·종이에 매핑하고, `role`의 별칭은 `palette`를 참조합니다. 단일 HTML 가이드에는 KaTeX가 렌더링한 예시와 수식 글꼴이 포함되어 오프라인에서도 볼 수 있습니다.

| v1에서 사용한 클래스 | v2에서 적용할 클래스 |
|---|---|
| `.pulim-button` | `.pulim-control` |
| `.pulim-button--start` | `.pulim-control--primary` |
| `.pulim-button--skip` | `.pulim-control--skip` |
| `.pulim-button--icon` | `.pulim-control--tool` |
| `.pulim-chip` | `.pulim-tag`와 아이콘 + 라벨 |
| `.pulim-option` | `.pulim-control.pulim-select.pulim-option` |
| `.pulim-select`, `.pulim-select--compact` | `.pulim-control.pulim-select` |

태그와 본문, 모드 색 및 상태색을 원본의 팔레트에 연결했습니다. 기존 18px 버튼은 본문과 같은 17px로, 문제와 객관식 선택지는 기존 지문 크기 중 20px로, 화면 제목은 기존 제목 크기 중 29px로 정했습니다. 다른 모서리 값과 반복 간격은 공용 토큰으로 합쳤습니다. 원본 근거는 [forge.css](https://github.com/gitsbee/Pulim/blob/9246edfe3b9a341549e939e4ad557f586f171726/src/forge.css)와 [pulim.css](https://github.com/gitsbee/Pulim/blob/9246edfe3b9a341549e939e4ad557f586f171726/src/pulim.css)에 있습니다.

## 색상과 아이콘

| 표면 | 밝게 | 어둡게 | 종이 |
|---|---|---|---|
| 페이지 `--pulim-surface-page` | `#F8F8F8` | `#151515` | `#EEE8D9` |
| 입력·패널·섹션 `--pulim-surface-panel` | `#FFFFFF` | `#202020` | `#FAF6E9` |

카드와 입력은 같은 표면색을 공유합니다. 입력의 2px 테두리와 레이블이 컨트롤을 구분합니다. v2의 `--pulim-surface-section`을 사용한 곳은 `--pulim-surface-panel`로 연결하고, 수식 전용 표면 `--pulim-surface-formula`는 제거합니다.

HTML의 색상 팔레트에서 기본색 13종, 테마 표면·글자·선·포커스, 동작과 판정 색, 과목·모드·난도·단원 태그를 확인할 수 있습니다. 공용 노랑은 `#8A661C`, 공용 초록은 시작·채점에서 쓰던 `#226440`입니다. 기본색과 동작·상태 색은 무채색과 빨강·주황·노랑·초록·파랑·남색·보라 순서로 표시하고, 분홍과 라임은 같은 계열에 붙입니다. 동작·상태에는 역할명과 색 이름을 표시합니다. 키보드 포커스는 밝게·종이에서 공용 파랑 `#315F91`을 쓰고, 어둡게에서는 대비를 위해 정보·진도의 밝은 파랑 상태색을 재사용합니다.

### 태그의 글자 대비

유리함수 태그에서 쓰던 원본 라임 `#71872F`와 흰색의 대비는 4.03:1입니다. v3는 그래서 해당 태그에만 검은 글씨를 지정했습니다. v4는 유리함수 단위의 예외를 걷어내고, 모든 색 채움 태그에 흰색을 적용합니다. 4.5:1에 못 미치는 단색 면은 공용 혼합 비율로 어둡게 조정합니다. 이 규칙으로 라임 단색 면은 `#627529`가 되며 흰 글자 대비는 5.13:1입니다. 팔레트 원색은 `#71872F`이고, 실제 태그와 선택된 버튼의 면은 대비를 확보한 파생 토큰을 사용합니다. 중립 태그는 테마별 바탕색과 글자색을 사용합니다.

### 공용 아이콘

`pulim-icons.svg`와 팔레트는 공용 SVG 74종을 같은 ID로 제공합니다. 아이콘 타일은 2px 테두리와 10px 모서리를 사용합니다. `pulim-icons.json`의 `aliases`는 원본 화면별 ID, `legacyIds`는 v3에서 사용한 ID를 공용 ID에 연결합니다. 가이드 검색에서도 이전 ID로 같은 타일을 찾을 수 있습니다.

| v3 ID | v4 공용 ID |
|---|---|
| `challenge` | `star` |
| `math-pulleem` | `pulleem` |
| `math-close` | `close` |
| `math-trash` | `trash` |
| `math-plus` | `plus` |
| `math-search` | `search` |

### 모서리 반경

| 반경 | 적용 |
|---:|---|
| 10px · `--pulim-radius-ui` | 버튼·입력·선택 카드·패널·태그·메뉴·대화상자·아이콘 타일, 스위치와 슬라이더의 트랙·손잡이 |
| 2px · `--pulim-radius-detail` | 탭 밑줄과 작은 표시 요소 |
| 0px | 구분선과 별도 표면이 없는 수식 |

반경은 컴포넌트 역할로 결정합니다. 면의 크기와 테마가 바뀌어도 같은 역할의 반경을 사용합니다. 테두리 두께 2px와 모서리 2px는 서로 독립적인 토큰입니다.

## 입력과 메뉴 예제

| 사례 | 구현 |
|---|---|
| 효과음 슬라이더 | 네이티브 `input[type=range]`를 `.pulim-range`로 감쌉니다. `--value`를 0–1 사이로 갱신합니다. 손잡이는 끌 때도 바깥쪽 그림자와 높이를 유지합니다 |
| 토글·라디오 | 켜기·끄기는 `button.pulim-switch[role="switch"]`와 `aria-checked`를 사용합니다. 여러 항목 중 하나는 네이티브 라디오와 `.pulim-select`를 사용합니다 |
| 값 선택 드롭다운 | `.pulim-field-icon.pulim-select-field` 안에 `select.pulim-input`과 하향 아이콘을 둡니다. 키보드와 모바일 선택 UI를 운영체제에 맡깁니다 |
| 동작 드롭다운 | `details.pulim-menu`의 `summary`로 열고, `.pulim-menu-items` 안에 실제 동작 버튼을 둡니다. Escape와 항목 선택 시 열기 버튼으로 포커스를 되돌리는 예제가 포함됩니다 |
| 텍스트 계열 | 기본, 검색, 숫자, 서술형과 여러 줄 입력을 같은 표면과 테두리로 표시합니다 |
| 파일 선택 | `.pulim-control.pulim-file`에 파일 입력과 아이콘·라벨을 연결합니다. 예제는 선택한 파일 이름만 표시합니다 |
| 접기·펼치기 | `details.pulim-disclosure`로 풀이 해설을 펼칩니다. 오른쪽 하향 표시가 열림에 맞춰 회전합니다 |
| 필터·필기 도구·반응 | 밑줄형 필터, 눌림이 유지되는 아이콘 도구, 채워지는 반응 아이콘을 각각 적용합니다 |
| 진행률·이전/다음 | 읽기 전용 `progress.pulim-progress`와 이전·다음 버튼을 연결합니다 |
| 확인 대화상자 | `dialog.pulim-dialog`와 `form method="dialog"`를 씁니다. 닫히면 동작 메뉴 버튼으로 포커스를 되돌립니다 |

```js
function syncRange(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const track = input.parentElement;
  track.style.setProperty('--value', (input.valueAsNumber - min) / (max - min));
  track.toggleAttribute('data-filled', input.valueAsNumber > min);
}
```

v4 패키지의 HTML에서는 세 테마를 바꿔가며 각 예제를 조작할 수 있습니다.

커스텀 토글의 공통 마크업과 상태 전환 예제입니다. 네이티브 버튼이므로 클릭, Space, Enter가 같은 동작을 실행합니다.

```html
<button type="button" class="pulim-switch" role="switch" aria-checked="false">
  <span>틀린 문제 포함</span>
  <span class="pulim-switch__track" aria-hidden="true"></span>
</button>
```

```js
const toggle = document.querySelector('.pulim-switch[role="switch"]');
toggle.addEventListener('click', () => {
  const enabled = toggle.getAttribute('aria-checked') !== 'true';
  toggle.setAttribute('aria-checked', String(enabled));
});
```
