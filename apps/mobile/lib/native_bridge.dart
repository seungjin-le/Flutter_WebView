import 'dart:convert';

import 'fold_state.dart';

String? pongScriptFor(String message, String platform) {
  if (message.length > 4096 || (platform != 'android' && platform != 'ios')) {
    return null;
  }
  try {
    final request = jsonDecode(message);
    if (request is! Map<String, dynamic> ||
        request['version'] != 1 ||
        request['type'] != 'ping') {
      return null;
    }
    final id = request['id'];
    if (id is! String || id.trim().isEmpty || id.length > 128) return null;
    final reply = jsonEncode({
      'version': 1,
      'id': id,
      'type': 'pong',
      'platform': platform,
    });
    return 'window.dispatchEvent(new CustomEvent("luckieverse:response", {detail: $reply}));';
  } on FormatException {
    return null;
  }
}

({String id, String type})? foldRequestFor(String message) {
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
        !{
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

String foldStateScript(String id, FoldState state) {
  final reply = jsonEncode({
    'version': 1,
    'id': id,
    'type': 'foldState',
    'state': state.toJson(),
  });
  return 'window.dispatchEvent(new CustomEvent("luckieverse:response", {detail: $reply}));';
}
