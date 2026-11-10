Uri? parseWebAppUrl(String value, {bool allowLocalHttp = false}) {
  try {
    final uri = Uri.tryParse(value);
    if (uri == null ||
        !uri.hasAuthority ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.port < 1 ||
        uri.port > 65535) {
      return null;
    }
    if (uri.scheme == 'https') return uri;
    if (allowLocalHttp && uri.scheme == 'http' && _isLocalHost(uri.host)) {
      return uri;
    }
  } on FormatException {
    return null;
  }
  return null;
}

bool _isLocalHost(String host) {
  if (host == 'localhost' || host == '::1') return true;
  final parts = host.split('.').map(int.tryParse).toList();
  if (parts.length != 4 ||
      parts.any((part) => part == null || part < 0 || part > 255)) {
    return false;
  }
  return parts[0] == 127 ||
      parts[0] == 10 ||
      (parts[0] == 192 && parts[1] == 168) ||
      (parts[0] == 172 && (parts[1] ?? 0) >= 16 && (parts[1] ?? 0) <= 31);
}

bool isAllowedNavigation(Uri base, String target) {
  final uri = parseWebAppUrl(target, allowLocalHttp: base.scheme == 'http');
  return uri != null &&
      uri.scheme == base.scheme &&
      uri.host == base.host &&
      uri.port == base.port;
}
