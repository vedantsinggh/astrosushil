// Consult tab: every action is reachable and tappable, plus regression tests
// for the bugs fixed in the simplified redesign.
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/services/consultation_service.dart';
import 'package:astro_mobile/features/consultations/widgets/booking_flow_sheet.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

import 'phase6_consultations_experience_test.dart'
    show MockConsultationService, TestAuthNotifier, TestBirthProfilesNotifier, testUser;

class _FlakyService extends MockConsultationService {
  int catalogCalls = 0;
  int bookingCalls = 0;
  final int failCatalogTimes;
  final int failBookingsTimes;

  _FlakyService({this.failCatalogTimes = 0, this.failBookingsTimes = 0, super.catalog, super.myBookings});

  @override
  Future<List<ConsultationOfferingModel>> fetchCatalog() async {
    catalogCalls++;
    if (catalogCalls <= failCatalogTimes) throw Exception('offline');
    return super.fetchCatalog();
  }

  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async {
    bookingCalls++;
    if (bookingCalls <= failBookingsTimes) throw Exception('offline');
    return super.getMyBookings();
  }
}

ConsultationBookingModel _booking(String id, String status, {String title = 'General Consultation (Video)'}) =>
    ConsultationBookingModel(
      id: id,
      bookingReference: 'BK-$id',
      serviceTitle: title,
      consultationMode: 'VIDEO',
      appointmentDate: '2026-09-10',
      startTime: '11:00',
      endTime: '11:30',
      status: status,
    );

Widget _app({
  Widget child = const ConsultScreen(),
  ConsultationService? service,
  bool signedIn = true,
}) {
  return ProviderScope(
    overrides: [
      consultationServiceProvider.overrideWithValue(service ?? MockConsultationService()),
      authStateProvider.overrideWith(
        (ref) => TestAuthNotifier(signedIn ? AuthState.authenticated(testUser) : AuthState.unauthenticated()),
      ),
      birthProfilesListNotifierProvider.overrideWith((ref) => TestBirthProfilesNotifier(const [])),
    ],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
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

const _bothPlatforms = TargetPlatformVariant(<TargetPlatform>{TargetPlatform.iOS, TargetPlatform.android});

void _tall(WidgetTester tester) {
  tester.view.physicalSize = const Size(800, 6000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
}

/// url_launcher answers over a real platform channel; let it reply.
Future<void> _settleLaunch(WidgetTester tester) async {
  await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 100)));
  await tester.pumpAndSettle();
}

/// Taps a segment of the pinned "Book a session | My bookings" switch.
Future<void> _openTab(WidgetTester tester, String label) async {
  await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text(label)));
  await tester.pumpAndSettle();
}

void _expectTapTarget(WidgetTester tester, Finder f) {
  final size = tester.getSize(f);
  expect(size.height, greaterThanOrEqualTo(48), reason: '$f is ${size.height}px tall');
}

void main() {
  testWidgets('Every action on the Consult tab is present, large enough and does something', (tester) async {
    _tall(tester);
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    // Large iOS-style title
    expect(find.byKey(const ValueKey('consult_nav_bar')), findsOneWidget);
    expect(find.text('Consult'), findsWidgets);

    // Opens on My bookings (the user has an upcoming booking).
    for (final label in ['Book a session', 'My bookings']) {
      final seg = find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text(label));
      expect(seg, findsOneWidget);
    }
    expect(find.byKey(const ValueKey('consult_upcoming_group')), findsOneWidget);
    expect(find.byKey(const ValueKey('consult_filter_ALL')), findsNothing);

    // Join: link cannot be opened in tests, so the user gets told and the link is copied
    final join = find.byKey(const ValueKey('consult_join_bk-123'));
    _expectTapTarget(tester, join);
    await tester.tap(join);
    await tester.pumpAndSettle();
    await _settleLaunch(tester);
    expect(find.textContaining('Could not open the link'), findsOneWidget);

    // Reschedule opens the in-app sheet: current time, the server's open
    // slots, and a confirm button that needs a chosen time.
    final reschedule = find.byKey(const ValueKey('consult_reschedule_bk-123'));
    _expectTapTarget(tester, reschedule);
    await tester.tap(reschedule);
    await tester.pumpAndSettle();
    expect(find.text('Choose a new time'), findsOneWidget);
    expect(find.byKey(const ValueKey('reschedule_current')), findsOneWidget);
    expect(find.byKey(const ValueKey('reschedule_confirm')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('reschedule_close')));
    await tester.pumpAndSettle();
    expect(find.text('Choose a new time'), findsNothing);

    // Details are one tap away on every booking.
    final details = find.byKey(const ValueKey('consult_details_bk-123'));
    _expectTapTarget(tester, details);
    await tester.tap(details);
    await tester.pumpAndSettle();
    expect(find.text('Booking details'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('booking_detail_close')));
    await tester.pumpAndSettle();

    // Cancel asks first
    final cancel = find.byKey(const ValueKey('consult_cancel_bk-123'));
    _expectTapTarget(tester, cancel);
    await tester.tap(cancel);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('consult_cancel_confirm')), findsOneWidget);
    await tester.tap(find.text('Keep Appointment'));
    await tester.pumpAndSettle();

    // Book a session: mode filters and Book Now
    await _openTab(tester, 'Book a session');
    for (final k in ['ALL', 'AUDIO', 'VIDEO', 'IN_PERSON']) {
      final f = find.byKey(ValueKey('consult_filter_$k'));
      expect(f, findsOneWidget);
      _expectTapTarget(tester, f);
    }

    // Book opens the 3-step booking sheet
    final book = find.byKey(const ValueKey('consult_book_consult-general-video'));
    _expectTapTarget(tester, book);
    await tester.tap(book);
    await tester.pumpAndSettle();
    expect(find.byType(BookingFlowSheet), findsOneWidget);
    expect(find.text('Step 1 of 3'), findsOneWidget);
    Navigator.of(tester.element(find.byType(BookingFlowSheet))).pop();
    await tester.pumpAndSettle();
    expect(find.byType(BookingFlowSheet), findsNothing);

    // Help rows
    final prepare = find.byKey(const ValueKey('consult_prepare'));
    _expectTapTarget(tester, prepare);
    final prepareInk = find.descendant(of: prepare, matching: find.byType(InkWell));
    expect(tester.widget<InkWell>(prepareInk.first).onTap, isNotNull);

    final whatsapp = find.byKey(const ValueKey('consult_whatsapp'));
    _expectTapTarget(tester, whatsapp);
    await tester.tap(whatsapp);
    await tester.pumpAndSettle();
    await _settleLaunch(tester);
    // WhatsApp unavailable -> office contact sheet as fallback
    expect(find.byKey(const ValueKey('consult_call_office')), findsOneWidget);
    await tester.tap(find.text('Close').last);
    await tester.pumpAndSettle();

    final contact = find.byKey(const ValueKey('consult_contact'));
    _expectTapTarget(tester, contact);
    await tester.tap(contact);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('consult_email_office')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('consult_call_office')));
    await tester.pumpAndSettle();
    await _settleLaunch(tester);
    expect(find.text('Phone number copied'), findsOneWidget);

    // Good to know expander holds the detail
    expect(find.text('All times are in Indian Standard Time (IST / UTC+05:30)'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('consult_good_to_know')));
    await tester.pumpAndSettle();
    expect(find.text('All times are in Indian Standard Time (IST / UTC+05:30)'), findsOneWidget);
  }, variant: _bothPlatforms);

  testWidgets('Choice sheets follow the platform: action sheet on iOS, M3 bottom sheet on Android', (tester) async {
    _tall(tester);
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('consult_cancel_bk-123')));
    await tester.pumpAndSettle();
    final ios = debugDefaultTargetPlatformOverride == TargetPlatform.iOS;
    expect(find.byType(CupertinoActionSheet), ios ? findsOneWidget : findsNothing);
    expect(find.byType(BottomSheet), ios ? findsNothing : findsOneWidget);
    expect(find.byKey(const ValueKey('consult_cancel_confirm')), findsOneWidget);

    // Physics: bounce on iOS only.
    await tester.tap(find.text('Keep Appointment').last);
    await tester.pumpAndSettle();
    final scroll = tester.widget<CustomScrollView>(find.byType(CustomScrollView));
    expect(scroll.physics is BouncingScrollPhysics, ios);
  }, variant: _bothPlatforms);

  testWidgets('Bug: guests could open booking and payment; now asked to sign in first', (tester) async {
    _tall(tester);
    final service = _FlakyService();
    await tester.pumpWidget(_app(service: service, signedIn: false));
    await tester.pumpAndSettle();

    // Signed out: opens on Book a session; the sign-in card is under My bookings.
    expect(find.text('Sign in to see your bookings.'), findsNothing);
    await _openTab(tester, 'My bookings');
    expect(find.text('Sign in to see your bookings.'), findsOneWidget);
    expect(service.bookingCalls, 0);
    await _openTab(tester, 'Book a session');

    await tester.tap(find.byKey(const ValueKey('consult_book_consult-general-video')));
    await tester.pumpAndSettle();
    expect(find.byType(BookingFlowSheet), findsNothing);
    expect(find.byType(BottomSheet), findsOneWidget);
  });

  testWidgets('Bug: NO_SHOW / REFUNDED were labelled "Rescheduled"; past bookings are collapsed', (tester) async {
    _tall(tester);
    final service = _FlakyService(myBookings: [
      _booking('a', 'COMPLETED', title: 'Done Session'),
      _booking('b', 'CANCELLED'),
      _booking('c', 'NO_SHOW'),
      _booking('d', 'REFUNDED'),
    ]);
    await tester.pumpWidget(_app(service: service));
    await tester.pumpAndSettle();
    await _openTab(tester, 'My bookings');

    expect(find.text('No upcoming bookings.'), findsOneWidget);
    expect(find.text('Past bookings (4)'), findsOneWidget);
    expect(find.text('Done Session'), findsNothing);

    await tester.tap(find.text('Past bookings (4)'));
    await tester.pumpAndSettle();
    expect(find.text('Done Session'), findsOneWidget);
    expect(find.text('Completed'), findsOneWidget);
    expect(find.text('Cancelled'), findsOneWidget);
    expect(find.text('Missed'), findsOneWidget);
    expect(find.text('Refunded'), findsOneWidget);
    expect(find.text('Rescheduled'), findsNothing);
    // Past bookings offer no actions.
    expect(find.byKey(const ValueKey('consult_cancel_b')), findsNothing);
  });

  testWidgets('Bug: catalogue error was wiped by the bookings load; now stays with Try Again', (tester) async {
    _tall(tester);
    final service = _FlakyService(failCatalogTimes: 1);
    await tester.pumpWidget(_app(service: service));
    await tester.pumpAndSettle();

    expect(service.bookingCalls, 1);
    await _openTab(tester, 'Book a session');
    expect(find.byKey(const ValueKey('consult_catalog_error')), findsOneWidget);
    expect(find.textContaining('No consultations are open'), findsNothing);

    await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_catalog_error')), matching: find.text('Try Again')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('consult_catalog_error')), findsNothing);
    expect(find.text('Budget Friendly Consultation'), findsOneWidget);
  });

  testWidgets('Bug: failed bookings load looked like "no appointments"; now an error with Try Again', (tester) async {
    _tall(tester);
    final service = _FlakyService(failBookingsTimes: 1);
    await tester.pumpWidget(_app(service: service));
    await tester.pumpAndSettle();
    await _openTab(tester, 'My bookings');

    expect(find.byKey(const ValueKey('consult_bookings_error')), findsOneWidget);
    expect(find.text('No consultation appointments found.'), findsNothing);

    await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_bookings_error')), matching: find.text('Try Again')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('consult_bookings_error')), findsNothing);
    expect(find.text('Ref: BK-TEST-1'), findsOneWidget);
  });

  testWidgets('Services that are unavailable or have no price cannot be booked', (tester) async {
    _tall(tester);
    final service = _FlakyService(catalog: const [
      ConsultationOfferingModel(
        sku: 'no-price',
        title: 'No Price Service',
        description: '',
        mode: 'AUDIO',
        durationMinutes: 30,
        pricePaise: 0,
        responseDaysNotice: 7,
        category: 'Audio',
      ),
      ConsultationOfferingModel(
        sku: 'closed',
        title: 'Closed Service',
        description: '',
        mode: 'VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 7,
        category: 'Video',
        isAvailable: false,
      ),
    ]);
    await tester.pumpWidget(_app(service: service));
    await tester.pumpAndSettle();
    await _openTab(tester, 'Book a session');

    expect(find.text('Price not available'), findsOneWidget);
    expect(find.text('₹0'), findsNothing);
    final book = tester.widget<ElevatedButton>(find.byKey(const ValueKey('consult_book_no-price')));
    expect(book.onPressed, isNull);
    expect(find.text('Not available now'), findsOneWidget);
    expect(find.byKey(const ValueKey('consult_book_closed')), findsNothing);
  });

  testWidgets('When pushed as a page it shows a labelled Back button that pops', (tester) async {
    _tall(tester);
    await tester.pumpWidget(_app(
      child: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ConsultScreen())),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    // Shared adaptive back button: labelled "Back" (tooltip / semantics).
    expect(find.byTooltip('Back'), findsOneWidget);
    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.byType(ConsultScreen), findsNothing);
  });

  test('Bug: booking JSON from the API (title/mode/date/primaryQuestion) was dropped', () {
    final b = ConsultationBookingModel.fromJson(const {
      'id': 'b1',
      'title': 'Standard Consultation (Video)',
      'mode': 'VIDEO',
      'date': '2026-12-02',
      'startTime': '10:00',
      'endTime': '10:30',
      'status': 'CONFIRMED',
      'primaryQuestion': 'Career change?',
      'birthProfile': {'name': 'Rahul Sharma'},
    });
    expect(b.serviceTitle, 'Standard Consultation (Video)');
    expect(b.consultationMode, 'VIDEO');
    expect(b.appointmentDate, '2026-12-02');
    expect(b.query, 'Career change?');
    expect(b.birthProfileName, 'Rahul Sharma');

    // Legacy keys still win when present.
    final legacy = ConsultationBookingModel.fromJson(const {
      'id': 'b2',
      'serviceTitle': 'Legacy',
      'title': 'Ignored',
      'appointmentDate': '2026-01-01',
      'status': 'CONFIRMED',
    });
    expect(legacy.serviceTitle, 'Legacy');
    expect(legacy.appointmentDate, '2026-01-01');
  });
}
