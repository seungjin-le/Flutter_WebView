import 'package:flutter_test/flutter_test.dart';
import 'package:luckieverse_tab_flutter/social_login.dart';

void main() {
  test('Kakao only initializes with a configured native app key', () async {
    final initialized = <String>[];
    Future<void> record(String key) async => initialized.add(key);

    for (final key in ['', '   ', 'test-key']) {
      await initializeKakao(nativeAppKey: key, initialize: record);
    }
    expect(initialized, ['test-key']);
  });

  test('Apple Android options require a Services ID and HTTPS return URL', () {
    for (final url in [
      '',
      'relative',
      'http://auth.example/callback',
      'https:',
    ]) {
      expect(appleWebOptions(serviceId: 'test.id', returnUrl: url), isNull);
    }
    const url = 'https://auth.example/callback';
    expect(appleWebOptions(serviceId: ' ', returnUrl: url), isNull);
    final options = appleWebOptions(serviceId: 'test.id', returnUrl: url);
    expect(options?.clientId, 'test.id');
    expect(options?.redirectUri, Uri.parse(url));
  });
}
