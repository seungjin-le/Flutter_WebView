# Luckieverse

Flutter 앱(Android·iOS)이 React 화면을 WebView로 여는 모노레포야. 웹은 배포 URL로 제공하며 브라우저에서도 독립 실행돼.

## 구조

- `apps/mobile/`: 기존 Flutter 프로젝트, 플랫폼 호스트, 카운터 데모와 테스트.
- `apps/web/`: React + TypeScript + Vite, 통신 예제와 브라우저 테스트.
- `packages/theme/`: web이 사용하는 Tailwind 초기화와 디자인 토큰.
- `docs/bridge.md`: URL 정책과 React ↔ Flutter 메시지 계약.
- `docs/verification.md`: 요구사항·테스트 시나리오와 검증 범위.
- `scripts/`: 구조 검사와 로컬 네이티브 테스트 서버.

기존 `AGENTS.md`는 요청대로 원문을 보존했어. 그 문서의 Flutter 경로·명령은 이제 `apps/mobile/`를 기준으로 읽어. Flutter 생성물은 `apps/mobile/` 아래에서 관리해.

## 준비

Node 24, pnpm 11.17.0, Flutter SDK가 필요해. 현재 Dart 제약은 `^3.15.0-132.0.dev`이고 Flutter main 3.50.0-1.0.pre-505에서 작업했어. SDK를 변경하면 버전·테스트를 다시 확인해.

```sh
pnpm install --frozen-lockfile
pnpm mobile:pub
pnpm dev:web
```

웹 개발 서버는 `http://127.0.0.1:5173`을 사용해. 포트가 사용 중이면 자동으로 바꾸지 않고 실패해.

앱별 `.env.local`을 사용하며, `VITE_` 환경변수는 브라우저에 노출되므로 비밀 값을 넣지 않아.

## 라이브러리 버전 관리

`pnpm-workspace.yaml`의 `catalog`에서 공통 라이브러리와 개발 도구의 버전을 관리하고, 각 앱의 `package.json`은 `"catalog:"`로 참조해. 앱 전용 라이브러리는 해당 앱에서 직접 관리해.

- 런타임: React·React DOM, TanStack Query·Router, Zod, React Hook Form·resolvers, Zustand, Axios, date-fns.
- 스타일: `@luckieverse/theme`의 `packages/theme/theme.css`에서 Tailwind 초기화(Preflight 포함)와 `@theme` 토큰을 공통 관리해. 각 앱의 `src/style.css`는 이 패키지를 가져오고 `@source "../"`로 해당 앱만 탐색해. Vite 플러그인 등록은 앱별 설정에 유지해.
- 개발: TypeScript, Vite·React 플러그인, ESLint·typescript-eslint, Playwright, Vitest, React·Node 타입 패키지.

공통 토큰은 `bg-surface`(흰 배경), `text-content`(검정 글자), `font-sans`(시스템 폰트), `p-4`·`gap-2`(4px 기본 간격 단위)로 사용할 수 있어. 토큰을 바꾸려면 `packages/theme/theme.css`의 `@theme`만 수정해. 변경 후 web의 검사·E2E·빌드를 실행해. 앱별 클래스 탐색 범위는 확장하지 않아.

MSW와 React Router는 설치하지 않아. TanStack Router 패키지명은 `@tanstack/react-router`야. 라이브러리는 설치만 되어 있고 라우트·QueryClient·폼·store·API 클라이언트는 기능을 구현할 때 앱별로 구성해.

TypeScript는 현재 `typescript-eslint`의 지원 범위(`>=4.8.4 <6.1.0`)에 맞춰 6.0.3을 사용해. TypeScript 7 전환은 린터 지원 이후 진행하고, `@types/node`는 실행 환경과 같은 Node 24 계열 최신을 사용해. [지원 범위](https://typescript-eslint.io/users/dependency-versions/)

공통 버전을 바꾼 뒤 `pnpm install`로 잠금 파일을 갱신하고 web의 검사·E2E·빌드를 실행해. catalog는 버전 관리 기능이며 실행 중인 상태나 배포 번들을 공유하지 않아. [pnpm Catalogs](https://pnpm.io/catalogs)

## Flutter 로컬 실행

```sh
# iOS simulator
pnpm mobile:run -d <ios-device-id> --dart-define=WEB_APP_URL=http://127.0.0.1:5173
# Android emulator: 호스트 컴퓨터 접근 주소
pnpm mobile:run -d <android-device-id> --dart-define=WEB_APP_URL=http://10.0.2.2:5173
# 실기기 개발: LAN 공개는 명시적으로 선택
pnpm dev:web --host 0.0.0.0
pnpm mobile:run -d <device-id> --dart-define=WEB_APP_URL=http://<개발컴퓨터의-사설-IP>:5173
```

HTTP는 debug 빌드의 localhost·사설 IP에서만 허용해. profile/release는 HTTPS가 필요해. URL 미설정·오류 시 설정 안내가 표시돼. iOS에서 요청하면 로컬 네트워크 접근을 허용해야 해.

## Flutter 소셜 로그인 설정

카카오·네이버·구글·애플의 Android/iOS SDK와 콜백은 `apps/mobile`에 설정돼 있어. 키를 비워도 기본 앱을 실행할 수 있어. 발급받은 값을 적용할 때는 모바일 디렉터리에서 다음과 같이 실행해.

```sh
cd apps/mobile
cp -n social-login.env.example .env.local
# .env.local에 필요한 제공자 값만 입력한 뒤 앱을 다시 빌드해.
flutter run --dart-define-from-file=.env.local
```

Android와 Xcode도 같은 `.env.local`을 읽어. `flutter build`에도 같은 옵션을 붙여. 이 파일은 Git에서 제외돼. 앱에 포함되는 클라이언트 설정만 넣고, Apple 서명용 개인 키나 서버용 OAuth 시크릿은 서버에서 관리해.

| 제공자 | 입력할 값 | 제공자 콘솔과 앱에서 맞출 설정 |
| --- | --- | --- |
| 카카오 | `KAKAO_NATIVE_APP_KEY` | 카카오 로그인 활성화, Android 패키지·서명 키 해시와 iOS 번들 ID 등록. 앱의 복귀 주소는 `kakao{네이티브 앱 키}://oauth`야. |
| 네이버 | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 네이버 로그인 환경에 Android 패키지와 iOS URL 스킴 `luckieverse-naver`를 등록해. |
| 구글 | `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_REVERSED_CLIENT_ID` | Android OAuth 클라이언트에는 패키지와 서명 SHA-1을 등록해. Android SDK가 사용하는 서버 클라이언트 ID는 웹 유형이야. iOS 값은 해당 번들용 클라이언트의 `CLIENT_ID`와 `REVERSED_CLIENT_ID`야. 로그인 호출 전 `GoogleSignIn.instance.initialize()`를 한 번 호출해. |
| 애플 | iOS는 앱 키 불필요. Android는 `APPLE_SERVICE_ID`, `APPLE_RETURN_URL` | iOS App ID와 서명 프로파일에 Sign in with Apple을 활성화해. Android는 Services ID에 HTTPS Return URL을 등록하고, 해당 서버가 Apple의 POST를 받아 앱의 패키지를 지정한 `intent://callback?...#Intent;package=com.example.luckieverse_tab_flutter;scheme=signinwithapple;end`로 복귀시켜야 해. Dart에서 Android용 인증 옵션은 `appleWebOptions()`로 얻을 수 있어. |

현재 Android 패키지는 `com.example.luckieverse_tab_flutter`, iOS 번들 ID는 `com.example.luckieverseTabFlutter`야. 로그인 화면과 서버 세션 발급은 후속 연동 범위야.

## 웹 배포와 앱 빌드

```sh
pnpm build:web
# apps/web/dist를 HTTPS 정적 호스팅에 배포한 뒤 해당 URL을 주입
pnpm build:android --dart-define=WEB_APP_URL=https://your-domain.example
pnpm build:ios:simulator --dart-define=WEB_APP_URL=https://your-domain.example
```

웹 호스팅에는 SPA 경로를 `index.html`로 연결하도록 설정해. 실제 호스팅·스토어 배포는 포함하지 않아. 앱 ID와 기존 Android debug 서명 설정은 유지하므로 배포용 서명 설정은 별도로 필요해. 환경 주소는 비밀 저장소가 아니므로 토큰을 URL이나 `dart-define`에 넣지 않아.

기본 화면은 WebView이며, 앱바의 **카운터 데모**에서 기존 Flutter 예제를 사용할 수 있어. 웹 홈 `/`은 세로로 넘기는 iframe 피드야. 실제 콘텐츠와 에셋은 `dist/feed/`에서 정적 파일로 제공해. `/connection`의 **앱 연결 확인** 버튼은 Android/iOS의 `pong`을 표시하고, 일반 브라우저에서는 비활성화돼. 다른 origin과 외부 앱 링크는 차단하며 로그인·카메라·푸시 기능은 아직 없어.

래플 상세(`/benefits/raffles/r1`, `/benefits/raffles/r2`), 클로버 내역(`/benefits/history`), 프로필 설정(`/profile/settings`)은 직접 열거나 새로고침할 수 있어. 앱 안에서 열면 뒤로가기로 보던 목록이나 메뉴에 복귀해. 직접 접속하거나 새로고침한 뒤 화면의 뒤로 버튼을 누르면 혜택 또는 프로필 탭으로 돌아가.

## 임시 프로토타입과 삭제 시점

홈·탐색·혜택·프로필은 LuckyBusTap 프로토타입의 디자인과 조작을 확인하기 위한 임시 화면이야. **각 탭에 정식 디자인과 콘텐츠를 적용할 때 해당 복제 자료와 전용 코드를 삭제해.**

- `apps/web/public/feed/`는 홈과 탐색·프로필이 함께 사용해. 마지막 사용처를 교체하면 디렉터리 전체를 삭제해. 원본 콘텐츠 HTML 91개, 이미지, 미리보기 SDK 2개가 들어 있어. 웹을 다시 빌드한 뒤 배포본의 `dist/feed/`도 정리해.
- `apps/web/src/features/home/`의 임시 목록(`feed-items.json`, `feed-catalog.ts`), 표지, 예시 광고, 미리보기, 참여 화면과 전용 CSS를 삭제하고 정식 홈을 `/`에 연결해.
- `apps/web/src/router.tsx`의 임시 피드 쿼리(`feed`, `play`, `view`)와 `.prettierignore`, `apps/web/eslint.config.js`, `apps/web/src/style.css`의 `public/feed` 전용 예외도 함께 제거해.
- `apps/web/e2e/home-feed.spec.ts`, `apps/web/e2e/feed-card.spec.ts`와 `apps/mobile/integration_test/webview_test.dart`에서 예시 카드와 복제 콘텐츠에 의존하는 검사를 정식 콘텐츠 기준으로 교체해. `apps/web/e2e/bottom-nav.spec.ts`에서도 임시 홈 제목과 스크롤 영역에 의존하는 단언만 갱신해. 하단 메뉴의 아이콘·색상과 데스크톱 화면 프레임 치수도 정식 디자인에 맞춰 교체해.
- 탐색·혜택·프로필은 `apps/web/public/prototype-tabs/index.html`을 하나의 iframe으로 공유해. 출석·클로버·닉네임 변경은 현재 페이지를 새로고침할 때까지 유지되는 예시 데이터야. 세 탭을 모두 교체하면 `apps/web/public/prototype-tabs/`와 `apps/web/src/features/prototype-tabs/`를 삭제하고 배포본의 `dist/prototype-tabs/`도 정리해.
- 정식 화면도 위의 상세 주소를 사용해. 교체할 때는 `router.tsx`의 iframe 연결, 홈 플레이어의 `fromPrototypePlayer` 복귀 처리와 피드 활동을 미션·도감에 전달하는 임시 연동, `style.css`와 `.prettierignore`의 임시 탭 전용 규칙을 제거해. `prototype-shell.spec.ts`, `prototype-tabs.spec.ts`, `prototype-activity.spec.ts`, `detail-routes.spec.ts`에서 복제 화면에 의존하는 검사는 정식 화면 기준으로 교체해.

## 검증

```sh
pnpm test:workspace
pnpm check:web
pnpm --filter @luckieverse/web exec playwright install chromium
pnpm test:e2e
pnpm check:mobile
```

실제 WebView 통합 테스트는 별도 터미널에서 테스트 서버를 실행한 뒤 플랫폼별로 순차 실행해. 테스트 서버는 배포 대상이 아니며, HTTP 오류·연결 끊김·지연 응답을 재현해.

```sh
pnpm test:native:server
pnpm test:native -d <android-device-id> --dart-define=WEB_APP_URL=http://10.0.2.2:5174
pnpm test:native -d <ios-device-id> --dart-define=WEB_APP_URL=http://127.0.0.1:5174
```

브라우저 E2E의 네이티브 채널은 mock이야. 실제 WebView 통신은 Flutter 통합 테스트로 따로 확인하고, emulator/simulator 결과를 물리 기기·운영 서버 확인으로 간주하지 않아. Flutter 호스트와 WebView 지원 대상은 Android·iOS야. 웹은 별도의 React 프로젝트인 `apps/web/`에서 제공해.
