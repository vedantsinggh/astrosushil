import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/config/app_config.dart';

void main() {
  group('AppConfig Network Configuration Tests', () {
    tearDown(() {
      AppConfig.resetBaseUrl();
    });

    test('1. Default development API base URL points to localhost on desktop and LAN IP on mobile', () {
      AppConfig.resetBaseUrl();
      expect(AppConfig.apiPort, equals(3000));
      expect(AppConfig.apiPrefix, equals('/api/v1'));
      expect(AppConfig.defaultDevHost, equals('192.168.1.10'));
      final expectedDefault = (!kIsWeb && (Platform.isLinux || Platform.isMacOS || Platform.isWindows))
          ? 'http://127.0.0.1:3000/api/v1'
          : 'http://192.168.1.10:3000/api/v1';
      expect(AppConfig.baseUrl, equals(expectedDefault));
    });

    test('2. Programmatic setBaseUrl overrides baseUrl and normalizes paths', () {
      AppConfig.setBaseUrl('http://custom-host:8080');
      expect(AppConfig.baseUrl, equals('http://custom-host:8080/api/v1'));

      AppConfig.setBaseUrl('http://custom-host:8080/');
      expect(AppConfig.baseUrl, equals('http://custom-host:8080/api/v1'));

      AppConfig.setBaseUrl('http://custom-host:8080/api/v1');
      expect(AppConfig.baseUrl, equals('http://custom-host:8080/api/v1'));

      AppConfig.setBaseUrl('http://custom-host:8080/api/v1/');
      expect(AppConfig.baseUrl, equals('http://custom-host:8080/api/v1'));

      AppConfig.resetBaseUrl();
      final expectedDefault = (!kIsWeb && (Platform.isLinux || Platform.isMacOS || Platform.isWindows))
          ? 'http://127.0.0.1:3000/api/v1'
          : 'http://192.168.1.10:3000/api/v1';
      expect(AppConfig.baseUrl, equals(expectedDefault));
    });

    test('3. normalizeApiUrl handles variations without duplicate /api/v1 pathing', () {
      expect(
        AppConfig.normalizeApiUrl('http://192.168.1.10:3000'),
        equals('http://192.168.1.10:3000/api/v1'),
      );
      expect(
        AppConfig.normalizeApiUrl('http://192.168.1.10:3000/'),
        equals('http://192.168.1.10:3000/api/v1'),
      );
      expect(
        AppConfig.normalizeApiUrl('http://192.168.1.10:3000/api/v1'),
        equals('http://192.168.1.10:3000/api/v1'),
      );
      expect(
        AppConfig.normalizeApiUrl('http://192.168.1.10:3000/api/v1/'),
        equals('http://192.168.1.10:3000/api/v1'),
      );
      expect(
        AppConfig.normalizeApiUrl('http://127.0.0.1:3000'),
        equals('http://127.0.0.1:3000/api/v1'),
      );
    });

    test('4. Network timeouts are configured according to specifications', () {
      expect(AppConfig.connectTimeout, equals(const Duration(seconds: 15)));
      expect(AppConfig.receiveTimeout, equals(const Duration(seconds: 30)));
      expect(AppConfig.binaryReceiveTimeout, equals(const Duration(seconds: 90)));
    });

    test('5. Production URL constant matches authoritative backend domain', () {
      expect(AppConfig.productionApiUrl, equals('https://backend.astrosushil.com/api/v1'));
    });
  });
}
