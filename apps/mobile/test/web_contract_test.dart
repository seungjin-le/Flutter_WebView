import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:luckieverse_tab_flutter/web_policy.dart';
import 'package:luckieverse_tab_flutter/native_bridge.dart';

void main() {
  group('Web URL trust boundary', () {
    test('requires a valid HTTPS URL in release', () {
      expect(parseWebAppUrl('https://example.com/app')?.host, 'example.com');
      for (final value in [
        '',
        ' ',
        'not a url',
        'http://localhost:5173',
        'javascript:alert(1)',
        'file:///tmp/index.html',
        'https://user:pass@example.com',
        'https://',
        'https://example.com:bad',
      ]) {
        expect(parseWebAppUrl(value), isNull, reason: value);
      }
    });
    test('allows HTTP only for local development hosts in debug', () {
      for (final host in [
        'localhost',
        '127.0.0.1',
        '10.0.2.2',
        '192.168.1.12',
        '[::1]',
      ]) {
        expect(
          parseWebAppUrl('http://$host:5173', allowLocalHttp: true),
          isNotNull,
        );
      }
      expect(
        parseWebAppUrl('http://example.com', allowLocalHttp: true),
        isNull,
      );
      expect(
        parseWebAppUrl('http://192.168.999.1', allowLocalHttp: true),
        isNull,
      );
    });
    test('only permits same-origin navigation, including default ports', () {
      final base = Uri.parse('https://example.com/start');
      for (final value in [
        'https://example.com/next',
        'https://example.com:443/#part',
      ]) {
        expect(isAllowedNavigation(base, value), isTrue);
      }
      for (final value in [
        '',
        'http://example.com',
        'https://example.com.evil.test',
        'https://example.com:444',
        'tel:123',
        'javascript:void(0)',
        'https://name@example.com',
        'https://example.com:invalid',
      ]) {
        expect(isAllowedNavigation(base, value), isFalse, reason: value);
      }
    });
  });
  group('Native ping contract', () {
    test('serializes ID and platform safely into a pong event', () {
      final message = jsonEncode({
        'version': 1,
        'id': 'test-1',
        'type': 'ping',
      });
      expect(
        pongScriptFor(message, 'android'),
        contains('luckieverse:response'),
      );
      expect(pongScriptFor(message, 'ios'), contains('"platform":"ios"'));
      expect(pongScriptFor(message, 'windows'), isNull);
      final hostile = jsonEncode({
        'version': 1,
        'id': "');throw new Error('oops')//",
        'type': 'ping',
      });
      expect(
        pongScriptFor(hostile, 'ios'),
        contains(jsonEncode("');throw new Error('oops')//")),
      );
    });
    test(
      'rejects invalid JSON, null, falsy, unsupported versions and types',
      () {
        for (final message in [
          'not JSON',
          'null',
          '[]',
          'false',
          '0',
          '""',
          '{}',
          '{"version":1,"id":null,"type":"ping"}',
          '{"version":1,"id":0,"type":"ping"}',
          '{"version":1,"id":false,"type":"ping"}',
          '{"version":1,"id":" ","type":"ping"}',
          '{"version":0,"id":"a","type":"ping"}',
          '{"version":1,"id":"a","type":"other"}',
          jsonEncode({'version': 1, 'id': 'x' * 129, 'type': 'ping'}),
        ]) {
          expect(pongScriptFor(message, 'ios'), isNull, reason: message);
        }
      },
    );
  });
}
