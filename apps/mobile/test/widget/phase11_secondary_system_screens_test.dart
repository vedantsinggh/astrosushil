import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/features/notifications/screens/notifications_screen.dart';
import 'package:astro_mobile/features/notifications/widgets/notification_detail_sheet.dart';
import 'package:astro_mobile/features/support/screens/help_support_screen.dart';
import 'package:astro_mobile/features/legal/screens/legal_documents_screen.dart';
import 'package:astro_mobile/shared/screens/not_found_screen.dart';
import 'package:astro_mobile/shared/screens/system_maintenance_screen.dart';
import 'package:astro_mobile/shared/screens/network_error_screen.dart';
import 'package:astro_mobile/features/auth/screens/register_success_screen.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

Widget _buildTestApp({
  required Widget child,
  Locale locale = const Locale('en'),
  double textScaleFactor = 1.0,
  List<Override> overrides = const [],
}) {
  return ProviderScope(
    overrides: [
      secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
      ...overrides,
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
      home: Builder(
        builder: (context) {
          final mq = MediaQuery.of(context);
          return MediaQuery(
            data: mq.copyWith(textScaler: TextScaler.linear(textScaleFactor)),
            child: child,
          );
        },
      ),
    ),
  );
}

void main() {
  group('Phase 11: Notifications Inbox & Detail Sheet', () {
    testWidgets('renders notifications screen with categories and list items', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const NotificationsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Notifications'), findsOneWidget);
      expect(find.textContaining('All'), findsOneWidget);
      expect(find.byType(ListView), findsOneWidget);

      // Verify notification title exists
      expect(find.textContaining('Rahu Kaal'), findsWidgets);
    });

    testWidgets('filters notifications when category chip tapped', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const NotificationsScreen()));
      await tester.pumpAndSettle();

      // Scroll horizontally to bring Transits chip into viewport
      await tester.drag(find.textContaining('All'), const Offset(-200, 0));
      await tester.pumpAndSettle();

      final transitChip = find.textContaining('Transits');
      expect(transitChip, findsOneWidget);
      await tester.tap(transitChip);
      await tester.pumpAndSettle();

      // Should show transit notification
      expect(find.textContaining('Planetary Transit (Gochara) Update'), findsOneWidget);
    });

    testWidgets('mark all as read updates unread indicators', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const NotificationsScreen()));
      await tester.pumpAndSettle();

      // Tap mark all read icon button in app bar
      final markReadBtn = find.byIcon(Icons.done_all_rounded);
      expect(markReadBtn, findsOneWidget);
      await tester.tap(markReadBtn);
      await tester.pumpAndSettle();

      // Snackbar should appear
      expect(find.text('All notifications marked as read'), findsOneWidget);
    });

    testWidgets('tapping notification opens NotificationDetailSheet modal', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const NotificationsScreen()));
      await tester.pumpAndSettle();

      final firstNotification = find.textContaining('Rahu Kaal').first;
      await tester.tap(firstNotification);
      await tester.pumpAndSettle();

      expect(find.byType(NotificationDetailSheet), findsOneWidget);
      expect(find.text('Close'), findsOneWidget);
      expect(find.text('Open Details'), findsOneWidget);
    });
  });

  group('Phase 11: Help, FAQs & Support Hub', () {
    testWidgets('renders support hero with WhatsApp number and FAQs', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const HelpSupportScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Help & Support'), findsOneWidget);
      expect(find.text('Official WhatsApp Support'), findsOneWidget);
      expect(find.text('+91 9621127233'), findsOneWidget);
      expect(find.text('Frequently Asked Questions'), findsOneWidget);
    });

    testWidgets('expands FAQ item on tap and toggles answer', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const HelpSupportScreen()));
      await tester.pumpAndSettle();

      // Find an FAQ item and tap it
      final faqQuestion = find.textContaining('How are planetary positions');
      expect(faqQuestion, findsOneWidget);
      await tester.tap(faqQuestion);
      await tester.pumpAndSettle();

      expect(find.textContaining('deterministic ephemeris algorithms'), findsOneWidget);
    });

    testWidgets('feedback modal sheet opens and accepts input', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const HelpSupportScreen()));
      await tester.pumpAndSettle();

      // Drag up to expose bottom of the support screen
      await tester.drag(find.byType(HelpSupportScreen), const Offset(0, -600));
      await tester.pumpAndSettle();

      final feedbackBtn = find.text('Send Feedback');
      expect(feedbackBtn, findsOneWidget);
      await tester.tap(feedbackBtn);
      await tester.pumpAndSettle();

      expect(find.text('Share Feedback or Query'), findsOneWidget);
      expect(find.text('Submit Feedback'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });
  });

  group('Phase 11: Legal Documents & Policies Hub', () {
    testWidgets('renders legal documents selector chips and privacy sections', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const LegalDocumentsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Policies & Terms'), findsOneWidget);
      expect(find.textContaining('Privacy'), findsWidgets);
      expect(find.textContaining('Terms'), findsWidgets);
      expect(find.textContaining('Refund'), findsWidgets);
      expect(find.textContaining('Shipping'), findsWidgets);

      // Verify privacy policy content is displayed
      expect(find.textContaining('Birth Data Privacy'), findsOneWidget);
    });

    testWidgets('switches to Refund & Cancellation policy on chip tap', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const LegalDocumentsScreen()));
      await tester.pumpAndSettle();

      // Scroll horizontally to bring Refund chip into viewport
      await tester.drag(find.textContaining('Privacy').first, const Offset(-300, 0));
      await tester.pumpAndSettle();

      final refundChip = find.textContaining('Refund');
      expect(refundChip, findsOneWidget);
      await tester.tap(refundChip);
      await tester.pumpAndSettle();

      expect(find.textContaining('Personalized PDF Reports'), findsOneWidget);
    });
  });

  group('Phase 11: System Screens (NotFound, Maintenance, NetworkError)', () {
    testWidgets('NotFoundScreen renders celestial recovery UI and return CTA', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const NotFoundScreen(routePath: '/unknown/test')));
      await tester.pumpAndSettle();

      expect(find.text('Lost in the Cosmos'), findsOneWidget);
      expect(find.textContaining('/unknown/test'), findsOneWidget);
      expect(find.text('Return to Home'), findsOneWidget);
    });

    testWidgets('SystemMaintenanceScreen renders scheduled upgrade details', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      var refreshed = false;
      await tester.pumpWidget(_buildTestApp(
        child: SystemMaintenanceScreen(onRefresh: () => refreshed = true),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Scheduled Maintenance'), findsOneWidget);
      expect(find.text('Check Status / Refresh'), findsOneWidget);
      expect(find.textContaining('accessible offline'), findsOneWidget);

      await tester.tap(find.text('Check Status / Refresh'));
      await tester.pumpAndSettle();
      expect(refreshed, isTrue);
    });

    testWidgets('NetworkErrorScreen renders offline state and retry button', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      var retried = false;
      await tester.pumpWidget(_buildTestApp(
        child: NetworkErrorScreen(onRetry: () => retried = true),
      ));
      await tester.pumpAndSettle();

      expect(find.text("You're offline"), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);

      await tester.tap(find.text('Try Again'));
      await tester.pumpAndSettle();
      expect(retried, isTrue);
    });
  });

  group('Phase 11: Secondary Screen Modernization (RegisterSuccessScreen)', () {
    testWidgets('RegisterSuccessScreen renders congratulations emblem and Get Started CTA', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(child: const RegisterSuccessScreen()));
      await tester.pumpAndSettle();

      expect(find.textContaining('Welcome to Astro Sushil'), findsOneWidget);
      expect(find.text('Get Started'), findsOneWidget);
    });
  });

  group('Phase 11: Responsive Viewports, Scaling, and Localization', () {
    for (final width in [320.0, 360.0, 390.0, 414.0]) {
      testWidgets('NotificationsScreen renders cleanly at ${width}dp width', (tester) async {
        tester.view.physicalSize = Size(width * 2, 800 * 2);
        tester.view.devicePixelRatio = 2.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(_buildTestApp(child: const NotificationsScreen()));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
      });

      testWidgets('HelpSupportScreen renders cleanly at ${width}dp width', (tester) async {
        tester.view.physicalSize = Size(width * 2, 800 * 2);
        tester.view.devicePixelRatio = 2.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(_buildTestApp(child: const HelpSupportScreen()));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('HelpSupportScreen renders at 2.0x font scaling without overflow', (tester) async {
      tester.view.physicalSize = const Size(360 * 2, 800 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(
        child: const HelpSupportScreen(),
        textScaleFactor: 2.0,
      ));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });

    testWidgets('NotificationsScreen renders correctly in Hindi', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestApp(
        child: const NotificationsScreen(),
        locale: const Locale('hi'),
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('सूचनाएं'), findsOneWidget);
      expect(find.textContaining('सभी'), findsOneWidget);
    });
  });
}
