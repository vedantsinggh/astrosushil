import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/secure_storage_service.dart';
import '../../l10n/app_localizations.dart';

export '../../l10n/app_localizations.dart';

/// Supported locales in Astro Sushil
class SupportedLocales {
  static const Locale english = Locale('en');
  static const Locale hindi = Locale('hi');

  static const List<Locale> all = [english, hindi];

  static bool isSupported(Locale locale) {
    return all.any((l) => l.languageCode == locale.languageCode);
  }
}

/// Storage service provider
final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return FlutterSecureStorageService();
});

/// Locale state notifier managing language selection and persistence
class LocaleNotifier extends StateNotifier<Locale> {
  final SecureStorageService _storage;

  LocaleNotifier(this._storage) : super(SupportedLocales.english) {
    _loadPersistedLocale();
  }

  Future<void> _loadPersistedLocale() async {
    try {
      final savedCode = await _storage.read(key: StorageKeys.appLocale);
      if (savedCode != null && savedCode.isNotEmpty) {
        if (savedCode == 'hi') {
          state = SupportedLocales.hindi;
        } else if (savedCode == 'en') {
          state = SupportedLocales.english;
        }
      }
    } catch (_) {}
  }

  /// Change app language and persist preference
  Future<void> setLocale(Locale newLocale) async {
    if (!SupportedLocales.isSupported(newLocale)) return;
    state = newLocale;
    try {
      await _storage.write(
        key: StorageKeys.appLocale,
        value: newLocale.languageCode,
      );
    } catch (_) {}
  }

  /// Switch between English and Hindi directly
  Future<void> toggleLanguage() async {
    if (state.languageCode == 'hi') {
      await setLocale(SupportedLocales.english);
    } else {
      await setLocale(SupportedLocales.hindi);
    }
  }

  bool get isHindi => state.languageCode == 'hi';
  bool get isEnglish => state.languageCode == 'en';
}

/// Global provider for App Locale
final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return LocaleNotifier(storage);
});

/// Convenient extension on BuildContext for localization access
extension LocalizedContextExtension on BuildContext {
  AppLocalizations get l10n {
    return AppLocalizations.of(this) ?? lookupAppLocalizations(SupportedLocales.english);
  }
}
