import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final dir in [
    'values',
    'values-night',
    'values-v31',
    'values-night-v31',
  ]) {
    test('$dir hides the status bar on the native launch screen', () {
      final styles = File('android/app/src/main/res/$dir/styles.xml')
          .readAsStringSync();
      final launchTheme = RegExp(
        r'<style name="LaunchTheme"[^>]*>(.*?)</style>',
        dotAll: true,
      ).firstMatch(styles)?.group(1);
      expect(
        launchTheme,
        contains('<item name="android:windowFullscreen">true</item>'),
      );
    });
  }
}
