import 'dart:ui';

import 'package:dio/dio.dart' show CancelToken;
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/localization/content_language.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/features/reports/models/report_catalog_model.dart';
import 'package:astro_mobile/features/reports/models/report_language.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/services/reports_service.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';

/// Records the requests the service would send; nothing reaches a network.
class _RecordingApiClient extends Fake implements ApiClient {
  final List<String> paths = [];
  final List<Map<String, dynamic>> bodies = [];

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    Duration? timeout,
  }) async {
    paths.add(path);
    bodies.add(Map<String, dynamic>.from(data as Map));
    return {'orderId': 'ord_1', 'razorpayOrderId': 'order_rzp_1', 'amount': 29900, 'reportId': 'rep_1'};
  }
}

Map<String, dynamic> _catalogItem(String type, {Object? languages = _absent}) => {
      'id': 'report-${type.toLowerCase()}',
      'itemType': 'REPORT',
      'title': '$type report',
      'pricePaise': 29900,
      'currency': 'INR',
      'isActive': true,
      'legacyReportType': type,
      if (!identical(languages, _absent)) 'languages': languages,
    };

const Object _absent = Object();

void main() {
  group('Report catalogue languages', () {
    test('the languages of each report are read from the catalogue', () {
      final catalog = parseReportCatalog({
        'items': [
          _catalogItem('KUNDLI', languages: ['en', 'hi']),
          _catalogItem('CAREER', languages: ['en']),
          _catalogItem('SATURN', languages: <String>[]),
          _catalogItem('LOVE'),
        ],
      });

      expect(catalog['KUNDLI']!.languages, ['en', 'hi']);
      expect(catalog['CAREER']!.languages, ['en']);
      expect(catalog['SATURN']!.languages, isEmpty);
      // No field: nothing is assumed, so Hindi is not offered.
      expect(catalog['LOVE']!.languages, isEmpty);
    });

    test('unknown or malformed language entries are dropped, never turned into Hindi', () {
      final catalog = parseReportCatalog({
        'items': [
          _catalogItem('KUNDLI', languages: ['en', 'fr', 7, null, 'EN', 'hi', 'hi']),
          _catalogItem('CAREER', languages: 'hi'),
        ],
      });

      expect(catalog['KUNDLI']!.languages, ['en', 'hi']);
      expect(catalog['CAREER']!.languages, isEmpty);
    });
  });

  group('Report language on a report', () {
    Map<String, dynamic> report({Object? language}) => {
          'id': 'rep_1',
          'userId': 'usr_1',
          'birthProfileId': 'bp_1',
          'reportType': 'KUNDLI',
          'status': 'COMPLETED',
          'createdAt': '2026-11-20T10:00:00.000Z',
          if (language != null) 'language': language,
        };

    test('the language of a report comes from the server', () {
      expect(UserReportItemModel.fromJson(report(language: 'hi')).language, 'hi');
      expect(UserReportItemModel.fromJson(report(language: 'en')).language, 'en');
    });

    test('a missing or unknown language is left unknown', () {
      expect(UserReportItemModel.fromJson(report()).language, isNull);
      expect(UserReportItemModel.fromJson(report(language: 'fr')).language, isNull);
      expect(UserReportItemModel.fromJson(report(language: 5)).language, isNull);
    });

    test('the language line names the language in both app languages', () {
      final en = lookupAppLocalizations(const Locale('en'));
      final hi = lookupAppLocalizations(const Locale('hi'));

      expect(reportLanguageLine(en, 'hi'), 'Language: हिन्दी (Hindi)');
      expect(reportLanguageLine(en, 'en'), 'Language: English');
      expect(reportLanguageLine(hi, 'hi'), 'भाषा: हिन्दी');
      expect(reportLanguageLine(en, null), isNull);
      expect(reportLanguageLine(en, 'fr'), isNull);
    });
  });

  group('Report language in requests', () {
    test('the chosen language is sent with the order', () async {
      final api = _RecordingApiClient();
      await ReportsService(apiClient: api).createReportOrder(reportType: 'KUNDLI', language: 'hi', idempotencyKey: 'key_1');

      expect(api.paths.single, '/payments/create-order');
      expect(api.bodies.single, {'reportType': 'KUNDLI', 'language': 'hi', 'idempotencyKey': 'key_1'});
    });

    test('no language is sent when none is given (the server reads that as English)', () async {
      final api = _RecordingApiClient();
      await ReportsService(apiClient: api).createReportOrder(reportType: 'KUNDLI');

      expect(api.bodies.single.containsKey('language'), isFalse);
    });

    test('creating or regenerating a report never names a language: the purchase decides it', () async {
      final api = _RecordingApiClient();
      final service = ReportsService(apiClient: api);

      await service.createReportJob(birthProfileId: 'bp_1', reportType: 'KUNDLI', orderId: 'ord_1');
      await service.createReportJob(birthProfileId: 'bp_1', reportType: 'KUNDLI', forceRegenerate: true);
      await service.createReportJob(birthProfileId: 'bp_1', reportType: 'CAREER', orderId: 'ord_2');

      expect(api.paths, ['/reports', '/reports', '/reports/career']);
      for (final body in api.bodies) {
        expect(body.containsKey('language'), isFalse);
      }
    });
  });

  group('Report language API errors', () {
    final en = lookupAppLocalizations(const Locale('en'));
    final hi = lookupAppLocalizations(const Locale('hi'));

    test('REPORT_LANGUAGE_NOT_AVAILABLE before payment says no payment was taken', () {
      expect(
        reportLanguageErrorText(en, 'REPORT_LANGUAGE_NOT_AVAILABLE', language: 'hi', beforePayment: true),
        'This report is not available in हिन्दी (Hindi) right now. No payment was taken.',
      );
      expect(
        reportLanguageErrorText(hi, 'REPORT_LANGUAGE_NOT_AVAILABLE', language: 'hi', beforePayment: true),
        'यह रिपोर्ट अभी हिन्दी में उपलब्ध नहीं है। कोई भुगतान नहीं लिया गया है।',
      );
    });

    test('REPORT_LANGUAGE_NOT_AVAILABLE after payment makes no claim about payment', () {
      expect(
        reportLanguageErrorText(en, 'REPORT_LANGUAGE_NOT_AVAILABLE', language: 'hi'),
        'This report is not available in that language right now.',
      );
    });

    test('REPORT_LANGUAGE_FIXED says the language cannot be changed', () {
      expect(
        reportLanguageErrorText(en, 'REPORT_LANGUAGE_FIXED'),
        'The language of this report was fixed when it was bought and cannot be changed.',
      );
      expect(reportLanguageErrorText(hi, 'REPORT_LANGUAGE_FIXED'), isNotNull);
    });

    test('other errors are not rewritten', () {
      expect(reportLanguageErrorText(en, 'PAYMENT_REQUIRED'), isNull);
      expect(reportLanguageErrorText(en, null), isNull);
    });
  });

  test('ContentLanguage knows only English and Hindi', () {
    expect(ContentLanguage.tryParse('hi'), 'hi');
    expect(ContentLanguage.tryParse(' EN '), 'en');
    expect(ContentLanguage.tryParse('fr'), isNull);
    expect(ContentLanguage.tryParse(null), isNull);
    expect(ContentLanguage.fallback, 'en');
  });
}
