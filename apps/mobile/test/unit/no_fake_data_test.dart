import 'package:astro_mobile/features/astrology/models/rashi_bhavishya_model.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/courses/models/course_models.dart';
import 'package:astro_mobile/features/notifications/models/notification_item_model.dart';
import 'package:astro_mobile/features/notifications/providers/notifications_provider.dart';
import 'package:astro_mobile/features/reports/models/report_catalog_model.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/rashi_bhavishya_sample.dart';

/// Guards the "no fallbacks, no mocks, no false data" rule: models must never
/// invent values when the backend omits them.
void main() {
  group('RashiBhavishyaModel', () {
    test('throws instead of inventing a prediction when fields are missing', () {
      expect(() => RashiBhavishyaModel.fromJson({'data': {'date': '2026-11-18'}}), throwsFormatException);
      expect(() => RashiBhavishyaModel.fromJson(const {}), throwsFormatException);
      final noSections = rashiBhavishyaSampleJson();
      ((noSections['data'] as Map<String, dynamic>)['prediction'] as Map<String, dynamic>)['sections'] = <dynamic>[];
      expect(() => RashiBhavishyaModel.fromJson(noSections), throwsFormatException);
      final noFacts = rashiBhavishyaSampleJson();
      (noFacts['data'] as Map<String, dynamic>).remove('facts');
      expect(() => RashiBhavishyaModel.fromJson(noFacts), throwsFormatException);
    });

    test('parses the genuine response; no lucky values; missing fixture flag is non-genuine', () {
      final model = rashiBhavishyaSampleModel();
      expect(model.date, '2026-11-18');
      expect(model.rashi.englishName, 'Aries');
      expect(model.facts.planets, hasLength(9));
      expect(model.facts.tally.favourable + model.facts.tally.demanding, model.facts.tally.total);
      expect(model.prediction.sections, isNotEmpty);
      expect(model.prediction.luckyNumber, isNull);
      expect(model.prediction.luckyColor, isNull);
      expect(model.isDevelopmentFixture, isFalse);

      final json = rashiBhavishyaSampleJson();
      (json['data'] as Map<String, dynamic>).remove('isDevelopmentFixture');
      expect(RashiBhavishyaModel.fromJson(json).isDevelopmentFixture, isTrue);
    });

    test('round-trips through the local cache format', () {
      final model = rashiBhavishyaSampleModel();
      final again = RashiBhavishyaModel.fromJson(model.toJson());
      expect(again.facts.planets.map((p) => p.house), model.facts.planets.map((p) => p.house));
      expect(again.prediction.summary, model.prediction.summary);
    });

    test('recognises the backend deterministic plain-wording result', () {
      expect(rashiBhavishyaSampleModel().isDeterministicFallback, isFalse);
      final json = rashiBhavishyaSampleJson();
      (json['data'] as Map<String, dynamic>)['narrativeSource'] = 'deterministic';
      final model = RashiBhavishyaModel.fromJson(json);
      expect(model.isDeterministicFallback, isTrue);
      expect(model.isDevelopmentFixture, isFalse);
      expect(RashiBhavishyaModel.fromJson(model.toJson()).isDeterministicFallback, isTrue);
    });
  });

  group('ReportCatalogItem', () {
    test('parses server catalogue and keeps only active, priced report SKUs', () {
      final catalog = parseReportCatalog({
        'items': [
          {'id': 'report-kundli', 'title': 'Kundli', 'description': 'd', 'pricePaise': 29900, 'isActive': true, 'legacyReportType': 'KUNDLI'},
          {'id': 'report-jupiter', 'title': 'Jupiter', 'pricePaise': 0, 'isActive': false, 'legacyReportType': 'JUPITER_TRANSIT'},
          {'id': 'product-x', 'title': 'Not a report', 'pricePaise': 100, 'isActive': true},
        ],
      });
      expect(catalog.keys, ['KUNDLI']);
      expect(catalog['KUNDLI']!.pricePaise, 29900);
      expect(catalog['KUNDLI']!.priceText, '₹299');
    });

    test('formats prices with Indian grouping', () {
      final item = ReportCatalogItem.tryParse({
        'id': 'a', 'title': 't', 'pricePaise': 29999900, 'isActive': true, 'legacyReportType': 'X',
      })!;
      expect(item.priceText, '₹2,99,999');
    });

    test('throws on malformed catalogue', () {
      expect(() => parseReportCatalog(const {}), throwsFormatException);
    });
  });

  test('BirthProfileModel does not assume a timezone', () {
    final profile = BirthProfileModel.fromJson({'id': 'p1', 'name': 'A', 'dateOfBirth': '2000-01-01', 'timeOfBirth': '10:00:00'});
    expect(profile.timezone, isEmpty);
  });

  test('CourseSummaryModel rating is null when the backend sends none', () {
    final course = CourseSummaryModel.fromJson({'id': 'c1', 'title': 'T', 'slug': 's'});
    expect(course.rating, isNull);
  });

  group('Notifications inbox', () {
    test('starts empty without a server (no seeded demo notifications)', () {
      final notifier = NotificationsNotifier();
      expect(notifier.state.items, isEmpty);
    });

    test('maps a server row and drops incomplete rows', () {
      final item = NotificationsNotifier.notificationFromServer({
        'id': 'n1',
        'type': 'BOOKING_CONFIRMED',
        'title': 'Booked',
        'body': 'Your slot is confirmed',
        'metadata': '{"route":"OPEN_APPOINTMENTS","entityId":"b1"}',
        'readAt': null,
        'createdAt': '2026-11-18T10:00:00.000Z',
      })!;
      expect(item.category, NotificationCategory.consultation);
      expect(item.isRead, isFalse);
      expect(item.routeAction, 'OPEN_APPOINTMENTS');
      expect(item.entityId, 'b1');
      expect(NotificationsNotifier.notificationFromServer({'id': 'x', 'title': 't'}), isNull);
    });
  });
}
