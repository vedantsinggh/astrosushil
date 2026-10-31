import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/features/notifications/models/notification_item_model.dart';
import 'package:astro_mobile/features/notifications/providers/notifications_provider.dart';
import 'package:astro_mobile/features/notifications/screens/notifications_screen.dart';
import 'package:astro_mobile/features/notifications/widgets/notification_detail_sheet.dart';
import 'package:astro_mobile/features/support/screens/help_support_screen.dart';
import 'package:astro_mobile/features/legal/screens/legal_documents_screen.dart';
import 'package:astro_mobile/shared/screens/not_found_screen.dart';
import 'package:astro_mobile/shared/screens/system_maintenance_screen.dart';
import 'package:astro_mobile/features/auth/screens/register_success_screen.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

void main() {
  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_11');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  Widget buildCaptureApp({
    required GlobalKey boundaryKey,
    required Widget child,
    List<Override> overrides = const [],
    Locale locale = const Locale('en'),
    double textScaleFactor = 1.0,
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
              child: RepaintBoundary(
                key: boundaryKey,
                child: Scaffold(
                  backgroundColor: const Color(0xFFFBF8F3),
                  body: child,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> captureToFile(
    WidgetTester tester,
    GlobalKey boundaryKey,
    String filename,
  ) async {
    await tester.runAsync(() async {
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final file = File('${outDir.path}/$filename');
        await file.writeAsBytes(byteData.buffer.asUint8List());
      }
    });
  }

  group('Phase 11: Headless Screenshot Capture Suite', () {
    testWidgets('Capture 01_notifications_inbox', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const NotificationsScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '01_notifications_inbox.png');
    });

    testWidgets('Capture 02_notification_detail_sheet', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final sampleNotification = NotificationItemModel(
        id: 'notif-cap-1',
        title: 'Rahu Kaal Alert Today',
        titleHi: 'आज का राहु काल अलर्ट',
        body: 'Rahu Kaal period begins at 16:30 today in New Delhi. Avoid commencing major new undertakings.',
        bodyHi: 'नई दिल्ली में आज राहु काल 16:30 बजे प्रारंभ होगा। इस अवधि में नए शुभ कार्यों से बचें।',
        category: NotificationCategory.panchang,
        timestamp: DateTime(2026, 10, 15, 16, 0),
        routeAction: '/panchanga',
      );

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: NotificationDetailSheet(notification: sampleNotification),
        ),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '02_notification_detail_sheet.png');
    });

    testWidgets('Capture 03_notifications_empty_state', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      // Create empty notification container state
      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        overrides: [
          notificationsNotifierProvider.overrideWith((ref) => NotificationsNotifier()..clearAll()),
        ],
        child: const NotificationsScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '03_notifications_empty_state.png');
    });

    testWidgets('Capture 04_help_support_hub', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const HelpSupportScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '04_help_support_hub.png');
    });

    testWidgets('Capture 05_legal_documents_privacy', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const LegalDocumentsScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '05_legal_documents_privacy.png');
    });

    testWidgets('Capture 06_system_maintenance_screen', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const SystemMaintenanceScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '06_system_maintenance_screen.png');
    });

    testWidgets('Capture 07_route_not_found_recovery', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const NotFoundScreen(routePath: '/deeplink/kundli/invalid_token'),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '07_route_not_found_recovery.png');
    });

    testWidgets('Capture 08_register_success_hindi_2x', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        locale: const Locale('hi'),
        textScaleFactor: 1.5,
        child: const RegisterSuccessScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '08_register_success_hindi_2x.png');
    });
  });
}
