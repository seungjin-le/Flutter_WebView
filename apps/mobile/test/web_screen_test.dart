import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:webview_flutter_platform_interface/webview_flutter_platform_interface.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';
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

  test('defaults to the deployed web app when WEB_APP_URL is not set', () {
    expect(const MyApp().webAppUrl, 'https://flutter-web-view.vercel.app/');
  });

  testWidgets(
    'missing URL shows a configuration error and preserves counter demo',
    (tester) async {
      await tester.pumpWidget(const MyApp(webAppUrl: ''));
      expect(find.text('웹 주소가 설정되지 않았어'), findsOneWidget);
      expect(find.byType(Image), findsNothing);
      await tester.tap(find.text('카운터 데모'));
      await tester.pumpAndSettle();
      expect(find.text('0'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      expect(find.text('1'), findsOneWidget);
    },
  );

  const splashLabel = 'Luckieverse 불러오는 중';
  Future<void> finishLoad(WidgetTester tester) async {
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
  }

  testWidgets('splash with logo covers the UI until the first page finishes', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await start(tester);
    expect(find.bySemanticsLabel(splashLabel), findsOneWidget);
    expect(find.byType(Image), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    await tester.tap(find.text('카운터 데모'), warnIfMissed: false);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('0'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    semantics.dispose();
  });
  testWidgets('splash is removed after the first page finishes', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await start(tester);
    await finishLoad(tester);
    expect(find.bySemanticsLabel(splashLabel), findsNothing);
    expect(find.byType(Image), findsNothing);
    expect(find.byKey(const Key('fake-webview')), findsOneWidget);
    await tester.tap(find.text('카운터 데모'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('0'), findsOneWidget);
    semantics.dispose();
  });
  final failures = <String, void Function()>{
    'main frame error': () => platform.delegate.failed?.call(
      WebResourceError(
        errorCode: -2,
        description: 'network',
        isForMainFrame: true,
      ),
    ),
    'HTTP error': () => platform.delegate.httpFailed?.call(
      HttpResponseError(
        request: WebResourceRequest(uri: Uri.parse('https://example.com')),
        response: const WebResourceResponse(uri: null, statusCode: 503),
      ),
    ),
  };
  failures.forEach((name, fail) {
    testWidgets('splash gives way to the error screen on $name', (
      tester,
    ) async {
      await start(tester);
      fail();
      await tester.pump();
      expect(find.byType(Image), findsNothing);
      expect(find.text('다시 시도'), findsOneWidget);
    });
  });
  testWidgets('splash gives way to the error screen on timeout', (
    tester,
  ) async {
    await start(tester);
    await tester.pump(const Duration(seconds: 31));
    expect(find.byType(Image), findsNothing);
    expect(find.textContaining('시간'), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);
  });
  testWidgets('splash never returns for later navigations or retries', (
    tester,
  ) async {
    await start(tester);
    await finishLoad(tester);
    platform.delegate.started?.call('https://example.com/next');
    await tester.pump();
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    await tester.pump(const Duration(seconds: 31));
    await tester.tap(find.text('다시 시도'));
    await tester.pump();
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
  for (final (target, brightness, color) in [
    (TargetPlatform.android, Brightness.dark, Colors.black),
    (TargetPlatform.android, Brightness.light, Colors.white),
    (TargetPlatform.iOS, Brightness.dark, Colors.white),
  ]) {
    testWidgets('splash background on $target in $brightness is $color', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = target;
      tester.platformDispatcher.platformBrightnessTestValue = brightness;
      addTearDown(() {
        debugDefaultTargetPlatformOverride = null;
        tester.platformDispatcher.clearPlatformBrightnessTestValue();
      });
      await start(tester);
      final box = tester
          .widgetList<ColoredBox>(
            find.ancestor(
              of: find.byType(Image),
              matching: find.byType(ColoredBox),
            ),
          )
          .first;
      expect(box.color, color);
      await tester.pumpWidget(const SizedBox());
    });
  }

  testWidgets('enables native history gestures on each WebKit controller', (
    tester,
  ) async {
    final webKit = _FakeWebKitPlatform();
    WebViewPlatform.instance = webKit;
    await start(tester);
    final first = webKit.controller;
    expect(
      first.operations,
      containsAllInOrder(['historyGestures:true', 'load']),
    );

    webKit.delegate.failed?.call(
      WebResourceError(
        errorCode: -2,
        description: 'network',
        isForMainFrame: true,
      ),
    );
    await tester.pump();
    await tester.tap(find.text('다시 시도'));
    await tester.pump();
    expect(webKit.controller, isNot(same(first)));
    expect(
      webKit.controller.operations,
      containsAllInOrder(['historyGestures:true', 'load']),
    );
    await tester.pumpWidget(const SizedBox());
  });

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

class _FakeWebKitPlatform extends FakeWebViewPlatform {
  @override
  PlatformWebViewController createPlatformWebViewController(
    PlatformWebViewControllerCreationParams params,
  ) => controller = _FakeWebKitController(params);
}

class _FakeWebKitController extends FakeController
    implements WebKitWebViewController {
  _FakeWebKitController(super.params);

  @override
  Future<void> setAllowsBackForwardNavigationGestures(bool enabled) async {
    operations.add('historyGestures:$enabled');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
