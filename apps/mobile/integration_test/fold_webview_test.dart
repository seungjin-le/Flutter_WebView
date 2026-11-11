import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:luckieverse_tab_flutter/main.dart';
import 'package:luckieverse_tab_flutter/web_app_screen.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const base = String.fromEnvironment('WEB_APP_URL');
  const expectedDevice = String.fromEnvironment('FOLD_DEVICE');
  const exercisePosture = bool.fromEnvironment('FOLD_TRANSITIONS');

  Future<void> waitUntil(
    WidgetTester tester,
    Future<bool> Function() condition,
  ) async {
    final end = DateTime.now().add(const Duration(seconds: 90));
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 200));
      if (await condition()) return;
    }
    fail('Fold bridge condition timed out');
  }

  Future<bool> jsBool(WebViewController controller, String expression) async {
    final value = await controller.runJavaScriptReturningResult(expression);
    return value == true || value == 'true';
  }

  testWidgets(
    'native device snapshot reaches web getter, subscription, SPA and reload',
    (tester) async {
      expect(base, isNotEmpty);
      expect(['ios-duo', 'android-fold', 'unknown'], contains(expectedDevice));
      await tester.pumpWidget(
        MyApp(webAppUrl: '$base/e2e/fixtures/native-fold.html'),
      );
      WebViewController? active;
      await waitUntil(tester, () async {
        active = tester
            .state<WebAppScreenState>(find.byType(WebAppScreen))
            .controller;
        return active != null;
      });
      final controller = active;
      if (controller == null) fail('Missing WebView controller');
      final expected = jsonEncode(expectedDevice);
      await waitUntil(
        tester,
        () => jsBool(
          controller,
          'window.foldStates?.at(-1)?.deviceType === $expected',
        ),
      );
      await controller.runJavaScript('window.readFold()');
      await waitUntil(
        tester,
        () => jsBool(controller, 'window.foldQuery?.deviceType === $expected'),
      );
      expect(
        await jsBool(controller, 'window.foldErrors.length === 0'),
        isTrue,
      );
      await controller.runJavaScript('history.pushState({}, "", "/fold-spa")');
      await controller.runJavaScript(
        'window.foldQuery = null; window.readFold()',
      );
      await waitUntil(
        tester,
        () => jsBool(controller, 'window.foldQuery?.deviceType === $expected'),
      );

      if (exercisePosture) {
        // The host test runner changes the simulator/emulator hinge while waiting.
        debugPrint('FOLD_READY_FOR_HALF_OPEN');
        await waitUntil(
          tester,
          () => jsBool(
            controller,
            'window.foldStates?.at(-1)?.posture === "half-opened"',
          ),
        );
        debugPrint('FOLD_READY_FOR_UNFOLDED');
        await waitUntil(
          tester,
          () => jsBool(
            controller,
            'window.foldStates?.at(-1)?.posture === "unfolded"',
          ),
        );
      }

      await controller.runJavaScript(
        'window.stopFold(); window.foldCount = window.foldStates.length',
      );
      await tester.pump(const Duration(milliseconds: 500));
      expect(
        await jsBool(
          controller,
          'window.foldStates.length === window.foldCount',
        ),
        isTrue,
      );
      await controller.loadRequest(
        Uri.parse('$base/e2e/fixtures/native-fold.html'),
      );
      await waitUntil(
        tester,
        () => jsBool(
          controller,
          'window.foldStates?.at(-1)?.deviceType === $expected && !window.foldCount',
        ),
      );
      expect(
        await jsBool(controller, 'window.foldErrors.length === 0'),
        isTrue,
      );
      debugPrint('FOLD_NATIVE_VERIFIED $expected');
      await tester.pumpWidget(const SizedBox());
    },
  );
}
