# Repository Guidelines

## 프로젝트 구조

현재 프로젝트는 `material_ui`를 사용하는 Flutter 카운터 앱이다. `lib/main.dart`에 진입점, `MyApp`, 홈 화면과 카운터 상태가 있다. 새 기능은 `lib/` 아래에 역할에 맞게 분리하되 기존 위젯과 테마를 우선 재사용한다.

`test/widget_test.dart`에는 카운터 증가와 접근성 검사가 있다. 플랫폼별 호스트 코드는 `android/`, `ios/`, `web/`, `macos/`, `linux/`, `windows/`에 있다. 현재 별도 앱 에셋 디렉터리와 활성화된 에셋 선언은 없다. 이미지나 폰트를 추가할 때는 `pubspec.yaml`에 경로도 등록한다. `build/`와 `.dart_tool/`은 생성물이므로 직접 편집하지 않는다.

## 개발·빌드 명령

명령은 프로젝트 루트에서 실행한다. 먼저 `flutter --version`으로 포함된 Dart SDK가 `pubspec.yaml`의 `^3.15.0-132.0.dev` 제약을 만족하는지 확인한다. 플랫폼별 빌드는 해당 개발 도구가 설치된 환경에서 수행한다.

- `flutter pub get`: 선언된 의존성을 설치한다.
- `flutter devices`: 실행 가능한 기기와 브라우저를 확인한다.
- `flutter run -d <device-id>`: 선택한 대상에서 앱을 실행한다.
- `dart format lib test`: Dart 소스와 테스트 형식을 정리한다.
- `flutter analyze`: 정적 분석과 린트를 실행한다.
- `flutter test`: 전체 단위·위젯 테스트를 실행한다.
- `flutter test test/widget_test.dart`: 기존 위젯 테스트만 실행한다.
- `flutter build apk` 또는 `flutter build web`: Android 또는 웹 배포 산출물을 생성한다.

## 코드 스타일과 이름

들여쓰기는 공백 두 칸을 사용하고 `dart format` 결과를 따른다. 파일명은 `snake_case.dart`, 타입은 `UpperCamelCase`, 함수와 변수는 `lowerCamelCase`로 작성한다. 비공개 멤버에는 `_` 접두사를 사용한다. 변경하지 않는 값에는 `final`, 가능한 위젯에는 `const`를 사용한다.

`analysis_options.yaml`은 `flutter_lints`를 적용하고 플랫폼 디렉터리를 분석 대상에서 제외한다. 분석 통과를 네이티브 코드 검증으로 간주하지 않는다. 기존 UI는 `package:material_ui/material_ui.dart`를 가져오므로 관련 변경에서 현재 의존성과 사용 방식을 먼저 확인한다.

## 테스트 지침

`flutter_test`와 `testWidgets`를 사용한다. 테스트 파일명은 `*_test.dart`로 정하고 검증하는 동작을 테스트 이름에 명시한다. 동작 변경은 실패하는 테스트로 먼저 재현한 뒤 구현한다. 기존 카운터 검사와 터치 영역·레이블·명암 대비 접근성 검사를 유지한다.

현재 수치화된 커버리지 기준이나 `integration_test/` 구성은 없다. 필요하면 `flutter test --coverage`로 측정하고, 기기 검증 결과는 위젯 테스트 결과와 구분한다. 문서만 변경한 경우 앱 테스트와 빌드 대신 내용·경로·명령의 일관성을 검토한다.

## 커밋과 Pull Request

현재 작업 폴더에는 Git 메타데이터가 없어 기존 커밋 관례는 미확인이다. 권장 형식은 `feat: 기능 설명`, `fix: 수정 방법과 이유`, `docs: 문서 설명`이다.

PR에는 변경 내용과 이유, 관련 이슈가 있으면 링크, 실행한 검증과 미실행 항목을 적는다. 화면 변경에는 스크린샷과 확인한 플랫폼을 첨부한다. 의존성 변경 시 `pubspec.lock`도 함께 검토하고, 인증 정보·서명 키·생성 산출물은 포함하지 않는다. 무관한 리팩터링과 기존 사용자 변경 수정은 피한다.
