import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import 'package:astro_mobile/features/reports/models/report_catalog_model.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/report_catalog_provider.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/reports/screens/report_detail_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_generation_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_pdf_viewer_screen.dart';
import 'package:astro_mobile/features/reports/services/reports_service.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

import '../helpers/report_catalog_fixture.dart';

final _profile = BirthProfileModel(
  id: 'bp_1',
  userId: 'u_1',
  name: 'Rahul Sharma',
  dateOfBirth: '1990-05-15',
  timeOfBirth: '14:30:00',
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata',
  placeName: 'New Delhi, India',
  createdAt: DateTime(2026, 1, 1),
  updatedAt: DateTime(2026, 1, 1),
);

final _partner = BirthProfileModel(
  id: 'bp_2',
  userId: 'u_1',
  name: 'Priya Patel',
  dateOfBirth: '1992-08-20',
  timeOfBirth: '09:15:00',
  latitude: 19.0760,
  longitude: 72.8777,
  timezone: 'Asia/Kolkata',
  placeName: 'Mumbai, India',
  createdAt: DateTime(2026, 1, 2),
  updatedAt: DateTime(2026, 1, 2),
);

UserReportItemModel _report(String id, String type, String status,
        {int progress = 0, String? err, String? partnerId, String? partnerName, String? language}) =>
    UserReportItemModel(
      id: id,
      userId: 'u_1',
      birthProfileId: 'bp_1',
      profileName: 'Rahul Sharma',
      reportType: type,
      status: status,
      stage: status,
      progress: progress,
      errorMessage: err,
      createdAt: DateTime(2026, 3, 15, 10, 30),
      partnerProfileId: partnerId,
      partnerName: partnerName,
      language: language,
    );

final _ready = _report('rep_ready', 'KUNDLI', 'COMPLETED', progress: 100);
final _preparing = _report('rep_prep', 'CAREER', 'ANALYZING', progress: 45);
final _failed = _report('rep_fail', 'MARRIAGE_COMPATIBILITY', 'FAILED',
    err: 'Ephemeris calculation timeout', partnerId: 'bp_2', partnerName: 'Priya Patel');

class _Profiles extends StateNotifier<BirthProfilesState> implements BirthProfilesNotifier {
  _Profiles(List<BirthProfileModel> p) : super(BirthProfilesState(isLoading: false, profiles: p));

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakeApiClient extends Fake implements ApiClient {}

class _Gen extends ReportGenerationNotifier {
  final List<Map<String, Object?>> jobs = [];
  final String? nextId;

  _Gen({this.nextId = 'rep_new'}) : super(ReportsService(apiClient: _FakeApiClient()));

  @override
  Future<String?> createReportJob({
    required String birthProfileId,
    required String reportType,
    String? partnerProfileId,
    String? orderId,
    bool forceRegenerate = false,
  }) async {
    jobs.add({
      'birthProfileId': birthProfileId,
      'reportType': reportType,
      'partnerProfileId': partnerProfileId,
      'forceRegenerate': forceRegenerate,
    });
    if (nextId == null) {
      state = state.copyWith(errorMessage: 'Payment or entitlement required to access this report');
    }
    return nextId;
  }

  @override
  void startPolling(String reportId) {}

  @override
  void stopPolling() {}

  @override
  Future<Uint8List?> downloadAndCachePdf(String reportId) async => null;
}

void main() {
  late int reportFetches;

  Widget app({
    List<UserReportItemModel> reports = const [],
    List<BirthProfileModel>? profiles,
    _Gen? gen,
    bool reportsError = false,
    bool catalogError = false,
    bool pushed = false,
    ReportsTab? initialTab,
    Map<String, dynamic>? catalogResponse,
  }) {
    final ps = profiles ?? [_profile, _partner];
    return ProviderScope(
      overrides: [
        if (catalogError)
          reportCatalogProvider.overrideWith((ref) async => throw Exception('offline'))
        else if (catalogResponse != null)
          reportCatalogProvider.overrideWith((ref) async => parseReportCatalog(catalogResponse))
        else
          reportCatalogTestOverride,
        birthProfilesListNotifierProvider.overrideWith((ref) => _Profiles(ps)),
        selectedBirthProfileProvider.overrideWith((ref) => ps.isEmpty ? null : ps.first),
        userReportsProvider.overrideWith((ref) async {
          reportFetches++;
          if (reportsError) throw Exception('offline');
          return reports;
        }),
        reportGenerationNotifierProvider.overrideWith((ref) => gen ?? _Gen()),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en'), Locale('hi')],
        home: pushed
            ? Builder(
                builder: (c) => Scaffold(
                  body: Center(
                    child: TextButton(
                      onPressed: () => Navigator.of(c).push(
                        MaterialPageRoute(builder: (_) => ReportsScreen(initialTab: initialTab)),
                      ),
                      child: const Text('go'),
                    ),
                  ),
                ),
              )
            : ReportsScreen(initialTab: initialTab),
      ),
    );
  }

  /// Centres [f] in the scroll view: the pinned large-title bar (with the
  /// tab switch) covers the top edge.
  Future<void> reveal(WidgetTester tester, Finder f) async {
    await Scrollable.ensureVisible(tester.element(f), alignment: 0.5);
    await tester.pumpAndSettle();
  }

  Future<void> openTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(of: find.byKey(const ValueKey('reports-tabs')), matching: find.text(label)));
    await tester.pumpAndSettle();
  }

  setUp(() => reportFetches = 0);

  Future<void> setSize(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390 * 2, 1400 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
  }

  testWidgets('every action on the Reports tab is present and tappable', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(reports: [_ready, _preparing, _failed]));
    await tester.pumpAndSettle();

    Future<void> checkAll(List<Finder> actions) async {
      for (final a in actions) {
        expect(a, findsOneWidget);
        await reveal(tester, a);
        expect(a.hitTestable(), findsOneWidget);
        final size = tester.getSize(a);
        expect(size.height, greaterThanOrEqualTo(48));
      }
    }

    // "My reports" tab (default when the user has reports).
    await checkAll([
      find.byKey(const ValueKey('my-report-open-rep_ready')),
      find.byKey(const ValueKey('my-report-progress-rep_prep')),
      find.byKey(const ValueKey('my-report-retry-rep_fail')),
      for (final f in ['all', 'ready', 'preparing', 'failed']) find.byKey(ValueKey('reports-filter-$f')),
    ]);

    // "Get a report" tab: all 13 canonical Astro Sushil reports.
    await openTab(tester, 'Get a report');
    await checkAll([
      for (final t in [
        'KUNDLI',
        'CAREER',
        'MARRIAGE_COMPATIBILITY',
        'FINANCE',
        'LOVE',
        'FORTUNE',
        'FORTUNE_PLUS',
        'HOROSCOPE',
        'SATURN',
        'JUPITER_TRANSIT',
        'RAHU_KETU_TRANSIT',
        'VARSHPHAL',
        'BABY_NAME',
      ])
        find.byKey(ValueKey('report-offer-$t')),
    ]);
    // One clear action per report: no broken empty-PDF "Share" button.
    expect(find.text('Share'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('offer card opens the report detail flow with server title and price', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    final card = find.byKey(const ValueKey('report-offer-KUNDLI'));
    await reveal(tester, card);
    await tester.tap(card);
    await tester.pumpAndSettle();

    final detail = tester.widget<ReportDetailScreen>(find.byType(ReportDetailScreen));
    expect(detail.reportType, 'KUNDLI');
    expect(detail.title, 'Premium Personalised Kundli Report');
    expect(detail.priceText, '₹299');
    expect(detail.pricePaise, 29900);
    expect(detail.initialProfile.id, 'bp_1');
  });

  testWidgets('the languages offered before payment come from the catalogue', (tester) async {
    await setSize(tester);
    Map<String, dynamic> item(String type, List<String> languages) => {
          'id': 'report-${type.toLowerCase()}',
          'itemType': 'REPORT',
          'title': '$type report',
          'pricePaise': 29900,
          'currency': 'INR',
          'isActive': true,
          'legacyReportType': type,
          'languages': languages,
        };
    await tester.pumpWidget(app(
      catalogResponse: {
        'items': [
          item('KUNDLI', ['en', 'hi']),
          item('CAREER', ['en']),
        ],
      },
    ));
    await tester.pumpAndSettle();

    final kundli = find.byKey(const ValueKey('report-offer-KUNDLI'));
    await reveal(tester, kundli);
    await tester.tap(kundli);
    await tester.pumpAndSettle();
    expect(tester.widget<ReportDetailScreen>(find.byType(ReportDetailScreen)).availableLanguages, ['en', 'hi']);
    expect(find.byKey(const ValueKey('report_language_hi')), findsOneWidget);

    Navigator.of(tester.element(find.byType(ReportDetailScreen))).pop();
    await tester.pumpAndSettle();

    final career = find.byKey(const ValueKey('report-offer-CAREER'));
    await reveal(tester, career);
    await tester.tap(career);
    await tester.pumpAndSettle();
    expect(tester.widget<ReportDetailScreen>(find.byType(ReportDetailScreen)).availableLanguages, ['en']);
    // Hindi is not offered for a report the catalogue lists in English only.
    expect(find.byKey(const ValueKey('report_language_hi')), findsNothing);
  });

  testWidgets('My reports shows the language each report was bought in', (tester) async {
    await setSize(tester);
    final hindi = _report('rep_hi', 'KUNDLI', 'COMPLETED', progress: 100, language: 'hi');
    final english = _report('rep_en', 'CAREER', 'ANALYZING', progress: 45, language: 'en');
    await tester.pumpWidget(app(reports: [hindi, english, _failed]));
    await tester.pumpAndSettle();

    expect(
      find.descendant(
        of: find.byKey(const ValueKey('my-report-rep_hi')),
        matching: find.text('Language: हिन्दी (Hindi)'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(of: find.byKey(const ValueKey('my-report-rep_en')), matching: find.text('Language: English')),
      findsOneWidget,
    );
    // The server did not state a language for this one: none is invented.
    expect(find.byKey(const ValueKey('my-report-language-rep_fail')), findsNothing);
  });

  testWidgets('an opened report shows its language', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(reports: [_report('rep_hi', 'KUNDLI', 'COMPLETED', progress: 100, language: 'hi')]));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('my-report-open-rep_hi')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(tester.widget<ReportPdfViewerScreen>(find.byType(ReportPdfViewerScreen)).language, 'hi');
    expect(tester.widget<Text>(find.byKey(const ValueKey('report-pdf-language'))).data, 'Language: हिन्दी (Hindi)');
  });

  testWidgets('Open report opens the PDF viewer for that report', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(reports: [_ready]));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('my-report-open-rep_ready')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    final viewer = tester.widget<ReportPdfViewerScreen>(find.byType(ReportPdfViewerScreen));
    expect(viewer.reportId, 'rep_ready');
  });

  testWidgets('bug: See progress opens the progress screen instead of only a snackbar', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(reports: [_preparing]));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('my-report-progress-rep_prep')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    final gen = tester.widget<ReportGenerationScreen>(find.byType(ReportGenerationScreen));
    expect(gen.reportId, 'rep_prep');
    expect(gen.profile.id, 'bp_1');
  });

  testWidgets('bug: Try again keeps the partner profile and opens progress for the new job', (tester) async {
    await setSize(tester);
    final gen = _Gen();
    await tester.pumpWidget(app(reports: [_failed], gen: gen));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('my-report-retry-rep_fail')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(gen.jobs, hasLength(1));
    expect(gen.jobs.single['partnerProfileId'], 'bp_2');
    expect(gen.jobs.single['reportType'], 'MARRIAGE_COMPATIBILITY');
    expect(gen.jobs.single['forceRegenerate'], true);

    final screen = tester.widget<ReportGenerationScreen>(find.byType(ReportGenerationScreen));
    expect(screen.reportId, 'rep_new');
    expect(screen.partnerProfile?.id, 'bp_2');
  });

  testWidgets('bug: a failed Try again tells the user why', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(reports: [_failed], gen: _Gen(nextId: null)));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('my-report-retry-rep_fail')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Payment or entitlement required to access this report'), findsOneWidget);
    expect(find.byType(ReportGenerationScreen), findsNothing);
  });

  testWidgets('bug: My reports reloads after returning from a report flow', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    final before = reportFetches;

    final card = find.byKey(const ValueKey('report-offer-CAREER'));
    await reveal(tester, card);
    await tester.tap(card);
    await tester.pumpAndSettle();
    expect(find.byType(ReportDetailScreen), findsOneWidget);

    tester.state<NavigatorState>(find.byType(Navigator).first).pop();
    await tester.pumpAndSettle();

    expect(reportFetches, greaterThan(before));
  });

  testWidgets('no birth profile: one Add button, and offers lead to profile creation', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(profiles: const []));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('reports-no-profile')), findsOneWidget);
    expect(find.text('Add birth details'), findsOneWidget);
    expect(find.text('My reports'), findsNothing);

    final card = find.byKey(const ValueKey('report-offer-KUNDLI'));
    await reveal(tester, card);
    await tester.tap(card);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(CreateBirthProfileScreen), findsOneWidget);
    expect(find.byType(ReportDetailScreen), findsNothing);
  });

  testWidgets('error states show one Try again each', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(reportsError: true, catalogError: true));
    await tester.pumpAndSettle();

    // Reports unknown -> opens on "Get a report", whose catalogue failed.
    expect(find.byKey(const ValueKey('report-catalog-error')), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
    // No invented prices when the catalogue is unavailable.
    expect(find.textContaining('₹'), findsNothing);

    await openTab(tester, 'My reports');
    expect(find.byKey(const ValueKey('my-reports-error')), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);

    final before = reportFetches;
    await tester.tap(find.descendant(
      of: find.byKey(const ValueKey('my-reports-error')),
      matching: find.text('Try again'),
    ));
    await tester.pumpAndSettle();
    expect(reportFetches, greaterThan(before));
  });

  testWidgets('opened from another screen it shows a labelled Back button', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(pushed: true));
    await tester.tap(find.text('go'));
    await tester.pumpAndSettle();

    expect(find.byType(ReportsScreen), findsOneWidget);
    // Shared adaptive back button: chevron + "Back" on iOS, arrow on Android;
    // labelled "Back" (tooltip / semantics) on both.
    expect(find.byTooltip('Back'), findsOneWidget);
    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.byType(ReportsScreen), findsNothing);
  });

  testWidgets('as a bottom tab (root route) there is no Back button', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    expect(find.byTooltip('Back'), findsNothing);
  });

  testWidgets('no overflow at 320px with 2.0x text', (tester) async {
    tester.view.physicalSize = const Size(320 * 2, 700 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
    tester.platformDispatcher.textScaleFactorTestValue = 2.0;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

    await tester.pumpWidget(app(reports: [_ready, _preparing, _failed]));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  group('two tabs: My reports / Get a report', () {
    const both = TargetPlatformVariant({TargetPlatform.iOS, TargetPlatform.android});

    testWidgets('default tab is My reports when the user has reports', (tester) async {
      await setSize(tester);
      await tester.pumpWidget(app(reports: [_ready]));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('reports-tabs')), findsOneWidget);
      expect(find.byKey(const ValueKey('my-report-rep_ready')), findsOneWidget);
      expect(find.byKey(const ValueKey('report-offer-KUNDLI')), findsNothing);
    }, variant: both);

    testWidgets('default tab is Get a report when the user has no reports', (tester) async {
      await setSize(tester);
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('report-offer-KUNDLI')), findsOneWidget);
      expect(find.byKey(const ValueKey('my-reports-empty')), findsNothing);
    }, variant: both);

    testWidgets('switching tabs shows the other list, and the switch stays pinned', (tester) async {
      await setSize(tester);
      await tester.pumpWidget(app(reports: [_ready, _preparing, _failed]));
      await tester.pumpAndSettle();

      await openTab(tester, 'Get a report');
      expect(find.byKey(const ValueKey('report-offer-CAREER')), findsOneWidget);
      expect(find.byKey(const ValueKey('my-report-rep_ready')), findsNothing);

      // Scrolled to the end, the switch is still on screen and tappable.
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -3000));
      await tester.pumpAndSettle();
      final mine = find.descendant(of: find.byKey(const ValueKey('reports-tabs')), matching: find.text('My reports'));
      expect(mine.hitTestable(), findsOneWidget);

      await openTab(tester, 'My reports');
      expect(find.byKey(const ValueKey('my-report-rep_ready')), findsOneWidget);
      expect(find.byKey(const ValueKey('report-offer-CAREER')), findsNothing);
      expect(tester.takeException(), isNull);
    }, variant: both);

    testWidgets('the chosen tab is remembered for the session', (tester) async {
      await setSize(tester);
      await tester.pumpWidget(app(reports: [_ready]));
      await tester.pumpAndSettle();
      await openTab(tester, 'Get a report');

      final container = ProviderScope.containerOf(tester.element(find.byType(ReportsScreen)));
      expect(container.read(reportsTabProvider), ReportsTab.get);
    });

    testWidgets('empty My reports: Choose a report switches to Get a report', (tester) async {
      await setSize(tester);
      await tester.pumpWidget(app(initialTab: ReportsTab.mine));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('my-reports-empty')), findsOneWidget);
      await tester.tap(find.text('Choose a report'));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('my-reports-empty')), findsNothing);
      expect(find.byKey(const ValueKey('report-offer-KUNDLI')), findsOneWidget);
    }, variant: both);

    testWidgets('initialTab opens on the requested tab', (tester) async {
      await setSize(tester);
      await tester.pumpWidget(app(reports: [_ready], initialTab: ReportsTab.get));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('report-offer-KUNDLI')), findsOneWidget);
      expect(find.byKey(const ValueKey('my-report-rep_ready')), findsNothing);

      await tester.pumpWidget(Container());
      await tester.pumpWidget(app(pushed: true, initialTab: ReportsTab.get));
      await tester.tap(find.text('go'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('report-offer-KUNDLI')), findsOneWidget);
      expect(find.byTooltip('Back'), findsOneWidget);
    }, variant: both);

    testWidgets('no birth profile and no reports: no tab switch, just add details and the catalogue', (tester) async {
      await setSize(tester);
      await tester.pumpWidget(app(profiles: const []));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('reports-tabs')), findsNothing);
      expect(find.byKey(const ValueKey('reports-no-profile')), findsOneWidget);
      expect(find.byKey(const ValueKey('report-offer-KUNDLI')), findsOneWidget);
    });
  });
}
