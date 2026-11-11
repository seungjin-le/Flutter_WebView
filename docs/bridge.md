# WebView bridge v1

이 문서는 React와 Flutter가 공유하는 계약이다. 인증·권한·파일 접근 기능은 없다.

- 앱 URL: `--dart-define=WEB_APP_URL=https://...`. 운영에서는 HTTPS, debug에서는 로컬 개발용 HTTP도 허용한다. URL에 사용자 정보는 허용하지 않는다.
- 허용 탐색: 설정 URL과 동일한 scheme/host/port. 다른 origin, `file:`, `javascript:`, 외부 앱 스킴은 차단한다.
- React 공개 함수: `pingNative(): Promise<Pong>`. 채널이 없는 브라우저에서는 호출을 거부한다.
- JavaScript → Dart: `window.LuckieverseBridge.postMessage(JSON.stringify({version: 1, id, type: 'ping'}))`.
- `id`: 요청별 고유한 1~128자의 문자열. 버전은 숫자 `1`, type은 `ping`, `getFoldState`, `subscribeFoldState`, `unsubscribeFoldState`를 허용한다. 잘못된 메시지는 응답 없이 거부한다.
- Dart → JavaScript: `luckieverse:response` CustomEvent의 detail로 `{version: 1, id, type: 'pong', platform: 'android' | 'ios'}`를 전달한다. JSON으로 직렬화하며 실행 코드 문자열에 값을 직접 보간하지 않는다.
- React는 요청 ID별 응답을 처리하고 5초 뒤 실패한다. 일치하지 않거나 잘못된 응답은 무시한다. pagehide/beforeunload에서 대기 요청을 취소한다.
- Flutter는 탐색 세대와 현재 URL을 확인하고 오래된 메시지를 전달하지 않는다. 페이지 전환 후의 React 요청 ID는 새로운 문서에 속한다.
- 브리지는 로드 이전에 등록한다. 서브프레임의 신뢰성을 채널 API로 보증하지 않으므로 민감한 네이티브 기능으로 확장하려면 별도 origin/frame 검증 설계가 필요하다.

재시도는 새 WebViewController를 만들고 이전 컨트롤러의 콜백·비동기 완료를 무시한다. 같은 URL의 늦은 완료 이벤트도 새 시도의 타이머를 해제하지 못한다.


## iOS Duo / Android Fold 상태

`apps/web/src/fold-state.ts`에서 조회·구독 함수를 가져온다. 화면·컴포넌트는 변경하지 않는다.

```ts
import { getFoldState, subscribeFoldState } from './fold-state'

const state = await getFoldState()
const unsubscribe = subscribeFoldState(
  state => console.log(state.deviceType, state.posture),
  error => console.error(error.message),
)
// 사용처 해제 시 호출
unsubscribe()
```

`FoldState`는 다음 세 필드로 구성된다.

| 필드 | 값·의미 |
| --- | --- |
| `platform` | `ios` 또는 `android` |
| `deviceType` | `ios-duo`, `android-fold`, `unknown` |
| `posture` | `folded`, `half-opened`, `unfolded`, `unknown` |

기기 유형은 **공식 힌지 API로 관측한 계열**이며 정확한 제품 모델명이 아니다. iOS는 [UIHingeInteraction](https://developer.apple.com/documentation/uikit/uihingeinteraction)의 non-nil 힌지, Android는 [FoldingFeature](https://developer.android.com/reference/androidx/window/layout/FoldingFeature) 또는 extension 6 이상의 TABLETOP 지원으로 유형을 확인한다. 한 번 확인한 유형은 네이티브 관찰자 수명 동안 유지한다. 정보 없음·API 미지원은 일반폰이라는 증거가 아니므로 `unknown`으로 둔다. 화면 폭·모델명·User-Agent로 추정하지 않는다.

- iOS 27.1 이상: closed → folded, partiallyOpen → half-opened, fullyOpen → unfolded. nil·unknown은 posture unknown. SDK 심볼이 없는 빌드도 동작하도록 `HAS_UI_HINGE_API`는 현재 Xcode 프로젝트의 SDK 27.1/27.2 조건에만 설정한다. 새 SDK 채택 시 조건을 검토한다.
- Android: FLAT → unfolded, HALF_OPENED → half-opened. 빈 WindowLayoutInfo는 cover 화면·일반폰·멀티윈도 모두 가능하므로 folded로 추정하지 않는다. 현재 공개 API에서는 folded를 보내지 않는다. Jetpack WindowManager 1.5.1을 사용한다.
- 미지원·잘못된 네이티브 데이터·스트림 오류는 현재 플랫폼의 unknown 상태로 처리하며 웹 화면을 오류 화면으로 바꾸지 않는다.

네이티브 → Flutter는 `luckieverse/fold_state` EventChannel로 초기 snapshot과 변경을 전달한다. 웹 요청은 기존 `LuckieverseBridge`의 `{version:1,id,type}` 형식이며, 응답·변경은 기존 `luckieverse:response`의 `{version:1,id,type:'foldState',state}`다. 조회는 한 번 응답하고, 구독은 같은 ID로 초기 상태와 변경을 받는다. 네이티브에는 현재 WebView 구독 하나만 유지하며 웹 모듈이 여러 소비자를 관리한다. 일치하는 ID의 unsubscribe만 구독을 해제한다.

조회와 구독 초기 응답은 5초 제한이다. 없는 브리지·전송 실패·응답 시간 초과는 Promise 거절 또는 `onError`로 전달한다. 상태가 unknown인 정상 응답과 통신 실패는 구분한다. 여러 조회는 ID별로 처리하고 잘못된 버전·enum·플랫폼 조합은 무시한다. pagehide에서 조회를 취소하고 구독을 중단하며, pageshow에서 활성 구독을 새 ID로 복구한다. 수동 재시도는 구독 해제 후 다시 구독한다.

새 문서·재시도·오류·dispose는 네이티브 구독을 지우고 이전 컨트롤러·탐색 세대의 비동기 전송을 차단한다. 동일 문서의 SPA URL 변경에서는 현재 신뢰 origin과 구독 ID를 확인해 계속 전달한다. 페이지 완료 URL의 일치 여부에 구독을 묶지 않는다.
