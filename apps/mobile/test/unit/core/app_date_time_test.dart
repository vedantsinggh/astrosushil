import 'package:astro_mobile/core/utils/app_date_time.dart';
import 'package:astro_mobile/core/utils/formatters.dart';
import 'package:astro_mobile/features/astrology/models/panchang_model.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/notifications/providers/notifications_provider.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/shop/models/shop_order_model.dart';
import 'package:flutter_test/flutter_test.dart';

/// Device timezone is simulated with a fixed offset, so these tests do not
/// depend on the timezone of the machine running them.
const ist = Duration(hours: 5, minutes: 30);
const newYork = Duration(hours: -5);

void main() {
  tearDown(() => AppDateTime.debugLocalOffset = null);

  group('server instants follow the device local date', () {
    test('22:52 UTC on 19 Nov is 20 Nov 04:22 on an IST device', () {
      AppDateTime.debugLocalOffset = ist;
      final local = AppDateTime.parseInstant('2026-11-19T22:52:22.000Z')!;
      expect(local.isUtc, isFalse);
      expect([local.year, local.month, local.day, local.hour, local.minute], [2026, 11, 20, 4, 22]);
      expect(AppDateTime.formatLocal(local, 'd MMM yyyy'), '20 Nov 2026');
      expect(AppDateTime.shortNumericDate(local), '20/11/2026');
    });

    test('the same instant stays on 19 Nov for a device in New York', () {
      AppDateTime.debugLocalOffset = newYork;
      final local = AppDateTime.parseInstant('2026-11-19T22:52:22Z')!;
      expect(AppDateTime.formatLocal(local, 'd MMM yyyy HH:mm'), '19 Nov 2026 17:52');
    });

    test('formatLocal converts a UTC DateTime that was never converted', () {
      AppDateTime.debugLocalOffset = ist;
      final utc = DateTime.utc(2026, 11, 19, 22, 52, 22);
      expect(AppDateTime.formatLocal(utc, 'd MMM yyyy, HH:mm'), '20 Nov 2026, 04:22');
    });

    test('explicit offsets are honoured', () {
      AppDateTime.debugLocalOffset = ist;
      final local = AppDateTime.parseInstant('2026-11-20T04:22:22+05:30')!;
      expect(AppDateTime.formatLocal(local, 'd MMM HH:mm'), '20 Nov 04:22');
    });

    test('null, empty and garbage input return null', () {
      expect(AppDateTime.parseInstant(null), isNull);
      expect(AppDateTime.parseInstant(''), isNull);
      expect(AppDateTime.parseInstant('not a date'), isNull);
      expect(AppDateTime.formatLocal(null, 'd MMM', fallback: '-'), '-');
    });

    test('toJsonInstant round-trips as UTC with Z', () {
      final instant = DateTime.utc(2026, 11, 19, 22, 52, 22);
      final json = AppDateTime.toJsonInstant(instant.toLocal());
      expect(json, '2026-11-19T22:52:22.000Z');
      expect(AppDateTime.parseInstant(json)!.toUtc(), instant);
    });

    test('timeAgo works on instants and never goes negative', () {
      final now = DateTime.utc(2026, 11, 20, 0, 0);
      expect(AppDateTime.timeAgo(DateTime.utc(2026, 11, 19, 22, 0), now: now), '2h ago');
      expect(AppDateTime.timeAgo(DateTime.utc(2026, 11, 19, 23, 55).toLocal(), now: now), '5m ago');
      expect(AppDateTime.timeAgo(DateTime.utc(2026, 11, 17, 0, 0), now: now), '3d ago');
      expect(AppDateTime.timeAgo(DateTime.utc(2026, 11, 20, 0, 2), now: now), '0m ago');
    });
  });

  group('models keep server timestamps in local time', () {
    test('UserReportItemModel.createdAt is 20 Nov on an IST device', () {
      AppDateTime.debugLocalOffset = ist;
      final r = UserReportItemModel.fromJson({
        'id': 'r1',
        'reportType': 'KUNDLI',
        'status': 'COMPLETED',
        'createdAt': '2026-11-19T22:52:22.000Z',
        'completedAt': '2026-11-19T23:10:00.000Z',
      });
      expect([r.createdAt.year, r.createdAt.month, r.createdAt.day], [2026, 11, 20]);
      expect([r.completedAt!.day, r.completedAt!.hour, r.completedAt!.minute], [20, 4, 40]);
    });

    test('ShopOrderModel dates are local', () {
      AppDateTime.debugLocalOffset = ist;
      final o = ShopOrderModel.fromJson({
        'id': 'o1',
        'createdAt': '2026-11-19T22:52:22.000Z',
        'dispatchedAt': '2026-11-20T19:00:00.000Z',
        'items': const <dynamic>[],
      });
      expect(AppDateTime.shortNumericDate(o.createdAt), '20/11/2026');
      expect(AppDateTime.shortNumericDate(o.dispatchedAt), '21/11/2026');
    });

    test('server notifications are local', () {
      AppDateTime.debugLocalOffset = ist;
      final n = NotificationsNotifier.notificationFromServer({
        'id': 'n1',
        'title': 't',
        'body': 'b',
        'type': 'PAYMENT_SUCCESS',
        'createdAt': '2026-11-19T22:52:22.000Z',
      })!;
      expect([n.timestamp.day, n.timestamp.hour], [20, 4]);
    });
  });

  group('IST business dates', () {
    test('00:30 IST is still the IST date although UTC is the previous day', () {
      final instant = DateTime.utc(2026, 11, 19, 19, 0); // 00:30 IST on 20 Nov
      expect(AppDateTime.istDateKey(instant), '2026-11-20');
      expect(AppDateTime.istToday(instant), DateTime(2026, 11, 20));
    });

    test('23:59 IST stays on the same IST date', () {
      expect(AppDateTime.istDateKey(DateTime.utc(2026, 11, 20, 18, 29)), '2026-11-20');
      expect(AppDateTime.istDateKey(DateTime.utc(2026, 11, 20, 18, 30)), '2026-11-21');
    });

    test('IST date does not depend on the device offset', () {
      AppDateTime.debugLocalOffset = newYork;
      expect(AppDateTime.istDateKey(DateTime.utc(2026, 11, 19, 19, 0)), '2026-11-20');
    });

    test('addCalendarDays crosses months', () {
      expect(AppDateTime.dateKey(AppDateTime.addCalendarDays(DateTime(2026, 11, 29), 3)), '2026-12-02');
    });

    test('atOffset gives the wall clock at a place', () {
      final t = DateTime.utc(2026, 11, 20, 1, 0);
      expect(AppDateTime.atOffset(t, const Duration(hours: -5)).hour, 20);
      expect(AppDateTime.toIstWallClock(t).hour, 6);
    });
  });

  group('panchang times belong to the panchang place', () {
    test('sunrise in New York is shown in New York time on an IST device', () {
      AppDateTime.debugLocalOffset = ist;
      const sun = SunriseSunsetModel(
        sunriseIso: '1990-05-15T09:30:00.000Z',
        sunsetIso: '1990-05-16T00:10:00.000Z',
        dayLengthMinutes: 880,
      );
      expect(sun.formatSunrise(placeOffset: const Duration(hours: -4)), '05:30 AM');
      expect(sun.formatSunset(placeOffset: const Duration(hours: -4)), '08:10 PM');
      // Without a place offset the device time is used (previous behaviour).
      expect(sun.formattedSunrise, '03:00 PM');
    });

    test('Rahu Kala window uses the place offset', () {
      const rk = RahuKalaModel(
        startIso: '2026-11-20T06:00:00.000Z',
        endIso: '2026-11-20T07:30:00.000Z',
        segmentIndex: 6,
        totalSegments: 8,
      );
      expect(rk.formatWindow(placeOffset: ist), '11:30 AM – 01:00 PM');
    });
  });

  group('birth data is never shifted', () {
    for (final offset in [ist, newYork, const Duration(hours: 14), const Duration(hours: -12), Duration.zero]) {
      test('birth date/time unchanged with device offset $offset', () {
        AppDateTime.debugLocalOffset = offset;
        final p = BirthProfileModel.fromJson({
          'id': 'bp1',
          'userId': 'u1',
          'name': 'Test',
          'dateOfBirth': '1990-05-15',
          'timeOfBirth': '00:15:00',
          'latitude': 28.61,
          'longitude': 77.21,
          'timezone': 'Asia/Kolkata',
          'utcDateTime': '1990-05-14T18:45:00.000Z',
          'timezoneOffsetSeconds': 19800,
          'createdAt': '2026-11-19T22:52:22.000Z',
          'updatedAt': '2026-11-19T22:52:22.000Z',
        });
        expect(p.dateOfBirth, '1990-05-15');
        expect(p.timeOfBirth, '00:15:00');
        // The birth instant itself stays in UTC (it is shown labelled "UTC").
        expect(p.utcDateTime!.isUtc, isTrue);
        expect(p.utcDateTime!.toIso8601String(), '1990-05-14T18:45:00.000Z');
        // Round trip keeps the same strings.
        final again = BirthProfileModel.fromJson(p.toJson());
        expect(again.dateOfBirth, '1990-05-15');
        expect(again.timeOfBirth, '00:15:00');
        expect(again.utcDateTime!.toUtc(), DateTime.utc(1990, 5, 14, 18, 45));
        // Display of the birth date is the civil date, whatever the device offset.
        expect(Formatters.formatDisplayDate(p.dateOfBirth), 'May 15, 1990');
        expect(AppDateTime.formatCalendarDate(p.dateOfBirth, 'd MMMM yyyy'), '15 May 1990');
      });
    }

    test('parseCalendarDate ignores any time/zone suffix and rejects invalid dates', () {
      AppDateTime.debugLocalOffset = newYork;
      expect(AppDateTime.parseCalendarDate('1990-05-15T00:00:00.000Z'), DateTime(1990, 5, 15));
      expect(AppDateTime.parseCalendarDate('1990-05-15'), DateTime(1990, 5, 15));
      expect(AppDateTime.parseCalendarDate('2026-02-31'), isNull);
      expect(AppDateTime.parseCalendarDate('15/05/1990'), isNull);
      expect(AppDateTime.formatCalendarDate('15/05/1990', 'd MMM'), '15/05/1990');
    });

    test('appointment date (IST calendar date) is shown as-is', () {
      AppDateTime.debugLocalOffset = newYork;
      final b = ConsultationBookingModel.fromJson({
        'id': 'b1',
        'appointmentDate': '2026-11-25',
        'startTime': '10:00',
        'endTime': '10:30',
      });
      expect(AppDateTime.formatCalendarDate(b.appointmentDate, 'EEE, d MMM yyyy'), 'Wed, 25 Nov 2026');
    });
  });
}
