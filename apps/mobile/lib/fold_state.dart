class FoldState {
  const FoldState._(this.platform, this.deviceType, this.posture);
  const FoldState.unknown(this.platform)
    : deviceType = 'unknown',
      posture = 'unknown';

  final String platform;
  final String deviceType;
  final String posture;

  factory FoldState.fromNative(Object? value, String platform) {
    if (value is! Map || value['platform'] != platform) {
      return FoldState.unknown(platform);
    }
    final device = value['deviceType'];
    final posture = value['posture'];
    final expectedDevice = platform == 'ios' ? 'ios-duo' : 'android-fold';
    final postures = {
      'unknown',
      'half-opened',
      'unfolded',
      if (platform == 'ios') 'folded',
    };
    if (device is! String ||
        posture is! String ||
        (device != expectedDevice && device != 'unknown') ||
        !postures.contains(posture) ||
        (device == 'unknown' && posture != 'unknown')) {
      return FoldState.unknown(platform);
    }
    return FoldState._(platform, device, posture);
  }

  Map<String, String> toJson() => {
    'platform': platform,
    'deviceType': deviceType,
    'posture': posture,
  };
}
