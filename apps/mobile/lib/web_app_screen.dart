import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'fold_state.dart';
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
  late FoldState _foldState;
  StreamSubscription<Object?>? _foldEvents;
  String? _foldSubscriptionId;
  String? _foldRequestedId;
  int _foldCommandVersion = 0;

  @override
  void initState() {
    super.initState();
    _base = parseWebAppUrl(widget.webAppUrl, allowLocalHttp: kDebugMode);
    final platform = defaultTargetPlatform.name.toLowerCase();
    _foldState = FoldState.unknown(platform);
    if (_base != null) {
      if (platform == 'ios' || platform == 'android') {
        _foldEvents = const EventChannel('luckieverse/fold_state')
            .receiveBroadcastStream()
            .listen(
              (value) =>
                  _updateFoldState(FoldState.fromNative(value, platform)),
              onError: (Object _) =>
                  _updateFoldState(FoldState.unknown(platform)),
              onDone: () => _updateFoldState(FoldState.unknown(platform)),
            );
      }
      unawaited(_initialize());
    }
  }

  bool _isCurrent(WebViewController? controller) =>
      mounted && identical(controller, _controller);

  Future<void> _initialize() async {
    _timer?.cancel();
    _generation++;
    _foldSubscriptionId = null;
    _foldRequestedId = null;
    setState(() {
      _controller = null;
      _documentUrl = null;
      _configured = false;
      _error = null;
      _loading = true;
    });
    WebViewController? initializingController;
    try {
      final controller = WebViewController();
      initializingController = controller;
      _controller = controller;
      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      if (!_isCurrent(controller)) return;
      await controller.setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) => _started(controller, url),
          onPageFinished: (url) => unawaited(_finished(controller, url)),
          onNavigationRequest: (request) {
            final base = _base;
            if (!_isCurrent(controller) ||
                base == null ||
                !isAllowedNavigation(base, request.url)) {
              return NavigationDecision.prevent;
            }
            // Record a new document before Android can report its HTTP error.
            // Fragment-only navigation does not start a document load.
            final target = Uri.tryParse(request.url);
            final current = Uri.tryParse(_documentUrl ?? '');
            if (request.isMainFrame &&
                target != null &&
                current?.removeFragment() != target.removeFragment()) {
              _started(controller, request.url);
            }
            return NavigationDecision.navigate;
          },
          onWebResourceError: (error) {
            if (_isCurrent(controller) &&
                error.isForMainFrame != false &&
                (error.url == null || error.url == _documentUrl)) {
              _fail('웹 화면을 불러오지 못했어. 연결을 확인하고 다시 시도해 줘.');
            }
          },
          onHttpError: (error) {
            if (!_isCurrent(controller)) return;
            final requestUrl = error.request?.uri.toString();
            // WKWebView omits request metadata for navigation HTTP errors.
            final unidentifiedLoadingError =
                requestUrl == null &&
                _loading &&
                (error.response?.statusCode ?? 0) >= 400;
            if ((requestUrl != null && requestUrl == _documentUrl) ||
                unidentifiedLoadingError) {
              _fail('서버에서 화면을 불러오지 못했어. 다시 시도해 줘.');
            }
          },
        ),
      );
      if (!_isCurrent(controller)) return;
      await controller.addJavaScriptChannel(
        'LuckieverseBridge',
        onMessageReceived: (message) =>
            unawaited(_receive(controller, message.message)),
      );
      if (!_isCurrent(controller)) return;
      _configured = true;
      await _load(controller);
    } catch (_) {
      if (_isCurrent(initializingController)) {
        _fail('웹 화면을 시작하지 못했어. 다시 시도해 줘.');
      }
    }
  }

  void _started(WebViewController controller, String url) {
    // Android can report an HTTP failure before its page-start callback.
    if (!_isCurrent(controller) || _error != null) {
      return;
    }
    final generation = ++_generation;
    _foldSubscriptionId = null;
    _foldRequestedId = null;
    _timer?.cancel();
    setState(() {
      _documentUrl = url;
      _loading = true;
      _error = null;
    });
    _timer = Timer(const Duration(seconds: 30), () {
      if (_isCurrent(controller) && generation == _generation) {
        _fail('화면을 불러오는 시간이 초과됐어. 다시 시도해 줘.');
      }
    });
  }

  Future<void> _finished(WebViewController controller, String url) async {
    if (!_isCurrent(controller) || _error != null || url != _documentUrl) {
      return;
    }
    final generation = _generation;
    try {
      final current = await controller.currentUrl();
      if (!_isCurrent(controller) ||
          generation != _generation ||
          _error != null ||
          current != url) {
        return;
      }
      _timer?.cancel();
      setState(() => _loading = false);
    } catch (_) {
      if (_isCurrent(controller) && generation == _generation) {
        _fail('웹 화면 상태를 확인하지 못했어. 다시 시도해 줘.');
      }
    }
  }

  void _fail(String message) {
    if (!mounted) return;
    _timer?.cancel();
    _generation++;
    _foldSubscriptionId = null;
    _foldRequestedId = null;
    setState(() {
      _error = message;
      _loading = false;
    });
  }

  Future<void> _load(WebViewController controller) async {
    final base = _base;
    if (!_isCurrent(controller) || base == null) return;
    _started(controller, base.toString());
    final generation = _generation;
    try {
      await controller.loadRequest(base);
    } catch (_) {
      if (_isCurrent(controller) && generation == _generation) {
        _fail('웹 화면을 불러오지 못했어. 다시 시도해 줘.');
      }
    }
  }

  void _updateFoldState(FoldState state) {
    if (!mounted) return;
    _foldState = state;
    final controller = _controller;
    final id = _foldSubscriptionId;
    if (controller != null && id != null) {
      unawaited(_sendFoldUpdate(controller, id));
    }
  }

  Future<void> _sendFoldUpdate(WebViewController controller, String id) async {
    final base = _base;
    final generation = _generation;
    if (!_isCurrent(controller) || base == null || _error != null) return;
    try {
      final current = await controller.currentUrl();
      if (!_isCurrent(controller) ||
          generation != _generation ||
          _foldSubscriptionId != id ||
          _error != null ||
          current == null ||
          !isAllowedNavigation(base, current)) {
        return;
      }
      // The subscription ID belongs to this document, even after SPA navigation.
      await controller.runJavaScript(foldStateScript(id, _foldState));
    } catch (_) {
      // Optional device metadata must not replace a working page with an error.
    }
  }

  Future<void> _receive(WebViewController controller, String message) async {
    final base = _base;
    final platform = defaultTargetPlatform.name.toLowerCase();
    final pongScript = pongScriptFor(message, platform);
    final foldRequest = foldRequestFor(message);
    if (!_isCurrent(controller) ||
        base == null ||
        _error != null ||
        (pongScript == null && foldRequest == null) ||
        (platform != 'ios' && platform != 'android')) {
      return;
    }
    final generation = _generation;
    final subscribing = foldRequest?.type == 'subscribeFoldState';
    if (foldRequest != null) {
      if (subscribing) {
        _foldRequestedId = foldRequest.id;
        _foldCommandVersion++;
      } else if (foldRequest.type == 'unsubscribeFoldState' &&
          _foldRequestedId == foldRequest.id) {
        _foldRequestedId = null;
        _foldCommandVersion++;
      }
    }
    final foldCommand = _foldCommandVersion;
    try {
      final current = await controller.currentUrl();
      if (!_isCurrent(controller) ||
          generation != _generation ||
          (subscribing && foldCommand != _foldCommandVersion) ||
          _error != null ||
          current == null ||
          !isAllowedNavigation(base, current)) {
        return;
      }
      if (pongScript != null) {
        await controller.runJavaScript(pongScript);
      } else if (foldRequest != null) {
        if (foldRequest.type == 'unsubscribeFoldState') {
          if (_foldSubscriptionId == foldRequest.id) _foldSubscriptionId = null;
          return;
        }
        if (foldRequest.type == 'subscribeFoldState') {
          _foldSubscriptionId = foldRequest.id;
        }
        await controller.runJavaScript(
          foldStateScript(foldRequest.id, _foldState),
        );
      }
    } catch (_) {
      if (pongScript != null &&
          _isCurrent(controller) &&
          generation == _generation) {
        _fail('앱 연결에 실패했어. 화면을 다시 불러와 줘.');
      }
    }
  }

  Future<void> _back() async {
    final controller = _controller;
    var generation = _generation;
    try {
      final hasHistory = controller != null && await controller.canGoBack();
      if (!_isCurrent(controller) || generation != _generation) return;
      if (hasHistory) {
        if (_error != null) {
          // Explicit back is a new attempt; late automatic redirects are not.
          generation = ++_generation;
          _timer?.cancel();
          setState(() {
            _error = null;
            _documentUrl = null;
            _loading = true;
          });
          _timer = Timer(const Duration(seconds: 30), () {
            if (_isCurrent(controller) && generation == _generation) {
              _fail('화면을 불러오는 시간이 초과됐어. 다시 시도해 줘.');
            }
          });
        }
        await controller.goBack();
      } else if (defaultTargetPlatform == TargetPlatform.android) {
        await SystemNavigator.pop();
      }
    } catch (_) {
      if (_isCurrent(controller) && generation == _generation) {
        _fail('이전 화면으로 이동하지 못했어. 다시 시도해 줘.');
      }
    }
  }

  @override
  void dispose() {
    _generation++;
    _foldSubscriptionId = null;
    _foldRequestedId = null;
    _timer?.cancel();
    unawaited(_foldEvents?.cancel());
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
                            unawaited(_initialize());
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
                      Expanded(
                        child: WebViewWidget(
                          key: ObjectKey(controller),
                          controller: controller,
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}
