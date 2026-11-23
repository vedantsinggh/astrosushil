import '../../../core/localization/content_language.dart';
import '../../../l10n/app_localizations.dart';

/// API error codes about the language of a paid report.
class ReportLanguageErrorCodes {
  ReportLanguageErrorCodes._();

  /// The report has no edition in the language asked for.
  static const String notAvailable = 'REPORT_LANGUAGE_NOT_AVAILABLE';

  /// The report was bought (or already made) in another language.
  static const String fixed = 'REPORT_LANGUAGE_FIXED';
}

/// "Language: Hindi" for a report, or null when its language is not known.
String? reportLanguageLine(AppLocalizations l10n, String? language) {
  final code = ContentLanguage.tryParse(language);
  if (code == null) return null;
  return l10n.reportLanguageLine(ContentLanguage.displayName(l10n, code));
}

/// Customer-facing text for a report-language API error [code], or null when
/// [code] is not about the report language.
///
/// [beforePayment] is true only while the order is being created: the server
/// refuses an unavailable language before any charge, and the message says so.
String? reportLanguageErrorText(
  AppLocalizations l10n,
  String? code, {
  String? language,
  bool beforePayment = false,
}) {
  switch (code) {
    case ReportLanguageErrorCodes.notAvailable:
      final known = ContentLanguage.tryParse(language);
      if (beforePayment && known != null) {
        return l10n.reportLanguageNotAvailableBeforePayment(ContentLanguage.displayName(l10n, known));
      }
      return l10n.reportLanguageNotAvailable;
    case ReportLanguageErrorCodes.fixed:
      return l10n.reportLanguageFixed;
    default:
      return null;
  }
}
