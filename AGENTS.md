# 물음샘 저장소 작업 지침

물음샘은 수학·영어 학습과 담벼락을 한 사이트에서 제공한다. [운영 사이트](https://gitsbee.github.io/Pulim/)는 GitHub Pages에서 제공하며, 활성 개발 브랜치는 `develop`, 배포 브랜치는 `main`이다. 기능이나 화면을 바꾸기 전에 사용자가 요청한 범위와 현재 코드, 관련 테스트, 아래의 디자인 기준을 함께 확인한다.

## 브랜치 운영

`main`은 운영 배포, `develop`은 통합 개발, `release`는 출시 준비, `hotfix`는 운영 긴급 수정에 사용한다. 출시 준비는 `develop`에서 `release`로 반영하고 검증 후 `main`과 `develop`에 반영한다. 긴급 수정은 `main`에서 `hotfix`로 반영하고 검증 후 `main`과 `develop`에 반영한다. 실제 릴리스 작업 중 다른 변경이 있는지 각 브랜치를 확인한다.

## 어디부터 읽을지

| 경로 | 역할 |
| --- | --- |
| [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx), [src/hooks/useNavigation.ts](src/hooks/useNavigation.ts) | React 진입점, 공용 화면 조합, 해시 내비게이션. Vite 기본 경로는 `/`이며, `/About/`은 빌드 후 별도 진입점으로 생성한다. |
| [src/components/](src/components/), [src/hooks/](src/hooks/) | 홈, 계정·프로필, 담벼락·상세창과 공용 UI, 구독과 내비게이션. |
| [src/learning/Header.tsx](src/learning/Header.tsx), [src/learning/StudyScreen.tsx](src/learning/StudyScreen.tsx), [src/learning/engines/](src/learning/engines/) | 수학·영어의 공용 헤더와 학습 화면. React가 과목별 HTML과 엔진을 지연 로드하고, `runtime.js`가 엔진 DOM, 이벤트, 브라우저 저장소의 범위를 관리한다. |
| [src/learning/settingsUnits.ts](src/learning/settingsUnits.ts), [src/learning/inputSettings.ts](src/learning/inputSettings.ts), [src/learning/recordTools.ts](src/learning/recordTools.ts), [src/learning/store.ts](src/learning/store.ts) | 공통 설정 탭과 입력 설정, 프로필의 로컬 기록 관리, 로그인 사용자의 풀이 결과 동기화. |
| [src/design/](src/design/), [src/forge.css](src/forge.css), [src/pulim.css](src/pulim.css) | 실제 앱에서 사용하는 공통 토큰·아이콘, 공통 컴포넌트 스타일, 서비스별 배치. |
| [src/firebase.ts](src/firebase.ts), [src/profiles.ts](src/profiles.ts), [src/data.ts](src/data.ts), [src/comments.ts](src/comments.ts), [firestore.rules](firestore.rules) | Firebase 연결, 프로필·핸들, 글·반응·댓글 쓰기와 서버측 검증. |
| [docs/ROADMAP.md](docs/ROADMAP.md), [docs/archive/](docs/archive/) | 현재 개발 제안과 과거 계획의 보관본. |
| [tests/](tests/), [playwright.config.ts](playwright.config.ts), [deploy-pages.yml](.github/workflows/deploy-pages.yml) | 단위·보안 규칙·브라우저 테스트와 Pages 배포. |

## 화면과 디자인을 바꿀 때

1. 화면 작업을 시작할 때마다 [물음샘 디자인 시스템 v4 가이드](docs/design-system/v4/README.md)와 [v4 컴포넌트 CSS](docs/design-system/v4/pulim-components.css)에서 해당 요소의 역할을 확인한다. [HTML 팔레트와 데모](docs/design-system/v4/pulim-design-system-v4.html)는 다운로드해 브라우저에서 열면 세 테마와 입력·버튼 예제를 직접 확인할 수 있다.
2. `docs/design-system/v4/`는 첨부 패키지를 펼친 기준 자료다. JSON·CSS 토큰, 아이콘 목록과 별칭, SVG, 수식 예제가 들어 있다. 실제 사이트 변경은 `src/design/`, `src/forge.css`, `src/pulim.css`와 사용하는 컴포넌트에 반영한다. 기존 앱의 구조와 동작에 맞춰 필요한 토큰과 컴포넌트 규칙을 옮긴다. 기준과 구현이 다르면 현재 사용자 요구와 기존 동작을 확인하고, 의도적인 차이와 영향은 작업 결과에 적는다.
3. 공통 토큰과 역할을 먼저 재사용한다. 일반 조작·입력은 최소 52px, 아이콘 전용·탐색은 44px, 정보 태그는 32px가 기본이다. 카드 여백은 역할에 맞는 4·8·12·16·24px 토큰을 쓴다. 카드 높이는 콘텐츠에 맡기고, 공통 버튼 규칙을 지키면서 배치가 필요한 화면의 CSS에만 레이아웃을 둔다.
4. 동작 버튼은 의미가 맞는 24px 아이콘을 라벨 왼쪽에 두고 한 묶음으로 가운데 정렬한다. 정보 태그는 18px 아이콘과 14px 라벨을 4px 간격으로 배치한다. React는 [Icon.tsx](src/components/Icon.tsx), 학습 엔진은 [icons.ts](src/design/icons.ts)의 공용 SVG 참조를 사용한다. 아이콘만 있는 조작은 접근 가능한 이름을 제공한다.
5. 돌출 버튼, 평면 탐색, 유지 선택, 읽기 전용 태그를 역할에 맞게 구별한다. 같은 조작의 기본·눌림·선택·포커스·비활성 상태를 세 테마에서 비교한다. 밝게·종이에서는 눌림 글자색이 흰색으로 바뀌며, 어둡게에서는 기본 글자색을 유지한다. 토글·슬라이더의 기존 터치 영역과 손잡이 크기를 기준대로 유지한다. 픽셀 정렬과 채움 문제는 기존 치수에서 좌표와 채움 계산을 확인한다.
6. 한 문서 안의 공용 헤더, 설정·도움말, 과목별 연습·기록 구조를 활용한다. 설정을 추가할 때 공통 입력이나 테마라면 세 서비스에서 같은 값을 읽도록 한다. 학습·풀이 도구는 해당 과목에 배치한다. 설정 탭은 시각적으로 같은 제목을 반복하지 않고 키보드 탐색과 콘텐츠 여백을 유지한다. 수식은 기존 LaTeX와 KaTeX 출력 경로를 사용한다.

## 기능과 데이터 변경 기준

- 기존 게시물, 인용 글, 이메일 계정과 프로필 핸들의 호환성을 유지한다. 로그인과 비밀번호 재설정은 실제 가입 이메일로 처리한다. 공개 핸들은 프로필과 검색에 쓴다. 이메일과 비밀번호는 Firebase Authentication에 맡기고, 공개 문서와 번들에는 공개용 웹 설정만 사용한다. 운영 구조는 Pages와 Firebase Authentication·Firestore로 구성한다. 기존 결정의 배경은 [인증 설계](docs/AUTH_DESIGN.md)를 참고한다.
- 글·댓글·반응의 소유권, 원문 삭제, 글과 인용 글의 독립된 반응·댓글, 작성자만 볼 수 있는 반응 목록을 함께 확인한다. Firestore 쓰기 흐름을 바꿀 때는 UI뿐 아니라 규칙과 에뮬레이터 검증을 함께 맞춘다.
- 계정에 동기화되는 풀이 기록과 제출 답안과 브라우저에 저장되는 필기·진행 상태·복습 데이터를 구별한다. 과목별 기록 탭에서 동기화 결과를 표시하고, 로컬 내보내기·가져오기·초기화는 프로필의 ‘내 정보 관리’에 둔다. 기록 코드를 바꿀 때는 기존 수학 백업과 게스트 저장소, 영어 백업 범위, 초기화 후 오늘의 결과 보존을 확인한다.
- 학습 엔진을 수정할 때 화면이 바뀌면 구독·이벤트·대화상자가 정리되는지 확인한다. 동일 화면을 반복해서 열거나 계정·과목을 바꿔도 이전 상태가 섞이지 않아야 한다.

## 실행과 확인

- Node.js 22.12 이상에서 `npm ci`, `npm run dev`를 실행하고, 개발 서버의 `/` 경로로 들어간다. 인증과 담벼락을 실제 Firebase에 연결하려면 [.env.example](.env.example)의 웹 앱 설정 네 항목을 `.env.local`에 입력하고 Vite를 재시작한다. 이 웹 설정은 배포 번들에 포함된다.
- 변경에 맞는 검증을 고른다. 공통 코드는 `npm test`와 `npm run build`, 보안 규칙은 `npm run test:rules`, 주요 사용자 흐름은 `npm run test:e2e`로 확인한다. 에뮬레이터는 데모 프로젝트 `demo-postpost`를 사용한다. Java 21 이상과 Chromium이 필요하며, `npx playwright install chromium`으로 설치하거나 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`로 설치된 실행 파일을 지정할 수 있다.
- 화면 변경은 데스크톱과 320px·390px 안팎의 모바일을 직접 본다. 가로 넘침, 정렬과 터치 영역, 밝게·어둡게·종이, 키보드 포커스, 모달을 열고 닫는 동작을 확인한다. 변경한 기능의 정상·오류·빈 상태와 기존 데이터도 확인한다. 문서 변경은 상대 링크, 저장 위치와 실제 설정의 일치 여부를 검증한다.

## 배포와 사용자에게 전달할 사항

- [도메인 전환·미리보기·신고 운영 문서](docs/DEPLOYMENT.md)를 참조한다. 미리보기의 Firebase와 브라우저 저장소를 운영과 분리한다. 새 브랜드 상태를 추가할 때 `src/storage.ts`의 접두어를 사용하고 기존 필기 IndexedDB 호환을 확인한다.

- `main`에 push하면 GitHub Actions가 에뮬레이터 검증과 프로덕션 빌드를 거쳐 Pages를 배포한다. 저장소의 Pages 소스는 GitHub Actions이고 `github-pages` 환경에서 `main`을 허용해야 한다. 워크플로는 네 `VITE_FIREBASE_*` 값을 Secrets 또는 Variables에서 읽는다. 운영 Firebase Authentication에는 이메일·비밀번호 제공자와 `gitsbee.github.io` 승인 도메인이 필요하다.
- Pages 배포와 Firestore 규칙 반영은 별개다. 권한 변경이 있으면 변경된 규칙과 기능의 의존성을 보고하고, 운영 Firebase에 실제로 반영됐는지를 별도로 확인한다. 운영 규칙은 해당 프로젝트의 권한과 배포 범위를 확인한 뒤 Firebase에서 적용한다.
- 사용자에게 보이는 변경, 확인한 화면과 테스트 결과, 관련 브랜치·커밋을 짧게 전달한다. 설정·규칙 적용이 필요한 경우 대상과 적용 전 영향을 함께 알려 준다. 로컬 검증, 원격 push, Pages 배포 및 실제 운영 동작의 확인 여부는 각각 정확히 적는다. 실행 환경 때문에 확인하지 못한 항목이나 제품 동작에 영향을 주는 결정도 남긴다.

[README.md](README.md)는 물음샘 이용자를 위한 서비스와 시작 방법을 설명한다. 개발·운영 절차는 이 파일과 관련 설계 문서에 둔다.
