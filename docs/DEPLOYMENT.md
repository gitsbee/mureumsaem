# 물음샘 배포와 도메인 전환

## 새 주소에 연결하기

1. 운영 주소를 확정한다. 도메인 전환 전 기존 주소의 **프로필 → 내 정보 관리**에서 수학·영어 백업을 내보낼 수 있도록 안내한다.
2. GitHub 계정 **Settings → Pages**에서 소유권을 확인한다. 도메인 제공자의 DNS에 GitHub가 제공한 TXT 값을 등록한다.
3. 저장소 **Settings → Pages → Custom domain**에 확정한 주소를 넣고, DNS에서 서브도메인 CNAME을 `gitsbee.github.io`로 지정한다. 루트 도메인을 사용한다면 GitHub의 최신 A·AAAA 또는 지원되는 ALIAS 안내를 따른다. HTTPS 인증서 발급 후 **Enforce HTTPS**를 켠다. [GitHub Pages 도메인 안내](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
4. Firebase Console의 운영 프로젝트 **Authentication → Settings → Authorized domains**에 새 호스트 이름만 추가한다. 운영 Firebase 인증 설정의 `VITE_FIREBASE_AUTH_DOMAIN`에는 기존 Firebase Web 앱의 값을 유지한다. 마이그레이션 기간에는 기존 `gitsbee.github.io`도 승인 목록에 둔다. [Firebase Authentication 설정](https://console.firebase.google.com/)
5. Firestore 콘솔에서 저장소의 [규칙](../firestore.rules)을 게시하고, 구 버전의 풀이 기록이 조회되는지 확인한다. 새 풀이 상세 저장과 신고·숨김·차단은 이 규칙이 필요하다. 개발 Firebase를 사용하는 경우 그 프로젝트에도 적용한다.
6. GitHub Actions 저장소 Variables의 `PAGES_CUSTOM_DOMAIN`에 같은 호스트 이름을 넣는다. 운영용 Firebase 변수 네 개는 기존 값을 그대로 사용한다. 릴리스가 `main`에 반영되면 Pages 배포를 확인한다.
7. 새 주소에서 `/`, `/About/`, `/dev/`, 이메일 로그인과 비밀번호 재설정, 풀이 기록, 담벼락을 점검한다. 기존 주소의 리디렉션을 확인한 뒤 GitHub About의 웹사이트 링크를 확정한다.
8. 도메인과 리디렉션을 확인한 뒤 저장소 이름 변경 여부를 정한다. 이름을 바꾸면 Git 원격, 저장소 링크, 기존 기본 Pages 주소와 워크플로의 경로를 함께 확인한다.

브라우저의 Web Storage와 IndexedDB는 주소의 호스트별로 분리된다. 같은 주소에서는 예전 키가 새 접두어로 한 번 옮겨지고, 기존 필기 데이터베이스는 계속 읽는다. 새 도메인에서는 기존 주소에서 내려받은 파일을 **프로필 → 내 정보 관리 → 가져오기**로 복원한다. 운영 Firebase 계정에 저장된 데이터는 새 주소에서 같은 계정으로 로그인하면 조회된다.

## 개발 미리보기

워크플로는 `main`의 운영 빌드와 `develop`의 별도 빌드를 같은 Pages 아티팩트에 올린다. 커스텀 도메인은 `/dev/`, 기존 저장소 주소는 `/Pulim/dev/`에 미리보기를 제공한다. `develop`만 갱신한 경우 `main`에 있는 Pages 워크플로의 **Run workflow**로 개발 빌드를 새로 가져온다. 미리보기는 운영과 별도의 브라우저 저장 영역을 사용하고 검색 색인 제외 메타를 포함한다.

계정 기능을 검증하려면 별도의 개발 Firebase 프로젝트와 같은 이름 앞에 `VITE_DEV_FIREBASE_`를 붙인 네 값(`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID`)을 등록한다. 운영 페이지와 미리보기의 호스트가 같으므로 개발 프로젝트에서도 그 호스트를 승인한다. 미리보기에 연결 값이 없으면 수학과 영어를 계정 연결 없이 사용할 수 있다. `/dev/`는 주소를 아는 사람에게 공개된다.

## 담벼락 신고 운영

- 운영자는 Firebase Console의 Firestore에서 `users/{uid}/reports/{postId}`와 하위 `reportedComments/{commentId}`를 조회한다. 신고 데이터에는 신고 사유, 추가 설명, 접수 시간이 있고 원문 경로는 문서 ID에 있다.
- 접수된 신고는 운영자가 원문을 확인해 처리한다. 신고만으로 게시물의 공개 범위가 바뀌지 않는다. 기존 반응이나 댓글은 차단해도 삭제되지 않는다.
- 사용자는 프로필의 **숨김 및 차단**에서 해제할 수 있다. 숨김은 개인 목록과 직접 보기에서 적용된다. 차단은 해당 계정의 콘텐츠를 내 화면에서 숨기고 계정 간 새 댓글·반응·리포스트를 제한한다. 게시물 자체는 공개로 유지된다.

## GitHub About에 사용할 정보

- 설명 — 수학과 영어를 연습하고, 막힌 문제를 담벼락에서 바로 질문하는 학습 공간.
- 웹사이트 — 확정한 운영 HTTPS 주소
- 토픽 — `education`, `math-practice`, `english-learning`, `firebase`, `react`, `github-pages`
