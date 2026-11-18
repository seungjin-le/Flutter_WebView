import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

Future<void> _initializeKakaoSdk(String key) =>
    KakaoSdk.init(nativeAppKey: key);

Future<void> initializeKakao({
  String nativeAppKey = const String.fromEnvironment('KAKAO_NATIVE_APP_KEY'),
  Future<void> Function(String) initialize = _initializeKakaoSdk,
}) async {
  final key = nativeAppKey.trim();
  if (key.isNotEmpty) await initialize(key);
}

// Android uses Apple's web flow. iOS uses the native entitlement.
WebAuthenticationOptions? appleWebOptions({
  String serviceId = const String.fromEnvironment('APPLE_SERVICE_ID'),
  String returnUrl = const String.fromEnvironment('APPLE_RETURN_URL'),
}) {
  final uri = Uri.tryParse(returnUrl.trim());
  if (serviceId.trim().isEmpty ||
      uri == null ||
      uri.scheme != 'https' ||
      uri.host.isEmpty) {
    return null;
  }
  return WebAuthenticationOptions(clientId: serviceId.trim(), redirectUri: uri);
}
