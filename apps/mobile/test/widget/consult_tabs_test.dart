// Consult tab: "Book a session" / "My bookings" segmented layout (mirrors
// reports_tab_test). Default tab rule, switching, session memory, initialTab,
// and every action on each tab present, large enough and tappable.
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
import 'package:astro_mobile/features/notifications/models/notification_item_model.dart';
import 'package:astro_mobile/features/notifications/widgets/notification_detail_sheet.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/shared/widgets/astro_controls.dart' show AstroSegmentedControl;

import 'phase6_consultations_experience_test.dart'
    show MockConsultationService, TestAuthNotifier, TestBirthProfilesNotifier, testUser;

ConsultationBookingModel _booking(String id, String status) => ConsultationBookingModel(
      id: id,
      bookingReference: 'BK-$id',
      serviceTitle: 'General Consultation (Video)',
      consultationMode: 'VIDEO',
      appointmentDate: '2026-09-10',
      startTime: '11:00',
      endTime: '11:30',
      status: status,
      meetingLink: status == 'CONFIRMED' ? 'https://meet.jit.si/x-$id' : null,
    );

/// Bookings load fails every time.
class _FailingBookings extends MockConsultationService {
  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async => throw Exception('offline');
}

/// Cancelling actually cancels: the next load returns the booking as CANCELLED.
class _CancellingService extends MockConsultationService {
  final Set<String> cancelled = {};

  _CancellingService() : super(myBookings: [_booking('one', 'CONFIRMED')]);

  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async => [
        for (final b in myBookings) cancelled.contains(b.id) ? _booking(b.id, 'CANCELLED') : b,
      ];

  @override
  Future<ConsultationBookingModel> cancelBooking({required String bookingId, String? reason}) async {
    cancelled.add(bookingId);
    return _booking(bookingId, 'CANCELLED');
  }
}

List<Override> _overrides({ConsultationService? service, bool signedIn = true}) => [
      consultationServiceProvider.overrideWithValue(service ?? MockConsultationService()),
      authStateProvider.overrideWith(
        (ref) => TestAuthNotifier(signedIn ? AuthState.authenticated(testUser) : AuthState.unauthenticated()),
      ),
      birthProfilesListNotifierProvider.overrideWith((ref) => TestBirthProfilesNotifier(const [])),
    ];

Widget _material(Widget home) => MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: home,
    );

Widget _pushHost(ConsultTab? initialTab) => Builder(
      builder: (c) => Scaffold(
        body: Center(
          child: TextButton(
            onPressed: () => Navigator.of(c).push(
              MaterialPageRoute(builder: (_) => ConsultScreen(initialTab: initialTab)),
            ),
            child: const Text('go'),
          ),
        ),
      ),
    );

Widget _app({
  ConsultationService? service,
  bool signedIn = true,
  ConsultTab? initialTab,
  bool pushed = false,
}) {
  return ProviderScope(
    overrides: _overrides(service: service, signedIn: signedIn),
    child: _material(pushed ? _pushHost(initialTab) : ConsultScreen(initialTab: initialTab)),
  );
}

const _both = TargetPlatformVariant({TargetPlatform.iOS, TargetPlatform.android});

/// A phone-sized viewport, so the page scrolls under the pinned bar.
void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390 * 2, 844 * 2);
  tester.view.devicePixelRatio = 2.0;
  addTearDown(tester.view.reset);
}

Finder _segment(String label) =>
    find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text(label));

ConsultTab _selected(WidgetTester tester) =>
    tester.widget<AstroSegmentedControl<ConsultTab>>(find.byKey(const ValueKey('consult_tabs'))).selected;

Future<void> _openTab(WidgetTester tester, String label) async {
  await tester.tap(_segment(label));
  await tester.pumpAndSettle();
}

/// Centres [f] in the scroll view: the pinned bar (with the tab switch)
/// covers the top edge.
Future<void> _reveal(WidgetTester tester, Finder f) async {
  await Scrollable.ensureVisible(tester.element(f), alignment: 0.5);
  await tester.pumpAndSettle();
}

Future<void> _checkAll(WidgetTester tester, List<Finder> actions, {double min = 48}) async {
  for (final a in actions) {
    expect(a, findsOneWidget, reason: '$a');
    await _reveal(tester, a);
    expect(a.hitTestable(), findsOneWidget, reason: '$a is not tappable');
    expect(tester.getSize(a).height, greaterThanOrEqualTo(min), reason: '$a is under ${min}pt');
  }
}

/// Platform minimum for the shared expanders (iOS-native disclosure rows):
/// 44pt on iOS (HIG), 48dp on Android.
double get _platformMin => defaultTargetPlatform == TargetPlatform.iOS ? 44.0 : 48.0;

void main() {
  group('default tab', () {
    testWidgets('My bookings when the user has an upcoming booking', (tester) async {
      _phone(tester);
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();

      expect(_selected(tester), ConsultTab.bookings);
      expect(find.byKey(const ValueKey('consult_upcoming_group')), findsOneWidget);
      expect(find.byKey(const ValueKey('consult_service_consult-general-video')), findsNothing);
    }, variant: _both);

    testWidgets('Book a session when the user has no bookings', (tester) async {
      _phone(tester);
      await tester.pumpWidget(_app(service: MockConsultationService(myBookings: const [])));
      await tester.pumpAndSettle();

      expect(_selected(tester), ConsultTab.book);
      expect(find.byKey(const ValueKey('consult_service_consult-budget-friendly')), findsOneWidget);
      expect(find.byKey(const ValueKey('consult_bookings_empty')), findsNothing);
    }, variant: _both);

    testWidgets('Book a session when there are only past bookings', (tester) async {
      _phone(tester);
      await tester.pumpWidget(_app(
          service: MockConsultationService(myBookings: [_booking('a', 'COMPLETED'), _booking('b', 'CANCELLED')])));
      await tester.pumpAndSettle();
      expect(_selected(tester), ConsultTab.book);
    }, variant: _both);

    testWidgets('Book a session when signed out', (tester) async {
      _phone(tester);
      await tester.pumpWidget(_app(signedIn: false));
      await tester.pumpAndSettle();

      expect(_selected(tester), ConsultTab.book);
      expect(find.byKey(const ValueKey('consult_bookings_signin')), findsNothing);
      await _openTab(tester, 'My bookings');
      expect(find.byKey(const ValueKey('consult_bookings_signin')), findsOneWidget);
      expect(find.text('Sign in to see your bookings.'), findsOneWidget);
    }, variant: _both);

    testWidgets('Book a session when the bookings fail to load', (tester) async {
      _phone(tester);
      await tester.pumpWidget(_app(service: _FailingBookings()));
      await tester.pumpAndSettle();

      expect(_selected(tester), ConsultTab.book);
      await _openTab(tester, 'My bookings');
      expect(find.byKey(const ValueKey('consult_bookings_error')), findsOneWidget);
    }, variant: _both);

    testWidgets('stays on My bookings after the last upcoming booking is cancelled', (tester) async {
      _phone(tester);
      await tester.pumpWidget(_app(service: _CancellingService()));
      await tester.pumpAndSettle();
      expect(_selected(tester), ConsultTab.bookings);

      await tester.tap(find.byKey(const ValueKey('consult_cancel_one')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('consult_cancel_confirm')));
      await tester.pumpAndSettle();

      expect(find.text('Appointment cancelled.'), findsOneWidget);
      expect(_selected(tester), ConsultTab.bookings);
      expect(find.text('No upcoming bookings.'), findsOneWidget);
      expect(find.text('Past bookings (1)'), findsOneWidget);
    }, variant: _both);
  });

  testWidgets('switching tabs shows the other part, and the switch stays pinned and tappable', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    await _openTab(tester, 'Book a session');
    expect(find.byKey(const ValueKey('consult_service_consult-general-video')), findsOneWidget);
    expect(find.byKey(const ValueKey('consult_upcoming_group')), findsNothing);

    // Scrolled to the end, the switch is still on screen and tappable.
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -4000));
    await tester.pumpAndSettle();
    expect(_segment('My bookings').hitTestable(), findsOneWidget);
    await _openTab(tester, 'My bookings');
    expect(find.byKey(const ValueKey('consult_upcoming_group')), findsOneWidget);
    expect(find.byKey(const ValueKey('consult_service_consult-general-video')), findsNothing);

    await tester.drag(find.byType(Scrollable).first, const Offset(0, -4000));
    await tester.pumpAndSettle();
    expect(_segment('Book a session').hitTestable(), findsOneWidget);
    await _openTab(tester, 'Book a session');
    expect(find.byKey(const ValueKey('consult_service_consult-general-video')), findsOneWidget);
    expect(tester.takeException(), isNull);
  }, variant: _both);

  testWidgets('the chosen tab is remembered for the session', (tester) async {
    _phone(tester);
    final container = ProviderContainer(overrides: _overrides());
    addTearDown(container.dispose);
    Widget screen() => UncontrolledProviderScope(container: container, child: _material(const ConsultScreen()));

    await tester.pumpWidget(screen());
    await tester.pumpAndSettle();
    expect(_selected(tester), ConsultTab.bookings);
    await _openTab(tester, 'Book a session');
    expect(container.read(consultTabProvider), ConsultTab.book);

    // A fresh Consult screen in the same session opens on the remembered tab,
    // even though the default rule would pick My bookings.
    await tester.pumpWidget(UncontrolledProviderScope(container: container, child: _material(const SizedBox())));
    await tester.pumpWidget(screen());
    await tester.pumpAndSettle();
    expect(_selected(tester), ConsultTab.book);
    expect(find.byKey(const ValueKey('consult_service_consult-general-video')), findsOneWidget);
  }, variant: _both);

  testWidgets('empty My bookings: the button switches to Book a session', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app(service: MockConsultationService(myBookings: const []), initialTab: ConsultTab.bookings));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('consult_bookings_empty')), findsOneWidget);
    expect(find.text('No bookings yet'), findsOneWidget);
    final button = find.byKey(const ValueKey('consult_bookings_empty_book'));
    expect(tester.getSize(button).height, greaterThanOrEqualTo(48));
    await tester.tap(button);
    await tester.pumpAndSettle();

    expect(_selected(tester), ConsultTab.book);
    expect(find.byKey(const ValueKey('consult_bookings_empty')), findsNothing);
    expect(find.byKey(const ValueKey('consult_service_consult-budget-friendly')), findsOneWidget);
  }, variant: _both);

  testWidgets('initialTab opens on the requested tab, as a tab and when pushed', (tester) async {
    _phone(tester);
    // No bookings: the default would be Book a session.
    final empty = MockConsultationService(myBookings: const []);
    await tester.pumpWidget(_app(service: empty, initialTab: ConsultTab.bookings));
    await tester.pumpAndSettle();
    expect(_selected(tester), ConsultTab.bookings);
    expect(find.byKey(const ValueKey('consult_bookings_empty')), findsOneWidget);
    expect(find.byTooltip('Back'), findsNothing);

    // Upcoming bookings: the default would be My bookings.
    await tester.pumpWidget(Container());
    await tester.pumpWidget(_app(pushed: true, initialTab: ConsultTab.book));
    await tester.tap(find.text('go'));
    await tester.pumpAndSettle();
    expect(_selected(tester), ConsultTab.book);
    expect(find.byKey(const ValueKey('consult_service_consult-general-video')), findsOneWidget);
    expect(find.byTooltip('Back'), findsOneWidget);

    await tester.pumpWidget(Container());
    await tester.pumpWidget(_app(service: empty, pushed: true, initialTab: ConsultTab.bookings));
    await tester.tap(find.text('go'));
    await tester.pumpAndSettle();
    expect(_selected(tester), ConsultTab.bookings);
    expect(find.byTooltip('Back'), findsOneWidget);
    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.byType(ConsultScreen), findsNothing);
  }, variant: _both);

  testWidgets('a booking notification opens Consult on My bookings', (tester) async {
    _phone(tester);
    final notification = NotificationItemModel(
      id: 'n1',
      title: 'Your consultation is tomorrow',
      titleHi: 'आपका परामर्श कल है',
      body: 'See your booking.',
      bodyHi: 'अपनी बुकिंग देखें।',
      category: NotificationCategory.values.firstWhere((c) => c.name == 'consultation'),
      timestamp: DateTime.now(),
      routeAction: 'OPEN_APPOINTMENTS',
    );
    await tester.pumpWidget(ProviderScope(
      // No bookings, so only initialTab can explain landing on My bookings.
      overrides: _overrides(service: MockConsultationService(myBookings: const [])),
      child: _material(Builder(
        builder: (c) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => NotificationDetailSheet.show(context: c, notification: notification),
              child: const Text('open'),
            ),
          ),
        ),
      )),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open Details'));
    await tester.pumpAndSettle();

    expect(tester.widget<ConsultScreen>(find.byType(ConsultScreen)).initialTab, ConsultTab.bookings);
    expect(_selected(tester), ConsultTab.bookings);
    expect(find.byKey(const ValueKey('consult_bookings_empty')), findsOneWidget);
  });

  testWidgets('every action on each tab is present, at least 48dp and tappable', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app(
      service: MockConsultationService(myBookings: [
        _booking('up', 'CONFIRMED'),
        _booking('pay', 'PENDING_PAYMENT'),
        _booking('old', 'COMPLETED'),
      ]),
    ));
    await tester.pumpAndSettle();

    // The segments: 44pt on iOS, 48dp on Android, both tappable.
    final minSegment = defaultTargetPlatform == TargetPlatform.iOS ? 44.0 : 48.0;
    for (final label in ['Book a session', 'My bookings']) {
      final seg = find.ancestor(of: _segment(label), matching: find.byType(GestureDetector)).first;
      expect(tester.getSize(seg).height, greaterThanOrEqualTo(minSegment), reason: '$label segment');
      expect(_segment(label).hitTestable(), findsOneWidget);
    }

    const help = ['consult_prepare', 'consult_whatsapp', 'consult_contact'];

    // My bookings (default: there is an upcoming booking).
    expect(_selected(tester), ConsultTab.bookings);
    await _checkAll(tester, [
      for (final k in ['consult_join_up', 'consult_cancel_up', 'consult_cancel_pay'])
        find.byKey(ValueKey(k)),
      for (final k in help) find.byKey(ValueKey(k)),
    ]);
    await _checkAll(tester, [
      find.byKey(const ValueKey('consult_past_bookings')),
      find.byKey(const ValueKey('consult_good_to_know')),
    ], min: _platformMin);
    // Past bookings stay collapsed until asked for.
    expect(find.text('Past bookings (1)'), findsOneWidget);
    expect(find.byKey(const ValueKey('consult_booking_old')), findsNothing);
    await tester.tap(find.text('Past bookings (1)'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('consult_booking_old')), findsOneWidget);

    // Every action still does something: Cancel asks first.
    await _reveal(tester, find.byKey(const ValueKey('consult_cancel_up')));
    await tester.tap(find.byKey(const ValueKey('consult_cancel_up')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('consult_cancel_confirm')), findsOneWidget);
    await tester.tap(find.text('Keep Appointment').last);
    await tester.pumpAndSettle();

    // Book a session.
    await _openTab(tester, 'Book a session');
    await _checkAll(tester, [
      for (final k in ['ALL', 'AUDIO', 'VIDEO', 'IN_PERSON']) find.byKey(ValueKey('consult_filter_$k')),
      for (final sku in [
        'consult-budget-friendly',
        'consult-general-audio',
        'consult-general-video',
        'consult-urgent-video',
        'consult-signature-analysis',
        'consult-in-person-delhi',
      ])
        find.byKey(ValueKey('consult_book_$sku')),
      for (final k in help) find.byKey(ValueKey(k)),
    ]);
    await _checkAll(tester, [find.byKey(const ValueKey('consult_good_to_know'))], min: _platformMin);
    expect(tester.takeException(), isNull);
  }, variant: _both);

  testWidgets('signed out: the sign-in button on My bookings is large enough and tappable', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app(signedIn: false, initialTab: ConsultTab.bookings));
    await tester.pumpAndSettle();
    final signIn = find.descendant(
      of: find.byKey(const ValueKey('consult_bookings_signin')),
      matching: find.text('Sign In'),
    );
    expect(signIn, findsOneWidget);
    expect(signIn.hitTestable(), findsOneWidget);
    final button = find.ancestor(of: signIn, matching: find.byWidgetPredicate((w) => w is ButtonStyleButton)).first;
    expect(tester.getSize(button).height, greaterThanOrEqualTo(48));
  }, variant: _both);

  testWidgets('no overflow at 320pt with 2.0x text on either tab', (tester) async {
    tester.view.physicalSize = const Size(320 * 2, 700 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
    tester.platformDispatcher.textScaleFactorTestValue = 2.0;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await _openTab(tester, 'Book a session');
    expect(tester.takeException(), isNull);
    expect(_segment('My bookings').hitTestable(), findsOneWidget);
  }, variant: _both);
}
