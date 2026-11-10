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
| 뒤로가기·카운터 왕복 | Android 웹 이력 우선, 데모와 기존 증가 유지 | widget_test, webview_test |
| 키보드·터치 영역·반응형 | semantic 버튼/status, 48px 버튼, overflow 없음 | widget_test, app.spec, 화면 확인 |
| 권한 없음 | 카메라·푸시·계정 권한은 범위 밖; iOS 로컬망 거절은 네트워크 오류로 처리 | 네트워크 오류 테스트; OS 권한 팝업 실기기 확인은 별도 |

## 실행·판정 원칙

계약·UI·플랫폼 설정의 실패 테스트를 먼저 확인한 뒤 구현했어. `scripts/workspace.test.mjs`, Flutter 계약·화면 테스트, React 통신 테스트, Playwright 화면 테스트의 초기 실패가 그 근거야. 로컬 HTTP에서 `crypto.randomUUID`를 쓸 수 없는 경우도 추가 실패 테스트로 재현 후 수정했어.

독립 검수와 최종 검증은 입력 파일 hash를 전후 비교해. Git 메타데이터가 없는 폴더이므로 Git 상태는 해당 없음이며, 원본과 이동 파일·신규 파일 목록을 기준으로 검수해. 상세 실행 결과는 작업별 외부 검증 기록에 남겨 이 문서의 시나리오 정의와 분리해.

운영 서버, 물리 기기, 스토어 배포는 로컬 테스트로 증명하지 않아. 필수 검증 실패·미실행은 완료 보고에서 별도로 표시해.

Android의 HTTP 오류가 page-start보다 먼저 오는 순서는 실제 에뮬레이터에서 재현했고 회귀 테스트로 고정했어. WKWebView HTTP 오류는 플러그인에서 요청 URL·frame 정보를 제공하지 않아 로딩 중 URL 없는 오류를 보수적으로 처리해. 현재 예제는 iframe을 사용하지 않으며, 향후 iframe을 추가하면 주 문서와 프레임 오류 구분을 다시 설계해야 해.
