import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:webview_flutter_platform_interface/webview_flutter_platform_interface.dart';
import 'package:luckieverse_tab_flutter/main.dart';

import 'fake_webview.dart';

void main() {
  late FakeWebViewPlatform platform;
  const foldChannel = MethodChannel('luckieverse/fold_state');
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(foldChannel, (_) async => null);
    platform = FakeWebViewPlatform();
    WebViewPlatform.instance = platform;
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(foldChannel, null);
  });
  Future<void> start(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(const MyApp(webAppUrl: 'https://example.com'));
    await tester.pump();
  }

  testWidgets(
    'missing URL shows a configuration error and preserves counter demo',
    (tester) async {
      await tester.pumpWidget(const MyApp(webAppUrl: ''));
      expect(find.text('웹 주소가 설정되지 않았어'), findsOneWidget);
      await tester.tap(find.text('카운터 데모'));
      await tester.pumpAndSettle();
      expect(find.text('0'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      expect(find.text('1'), findsOneWidget);
    },
  );
  testWidgets('registers channel before loading and hides progress on finish', (
    tester,
  ) async {
    await start(tester);
    expect(platform.controller.operations.take(2), ['channel', 'load']);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    platform.delegate.started?.call('https://example.com');
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
    expect(find.byType(LinearProgressIndicator), findsNothing);
  });
  testWidgets(
    'ignores subresource failure but shows main document error and retry',
    (tester) async {
      await start(tester);
      platform.delegate.failed?.call(
        WebResourceError(
          errorCode: -2,
          description: 'asset',
          isForMainFrame: false,
        ),
      );
      await tester.pump();
      expect(find.text('다시 시도'), findsNothing);
      platform.delegate.failed?.call(
        WebResourceError(
          errorCode: -2,
          description: 'network',
          isForMainFrame: true,
        ),
      );
      platform.delegate.finished?.call('https://example.com');
      await tester.pump();
      expect(find.text('다시 시도'), findsOneWidget);
      final previousController = platform.controller;
      await tester.tap(find.text('다시 시도'));
      await tester.pump();
      expect(identical(platform.controller, previousController), isFalse);
      expect(
        previousController.operations.where((item) => item == 'load'),
        hasLength(1),
      );
      expect(platform.controller.operations.take(2), ['channel', 'load']);
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('loading timeout cannot be erased by a late finish event', (
    tester,
  ) async {
    await start(tester);
    await tester.pump(const Duration(seconds: 31));
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
    expect(find.textContaining('시간'), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);
  });
  testWidgets('blocks other origins and non-web schemes', (tester) async {
    await start(tester);
    for (final url in [
      'https://evil.example',
      'tel:123',
      'javascript:alert(1)',
    ]) {
      expect(
        await platform.delegate.navigation?.call(
          NavigationRequest(url: url, isMainFrame: true),
        ),
        NavigationDecision.prevent,
      );
    }
    expect(
      await platform.delegate.navigation?.call(
        NavigationRequest(url: 'https://example.com/next', isMainFrame: true),
      ),
      NavigationDecision.navigate,
    );
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('does not deliver a pong after the document has changed', (
    tester,
  ) async {
    await start(tester);
    final current = Completer<String?>();
    platform.controller.delayedUrl = current;
    platform.controller.channel?.onMessageReceived(
      const JavaScriptMessage(message: '{"version":1,"id":"a","type":"ping"}'),
    );
    platform.delegate.started?.call('https://example.com/next');
    current.complete('https://example.com');
    await tester.pump();
    expect(
      platform.controller.operations.where(
        (item) => item.contains('luckieverse:response'),
      ),
      isEmpty,
    );
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'HTTP errors distinguish main document from assets and missing metadata',
    (tester) async {
      await start(tester);
      platform.delegate.httpFailed?.call(const HttpResponseError());
      platform.delegate.httpFailed?.call(
        HttpResponseError(
          request: WebResourceRequest(
            uri: Uri.parse('https://example.com/asset.png'),
          ),
          response: const WebResourceResponse(uri: null, statusCode: 404),
        ),
      );
      await tester.pump();
      expect(find.text('다시 시도'), findsNothing);
      platform.delegate.httpFailed?.call(
        HttpResponseError(
          request: WebResourceRequest(uri: Uri.parse('https://example.com')),
          response: const WebResourceResponse(uri: null, statusCode: 503),
        ),
      );
      await tester.pump();
      expect(find.text('다시 시도'), findsOneWidget);
    },
  );
  testWidgets('native ping replies only on the configured origin', (
    tester,
  ) async {
    await start(tester);
    const message = JavaScriptMessage(
      message: '{"version":1,"id":"a","type":"ping"}',
    );
    platform.controller.channel?.onMessageReceived(message);
    await tester.pump();
    expect(
      platform.controller.operations
          .where((item) => item.contains('luckieverse:response'))
          .length,
      1,
    );
    platform.controller.url = 'https://untrusted.example';
    platform.controller.channel?.onMessageReceived(message);
    await tester.pump();
    expect(
      platform.controller.operations
          .where((item) => item.contains('luckieverse:response'))
          .length,
      1,
    );
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'Android back uses web history and disposed callbacks are harmless',
    (tester) async {
      await start(tester);
      platform.controller.hasHistory = true;
      await tester.binding.handlePopRoute();
      await tester.pump();
      expect(platform.controller.operations, contains('back'));
      await tester.pumpWidget(const SizedBox());
      platform.delegate.started?.call('https://example.com/late');
      platform.delegate.failed?.call(
        WebResourceError(
          errorCode: -2,
          description: 'late',
          isForMainFrame: true,
        ),
      );
      await tester.pump(const Duration(seconds: 31));
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('configuration and error actions meet accessibility guidelines', (
    tester,
  ) async {
    await tester.pumpWidget(const MyApp(webAppUrl: ''));
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
    await start(tester);
    platform.delegate.failed?.call(
      WebResourceError(
        errorCode: -2,
        description: 'network',
        isForMainFrame: true,
      ),
    );
    await tester.pump();
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
  });
  testWidgets('URL-less iOS HTTP errors still expose retry', (tester) async {
    await start(tester);
    platform.delegate.httpFailed?.call(
      const HttpResponseError(
        response: WebResourceResponse(uri: null, statusCode: 503),
      ),
    );
    await tester.pump();
    expect(find.text('다시 시도'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'HTTP failure before page-start remains visible until explicit retry',
    (tester) async {
      await start(tester);
      platform.delegate.httpFailed?.call(
        HttpResponseError(
          request: WebResourceRequest(uri: Uri.parse('https://example.com')),
          response: const WebResourceResponse(uri: null, statusCode: 503),
        ),
      );
      platform.delegate.started?.call('https://example.com');
      platform.delegate.finished?.call('https://example.com');
      await tester.pump();
      expect(find.text('다시 시도'), findsOneWidget);
      await tester.tap(find.text('다시 시도'));
      await tester.pump();
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'iOS platform enum produces the lowercase bridge platform contract',
    (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      await start(tester);
      platform.controller.channel?.onMessageReceived(
        const JavaScriptMessage(
          message: '{"version":1,"id":"ios-test","type":"ping"}',
        ),
      );
      await tester.pump();
      expect(
        platform.controller.operations.where(
          (item) => item.contains('"platform":"ios"'),
        ),
        hasLength(1),
      );
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('late finish from a timed-out attempt cannot finish its retry', (
    tester,
  ) async {
    await start(tester);
    final previous = platform.delegate;
    await tester.pump(const Duration(seconds: 31));
    await tester.tap(find.text('다시 시도'));
    await tester.pump();
    previous.finished?.call('https://example.com');
    await tester.pump();
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    await tester.pump(const Duration(seconds: 31));
    expect(find.text('다시 시도'), findsOneWidget);
  });
  testWidgets('a previous currentUrl failure cannot fail a new navigation', (
    tester,
  ) async {
    await start(tester);
    final delayed = Completer<String?>();
    platform.controller.delayedUrl = delayed;
    platform.delegate.finished?.call('https://example.com');
    platform.delegate.started?.call('https://example.com/next');
    delayed.completeError(StateError('old navigation'));
    await tester.pump();
    expect(find.text('다시 시도'), findsNothing);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'Android back without web history exits through the system channel',
    (tester) async {
      final calls = <String>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          calls.add(call.method);
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      await start(tester);
      await tester.binding.handlePopRoute();
      await tester.pump();
      expect(
        calls.where((method) => method == 'SystemNavigator.pop'),
        hasLength(1),
      );
      expect(platform.controller.operations, isNot(contains('back')));
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('a late redirect cannot clear a timed-out attempt', (
    tester,
  ) async {
    await start(tester);
    await tester.pump(const Duration(seconds: 31));
    platform.delegate.started?.call('https://example.com/redirect');
    platform.delegate.finished?.call('https://example.com/redirect');
    await tester.pump();
    expect(find.text('다시 시도'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('explicit Android back recovers from a failed history entry', (
    tester,
  ) async {
    await start(tester);
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
    platform.controller.url = 'https://example.com/next';
    platform.delegate.started?.call('https://example.com/next');
    platform.delegate.failed?.call(
      WebResourceError(
        errorCode: -2,
        description: 'failed entry',
        isForMainFrame: true,
      ),
    );
    await tester.pump();
    expect(find.text('다시 시도'), findsOneWidget);
    platform.controller.hasHistory = true;
    await tester.binding.handlePopRoute();
    await tester.pump();
    platform.controller.url = 'https://example.com';
    platform.delegate.started?.call('https://example.com');
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
    expect(find.text('다시 시도'), findsNothing);
    expect(find.byKey(const Key('fake-webview')), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
  });
  testWidgets('normal fragment back stays ready without page callbacks', (
    tester,
  ) async {
    await start(tester);
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
    await platform.delegate.navigation?.call(
      NavigationRequest(url: 'https://example.com#section', isMainFrame: true),
    );
    platform.controller.url = 'https://example.com#section';
    platform.controller.hasHistory = true;
    await tester.binding.handlePopRoute();
    await tester.pump();
    platform.controller.url = 'https://example.com';
    await tester.pump(const Duration(seconds: 31));
    expect(platform.controller.operations, contains('back'));
    expect(find.text('다시 시도'), findsNothing);
    expect(find.byType(LinearProgressIndicator), findsNothing);
  });
  testWidgets('HTTP failure before start also handles an in-page navigation', (
    tester,
  ) async {
    await start(tester);
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
    expect(
      await platform.delegate.navigation?.call(
        NavigationRequest(
          url: 'https://example.com/failure',
          isMainFrame: true,
        ),
      ),
      NavigationDecision.navigate,
    );
    platform.delegate.httpFailed?.call(
      HttpResponseError(
        request: WebResourceRequest(
          uri: Uri.parse('https://example.com/failure'),
        ),
        response: const WebResourceResponse(uri: null, statusCode: 503),
      ),
    );
    platform.delegate.started?.call('https://example.com/failure');
    platform.controller.url = 'https://example.com/failure';
    platform.delegate.finished?.call('https://example.com/failure');
    await tester.pump();
    expect(find.text('다시 시도'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
