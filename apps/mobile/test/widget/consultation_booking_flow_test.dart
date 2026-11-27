// The consultation flow against the backend contract, end to end, with a fake
// API service and a fake payment gateway: slot list, hold, payment,
// verification, my bookings, booking details, reschedule and cancel.
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/errors/app_exception.dart';
import 'package:astro_mobile/core/utils/app_date_time.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/widgets/booking_flow_sheet.dart';
import 'package:astro_mobile/features/consultations/widgets/consultation_slot_picker.dart';
import 'package:astro_mobile/features/reports/services/razorpay_checkout_service.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

import '../helpers/consultation_fakes.dart';
import 'phase6_consultations_experience_test.dart'
    show MockConsultationService, TestAuthNotifier, TestBirthProfilesNotifier, testUser;

/// GST added on top: listed ₹15,000 + 18% GST ₹2,700 = ₹17,700 to pay.
const _exclusive = ConsultationOfferingModel(
  sku: 'consult-general-video',
  title: 'General Consultation (Video)',
  description: '30-minute interactive video call.',
  mode: 'VIDEO',
  durationMinutes: 30,
  pricePaise: 1770000,
  responseDaysNotice: 7,
  category: 'Video Consultation',
  basePricePaise: 1500000,
  gstPaise: 270000,
  taxIncluded: false,
  taxRateBasisPoints: 1800,
);

ConsultationBookingModel _confirmed({String id = 'bk-new'}) => ConsultationBookingModel(
      id: id,
      bookingReference: 'BK-CONF-88',
      serviceTitle: 'General Consultation (Video)',
      consultationMode: 'VIDEO',
      appointmentDate: '2026-10-26',
      startTime: '10:00',
      endTime: '10:30',
      status: 'CONFIRMED',
      meetingLink: 'https://meet.astrosushil.com/consult-bknew',
      consultationId: 'consult-general-video',
      amountPaise: 1770000,
    );

class _Service extends MockConsultationService {
  _Service({super.myBookings});

  // book
  Object? bookError;
  int bookAmountPaise = 1770000;
  Duration holdFor = const Duration(minutes: 15);
  final List<Map<String, String?>> bookCalls = [];

  // verify: answers in order, the last one repeats (an Exception is thrown).
  List<Object> verifyAnswers = [_confirmed()];
  final List<Map<String, String>> verifyCalls = [];

  // slots
  List<String> blockedDates = const [];
  int slotFailures = 0;
  final List<String> slotCalls = [];

  // reschedule / cancel / details
  Object? rescheduleError;
  Object? cancelError;
  final List<Map<String, String>> rescheduleCalls = [];
  ConsultationInvoiceModel? invoice;

  @override
  Future<List<AppointmentSlotModel>> fetchSlots({required String consultationId, required String date}) async {
    slotCalls.add('$consultationId $date');
    if (slotFailures > 0) {
      slotFailures--;
      throw const NetworkException('offline');
    }
    return [
      AppointmentSlotModel.fromApi(const {'startTime': '10:00', 'endTime': '10:30'}, date: date),
      AppointmentSlotModel.fromApi(const {'startTime': '11:00', 'endTime': '11:30'}, date: date),
    ];
  }

  @override
  Future<List<String>> fetchBlockedDates({required int month, required int year}) async => blockedDates;

  @override
  Future<ConsultationReservation> bookAppointment({
    required String consultationId,
    required String mode,
    String? date,
    String? startTime,
    String? endTime,
    String? birthProfileId,
    String? notes,
  }) async {
    bookCalls.add({
      'consultationId': consultationId,
      'mode': mode,
      'date': date,
      'startTime': startTime,
      'endTime': endTime,
      'birthProfileId': birthProfileId,
      'notes': notes,
    });
    final error = bookError;
    if (error != null) throw error;
    return fakeConsultationReservation(
      consultationId: consultationId,
      mode: mode,
      date: date ?? '',
      startTime: startTime ?? '',
      endTime: endTime ?? '',
      amountPaise: bookAmountPaise,
      gstPaise: 270000,
      gstType: 'EXCLUSIVE',
      holdFor: holdFor,
    );
  }

  @override
  Future<ConsultationBookingModel> verifyPayment({
    required String bookingId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    verifyCalls.add({
      'bookingId': bookingId,
      'razorpayOrderId': razorpayOrderId,
      'razorpayPaymentId': razorpayPaymentId,
      'razorpaySignature': razorpaySignature,
    });
    final answer = verifyAnswers.length > 1 ? verifyAnswers.removeAt(0) : verifyAnswers.first;
    if (answer is ConsultationBookingModel) return answer;
    throw answer;
  }

  @override
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newDate,
    required String newStartTime,
    required String newEndTime,
    String? reason,
  }) async {
    rescheduleCalls.add({'bookingId': bookingId, 'newDate': newDate, 'start': newStartTime, 'end': newEndTime});
    final error = rescheduleError;
    if (error != null) throw error;
    return myBookings.first;
  }

  @override
  Future<ConsultationBookingModel> cancelBooking({required String bookingId, String? reason}) async {
    final error = cancelError;
    if (error != null) throw error;
    return super.cancelBooking(bookingId: bookingId, reason: reason);
  }

  @override
  Future<ConsultationInvoiceModel> getBookingInvoice(String bookingId) async {
    final i = invoice;
    if (i == null) throw const ValidationException('An invoice exists only for a paid booking');
    return i;
  }
}

Widget _app({
  required Widget child,
  required _Service service,
  FakeRazorpayCheckoutService? razorpay,
  Locale locale = const Locale('en'),
}) {
  return ProviderScope(
    overrides: [
      consultationServiceProvider.overrideWithValue(service),
      razorpayCheckoutServiceProvider.overrideWithValue(razorpay ?? FakeRazorpayCheckoutService()),
      authStateProvider.overrideWith((ref) => TestAuthNotifier(AuthState.authenticated(testUser))),
      birthProfilesListNotifierProvider.overrideWith((ref) => TestBirthProfilesNotifier(const [])),
    ],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      locale: locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: child,
    ),
  );
}

void _size(WidgetTester tester, [Size size = const Size(800, 1600)]) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Future<void> _openSheet(WidgetTester tester, _Service service, FakeRazorpayCheckoutService razorpay,
    {ConsultationOfferingModel offering = _exclusive, Locale locale = const Locale('en')}) async {
  await tester.pumpWidget(_app(
    service: service,
    razorpay: razorpay,
    locale: locale,
    child: Scaffold(body: BookingFlowSheet(offering: offering)),
  ));
  await tester.pumpAndSettle();
}

/// Pick 10:00, go through the details step, land on review.
Future<void> _toReview(WidgetTester tester) async {
  await tester.tap(find.text('10:00 - 10:30 IST'));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const ValueKey('booking_next')));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const ValueKey('booking_next')));
  await tester.pumpAndSettle();
}

/// Taps Pay. While the gateway is open the button shows a spinner, so the
/// tree never settles: pump a few frames instead.
Future<void> _tapPay(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('booking_pay')));
  await _frames(tester);
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

String _firstBookableDate(int noticeDays) =>
    AppDateTime.dateKey(AppDateTime.addCalendarDays(AppDateTime.istToday(), noticeDays));

void main() {
  group('Booking: slots, price and the hold', () {
    testWidgets('lists the slots of the consultation for the first bookable date', (tester) async {
      _size(tester);
      final service = _Service();
      await _openSheet(tester, service, FakeRazorpayCheckoutService());

      expect(service.slotCalls, ['consult-general-video ${_firstBookableDate(7)}']);
      expect(find.text('7 days notice'), findsOneWidget);
      expect(find.text('10:00 - 10:30 IST'), findsOneWidget);
      expect(find.text('11:00 - 11:30 IST'), findsOneWidget);

      // Another date asks the server again for that date.
      final next = AppDateTime.dateKey(AppDateTime.addCalendarDays(AppDateTime.istToday(), 8));
      await tester.tap(find.byKey(ValueKey('consult_date_$next')));
      await tester.pumpAndSettle();
      expect(service.slotCalls.last, 'consult-general-video $next');
    });

    testWidgets('a blocked date is closed and cannot be picked; the next open day is loaded', (tester) async {
      _size(tester);
      final first = _firstBookableDate(7);
      final second = AppDateTime.dateKey(AppDateTime.addCalendarDays(AppDateTime.istToday(), 8));
      final service = _Service()..blockedDates = [first];
      await _openSheet(tester, service, FakeRazorpayCheckoutService());

      expect(find.text('Closed'), findsOneWidget);
      expect(service.slotCalls, ['consult-general-video $second']);

      await tester.tap(find.byKey(ValueKey('consult_date_$first')));
      await tester.pumpAndSettle();
      expect(service.slotCalls.length, 1);
    });

    testWidgets('a slot list that fails to load says so and can be retried', (tester) async {
      _size(tester);
      final service = _Service()..slotFailures = 1;
      await _openSheet(tester, service, FakeRazorpayCheckoutService());

      expect(find.byKey(const ValueKey('consult_slots_error')), findsOneWidget);
      expect(find.text('Could not load the times. Please check your internet and try again.'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('consult_slots_retry')));
      await tester.pumpAndSettle();
      expect(find.text('10:00 - 10:30 IST'), findsOneWidget);
    });

    testWidgets('GST added on top is shown before payment and the gateway is opened for the server amount',
        (tester) async {
      _size(tester);
      final service = _Service();
      final razorpay = FakeRazorpayCheckoutService();
      await _openSheet(tester, service, razorpay);
      await _toReview(tester);

      expect(find.text('Base Consultation Fee'), findsOneWidget);
      expect(find.text('₹15,000'), findsOneWidget);
      expect(find.text('GST (18%) added'), findsOneWidget);
      expect(find.text('₹2,700'), findsOneWidget);
      expect(find.text('Total Amount'), findsOneWidget);
      expect(find.text('₹17,700'), findsNWidgets(2)); // header and total
      expect(find.text('Proceed to Pay ₹17,700'), findsOneWidget);
      expect(
        find.text('When you tap Pay, this time is held for you for 15 minutes while you complete the payment.'),
        findsOneWidget,
      );

      await _tapPay(tester);

      // Exactly what POST /consultations/book needs.
      expect(service.bookCalls.single, {
        'consultationId': 'consult-general-video',
        'mode': 'VIDEO',
        'date': _firstBookableDate(7),
        'startTime': '10:00',
        'endTime': '10:30',
        'birthProfileId': null,
        'notes': '',
      });
      expect(razorpay.openCalls, 1);
      expect(razorpay.lastOrder!.amount, 1770000);
      expect(razorpay.lastOrder!.razorpayOrderId, 'order_fake_1');
      expect(razorpay.lastOrder!.razorpayKey, 'rzp_test_fake');
      expect(razorpay.lastOrder!.currency, 'INR');

      // The customer is told until when the time is held.
      expect(find.textContaining('This time is held for you for 15 minutes, until'), findsOneWidget);
    });

    testWidgets('cancelled payment: the hold is kept, Pay reuses it, then the booking is confirmed', (tester) async {
      _size(tester);
      final service = _Service();
      final razorpay = FakeRazorpayCheckoutService();
      await _openSheet(tester, service, razorpay);
      await _toReview(tester);
      await _tapPay(tester);

      razorpay.cancel();
      await tester.pumpAndSettle();
      expect(find.textContaining('Payment was not completed. Your time is still held until'), findsOneWidget);

      await _tapPay(tester);
      expect(service.bookCalls.length, 1, reason: 'a second hold on the same time would be refused with 409');
      expect(razorpay.openCalls, 2);

      razorpay.succeed(paymentId: 'pay_ok', signature: 'sig_ok');
      await tester.pumpAndSettle();

      expect(service.verifyCalls.single, {
        'bookingId': 'bk-new',
        'razorpayOrderId': 'order_fake_1',
        'razorpayPaymentId': 'pay_ok',
        'razorpaySignature': 'sig_ok',
      });
      expect(find.text('Appointment Confirmed!'), findsOneWidget);
      expect(find.text('Booking ID: BK-CONF-88'), findsOneWidget);
    });

    testWidgets('409 from book: "taken by someone else" and a way back to the slots', (tester) async {
      _size(tester);
      final service = _Service()
        ..bookError = const ServerException(
          'This consultation slot has already been reserved or booked. Please select another slot.',
          code: 'CONFLICT',
        );
      final razorpay = FakeRazorpayCheckoutService();
      await _openSheet(tester, service, razorpay);
      await _toReview(tester);
      await _tapPay(tester);

      expect(razorpay.openCalls, 0, reason: 'a customer who lost the slot is never sent to pay');
      expect(find.text('This time has just been taken by someone else. Please choose another time.'), findsOneWidget);
      expect(find.byKey(const ValueKey('booking_pay')), findsNothing);

      final slotLoads = service.slotCalls.length;
      await tester.tap(find.byKey(const ValueKey('booking_choose_time')));
      await tester.pumpAndSettle();

      expect(find.text('Step 1 of 3'), findsOneWidget);
      expect(service.slotCalls.length, slotLoads + 1, reason: 'the day is listed again');
      expect(find.byKey(const ValueKey('booking_message')), findsNothing);
    });

    testWidgets('expired hold: clear message, no payment, back to the slots', (tester) async {
      _size(tester);
      final service = _Service()..holdFor = const Duration(seconds: -1);
      final razorpay = FakeRazorpayCheckoutService();
      await _openSheet(tester, service, razorpay);
      await _toReview(tester);
      await _tapPay(tester);
      razorpay.cancel();
      await tester.pumpAndSettle();

      await _tapPay(tester);
      expect(razorpay.openCalls, 1);
      expect(find.text('Your 15-minute hold on this time has ended. Please choose a time again.'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('booking_choose_time')));
      await tester.pumpAndSettle();
      expect(find.text('Step 1 of 3'), findsOneWidget);
    });

    testWidgets('a rule refused by the server is shown (notice period)', (tester) async {
      _size(tester);
      final service = _Service()
        ..bookError = const ValidationException(
            'This day is blocked. Minimum booking notice for General Consultation (Video) is 15 day(s).');
      await _openSheet(tester, service, FakeRazorpayCheckoutService());
      await _toReview(tester);
      await _tapPay(tester);

      expect(find.text('This date is too soon for this consultation. Please choose a later date.'), findsOneWidget);
      expect(find.byKey(const ValueKey('booking_choose_time')), findsOneWidget);
    });

    testWidgets('a price changed on the server is shown before the gateway opens', (tester) async {
      _size(tester);
      final service = _Service()..bookAmountPaise = 1800000;
      final razorpay = FakeRazorpayCheckoutService();
      await _openSheet(tester, service, razorpay);
      await _toReview(tester);
      await _tapPay(tester);

      expect(razorpay.openCalls, 0);
      expect(find.textContaining('The price of this consultation is now ₹18,000'), findsOneWidget);
      expect(find.text('Proceed to Pay ₹18,000'), findsOneWidget);

      await _tapPay(tester);
      expect(razorpay.openCalls, 1);
      expect(razorpay.lastOrder!.amount, 1800000);
      expect(service.bookCalls.length, 1);
    });
  });

  group('Payment verification', () {
    Future<void> payWith(WidgetTester tester, _Service service) async {
      _size(tester);
      final razorpay = FakeRazorpayCheckoutService(autoSucceed: true);
      await _openSheet(tester, service, razorpay);
      await _toReview(tester);
      await _tapPay(tester);
    }

    void expectUnderReview(WidgetTester tester) {
      expect(find.text('Your booking is not confirmed yet'), findsOneWidget);
      expect(
        find.text('Your payment is recorded, but we could not confirm this booking. '
            'Our support team will contact you. Please do not pay again.'),
        findsOneWidget,
      );
      expect(find.text('Booking ID: BK-CONF-88'), findsOneWidget);
      expect(find.text('Payment ID: pay_fake_1'), findsOneWidget);
      // No way to pay a second time, and no promise about the money.
      expect(find.byKey(const ValueKey('booking_pay')), findsNothing);
      expect(find.byKey(const ValueKey('booking_verify_retry')), findsNothing);
      expect(find.textContaining(RegExp('refund', caseSensitive: false)), findsNothing);
      expect(find.text('Appointment Confirmed!'), findsNothing);
    }

    testWidgets('PAYMENT_MISMATCH: payment recorded, support will contact', (tester) async {
      final service = _Service()
        ..verifyAnswers = [const ServerException('Payment does not match this order', code: 'PAYMENT_MISMATCH')];
      await payWith(tester, service);
      expectUnderReview(tester);
    });

    testWidgets('409 after an expired hold: payment recorded, support will contact, no refund promised',
        (tester) async {
      final service = _Service()
        ..verifyAnswers = [
          const ServerException(
            'Your payment was received, but this slot is no longer available. '
            'Our team will contact you to reschedule or refund.',
            code: 'CONFLICT',
          ),
        ];
      await payWith(tester, service);
      expectUnderReview(tester);
    });

    testWidgets('server unreachable: "Check again" verifies the same payment and confirms', (tester) async {
      final service = _Service()..verifyAnswers = [const NetworkException('offline'), _confirmed()];
      await payWith(tester, service);

      expect(find.text('Payment received, confirmation pending'), findsOneWidget);
      expect(find.textContaining('Do not pay again'), findsOneWidget);
      expect(find.byKey(const ValueKey('booking_pay')), findsNothing);

      await tester.tap(find.byKey(const ValueKey('booking_verify_retry')));
      await tester.pumpAndSettle();

      expect(service.verifyCalls.length, 2);
      expect(service.verifyCalls.last['razorpayPaymentId'], 'pay_fake_1');
      expect(service.bookCalls.length, 1);
      expect(find.text('Appointment Confirmed!'), findsOneWidget);
    });
  });

  group('My bookings', () {
    ConsultationBookingModel booking(
      String id,
      String status, {
      DateTime? heldUntil,
      String? cancellationReason,
      String? consultationId = 'consult-general-video',
    }) =>
        ConsultationBookingModel(
          id: id,
          bookingReference: '',
          serviceTitle: 'General Consultation (Video)',
          consultationMode: 'VIDEO',
          appointmentDate: '2026-12-01',
          startTime: '11:00',
          endTime: '11:30',
          status: status,
          consultationId: consultationId,
          amountPaise: 1770000,
          gstPaise: 270000,
          reservationExpiresAt: heldUntil,
          cancellationReason: cancellationReason,
        );

    Future<void> openBookings(WidgetTester tester, _Service service) async {
      _size(tester, const Size(800, 3000));
      await tester.pumpWidget(_app(service: service, child: const ConsultScreen(initialTab: ConsultTab.bookings)));
      await tester.pumpAndSettle();
    }

    testWidgets('an unpaid booking shows until when its time is held; an expired one is past and "Not paid"',
        (tester) async {
      final heldUntil = DateTime.now().toUtc().add(const Duration(minutes: 10));
      final service = _Service(myBookings: [
        booking('held', 'PENDING_PAYMENT', heldUntil: heldUntil),
        booking('lapsed', 'PENDING_PAYMENT', heldUntil: DateTime.now().toUtc().subtract(const Duration(minutes: 1))),
        booking('released', 'CANCELLED', cancellationReason: 'RESERVATION_EXPIRED'),
      ]);
      await openBookings(tester, service);

      expect(
        find.text(
            'Payment is not complete. This time is held for you until ${consultationIstTime(heldUntil)} IST.'),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('consult_cancel_held')), findsOneWidget);

      // The two without a live hold are under "Past bookings".
      expect(find.byKey(const ValueKey('consult_cancel_lapsed')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('consult_past_bookings')));
      await tester.pumpAndSettle();
      expect(find.text('Not paid'), findsOneWidget);
      expect(
        find.text('Payment was not completed in time, so this time is no longer held for you.'),
        findsNWidgets(2),
      );
    });

    testWidgets('booking details come from the booking and its invoice', (tester) async {
      final service = _Service(myBookings: [booking('paid', 'CONFIRMED')])
        ..invoice = const ConsultationInvoiceModel(
          bookingId: 'paid',
          invoiceNumber: 'INV-2026-0042',
          taxablePaise: 1500000,
          gstPaise: 270000,
          totalPaise: 1770000,
        );
      await openBookings(tester, service);

      await tester.tap(find.byKey(const ValueKey('consult_details_paid')));
      await tester.pumpAndSettle();

      expect(find.text('Booking details'), findsOneWidget);
      expect(find.text('Confirmed • Booking ID: PAID'), findsOneWidget);
      expect(find.text('Tue, 1 Dec 2026\n11:00 - 11:30 IST'), findsOneWidget);
      expect(find.text('Amount paid'), findsOneWidget);
      expect(find.text('₹17,700'), findsOneWidget);
      expect(find.text('GST in this amount'), findsOneWidget);
      expect(find.text('₹2,700'), findsOneWidget);
      expect(find.text('INV-2026-0042'), findsOneWidget);
    });

    testWidgets('client cannot reschedule from the app (admin only)', (tester) async {
      final service = _Service(myBookings: [booking('b-1', 'CONFIRMED')]);
      await openBookings(tester, service);

      expect(find.byKey(const ValueKey('consult_reschedule_b-1')), findsNothing);
      expect(find.byKey(const ValueKey('consult_cancel_b-1')), findsOneWidget);
    });

    testWidgets('cancel: the confirmation states the payment rule, a refusal is explained', (tester) async {
      final service = _Service(myBookings: [booking('b-1', 'CONFIRMED')])
        ..cancelError = const ValidationException('Booking is already cancelled');
      await openBookings(tester, service);

      await tester.tap(find.byKey(const ValueKey('consult_cancel_b-1')));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('It does not refund a payment automatically; for payment questions, '
            'please contact the office.'),
        findsOneWidget,
      );

      await tester.tap(find.byKey(const ValueKey('consult_cancel_confirm')));
      await tester.pumpAndSettle();
      expect(find.text('This booking is already cancelled or completed.'), findsOneWidget);
    });
  });

  group('Localisation and layout', () {
    testWidgets('Hindi: review, hold note and the "support will contact you" state render without overflow',
        (tester) async {
      _size(tester, const Size(360, 780));
      final service = _Service()
        ..verifyAnswers = [const ServerException('Payment does not match this order', code: 'PAYMENT_MISMATCH')];
      final razorpay = FakeRazorpayCheckoutService();
      await _openSheet(tester, service, razorpay, locale: const Locale('hi'));
      await _toReview(tester);

      expect(find.text('जीएसटी (18%) अतिरिक्त'), findsOneWidget);
      expect(find.textContaining('15 मिनट तक सुरक्षित'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await _tapPay(tester);
      razorpay.succeed();
      await tester.pumpAndSettle();

      expect(find.text('आपकी बुकिंग की अभी पुष्टि नहीं हुई है'), findsOneWidget);
      expect(find.textContaining('हमारी सहायता टीम आपसे संपर्क करेगी'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('English at 320pt with 2.0x text: every step fits', (tester) async {
      _size(tester, const Size(320, 700));
      final service = _Service();
      await tester.pumpWidget(MediaQuery(
        data: const MediaQueryData(size: Size(320, 700), textScaler: TextScaler.linear(2.0)),
        child: _app(
          service: service,
          razorpay: FakeRazorpayCheckoutService(),
          child: const Scaffold(body: BookingFlowSheet(offering: _exclusive)),
        ),
      ));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('10:00 - 10:30 IST'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('booking_next')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.byKey(const ValueKey('booking_next')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
