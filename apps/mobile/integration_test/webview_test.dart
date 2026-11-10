import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:luckieverse_tab_flutter/main.dart';
import 'package:luckieverse_tab_flutter/web_app_screen.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const base = String.fromEnvironment('WEB_APP_URL');

  Future<void> waitUntil(
    WidgetTester tester,
    Future<bool> Function() condition, {
    Duration timeout = const Duration(seconds: 40),
  }) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 200));
      if (await condition()) return;
    }
    fail('WebView condition did not complete within $timeout');
  }

  Future<WebViewController> start(WidgetTester tester, String path) async {
    expect(
      base,
      isNotEmpty,
      reason: 'Pass WEB_APP_URL for the native fixture on port 5174',
    );
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(
      MyApp(webAppUrl: Uri.parse(base).resolve(path).toString()),
    );
    await waitUntil(
      tester,
      () async =>
          tester
              .state<WebAppScreenState>(find.byType(WebAppScreen))
              .controller !=
          null,
    );
    final controller = tester
        .state<WebAppScreenState>(find.byType(WebAppScreen))
        .controller;
    if (controller == null) throw StateError('Controller missing');
    return controller;
  }

  Future<void> ready(WidgetTester tester, WebViewController controller) async {
    await waitUntil(tester, () async {
      if (find.text('다시 시도').evaluate().isNotEmpty) {
        fail('WebView showed a loading error');
      }
      final result = await controller.runJavaScriptReturningResult(
        'Boolean(document.querySelector("button"))',
      );
      return result == true || result == 'true';
    });
  }

  Future<void> ping(WidgetTester tester, WebViewController controller) async {
    await controller.runJavaScript('document.querySelector("button").click()');
    await waitUntil(tester, () async {
      final result = await controller.runJavaScriptReturningResult(
        'document.querySelector("[role=status]")?.textContent.includes("앱과 연결됐어") === true',
      );
      return result == true || result == 'true';
    });
  }

  testWidgets(
    'real WebView renders React, exchanges pong, reloads, navigates and preserves counter',
    (tester) async {
      final controller = await start(tester, '/');
      await ready(tester, controller);
      await ping(tester, controller);
      await controller.reload();
      await tester.pump(const Duration(seconds: 1));
      await ready(tester, controller);
      await ping(tester, controller);
      await controller.runJavaScript('location.href = "/next"');
      await waitUntil(
        tester,
        () async => (await controller.currentUrl())?.endsWith('/next') == true,
      );
      await ready(tester, controller);
      await ping(tester, controller);
      await controller.runJavaScript(
        'location.href = "https://example.org/blocked"',
      );
      await tester.pump(const Duration(seconds: 1));
      expect((await controller.currentUrl())?.endsWith('/next'), isTrue);
      if (defaultTargetPlatform == TargetPlatform.android) {
        await tester.binding.handlePopRoute();
      } else {
        await controller.goBack();
      }
      await waitUntil(
        tester,
        () async => (await controller.currentUrl())?.endsWith('/') == true,
      );
      await ready(tester, controller);
      await ping(tester, controller);
      await tester.tap(find.text('카운터 데모'));
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      expect(find.text('1'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await ready(tester, controller);
      await ping(tester, controller);
    },
  );

  testWidgets('HTTP failure recovers through the retry action', (tester) async {
    Future<void> setFailure(bool fail) async {
      final client = HttpClient();
      try {
        final request = await client.postUrl(
          Uri.parse(base).resolve('/__control/recover?fail=$fail'),
        );
        final response = await request.close();
        expect(response.statusCode, 200);
        await response.drain<void>();
      } finally {
        client.close(force: true);
      }
    }

    await setFailure(true);
    final controller = await start(tester, '/recover');
    await waitUntil(
      tester,
      () async => find.text('다시 시도').evaluate().isNotEmpty,
    );
    await setFailure(false);
    await tester.tap(find.text('다시 시도'));
    await tester.pump();
    await ready(tester, controller);
    await ping(tester, controller);
  });

  testWidgets('network failure produces a recoverable error', (tester) async {
    await start(tester, '/disconnect');
    await waitUntil(
      tester,
      () async => find.text('다시 시도').evaluate().isNotEmpty,
    );
    expect(find.textContaining('불러오지 못했어'), findsOneWidget);
  });

  testWidgets('a stalled server reaches the loading deadline', (tester) async {
    await start(tester, '/slow');
    await waitUntil(
      tester,
      () async => find.text('다시 시도').evaluate().isNotEmpty,
    );
    expect(find.textContaining('시간'), findsOneWidget);
  });
}
