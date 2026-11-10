# Luckieverse

Flutter 앱(Android·iOS)이 React 화면을 WebView로 여는 모노레포야. 웹은 배포 URL로 제공하며 브라우저에서도 독립 실행돼.

## 구조

- `apps/mobile/`: 기존 Flutter 프로젝트, 플랫폼 호스트, 카운터 데모와 테스트.
- `apps/web/`: React + TypeScript + Vite, 통신 예제와 브라우저 테스트.
- `docs/bridge.md`: URL 정책과 React ↔ Flutter 메시지 계약.
- `docs/verification.md`: 요구사항·테스트 시나리오와 검증 범위.
- `scripts/`: 구조 검사와 로컬 네이티브 테스트 서버.

기존 `AGENTS.md`는 요청대로 원문을 보존했어. 그 문서의 Flutter 경로·명령은 이제 `apps/mobile/`를 기준으로 읽어. 루트에 남은 이전 `.dart_tool/`, `build/` 등 생성물은 사용하지 않아.

## 준비

Node 24, pnpm 11.17.0, Flutter SDK가 필요해. 현재 Dart 제약은 `^3.15.0-132.0.dev`이고 Flutter main 3.50.0-1.0.pre-505에서 작업했어. SDK를 변경하면 버전·테스트를 다시 확인해.

```sh
pnpm install --frozen-lockfile
pnpm mobile:pub
pnpm dev:web
```

웹 개발 서버는 `http://127.0.0.1:5173`을 사용해. 포트가 사용 중이면 자동으로 바꾸지 않고 실패해.

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

## 웹 배포와 앱 빌드

```sh
pnpm build:web
# apps/web/dist를 HTTPS 정적 호스팅에 배포한 뒤 해당 URL을 주입
pnpm build:android --dart-define=WEB_APP_URL=https://your-domain.example
pnpm build:ios:simulator --dart-define=WEB_APP_URL=https://your-domain.example
```

웹 호스팅에는 SPA 경로를 `index.html`로 연결하도록 설정해. 실제 호스팅·스토어 배포는 포함하지 않아. 앱 ID와 기존 Android debug 서명 설정은 유지하므로 배포용 서명 설정은 별도로 필요해. 환경 주소는 비밀 저장소가 아니므로 토큰을 URL이나 `dart-define`에 넣지 않아.

기본 화면은 WebView이며, 앱바의 **카운터 데모**에서 기존 Flutter 예제를 사용할 수 있어. React의 **앱 연결 확인** 버튼은 Android/iOS의 `pong`을 표시하고, 일반 브라우저에서는 비활성화돼. 다른 origin과 외부 앱 링크는 차단하며 로그인·카메라·푸시 기능은 아직 없어.

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

브라우저 E2E의 네이티브 채널은 mock이야. 실제 WebView 통신은 Flutter 통합 테스트로 따로 확인하고, emulator/simulator 결과를 물리 기기·운영 서버 확인으로 간주하지 않아. macOS·Windows·Linux·Flutter web 호스트 코드는 보존했지만 이번 WebView 지원 대상은 Android·iOS야.
