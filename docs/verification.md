# 요구사항과 검증 범위

## 성공 조건

| 요구사항 | 구현 위치 | 대응 검사 |
| --- | --- | --- |
| Flutter·React 모노레포와 루트 명령 | 루트 설정, apps/mobile, apps/web | scripts/workspace.test.mjs, 양쪽 빌드 |
| Android·iOS 배포 URL WebView | mobile/lib/web_app_screen.dart, 플랫폼 설정 | web_contract_test, web_screen_test, 실제 WebView 통합 테스트 |
| 양방향 통신 예제·브라우저 독립 실행 | mobile/lib/native_bridge.dart, web/src/bridge.ts | 양쪽 계약 테스트, Playwright, WebView 통합 테스트 |
| 기존 카운터·접근성 보존 | mobile/lib/main.dart | 기존 widget_test, WebView 통합 테스트 |
| 기존 AGENTS.md 보존 | 루트 AGENTS.md | baseline SHA-256 대조 |

## 정상·실패·경계 시나리오

| 시나리오 | 적용·처리 | 대응 테스트 |
| --- | --- | --- |
| 정상 화면·실제 ping/pong·재호출 | Android/iOS, 브라우저 단독은 비활성화 | bridge.test, app.spec, webview_test |
| 네트워크 끊김 | 오류·재시도 표시 | web_screen_test, webview_test의 disconnect |
| 서버 HTTP 오류·복구 | 요청 URL이 있는 오류는 주 문서와 대조; URL이 없는 iOS HTTP 오류는 로딩 중 실패로 처리, 재시도로 복구 | web_screen_test, webview_test의 recover |
| 로딩·통신 타임아웃 | 각각 30초·5초, 늦은 응답 무시 | web_screen_test, bridge.test, app.spec, webview_test의 slow |
| 잘못된 입력·빈 상태 | 빈 URL, 다른 scheme, 자격정보 URL, 잘못된 JSON·버전·ID 거부 | web_contract_test, bridge.test, web_screen_test |
| null·undefined·유효한 falsy | 0/false/빈 ID는 계약상 잘못된 메시지로 구분; 없는 채널은 브라우저 상태 | web_contract_test, bridge.test |
| 동시 요청·응답 순서 역전 | ID별 연결·중복/이전 응답 무시 | bridge.test |
| 외부 origin·비웹 스킴 | 탐색 차단, 민감한 네이티브 기능 없음 | web_contract_test, web_screen_test, webview_test |
| 재로딩·이동 중 응답 | 대기 요청 취소, 이전 세대 응답 차단 | bridge.test, web_screen_test, webview_test |
| 빠른 반복 클릭·재시도 | UI 요청 중 비활성화, 완료 후 재사용 | app.spec, web_screen_test |
| 뒤로가기·카운터 왕복 | Android 웹 이력 우선, 빈 이력은 SystemNavigator.pop, 데모와 기존 증가 유지 | widget_test, webview_test |
| 키보드·터치 영역·반응형 | semantic 버튼/status, 48px 버튼, overflow 없음 | widget_test, app.spec, 화면 확인 |
| 권한 없음 | 카메라·푸시·계정 권한은 범위 밖; iOS 로컬망 거절은 네트워크 오류로 처리 | 네트워크 오류 테스트; OS 권한 팝업 실기기 확인은 별도 |

## 실행·판정 원칙

계약·UI·플랫폼 설정의 실패 테스트를 먼저 확인한 뒤 구현했어. `scripts/workspace.test.mjs`, Flutter 계약·화면 테스트, React 통신 테스트, Playwright 화면 테스트의 초기 실패가 그 근거야. 로컬 HTTP에서 `crypto.randomUUID`를 쓸 수 없는 경우도 추가 실패 테스트로 재현 후 수정했어.

독립 검수와 최종 검증은 입력 파일 hash를 전후 비교해. 작업 시작 시 Git 메타데이터가 없어 원본과 이동 파일·신규 파일 목록으로 baseline을 기록했어. 작업 중 저장소가 생성된 이후에는 각 검수·검증 시점의 HEAD와 Git 상태도 함께 기록해. 상세 실행 결과는 작업별 외부 검증 기록에 남겨 이 문서의 시나리오 정의와 분리해.

운영 서버, 물리 기기, 스토어 배포는 로컬 테스트로 증명하지 않아. 필수 검증 실패·미실행은 완료 보고에서 별도로 표시해.

Android의 HTTP 오류가 page-start보다 먼저 오는 순서는 실제 에뮬레이터에서 재현했고 회귀 테스트로 고정했어. WKWebView HTTP 오류는 플러그인에서 요청 URL·frame 정보를 제공하지 않아 로딩 중 URL 없는 오류를 보수적으로 처리해. 현재 예제는 iframe을 사용하지 않으며, 향후 iframe을 추가하면 주 문서와 프레임 오류 구분을 다시 설계해야 해.

독립 검수에서 발견한 같은 URL 재시도 뒤 이전 완료·지연 예외 경합은 실패 테스트로 재현하고 컨트롤러 identity·탐색 세대 검사로 보호한다. Android 빈 이력의 SystemNavigator.pop 호출도 위젯 테스트에서 검증한다.

## 개발 의존성 점검

2026-11-10 audit에서 개발 전이 의존성 `minimatch 10.2.6`의 [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)를 확인했어. 수정 버전은 11.0.1 이상이지만 상위 `typescript-estree 8.72.2`는 ^10.2.2를 요구해 호환 patch/minor 갱신으로 제거할 수 없어. 취약 조건인 공격자 제어 glob + optimizationLevel >= 2를 현재 호출은 사용하지 않고, 해당 projectService도 활성화하지 않아 현재 악용 경로는 미발견이야. 운영 React 번들 의존성은 아니며, 검증 없이 major override를 강제하지 않았어. 상위 패키지의 호환 업데이트가 필요해.

오류 화면에서 Android 뒤로가기는 명시적 복구로 처리하며, 이전 정상 페이지 복귀를 위젯·실제 WebView 통합 시나리오에 포함해. 자동으로 늦게 도착하는 탐색과 구분해 오류를 해제해.

정상 fragment 뒤로가기는 페이지 시작 콜백이 없어도 기존 준비 상태를 유지하며, 오류 복구용 초기화는 오류 상태에만 적용해. 위젯의 31초 경계 검사와 실제 WebView의 fragment 왕복 시나리오로 구분해 검증해.

실제 WebView fragment 검사는 문서 로딩 완료와 실제 터치에 의한 user activation을 확인한 뒤 이력을 생성해. 사용자 동작 없는 스크립트 이력은 [Chromium history intervention](https://chromium.googlesource.com/chromium/src/+/main/docs/history_manipulation_intervention.md)에 의해 네이티브 back 대상에서 제외될 수 있어. 앱 내부의 새 문서 탐색도 허용된 navigation request에서 URL을 먼저 기록해 HTTP 오류-before-start 순서를 처리하고 fragment-only 요청은 로딩 상태를 바꾸지 않아.
