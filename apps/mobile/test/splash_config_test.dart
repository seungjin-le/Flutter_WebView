import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

const _res = 'android/app/src/main/res';
const _launchImages = 'ios/Runner/Assets.xcassets/LaunchImage.imageset';

(int, int) _pngSize(String path) {
  final bytes = File(path).readAsBytesSync();
  final data = ByteData.sublistView(bytes);
  return (data.getUint32(16), data.getUint32(20));
}

void main() {
  group('Android 스플래시', () {
    for (final dir in ['drawable', 'drawable-v21']) {
      test('$dir/launch_background.xml은 ic_launcher를 중앙에 배치한다', () {
        final xml = File('$_res/$dir/launch_background.xml').readAsStringSync();
        expect(xml, contains('<bitmap'));
        expect(xml, contains('android:gravity="center"'));
        expect(xml, contains('android:src="@mipmap/ic_launcher"'));
      });
    }

    for (final dir in ['values-v31', 'values-night-v31']) {
      test('$dir LaunchTheme이 Android 12 스플래시 속성을 정의한다', () {
        final xml = File('$_res/$dir/styles.xml').readAsStringSync();
        expect(xml, contains('name="LaunchTheme"'));
        expect(xml, contains('android:windowSplashScreenBackground'));
        expect(
          xml,
          contains(
            '<item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>',
          ),
        );
      });
    }
  });

  group('iOS 스플래시', () {
    const sizes = {
      'LaunchImage.png': 96,
      'LaunchImage@2x.png': 192,
      'LaunchImage@3x.png': 288,
    };
    sizes.forEach((name, size) {
      test('$name은 ${size}x$size 이다', () {
        expect(_pngSize('$_launchImages/$name'), (size, size));
      });
    });

    test('LaunchScreen.storyboard가 LaunchImage 96x96을 선언한다', () {
      final sb = File('ios/Runner/Base.lproj/LaunchScreen.storyboard')
          .readAsStringSync();
      expect(
        sb,
        contains('<image name="LaunchImage" width="96" height="96"/>'),
      );
    });
  });
}
