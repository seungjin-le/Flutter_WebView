import 'dart:convert';

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
