import 'dart:convert';

import 'fold_state.dart';

({String id, String type})? parseBridgeRequest(String message) {
  if (message.length > 4096) return null;
  try {
    final request = jsonDecode(message);
    if (request is! Map<String, dynamic> || request['version'] != 1) {
      return null;
    }
    final id = request['id'];
    final type = request['type'];
    if (id is! String ||
        id.trim().isEmpty ||
        id.length > 128 ||
        type is! String ||
        !const {
          'ping',
          'getFoldState',
          'subscribeFoldState',
          'unsubscribeFoldState',
        }.contains(type)) {
      return null;
    }
    return (id: id, type: type);
  } on FormatException {
    return null;
  }
}

String pongScript(String id, String platform) => _responseScript({
  'version': 1,
  'id': id,
  'type': 'pong',
  'platform': platform,
});

String foldStateScript(String id, FoldState state) => _responseScript({
  'version': 1,
  'id': id,
  'type': 'foldState',
  'state': state.toJson(),
});

String _responseScript(Map<String, Object> response) {
  final reply = jsonEncode(response);
  return 'window.dispatchEvent(new CustomEvent("luckieverse:response", {detail: $reply}));';
}
