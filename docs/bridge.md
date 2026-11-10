# WebView bridge v1

이 문서는 React와 Flutter가 공유하는 계약이다. 인증·권한·파일 접근 기능은 없다.

- 앱 URL: `--dart-define=WEB_APP_URL=https://...`. 운영에서는 HTTPS, debug에서는 로컬 개발용 HTTP도 허용한다. URL에 사용자 정보는 허용하지 않는다.
- 허용 탐색: 설정 URL과 동일한 scheme/host/port. 다른 origin, `file:`, `javascript:`, 외부 앱 스킴은 차단한다.
- React 공개 함수: `pingNative(): Promise<Pong>`. 채널이 없는 브라우저에서는 호출을 거부한다.
- JavaScript → Dart: `window.LuckieverseBridge.postMessage(JSON.stringify({version: 1, id, type: 'ping'}))`.
- `id`: 요청별 고유한 1~128자의 문자열. 버전은 숫자 `1`, type은 `ping`만 허용한다. 잘못된 메시지는 응답 없이 거부한다.
- Dart → JavaScript: `luckieverse:response` CustomEvent의 detail로 `{version: 1, id, type: 'pong', platform: 'android' | 'ios'}`를 전달한다. JSON으로 직렬화하며 실행 코드 문자열에 값을 직접 보간하지 않는다.
- React는 요청 ID별 응답을 처리하고 5초 뒤 실패한다. 일치하지 않거나 잘못된 응답은 무시한다. pagehide/beforeunload에서 대기 요청을 취소한다.
- Flutter는 탐색 세대와 현재 URL을 확인하고 오래된 메시지를 전달하지 않는다. 페이지 전환 후의 React 요청 ID는 새로운 문서에 속한다.
- 브리지는 로드 이전에 등록한다. 서브프레임의 신뢰성을 채널 API로 보증하지 않으므로 민감한 네이티브 기능으로 확장하려면 별도 origin/frame 검증 설계가 필요하다.

재시도는 새 WebViewController를 만들고 이전 컨트롤러의 콜백·비동기 완료를 무시한다. 같은 URL의 늦은 완료 이벤트도 새 시도의 타이머를 해제하지 못한다.
