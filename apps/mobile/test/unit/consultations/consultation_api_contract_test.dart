import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/network/api_exception.dart';
import 'package:astro_mobile/features/consultations/models/consultation_errors.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/services/consultation_service.dart';

/// Fake API: records every request and answers with the JSON the backend
/// sends (`{ statusCode, success, message, data }`), or throws.
class FakeApiClient implements ApiClient {
  final Map<String, Object> responses = {};
  final List<String> gets = [];
  final Map<String, Map<String, dynamic>?> getQueries = {};
  final List<String> posts = [];
  final Map<String, dynamic> postBodies = {};

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  Map<String, dynamic> _answer(String path) {
    final r = responses[path];
    if (r is Exception) throw r;
    if (r is Map<String, dynamic>) return r;
    return {'statusCode': 200, 'success': true, 'data': <dynamic>[]};
  }

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    gets.add(path);
    getQueries[path] = queryParameters;
    return _answer(path);
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    posts.add(path);
    postBodies[path] = data;
    return _answer(path);
  }
}

Map<String, dynamic> ok(Object data, {int status = 200}) =>
    {'statusCode': status, 'success': true, 'message': 'ok', 'data': data};

/// A `ConsultationBooking` row as the customer endpoints return it.
Map<String, dynamic> bookingRow({
  String id = '0b7f3a52-1c7e-4f0e-9a50-0f3f6c1f2a11',
  String status = 'PENDING_PAYMENT',
  String? reservationExpiresAt = '2026-12-01T05:45:00.000Z',
}) =>
    {
      'id': id,
      'userId': 'u-1',
      'consultationId': 'consult-general-video',
      'consultationTypeId': null,
      'title': 'General Consultation (Video)',
      'mode': 'VIDEO',
      'durationMinutes': 30,
      'date': '2026-12-01',
      'startTime': '11:00',
      'endTime': '11:30',
      'timezone': 'Asia/Kolkata',
      'status': status,
      'primaryQuestion': 'Career change in 2027?',
      'orderId': 'ord-1',
      'pricePaise': 1500000,
      'gstRateBasisPoints': 1800,
      'gstType': 'EXCLUSIVE',
      'taxablePaise': 1500000,
      'gstPaise': 270000,
      'amountPaise': 1770000,
      'reservationExpiresAt': reservationExpiresAt,
      'meetingLink': null,
      'locationAddress': null,
      'invoiceNumber': null,
      'cancellationReason': null,
      'createdAt': '2026-11-24T05:30:00.000Z',
    };

void main() {
  late FakeApiClient api;
  late ConsultationService service;

  setUp(() {
    api = FakeApiClient();
    service = ConsultationService(apiClient: api);
  });

  group('GET /consultations', () {
    test('reads data[] with the price the customer pays and the GST added on top', () async {
      api.responses['/consultations'] = ok([
        {
          'id': 'consult-general-video',
          'title': 'General Consultation (Video)',
          'description': '30-minute video call',
          'pricePaise': 1770000,
          'priceWithGst': 17700,
          'currency': 'INR',
          'durationMinutes': 30,
          'mode': 'VIDEO',
          'responseDays': 15,
          'taxIncluded': false,
          'taxRateBasisPoints': 1800,
          'practitionerName': 'Astro Sushil Kumar Singh',
          'consultationTypeId': 'type-1',
          'type': 'normal',
          'includes': ['Chart reading'],
          'priceLabel': null,
          'note': null,
          'basePricePaise': 1500000,
          'gstPaise': 270000,
          'unavailableDates': ['2026-12-25'],
        },
      ]);

      final catalog = await service.fetchCatalog();

      expect(api.gets, ['/consultations']);
      final o = catalog.single;
      expect(o.sku, 'consult-general-video');
      expect(o.mode, 'VIDEO');
      expect(o.responseDaysNotice, 15);
      expect(o.pricePaise, 1770000);
      expect(o.basePricePaise, 1500000);
      expect(o.gstPaise, 270000);
      expect(o.gstAddedOnTop, isTrue);
      expect(o.amountBeforeGstPaise, 1500000);
      expect(o.gstPercentLabel, '18');
      expect(o.unavailableDates, ['2026-12-25']);
    });

    test('a failed load is an error, never a second guessed path', () async {
      api.responses['/consultations'] = const NetworkException('offline');
      await expectLater(service.fetchCatalog(), throwsA(isA<NetworkException>()));
      expect(api.gets, ['/consultations']);
    });

    test('inclusive GST: the listed price is the total', () {
      final o = ConsultationOfferingModel.fromJson(const {
        'id': 'consult-general-audio',
        'title': 'General Consultation (Audio)',
        'pricePaise': 1000000,
        'basePricePaise': 1000000,
        'gstPaise': 152542,
        'taxIncluded': true,
        'taxRateBasisPoints': 1800,
        'mode': 'AUDIO',
        'durationMinutes': 30,
        'responseDays': 15,
      });
      expect(o.gstAddedOnTop, isFalse);
      expect(o.amountBeforeGstPaise, 847458);
      expect(formatInrPaise(o.amountBeforeGstPaise), '₹8,474.58');
    });
  });

  group('GET /consultations/slots and /blocked-dates', () {
    test('sends consultationId and date, reads data[] of {startTime, endTime}', () async {
      api.responses['/consultations/slots'] = {
        ...ok([
          {'startTime': '11:00', 'endTime': '11:30'},
          {'startTime': '11:30', 'endTime': '12:00'},
        ]),
        'meta': {'available': true, 'date': '2026-12-01'},
      };

      final slots = await service.fetchSlots(consultationId: 'consult-general-video', date: '2026-12-01');

      expect(api.getQueries['/consultations/slots'], {'consultationId': 'consult-general-video', 'date': '2026-12-01'});
      expect(slots.length, 2);
      expect(slots.first.date, '2026-12-01');
      expect(slots.first.startTime, '11:00');
      expect(slots.first.endTime, '11:30');
      expect(slots.first.isBookable, isTrue);
      expect(slots.first.sameTimeAs(slots.first), isTrue);
      expect(slots.first.sameTimeAs(slots.last), isFalse);
    });

    test('a closed day is an empty list', () async {
      api.responses['/consultations/slots'] = {
        'statusCode': 200,
        'success': true,
        'message': 'This day is blocked. Sunday is a weekly day off.',
        'data': <dynamic>[],
        'meta': {'available': false, 'date': '2026-12-06'},
      };
      expect(await service.fetchSlots(consultationId: 'consult-general-video', date: '2026-12-06'), isEmpty);
    });

    test('blocked dates of a month', () async {
      api.responses['/consultations/blocked-dates'] = ok(['2026-12-10', '2026-12-11']);
      final dates = await service.fetchBlockedDates(month: 12, year: 2026);
      expect(api.getQueries['/consultations/blocked-dates'], {'month': 12, 'year': 2026});
      expect(dates, ['2026-12-10', '2026-12-11']);
    });
  });

  group('POST /consultations/book', () {
    test('sends consultationId, mode, date and slot; reads booking, order and razorpayConfig', () async {
      api.responses['/consultations/book'] = ok({
        'booking': bookingRow(),
        'order': {
          'orderId': 'ord-1',
          'razorpayOrderId': 'order_Rzp1',
          'amount': 1770000,
          'currency': 'INR',
          'paidAmountMinor': 1770000,
        },
        'razorpayConfig': {'key': 'rzp_test_key', 'orderId': 'order_Rzp1', 'amount': 1770000, 'currency': 'INR'},
      }, status: 201);

      final r = await service.bookAppointment(
        consultationId: 'consult-general-video',
        mode: 'ONLINE_VIDEO',
        date: '2026-12-01',
        startTime: '11:00',
        endTime: '11:30',
        birthProfileId: 'bp-1',
        notes: 'Career change in 2027?',
      );

      expect(api.postBodies['/consultations/book'], {
        'consultationId': 'consult-general-video',
        'mode': 'VIDEO',
        'date': '2026-12-01',
        'slot': {'startTime': '11:00', 'endTime': '11:30'},
        'birthProfileId': 'bp-1',
        'notes': 'Career change in 2027?',
      });
      expect(r.booking.id, '0b7f3a52-1c7e-4f0e-9a50-0f3f6c1f2a11');
      expect(r.booking.isPendingPayment, isTrue);
      expect(r.booking.amountPaise, 1770000);
      expect(r.booking.gstPaise, 270000);
      expect(r.booking.gstType, 'EXCLUSIVE');
      expect(r.booking.reservationExpiresAt, DateTime.utc(2026, 12, 1, 5, 45));
      expect(r.orderId, 'ord-1');
      expect(r.razorpayKey, 'rzp_test_key');
      expect(r.razorpayOrderId, 'order_Rzp1');
      expect(r.amount, 1770000);
      expect(r.currency, 'INR');
      expect(r.totalPaise, 1770000);
      expect(r.isExpired(DateTime.utc(2026, 12, 1, 5, 44)), isFalse);
      expect(r.isExpired(DateTime.utc(2026, 12, 1, 5, 45)), isTrue);
    });

    test('never sends the fields the backend does not know', () async {
      api.responses['/consultations/book'] = ok({
        'booking': bookingRow(),
        'order': {'orderId': 'ord-1', 'razorpayOrderId': 'order_Rzp1', 'amount': 1770000, 'currency': 'INR'},
        'razorpayConfig': {'key': 'k', 'orderId': 'order_Rzp1', 'amount': 1770000, 'currency': 'INR'},
      });
      await service.bookAppointment(
        consultationId: 'consult-in-person-delhi',
        mode: 'IN_PERSON',
        date: '2026-12-01',
        startTime: '11:00',
        endTime: '11:30',
      );
      final body = api.postBodies['/consultations/book'] as Map<String, dynamic>;
      expect(body.keys, isNot(contains('slotId')));
      expect(body.keys, isNot(contains('consultationSku')));
      expect(body.keys, isNot(contains('consultationMode')));
      expect(body.keys, isNot(contains('query')));
      expect(body.keys, isNot(contains('birthProfileId')));
      expect(body['mode'], 'IN_PERSON');
    });

    test('409 reaches the caller as "slot taken"', () async {
      api.responses['/consultations/book'] = const ServerException(
        'This consultation slot has already been reserved or booked. Please select another slot.',
        code: 'CONFLICT',
      );
      Object? caught;
      try {
        await service.bookAppointment(
          consultationId: 'consult-general-video',
          mode: 'VIDEO',
          date: '2026-12-01',
          startTime: '11:00',
          endTime: '11:30',
        );
      } catch (e) {
        caught = e;
      }
      final failure = ConsultationFailure.from(caught!);
      expect(failure.kind, ConsultationErrorKind.slotTaken);
      expect(failure.needsNewSlot, isTrue);
    });

    test('a response without a payable order is refused', () async {
      api.responses['/consultations/book'] = ok({'booking': bookingRow()});
      await expectLater(
        service.bookAppointment(
          consultationId: 'consult-general-video',
          mode: 'VIDEO',
          date: '2026-12-01',
          startTime: '11:00',
          endTime: '11:30',
        ),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('POST /consultations/verify-payment', () {
    test('sends bookingId and the three gateway values; reads data as the booking', () async {
      api.responses['/consultations/verify-payment'] = ok({
        ...bookingRow(status: 'CONFIRMED', reservationExpiresAt: null),
        'meetingLink': 'https://meet.astrosushil.com/consult-0b7f3a52',
        'invoiceNumber': 'INV-2026-0042',
      });

      final booking = await service.verifyPayment(
        bookingId: '0b7f3a52-1c7e-4f0e-9a50-0f3f6c1f2a11',
        razorpayOrderId: 'order_Rzp1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig_1',
      );

      expect(api.postBodies['/consultations/verify-payment'], {
        'bookingId': '0b7f3a52-1c7e-4f0e-9a50-0f3f6c1f2a11',
        'razorpayOrderId': 'order_Rzp1',
        'razorpayPaymentId': 'pay_1',
        'razorpaySignature': 'sig_1',
      });
      expect(booking.isConfirmed, isTrue);
      expect(booking.serviceTitle, 'General Consultation (Video)');
      expect(booking.appointmentDate, '2026-12-01');
      expect(booking.meetingLink, 'https://meet.astrosushil.com/consult-0b7f3a52');
      expect(booking.invoiceNumber, 'INV-2026-0042');
      // The API has no booking reference: the short id is shown instead.
      expect(booking.displayReference, '0B7F3A52');
    });
  });

  group('bookings', () {
    test('GET /consultations/my-bookings reads data[]', () async {
      api.responses['/consultations/my-bookings'] = ok([
        {
          ...bookingRow(status: 'CONFIRMED', reservationExpiresAt: null),
          'amountPaise': null,
          'birthProfile': {'id': 'bp-1', 'name': 'Rahul Sharma'},
          'order': {'id': 'ord-1', 'amount': 1770000, 'currency': 'INR', 'paymentStatus': 'CAPTURED'},
        },
      ]);
      final b = (await service.getMyBookings()).single;
      expect(api.gets, ['/consultations/my-bookings']);
      expect(b.consultationMode, 'VIDEO');
      expect(b.query, 'Career change in 2027?');
      expect(b.birthProfileName, 'Rahul Sharma');
      expect(b.consultationId, 'consult-general-video');
      // Falls back to the order's amount for bookings without a price snapshot.
      expect(b.totalPaise, 1770000);
    });

    test('GET /consultations/bookings/:id reads data', () async {
      api.responses['/consultations/bookings/b-1'] = {
        'statusCode': 200,
        'success': true,
        'data': {
          ...bookingRow(id: 'b-1', status: 'CONFIRMED', reservationExpiresAt: null),
          'locationAddress': 'Astro Sushil Vedic Centre',
        },
      };
      final b = await service.getBookingDetails('b-1');
      expect(b.id, 'b-1');
      expect(b.status, 'CONFIRMED');
      expect(b.locationAddress, 'Astro Sushil Vedic Centre');
    });

    test('GET /consultations/my-bookings/:id/invoice reads the amounts', () async {
      api.responses['/consultations/my-bookings/b-1/invoice'] = ok({
        'bookingId': 'b-1',
        'invoiceNumber': 'INV-2026-0042',
        'invoiceStatus': 'allocated',
        'amounts': {
          'currency': 'INR',
          'taxablePaise': 1500000,
          'gstRateBasisPoints': 1800,
          'gstType': 'EXCLUSIVE',
          'gstPaise': 270000,
          'totalPaise': 1770000,
        },
      });
      final invoice = await service.getBookingInvoice('b-1');
      expect(invoice.invoiceNumber, 'INV-2026-0042');
      expect(invoice.taxablePaise, 1500000);
      expect(invoice.gstPaise, 270000);
      expect(invoice.totalPaise, 1770000);
    });

    test('POST reschedule sends newDate and newSlot', () async {
      api.responses['/consultations/bookings/b-1/reschedule'] = ok({
        ...bookingRow(id: 'b-1', status: 'RESCHEDULED', reservationExpiresAt: null),
        'date': '2026-12-03',
        'startTime': '15:00',
        'endTime': '15:30',
      });
      final b = await service.rescheduleBooking(
        bookingId: 'b-1',
        newDate: '2026-12-03',
        newStartTime: '15:00',
        newEndTime: '15:30',
      );
      expect(api.postBodies['/consultations/bookings/b-1/reschedule'], {
        'newDate': '2026-12-03',
        'newSlot': {'startTime': '15:00', 'endTime': '15:30'},
      });
      expect(b.isRescheduled, isTrue);
      expect(b.appointmentDate, '2026-12-03');
      expect(b.startTime, '15:00');
    });

    test('POST cancel sends the reason and reads the cancelled booking', () async {
      api.responses['/consultations/bookings/b-1/cancel'] =
          ok(bookingRow(id: 'b-1', status: 'CANCELLED', reservationExpiresAt: null));
      final b = await service.cancelBooking(bookingId: 'b-1', reason: 'Client requested via app');
      expect(api.postBodies['/consultations/bookings/b-1/cancel'], {'reason': 'Client requested via app'});
      expect(b.isCancelled, isTrue);
    });
  });

  group('rules the server sends back', () {
    ConsultationErrorKind kindOf(AppException e) => ConsultationFailure.from(e).kind;

    test('calendar and status rules are recognised', () {
      expect(
        kindOf(const ValidationException(
            'This day is blocked. Minimum booking notice for General Consultation is 15 day(s).')),
        ConsultationErrorKind.noticePeriod,
      );
      expect(kindOf(const ValidationException('This day is blocked. Sunday is a weekly day off.')),
          ConsultationErrorKind.dayUnavailable);
      expect(kindOf(const ValidationException('This day is not available')), ConsultationErrorKind.dayUnavailable);
      expect(kindOf(const ValidationException('This slot is in the past')), ConsultationErrorKind.slotUnavailable);
      expect(
        kindOf(const ValidationException('This slot is not offered. Please choose one of the available slots.')),
        ConsultationErrorKind.slotUnavailable,
      );
      expect(kindOf(const ValidationException('This slot is blocked')), ConsultationErrorKind.slotUnavailable);
      expect(kindOf(const ValidationException("Cannot reschedule a booking with status 'CANCELLED'")),
          ConsultationErrorKind.notAllowedForStatus);
      expect(kindOf(const ValidationException('Booking is already cancelled')),
          ConsultationErrorKind.notAllowedForStatus);
      expect(kindOf(const ServerException('Payment does not match this order', code: 'PAYMENT_MISMATCH')),
          ConsultationErrorKind.paymentMismatch);
      expect(kindOf(const NotFoundException("Booking 'x' not found")), ConsultationErrorKind.notFound);
      expect(kindOf(const NetworkException('offline')), ConsultationErrorKind.network);
      expect(kindOf(const TimeoutException('slow')), ConsultationErrorKind.network);
    });

    test('an unknown rule keeps the server sentence', () {
      final f = ConsultationFailure.from(const ValidationException('Mode AUDIO is not offered for "Vastu Visit"'));
      expect(f.kind, ConsultationErrorKind.rule);
      expect(f.message, 'Mode AUDIO is not offered for "Vastu Visit"');
      expect(f.needsNewSlot, isFalse);
    });
  });

  group('booking model', () {
    test('hold expiry and expired reservations', () {
      final held = ConsultationBookingModel.fromJson(bookingRow());
      expect(held.isHoldExpired(DateTime.utc(2026, 12, 1, 5, 30)), isFalse);
      expect(held.isHoldExpired(DateTime.utc(2026, 12, 1, 6)), isTrue);

      final released = ConsultationBookingModel.fromJson({
        ...bookingRow(status: 'CANCELLED', reservationExpiresAt: null),
        'cancellationReason': 'RESERVATION_EXPIRED',
      });
      expect(released.isReservationExpired, isTrue);
      expect(released.isHoldExpired(), isFalse);
    });

    test('formatInrPaise groups the Indian way and shows paise only when needed', () {
      expect(formatInrPaise(50000), '₹500');
      expect(formatInrPaise(1500000), '₹15,000');
      expect(formatInrPaise(10000000), '₹1,00,000');
      expect(formatInrPaise(117882), '₹1,178.82');
      expect(formatInrPaise(5), '₹0.05');
    });
  });

  group('ConsultationNotifier', () {
    const offering = ConsultationOfferingModel(
      sku: 'consult-general-video',
      title: 'General Consultation (Video)',
      description: '',
      mode: 'VIDEO',
      durationMinutes: 30,
      pricePaise: 1770000,
      responseDaysNotice: 0,
      category: 'General',
      unavailableDates: [],
    );

    Map<String, dynamic> reservationJson(String expiresAt) => ok({
          'booking': bookingRow(reservationExpiresAt: expiresAt),
          'order': {'orderId': 'ord-1', 'razorpayOrderId': 'order_Rzp1', 'amount': 1770000, 'currency': 'INR'},
          'razorpayConfig': {'key': 'k', 'orderId': 'order_Rzp1', 'amount': 1770000, 'currency': 'INR'},
        });

    const slot = AppointmentSlotModel(
      id: 's',
      practitionerId: '',
      practitionerName: '',
      date: '2026-12-01',
      startTime: '11:00',
      endTime: '11:30',
      mode: '',
      status: 'AVAILABLE',
    );

    Future<ConsultationNotifier> ready() async {
      final notifier = ConsultationNotifier(service);
      await notifier.selectOffering(offering);
      notifier.selectSlot(slot);
      return notifier;
    }

    test('a retried payment reuses the live hold instead of booking the slot twice', () async {
      api.responses['/consultations/book'] =
          reservationJson(DateTime.now().toUtc().add(const Duration(minutes: 15)).toIso8601String());
      final notifier = await ready();

      final first = await notifier.bookSelectedSlot();
      final second = await notifier.bookSelectedSlot();

      expect(first, isNotNull);
      expect(identical(first, second), isTrue);
      expect(api.posts.where((p) => p == '/consultations/book').length, 1);
    });

    test('an expired hold is reported and never sent to payment', () async {
      api.responses['/consultations/book'] =
          reservationJson(DateTime.now().toUtc().subtract(const Duration(seconds: 1)).toIso8601String());
      final notifier = await ready();

      expect(await notifier.bookSelectedSlot(), isNotNull);
      expect(await notifier.bookSelectedSlot(), isNull);
      expect(notifier.state.bookingFailure?.kind, ConsultationErrorKind.holdExpired);
      expect(notifier.state.reservation, isNull);
    });

    test('409 on book is "slot taken"; going back lists the day again', () async {
      api.responses['/consultations/book'] = const ServerException('taken', code: 'CONFLICT');
      final notifier = await ready();

      expect(await notifier.bookSelectedSlot(), isNull);
      expect(notifier.state.bookingFailure?.kind, ConsultationErrorKind.slotTaken);

      final before = api.gets.where((p) => p == '/consultations/slots').length;
      await notifier.backToSlotSelection();
      expect(api.gets.where((p) => p == '/consultations/slots').length, before + 1);
      expect(notifier.state.bookingFailure, isNull);
      expect(notifier.state.selectedSlot, isNull);
    });

    test('verify: mismatch and 409 are "under review", a lost connection is "retry"', () async {
      final notifier = await ready();
      Future<ConsultationPaymentResult> verify() => notifier.verifyPayment(
            bookingId: 'b',
            razorpayOrderId: 'o',
            razorpayPaymentId: 'p',
            razorpaySignature: 's',
          );

      api.responses['/consultations/verify-payment'] =
          const ServerException('Payment does not match this order', code: 'PAYMENT_MISMATCH');
      expect(await verify(), ConsultationPaymentResult.underReview);

      api.responses['/consultations/verify-payment'] = const ServerException(
        'Your payment was received, but this slot is no longer available.',
        code: 'CONFLICT',
      );
      expect(await verify(), ConsultationPaymentResult.underReview);

      api.responses['/consultations/verify-payment'] = const ValidationException('Order ID mismatch');
      expect(await verify(), ConsultationPaymentResult.underReview);

      api.responses['/consultations/verify-payment'] = const NetworkException('offline');
      expect(await verify(), ConsultationPaymentResult.retry);

      api.responses['/consultations/verify-payment'] =
          ok(bookingRow(status: 'CONFIRMED', reservationExpiresAt: null));
      expect(await verify(), ConsultationPaymentResult.confirmed);
      expect(notifier.state.activeBooking?.isConfirmed, isTrue);
    });

    test('blocked days of the office and of the consultation are both closed', () async {
      api.responses['/consultations/blocked-dates'] = ok(['2026-12-10']);
      final notifier = ConsultationNotifier(service);
      await notifier.startSlotSelection(
        consultationId: 'consult-general-video',
        noticeDays: 2,
        unavailableDates: const ['2026-12-25'],
      );
      expect(notifier.state.blockedDates, containsAll(<String>['2026-12-10', '2026-12-25']));
      expect(api.getQueries['/consultations/slots']?['consultationId'], 'consult-general-video');
    });

    test('reschedule sends the chosen slot and surfaces a refusal', () async {
      api.responses['/consultations/bookings/b-1/reschedule'] = const ServerException('taken', code: 'CONFLICT');
      final notifier = await ready();
      expect(await notifier.rescheduleBooking(bookingId: 'b-1'), isFalse);
      expect(notifier.state.actionFailure?.kind, ConsultationErrorKind.slotTaken);
      expect(api.postBodies['/consultations/bookings/b-1/reschedule'], {
        'newDate': '2026-12-01',
        'newSlot': {'startTime': '11:00', 'endTime': '11:30'},
      });
    });
  });
}
