import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:luckieverse_tab_flutter/main.dart';
import 'package:webview_flutter_platform_interface/webview_flutter_platform_interface.dart';

import 'fake_webview.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('luckieverse/fold_state');
  const codec = StandardMethodCodec();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  late FakeWebViewPlatform platform;
  late List<String> calls;

  setUp(() {
    platform = FakeWebViewPlatform();
    WebViewPlatform.instance = platform;
    calls = [];
    messenger.setMockMethodCallHandler(channel, (call) async {
      calls.add(call.method);
      return null;
    });
  });
  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  Future<void> start(WidgetTester tester) async {
    await tester.pumpWidget(const MyApp(webAppUrl: 'https://example.com'));
    await tester.pump();
    platform.delegate.finished?.call('https://example.com');
    await tester.pump();
  }

  void request(String type, [String id = 'doc:1']) {
    platform.controller.channel?.onMessageReceived(
      JavaScriptMessage(
        message: jsonEncode({'version': 1, 'id': id, 'type': type}),
      ),
    );
  }

  Future<void> emit(
    WidgetTester tester,
    Object? value, {
    bool error = false,
  }) async {
    await messenger.handlePlatformMessage(
      channel.name,
      error
          ? codec.encodeErrorEnvelope(code: 'unavailable')
          : codec.encodeSuccessEnvelope(value),
      (_) {},
    );
    await tester.pump();
  }

  List<String> replies() => platform.controller.operations
      .where((op) => op.contains('"type":"foldState"'))
      .toList();
  const unfolded = {
    'platform': 'android',
    'deviceType': 'android-fold',
    'posture': 'unfolded',
  };

  testWidgets(
    'initial query, live subscription, SPA update and matching unsubscribe',
    (tester) async {
      await start(tester);
      expect(calls, ['listen']);
      request('getFoldState');
      await tester.pump();
      expect(replies().single, contains('"deviceType":"unknown"'));
      request('subscribeFoldState');
      await tester.pump();
      await emit(tester, unfolded);
      expect(replies().last, contains('"posture":"unfolded"'));
      platform.controller.url = 'https://example.com/spa-route';
      await emit(tester, {...unfolded, 'posture': 'half-opened'});
      expect(replies().last, contains('"posture":"half-opened"'));
      request('unsubscribeFoldState', 'old:1');
      await tester.pump();
      final before = replies().length;
      await emit(tester, unfolded);
      expect(replies(), hasLength(before + 1));
      request('unsubscribeFoldState');
      await tester.pump();
      await emit(tester, {...unfolded, 'posture': 'half-opened'});
      expect(replies(), hasLength(before + 1));
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(calls, ['listen', 'cancel']);
    },
  );

  testWidgets(
    'replaces subscriptions and clears on new document, errors and retry',
    (tester) async {
      await start(tester);
      request('subscribeFoldState', 'old');
      await tester.pump();
      request('subscribeFoldState', 'new');
      await tester.pump();
      await emit(tester, unfolded);
      expect(replies().last, contains('"id":"new"'));
      final before = replies().length;
      platform.delegate.started?.call('https://example.com/new');
      await emit(tester, {...unfolded, 'posture': 'half-opened'});
      expect(replies(), hasLength(before));
      request('subscribeFoldState', 'next');
      await tester.pump();
      expect(replies().last, contains('"posture":"half-opened"'));
      platform.delegate.failed?.call(
        WebResourceError(
          errorCode: -2,
          description: 'offline',
          isForMainFrame: true,
        ),
      );
      await emit(tester, unfolded);
      expect(replies(), hasLength(before + 1));
      await tester.tap(find.text('다시 시도'));
      await tester.pump();
      await emit(tester, unfolded);
      expect(replies(), isEmpty);
      request('subscribeFoldState', 'retry');
      await tester.pump();
      expect(replies().single, contains('"id":"retry"'));
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'unknown/error native events do not fail the page and foreign origins receive nothing',
    (tester) async {
      await start(tester);
      request('subscribeFoldState');
      await tester.pump();
      await emit(tester, unfolded);
      await emit(tester, null);
      expect(replies().last, contains('"deviceType":"unknown"'));
      await emit(tester, unfolded);
      await emit(tester, null, error: true);
      expect(replies().last, contains('"posture":"unknown"'));
      expect(find.text('다시 시도'), findsNothing);
      platform.controller.url = 'https://foreign.example';
      final before = replies().length;
      await emit(tester, unfolded);
      request('getFoldState');
      await tester.pump();
      expect(replies(), hasLength(before));
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'in-flight fold query/update cannot escape its controller or generation',
    (tester) async {
      await start(tester);
      request('subscribeFoldState');
      await tester.pump();
      final before = replies().length;
      final delayed = Completer<String?>();
      platform.controller.delayedUrl = delayed;
      request('getFoldState', 'pending');
      await emit(tester, unfolded);
      platform.delegate.started?.call('https://example.com/new');
      delayed.complete('https://example.com');
      await tester.pump();
      expect(replies(), hasLength(before));
      platform.controller.delayedUrl = null;
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'late subscription checks cannot resurrect an unsubscribed listener',
    (tester) async {
      await start(tester);
      final delayed = Completer<String?>();
      platform.controller.delayedUrl = delayed;
      request('subscribeFoldState');
      platform.controller.delayedUrl = null;
      request('unsubscribeFoldState');
      await tester.pump();
      delayed.complete('https://example.com');
      await tester.pump();
      await emit(tester, unfolded);
      expect(replies(), isEmpty);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('unrelated unsubscribe preserves a pending new subscription', (
    tester,
  ) async {
    await start(tester);
    request('subscribeFoldState', 'old');
    await tester.pump();
    final delayed = Completer<String?>();
    platform.controller.delayedUrl = delayed;
    request('subscribeFoldState', 'new');
    platform.controller.delayedUrl = null;
    request('unsubscribeFoldState', 'old');
    await tester.pump();
    delayed.complete('https://example.com');
    await tester.pump();
    expect(replies().last, contains('"id":"new"'));
    final before = replies().length;
    await emit(tester, unfolded);
    expect(replies(), hasLength(before + 1));
    expect(replies().last, contains('"id":"new"'));
    await tester.pumpWidget(const SizedBox());
  });
}
