import '../../l10n/app_localizations.dart';

/// Language of server-written content: a report PDF or the daily horoscope.
///
/// These are the API values (`en`, `hi`). This is separate from the app
/// language (`localeProvider`), which only decides the language of the app's
/// own screens.
class ContentLanguage {
  ContentLanguage._();

  static const String english = 'en';
  static const String hindi = 'hi';

  /// The API default when no language is named.
  static const String fallback = english;

  /// Display order wherever the customer chooses a language.
  static const List<String> all = [english, hindi];

  /// The API value for [raw], or null when it is not a language this app knows.
  static String? tryParse(Object? raw) {
    if (raw is! String) return null;
    final code = raw.trim().toLowerCase();
    return all.contains(code) ? code : null;
  }

  /// Name of the language shown to the customer (same names as the app
  /// language setting).
  static String displayName(AppLocalizations l10n, String code) {
    return code == hindi ? l10n.languageHindi : l10n.languageEnglish;
  }
}
