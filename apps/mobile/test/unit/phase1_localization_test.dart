import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  group('Phase 1: LocaleNotifier & Persistence Unit Tests', () {
    late InMemorySecureStorageService storage;

    setUp(() {
      storage = InMemorySecureStorageService();
    });

    test('Defaults to English when storage is empty', () async {
      final notifier = LocaleNotifier(storage);
      expect(notifier.state, equals(SupportedLocales.english));
      expect(notifier.isEnglish, isTrue);
      expect(notifier.isHindi, isFalse);
    });

    test('Initializes with stored locale preference when available', () async {
      await storage.write(key: StorageKeys.appLocale, value: 'hi');
      final notifier = LocaleNotifier(storage);
      // Wait for async initialization in constructor
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state, equals(SupportedLocales.hindi));
      expect(notifier.isHindi, isTrue);
      expect(notifier.isEnglish, isFalse);
    });

    test('setLocale persists Hindi and updates state immediately', () async {
      final notifier = LocaleNotifier(storage);
      expect(notifier.state, equals(SupportedLocales.english));

      await notifier.setLocale(SupportedLocales.hindi);

      expect(notifier.state, equals(SupportedLocales.hindi));
      expect(notifier.isHindi, isTrue);

      final persisted = await storage.read(key: StorageKeys.appLocale);
      expect(persisted, equals('hi'));
    });

    test('setLocale persists English and updates state immediately', () async {
      await storage.write(key: StorageKeys.appLocale, value: 'hi');
      final notifier = LocaleNotifier(storage);
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(notifier.state, equals(SupportedLocales.hindi));

      await notifier.setLocale(SupportedLocales.english);

      expect(notifier.state, equals(SupportedLocales.english));
      expect(notifier.isEnglish, isTrue);

      final persisted = await storage.read(key: StorageKeys.appLocale);
      expect(persisted, equals('en'));
    });

    test('toggleLanguage alternates between English and Hindi', () async {
      final notifier = LocaleNotifier(storage);
      expect(notifier.state, equals(SupportedLocales.english));

      await notifier.toggleLanguage();
      expect(notifier.state, equals(SupportedLocales.hindi));
      expect(await storage.read(key: StorageKeys.appLocale), equals('hi'));

      await notifier.toggleLanguage();
      expect(notifier.state, equals(SupportedLocales.english));
      expect(await storage.read(key: StorageKeys.appLocale), equals('en'));
    });

    test('SupportedLocales defines English and Hindi properly', () {
      expect(SupportedLocales.all, containsAll([
        const Locale('en'),
        const Locale('hi'),
      ]));
      expect(SupportedLocales.all.length, equals(2));
    });
  });
}
