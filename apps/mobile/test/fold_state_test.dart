import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:luckieverse_tab_flutter/fold_state.dart';
import 'package:luckieverse_tab_flutter/native_bridge.dart';

void main() {
  test(
    'preserves positive device classification and each supported posture',
    () {
      for (final platform in ['ios', 'android']) {
        final device = platform == 'ios' ? 'ios-duo' : 'android-fold';
        for (final posture in [
          'unknown',
          'half-opened',
          'unfolded',
          if (platform == 'ios') 'folded',
        ]) {
          final value = {
            'platform': platform,
            'deviceType': device,
            'posture': posture,
          };
          expect(FoldState.fromNative(value, platform).toJson(), value);
        }
      }
    },
  );

  test(
    'missing, malformed, cross-platform and impossible states stay unknown',
    () {
      for (final value in [
        null,
        false,
        0,
        '',
        [],
        {},
        {'platform': 'android', 'deviceType': null, 'posture': 'unfolded'},
        {'platform': 'android', 'deviceType': 'ios-duo', 'posture': 'unfolded'},
        {'platform': 'ios', 'deviceType': 'ios-duo', 'posture': 'unfolded'},
        {'platform': 'android', 'deviceType': 'unknown', 'posture': 'unfolded'},
        {
          'platform': 'android',
          'deviceType': 'android-fold',
          'posture': 'folded',
        },
        {'platform': 'android', 'deviceType': 'android-fold', 'posture': false},
      ]) {
        expect(
          FoldState.fromNative(value, 'android').toJson(),
          FoldState.unknown('android').toJson(),
          reason: '$value',
        );
      }
    },
  );

  test('fold requests share ping limits and serialize the response safely', () {
    for (final type in [
      'getFoldState',
      'subscribeFoldState',
      'unsubscribeFoldState',
    ]) {
      final message = jsonEncode({'version': 1, 'id': 'doc:1', 'type': type});
      expect(foldRequestFor(message)?.id, 'doc:1');
      expect(foldRequestFor(message)?.type, type);
    }
    for (final message in [
      'null',
      'false',
      '0',
      '[]',
      'bad',
      '{}',
      '{"version":0,"id":"a","type":"getFoldState"}',
      '{"version":1,"id":false,"type":"getFoldState"}',
      '{"version":1,"id":" ","type":"getFoldState"}',
      '{"version":1,"id":"a","type":"other"}',
      jsonEncode({'version': 1, 'id': 'x' * 129, 'type': 'getFoldState'}),
      ' ' * 4097,
    ]) {
      expect(foldRequestFor(message), isNull, reason: message);
    }
    const id = "');throw new Error('bad')//";
    final script = foldStateScript(id, FoldState.unknown('ios'));
    expect(script, contains('luckieverse:response'));
    expect(script, contains(jsonEncode(id)));
    expect(script, contains('"type":"foldState"'));
    expect(script, contains('"deviceType":"unknown"'));
  });
}
