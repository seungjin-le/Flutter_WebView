import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'native_bridge.dart';
import 'web_policy.dart';

class WebAppScreen extends StatefulWidget {
  const WebAppScreen({super.key, required this.webAppUrl});
  final String webAppUrl;
  @override
  State<WebAppScreen> createState() => WebAppScreenState();
}

class WebAppScreenState extends State<WebAppScreen> {
  WebViewController? _controller;
  WebViewController? get controller => _controller;
  Uri? _base;
  Timer? _timer;
  String? _error;
  String? _documentUrl;
  bool _loading = true;
  bool _configured = false;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _base = parseWebAppUrl(widget.webAppUrl, allowLocalHttp: kDebugMode);
    if (_base != null) unawaited(_initialize());
  }

  Future<void> _initialize() async {
    try {
      final controller = WebViewController();
      _controller = controller;
      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      if (!mounted) return;
      await controller.setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: _started,
          onPageFinished: (url) => unawaited(_finished(url)),
          onNavigationRequest: (request) {
            final base = _base;
            return base != null && isAllowedNavigation(base, request.url)
                ? NavigationDecision.navigate
                : NavigationDecision.prevent;
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame != false &&
                (error.url == null || error.url == _documentUrl)) {
              _fail('웹 화면을 불러오지 못했어. 연결을 확인하고 다시 시도해 줘.');
            }
          },
          onHttpError: (error) {
            final requestUrl = error.request?.uri.toString();
            // WKWebView omits request metadata for navigation HTTP errors.
            final unidentifiedLoadingError =
                requestUrl == null &&
                _loading &&
                (error.response?.statusCode ?? 0) >= 400;
            if (requestUrl == _documentUrl || unidentifiedLoadingError) {
              _fail('서버에서 화면을 불러오지 못했어. 다시 시도해 줘.');
            }
          },
        ),
      );
      if (!mounted) return;
      await controller.addJavaScriptChannel(
        'LuckieverseBridge',
        onMessageReceived: (message) => unawaited(_receive(message.message)),
      );
      if (!mounted) return;
      _configured = true;
      await _load();
    } catch (_) {
      _fail('웹 화면을 시작하지 못했어. 다시 시도해 줘.');
    }
  }

  void _started(String url) {
    // Android can report an HTTP failure before its page-start callback.
    if (!mounted || (_error != null && url == _documentUrl)) return;
    _generation++;
    _timer?.cancel();
    setState(() {
      _documentUrl = url;
      _loading = true;
      _error = null;
    });
    _timer = Timer(const Duration(seconds: 30), () {
      _fail('화면을 불러오는 시간이 초과됐어. 다시 시도해 줘.');
    });
  }

  Future<void> _finished(String url) async {
    if (!mounted || _error != null || url != _documentUrl) return;
    final generation = _generation;
    try {
      final current = await _controller?.currentUrl();
      if (!mounted ||
          generation != _generation ||
          _error != null ||
          current != url) {
        return;
      }
      _timer?.cancel();
      setState(() => _loading = false);
    } catch (_) {
      _fail('웹 화면 상태를 확인하지 못했어. 다시 시도해 줘.');
    }
  }

  void _fail(String message) {
    if (!mounted) return;
    _timer?.cancel();
    _generation++;
    setState(() {
      _error = message;
      _loading = false;
    });
  }

  Future<void> _load() async {
    final controller = _controller;
    final base = _base;
    if (!mounted || controller == null || base == null) return;
    _error = null;
    _started(base.toString());
    try {
      await controller.loadRequest(base);
    } catch (_) {
      _fail('웹 화면을 불러오지 못했어. 다시 시도해 줘.');
    }
  }

  Future<void> _receive(String message) async {
    final controller = _controller;
    final base = _base;
    final script = pongScriptFor(message, defaultTargetPlatform.name);
    if (!mounted ||
        controller == null ||
        base == null ||
        script == null ||
        _error != null) {
      return;
    }
    final generation = _generation;
    try {
      final current = await controller.currentUrl();
      if (!mounted ||
          generation != _generation ||
          current == null ||
          !isAllowedNavigation(base, current)) {
        return;
      }
      await controller.runJavaScript(script);
    } catch (_) {
      if (mounted && generation == _generation) {
        _fail('앱 연결에 실패했어. 화면을 다시 불러와 줘.');
      }
    }
  }

  Future<void> _back() async {
    final controller = _controller;
    try {
      if (controller != null && await controller.canGoBack()) {
        if (mounted) await controller.goBack();
      } else if (mounted && defaultTargetPlatform == TargetPlatform.android) {
        await SystemNavigator.pop();
      }
    } catch (_) {
      _fail('이전 화면으로 이동하지 못했어. 다시 시도해 줘.');
    }
  }

  @override
  void dispose() {
    _generation++;
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final error = _error;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) unawaited(_back());
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Luckieverse'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pushNamed('/counter'),
              child: const Text('카운터 데모'),
            ),
          ],
        ),
        body: SafeArea(
          child: _base == null
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('웹 주소가 설정되지 않았어'),
                        SizedBox(height: 12),
                        Text(
                          '올바른 WEB_APP_URL로 앱을 실행해 줘.',
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                )
              : error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(error, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () {
                            _configured
                                ? unawaited(_load())
                                : unawaited(_initialize());
                          },
                          child: const Text('다시 시도'),
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    if (_loading) const LinearProgressIndicator(),
                    if (controller != null && _configured)
                      Expanded(child: WebViewWidget(controller: controller)),
                  ],
                ),
        ),
      ),
    );
  }
}
