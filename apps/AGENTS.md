# web·master 공통 React 작성 규칙

## 적용 범위

- 이 문서의 React 규칙은 `apps/web/**`와 `apps/master/**`에만 적용한다. `apps/mobile/**`의 Flutter·Dart·네이티브 코드에는 적용하지 않는다.
- 루트 `AGENTS.md`의 Flutter 전용 경로·명령·스타일은 모바일 기준으로 읽고, 두 React 앱의 작성 방식은 이 문서를 따른다. 사용자 지시와 적용되는 상위 지침의 사용자 변경 보호·승인 범위·Git 제한·TDD·E2E·독립 검수·최종 검증 요구를 완화하지 않는다.
- 기존 구현과 테마를 먼저 확인하고 재사용한다. 이 규칙만을 이유로 작업 범위 밖의 코드를 일괄 변환·이동·포맷팅하지 않는다.
- 이 문서는 Codex·Claude가 함께 사용하는 작성 기준이다. Claude 진입 문서는 같은 폴더의 `CLAUDE.md`이며 본문을 중복 관리하지 않는다.
- 실제 자동 검사 범위는 루트 `.prettierrc.json`과 각 앱의 `eslint.config.js`·`package.json`을 확인한다. 문서의 작성 기준과 도구로 강제되는 규칙을 구분한다.

## 포맷과 이름

- 들여쓰기는 공백 2칸, JavaScript·TypeScript 문자열은 작은따옴표, JSX 속성은 큰따옴표를 사용하고 세미콜론은 생략한다.
- 줄바꿈 기준은 100자로 두고, 여러 줄의 구문에서는 문법이 허용하는 후행 쉼표를 사용한다. 포맷터가 설정된 경우 그 결과를 따른다.
- 컴포넌트와 파일은 `UserCard`·`UserCard.tsx`처럼 PascalCase로 작성한다. 훅은 `useUser`·`use-user.ts`, 일반 모듈은 `user-api.ts`처럼 이름을 붙인다.
- 일반 함수·변수는 camelCase, 타입은 PascalCase를 사용한다. 내부 이벤트 핸들러는 `handleSave`, 콜백 prop은 `onSave`처럼 구분한다.
- 신규 일반 모듈은 named export를 기본으로 한다. 기존 `App`의 default export와 도구가 요구하는 export 형식은 유지한다.

## 컴포넌트와 타입

- React 컴포넌트는 `const UserCard = (...) => { ... }` 형태의 화살표 함수로 작성한다. 컴포넌트를 함수 선언식으로 새로 작성하지 않는다.
- props 타입은 컴포넌트 가까이에 명시하고, API 계약도 타입으로 표현한다. 추론 가능한 지역 변수에는 불필요한 타입을 반복하지 않는다. 타입 전용 참조는 `import type`을 사용한다.
- `any`, non-null assertion(`!`), 강제 타입 단언으로 타입 오류나 null 가능성을 숨기지 않는다. 외부 입력은 계약에 맞게 검증·좁히기한 뒤 사용한다.
- 객체·중첩 객체·속성의 null·undefined 가능성은 최초 접근 전에 guard 또는 `?.`로 처리한다. 기본값은 `??`나 명시적 검사로 정하며 `0`, `false`, `''`를 누락시키지 않는다. 잘못된 데이터를 임의로 제거하거나 기본값으로 바꿔 계약 오류를 숨기지 않는다.
- 독립된 UI 책임이나 복잡한 로직이 생길 때 컴포넌트·훅을 분리한다. 줄 수 제한, 모든 로직의 훅 분리, 불필요한 래퍼나 추상화를 강제하지 않는다.

### 컴포넌트 내부 순서

- 실제 코드가 있는 섹션을 `Constants → Variables → Hooks → Computed → Watchers → Functions → Handlers → return` 순서로 배치하고 섹션 주석으로 구분한다. 빈 섹션은 만들지 않는다.
- 훅은 `useRef → useState → 외부 라이브러리 훅` 순서를 기본으로 하되 값의 선언·의존 순서가 우선이다. 조건문이나 조기 반환 뒤로 훅을 이동하지 않는다.
- `Computed`는 파생 값, `Watchers`는 외부 시스템 동기화 Effect와 폼 구독에 해당한다. 이 순서를 맞추려고 계산 값을 Effect나 별도 state로 옮기지 않는다.
- 일반 내부 함수는 `function`, 이벤트 핸들러는 `const handleSave = () => { ... }` 형태로 작성한다. 선언 전 접근·Effect 의존성·기존 실행 순서를 보존한다.
- 타입은 import 아래, 관련 컴포넌트 가까이에 둔다. 신규 모듈의 named export 원칙과 기존 default export 유지 규칙은 위 기준을 따른다.

## 파일 배치

아래 경로는 필요한 파일이 생길 때 사용하는 기준이며 빈 폴더를 미리 만들지 않는다. `<app>`은 `web` 또는 `master`다.

| 용도 | 경로 |
| --- | --- |
| 기능의 페이지 | `apps/<app>/src/features/<feature>/UserListPage.tsx` |
| 기능 전용 컴포넌트 | `apps/<app>/src/features/<feature>/components/UserCard.tsx` |
| 기능 전용 훅 | `apps/<app>/src/features/<feature>/hooks/use-users.ts` |
| 기능 전용 API·타입 | `apps/<app>/src/features/<feature>/user-api.ts`, `user-types.ts` |
| 앱 안에서 공통 사용하는 기본 UI | `apps/<app>/src/components/ui/Button.tsx` |
| 앱 안에서 공통 사용하는 레이아웃 | `apps/<app>/src/components/layout/AppLayout.tsx` |

- 단위 테스트는 해당 기능 코드 가까이에 두되 기존 테스트 위치·명명 관례를 우선한다. 브라우저 E2E는 각 앱의 기존 `e2e/`를 사용한다.
- 특정 기능의 구현은 먼저 해당 기능 안에 둔다. 다른 기능에서도 같은 의미·동작으로 실제 사용하게 될 때 공통 경로로 이동한다.
- 두 앱의 화면·브리지·환경변수·실행 상태는 앱별로 유지한다. Tailwind 초기화와 토큰은 기존 `packages/theme/`를 재사용한다.
- 두 앱이 실제로 공유하는 UI가 생기면 `packages/ui/src/`를 공통화 후보로 검토한다. 현재 존재하는 패키지로 가정하거나 미리 생성하지 않고, 승인된 작업 범위와 양쪽 사용처의 계약·검증을 확인한다.

## API 서비스

- 서비스 구현 전에 endpoint·method·입출력 타입·인증·오류 계약을 확인한다. 해당 앱의 기존 클라이언트와 서비스를 먼저 재사용하며 외부 프로젝트의 래퍼·응답 형태를 가정하지 않는다.
- 서비스 파일은 입력·응답 스키마와 타입 → 요청 함수 순서로 작성한다. 이미 의존성으로 선언된 Zod로 외부 데이터를 검증하고 타입은 `z.infer`로 추출한다. TypeScript 타입 인자만으로 서버 응답을 검증했다고 간주하지 않는다.
- 작은 기능은 위 표의 `user-api.ts`처럼 유지한다. 요청별 분리가 필요하면 `services/get-user-detail.service.ts`처럼 `{http-method}-{resource}.service.ts`를 사용하며 빈 폴더·클라이언트를 미리 만들지 않는다.
- Query Key는 기능의 `constants/query-keys.constant.ts` 등 한 정의를 조회·갱신·무효화에서 재사용한다. 여러 기능이 실제로 공유할 때만 앱 공통 경로로 이동한다.

## 상태와 부수 효과

- 화면 내부 상태는 필요한 컴포넌트 가까이에 `useState`로 둔다. 공유가 필요하면 가까운 공통 부모로 올리고, 여러 화면이 공유하는 클라이언트 상태에만 Zustand를 사용한다.
- 서버 데이터는 해당 기능 구현 시 TanStack Query로 관리하고, 검색 조건·페이지 번호처럼 주소로 복원할 상태는 URL로 관리한다. 기존 설치 라이브러리를 활용하되 기능 없이 provider·store·API 클라이언트를 미리 구성하지 않는다.
- props·state에서 계산할 수 있는 필터 결과·합계 등을 별도 state와 Effect로 동기화하지 않는다. 사용자 동작에 따른 작업은 이벤트 핸들러에서 처리한다.
- `useEffect`는 구독·네이티브 브리지 등 외부 시스템과의 동기화에 사용한다. 훅 호출 규칙과 의존성을 지키고 구독·타이머 등은 해제한다. 의존성 경고를 숨겨 동작을 맞추지 않는다.
- `memo`, `useMemo`, `useCallback`은 실제 성능 문제나 참조 안정성 요구가 있을 때 사용한다.
- Zustand의 `persist`는 새로고침 후에도 유지해야 하는 상태에만 사용한다. 저장 키·저장 대상·초기화·복원 실패 처리를 정하고, 인증 비밀이나 서버 상태를 관성적으로 localStorage에 저장하지 않는다.
- React Context는 공통 하위 트리에서 공유할 값에 사용한다. 페이지 간 전달이라는 이유만으로 Context를 강제하지 않고 URL·서버 상태·클라이언트 상태의 책임을 먼저 구분한다.

## import·경로·라우터

- import는 React → 외부 라이브러리 → workspace 패키지 → 앱 내부 모듈 순으로 묶는다. 앱 내부는 공통 모듈·기능 모듈·가까운 상대 경로 순서를 기본으로 하고 타입 전용 import를 구분한다.
- 현재 두 앱의 TypeScript·Vite 설정에는 `@/` alias가 없다. 앱 내부는 상대 경로, 공유 테마는 `@luckieverse/theme`을 사용한다. 존재하지 않는 공유 UI·헬퍼 패키지를 가정하지 않는다.
- 라우팅 작업은 해당 앱의 기존 라우트 정의·타입을 확인하고 재사용한다. 여러 사용처가 공유하는 경로는 기존 라우트 정의 또는 경로 상수로 관리하며 같은 경로를 별도로 중복 정의하지 않는다.
- `index.ts` barrel은 실제 공개 진입점이 필요할 때만 사용한다. 모든 폴더에 만들거나 내부 import까지 barrel로 우회해 순환 참조를 만들지 않는다.

## 자동 검사 설정

- 루트 Prettier 설정은 `printWidth: 100`, `singleQuote: true`, JSX 큰따옴표, `semi: false`, `trailingComma: all`, 공백 2칸, LF다. import·Tailwind 정렬 플러그인은 현재 설정돼 있지 않다.
- 두 앱의 ESLint는 JavaScript·TypeScript recommended 구성을 사용한다. 현재 React Hooks 전용·타입 기반 규칙과 `no-console: warn`은 설정돼 있지 않다. 미설정을 훅 규칙·의존성·민감정보 로그를 무시해도 된다는 뜻으로 해석하지 않는다.

## 환경변수

- 환경변수는 각 앱의 `.env.local` 등 Vite 환경 파일에서 분리한다. 브라우저용 변수는 `VITE_` 접두사이며 `import.meta.env`로 읽는다. 필요한 값의 이름·필수 여부·형식을 먼저 정하고 검증한다.
- 공개 환경변수에 비밀 값을 넣지 않는다. 실제 `.env` 값·인증 정보는 문서·로그·커밋에 노출하지 않는다.
- Flutter의 `WEB_APP_URL`은 `--dart-define`으로 전달하는 별도 설정이다. 사용자 웹과 master 배포 URL을 혼용하지 않고 Flutter 설정은 모바일 범위에서 다룬다.

## 네이티브 브리지·이벤트

- 브리지는 사용자 웹 `apps/web`의 기능이다. master에 자동으로 추가하지 않는다. 계약의 기준은 [`docs/bridge.md`](../docs/bridge.md)다.
- 연결 확인은 `apps/web/src/bridge.ts`의 `isNativeAvailable()`·`pingNative()`, 폴드 상태는 `apps/web/src/fold-state.ts`의 `getFoldState()`·`subscribeFoldState()`를 재사용한다.
- 전송은 `window.LuckieverseBridge.postMessage()`에 JSON 문자열을 전달하고 `{ version: 1, id, type }` 계약을 유지한다. 응답은 `luckieverse:response` CustomEvent로 받는다. 별도 플랫폼 채널·이미터를 중복 추가하지 않는다.
- 요청 ID 대응, 5초 응답 제한, 잘못된 응답 무시, 브라우저의 채널 부재 처리, 페이지 수명·구독·타이머 정리를 보존한다. 폴드의 `unknown` 정상 응답과 통신 실패를 구분하고 화면 폭·User-Agent로 기기 상태를 추정하지 않는다.

## 스타일·접근성·검증

- Tailwind와 기존 공통 테마 토큰을 우선 사용하고 같은 의미의 색상·간격 값을 화면마다 반복 정의하지 않는다. 공통 토큰 변경 시 web·master 양쪽 영향을 확인한다.
- 동작은 `<button>`, 이동은 링크, 입력에는 연결된 label을 사용한다. 키보드 조작·접근 가능한 이름을 보장하고 로딩·오류·빈 상태를 실제 기능에 맞게 처리한다.
- 변경 동작과 영향받는 사용처는 적용되는 TDD·E2E 지침에 따라 검증한다. null·undefined·정상값·유효한 falsy와 적용 가능한 실패·경계 시나리오를 포함한다. 기존 테스트의 기대값을 약화해 통과시키지 않는다.
- 검사 명령은 루트와 각 앱의 현재 `package.json`, 실행 방법은 `README.md`를 확인한다. 브라우저의 네이티브 mock 결과를 실제 WebView·서버·물리 기기 검증으로 표현하지 않는다.
- 문서·지침만 변경한 경우 앱 테스트·빌드는 실행하지 않고 구조·경로·참조·내용 일관성과 기존 보호 조항을 검증한다.
