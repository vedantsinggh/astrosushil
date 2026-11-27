import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/reports/models/report_brand_assets.dart';
import 'package:astro_mobile/features/reports/models/report_catalog_model.dart';
import 'package:astro_mobile/features/reports/models/report_model.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/report_catalog_provider.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/reports/screens/report_detail_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_view_screen.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _MockProfilesNotifier extends StateNotifier<BirthProfilesState> implements BirthProfilesNotifier {
  _MockProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakeReportsNotifier extends StateNotifier<ReportsState> implements ReportsNotifier {
  _FakeReportsNotifier(super.state);

  @override
  Future<void> generateReport({
    required String birthProfileId,
    required String reportType,
    String? partnerProfileId,
    String? orderId,
  }) async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

void main() {
  final profile = BirthProfileModel(
    id: 'bp_redesign_1',
    userId: 'usr_1',
    name: 'Ananya Deshmukh-Chattopadhyay',
    dateOfBirth: '1991-07-19',
    timeOfBirth: '06:20:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  final fullCatalogPayload = {
    'items': [
      {
        'id': 'report-kundli',
        'title': 'Premium Personalised Kundli Report',
        'description': 'Full Vedic birth chart blueprint.',
        'pricePaise': 117882,
        'isActive': true,
        'legacyReportType': 'KUNDLI',
        'languages': ['en', 'hi'],
      },
      {
        'id': 'report-career',
        'title': 'Career Report',
        'description': '10th house career analysis.',
        'pricePaise': 49900,
        'isActive': true,
        'legacyReportType': 'CAREER',
        'languages': ['en'],
      },
      {
        'id': 'report-varshphal',
        'title': 'Varshphal Report',
        'description': 'Annual solar return Tajika chart.',
        'pricePaise': 0,
        'isActive': false,
        'legacyReportType': 'VARSHPHAL',
      },
    ],
  };

  Widget harness(Widget child, {List<Override> overrides = const []}) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en'), Locale('hi')],
        home: child,
      ),
    );
  }

  testWidgets('ReportsScreen renders exactly 13 unique canonical report cards with 210:297 covers and Coming Soon', (tester) async {
    tester.view.physicalSize = const Size(390 * 2, 1200 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      harness(
        const ReportsScreen(),
        overrides: [
          reportCatalogProvider.overrideWith((ref) async => parseAllReportCatalog(fullCatalogPayload)),
          birthProfilesListNotifierProvider.overrideWith((ref) => _MockProfilesNotifier([profile])),
          selectedBirthProfileProvider.overrideWith((ref) => profile),
          userReportsProvider.overrideWith((ref) async => const <UserReportItemModel>[]),
        ],
      ),
    );
    await tester.pumpAndSettle();

    var cardCount = 0;
    for (final brand in ReportBrandRegistry.canonicalReports) {
      final cardFinder = find.byKey(ValueKey('report-offer-${brand.reportType}'));
      expect(cardFinder, findsOneWidget, reason: 'Expected card for ${brand.reportType}');
      cardCount++;
    }
    expect(cardCount, 13);

    // Portrait 210:297 AspectRatio previews on all 13 cards
    final aspectRatios = tester.widgetList<AspectRatio>(find.byType(AspectRatio));
    final portraitCovers = aspectRatios.where((ar) => (ar.aspectRatio - (210 / 297)).abs() < 0.001).toList();
    expect(portraitCovers, hasLength(13));

    // Priced vs Coming Soon without fake prices
    expect(find.text('₹1,178.82'), findsOneWidget);
    expect(find.text('₹499'), findsOneWidget);
    expect(find.text('Coming Soon'), findsNWidgets(11));

    // Tap Coming Soon report (VARSHPHAL) -> opens ReportDetailScreen in Coming Soon mode
    final varshphalCard = find.byKey(const ValueKey('report-offer-VARSHPHAL'));
    await Scrollable.ensureVisible(tester.element(varshphalCard), alignment: 0.5);
    await tester.pumpAndSettle();
    await tester.tap(varshphalCard);
    await tester.pumpAndSettle();

    expect(find.byType(ReportDetailScreen), findsOneWidget);
    expect(find.byKey(const Key('report_coming_soon_bar')), findsOneWidget);
    expect(find.byKey(const Key('report_coming_soon_card')), findsOneWidget);
    expect(find.byKey(const Key('report_purchase_button')), findsNothing);
    expect(find.textContaining('₹0'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ReportViewScreen renders 4 tabs, expandable insight cards, tappable planet/house modals, and timeline filters', (tester) async {
    tester.view.physicalSize = const Size(390 * 2, 1000 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final response = ReportResponseModel.fromJson({
      'id': 'rep_view_test_1',
      'reportType': 'HOROSCOPE',
      'report': {
        'title': 'Personalised Horoscope Report',
        'type': 'HOROSCOPE',
        'profile': {
          'name': profile.name,
          'dateOfBirth': profile.dateOfBirth,
          'timeOfBirth': profile.timeOfBirth,
          'placeName': profile.placeName,
          'timezone': profile.timezone,
        },
        'configuration': {
          'zodiacType': 'SIDEREAL',
          'ayanamsa': 'LAHIRI',
          'houseSystem': 'WHOLE_SIGN',
          'nodeCalculation': 'MEAN_NODE',
        },
        'ascendant': {'sign': 'Cancer', 'degree': 14.5, 'nakshatra': 'Pushya', 'pada': 4},
        'planets': [
          {'planet': 'Sun', 'sign': 'Cancer', 'degree': 2.3, 'house': 1, 'nakshatra': 'Punarvasu', 'pada': 4, 'isRetrograde': false},
          {'planet': 'Moon', 'sign': 'Libra', 'degree': 18.1, 'house': 4, 'nakshatra': 'Swati', 'pada': 4, 'isRetrograde': false},
          {'planet': 'Saturn', 'sign': 'Capricorn', 'degree': 11.0, 'house': 7, 'nakshatra': 'Shravana', 'pada': 1, 'isRetrograde': true},
        ],
        'houses': [
          {'houseNumber': 1, 'sign': 'Cancer', 'planetsPresent': ['Sun']},
          {'houseNumber': 4, 'sign': 'Libra', 'planetsPresent': ['Moon']},
          {'houseNumber': 7, 'sign': 'Capricorn', 'planetsPresent': ['Saturn']},
        ],
        'nakshatra': {
          'birthNakshatra': 'Swati',
          'pada': 4,
          'rulingPlanet': 'Rahu',
          'associatedInfo': 'Independent and adaptable temperament.',
        },
        'sections': [
          {
            'id': 'sec_dasha',
            'title': 'Vimshottari Mahadasha Window',
            'type': 'DASHA',
            'content': 'Rahu Mahadasha activates growth in partnerships.',
            'keyValues': {'Period': '2024–2042'},
          },
          {
            'id': 'sec_transit',
            'title': 'Saturn Transit Overview',
            'type': 'TRANSIT',
            'content': 'Saturn transiting Aquarius brings steady consolidation.',
            'listItems': ['Focus on disciplined routines'],
          },
          {
            'id': 'sec_general',
            'title': 'Core Strengths',
            'type': 'TEXT',
            'content': 'Strong lunar emotional intuition.',
          },
        ],
      },
    });

    await tester.pumpWidget(
      harness(
        ReportViewScreen(birthProfileId: profile.id, reportType: 'HOROSCOPE'),
        overrides: [
          reportsNotifierProvider.overrideWith((ref) => _FakeReportsNotifier(ReportsState(reportResponse: response))),
        ],
      ),
    );
    await tester.pumpAndSettle();

    Future<void> reveal(Finder f) async {
      await Scrollable.ensureVisible(tester.element(f), alignment: 0.5);
      await tester.pumpAndSettle();
    }

    // All 4 tabs present
    expect(find.byKey(const ValueKey('report-view-tab-overview')), findsOneWidget);
    expect(find.byKey(const ValueKey('report-view-tab-charts')), findsOneWidget);
    expect(find.byKey(const ValueKey('report-view-tab-timelines')), findsOneWidget);
    expect(find.byKey(const ValueKey('report-view-tab-details')), findsOneWidget);

    // Overview: expandable insight card
    expect(find.text('Strong lunar emotional intuition.'), findsNothing);
    await reveal(find.text('Core Strengths'));
    await tester.tap(find.text('Core Strengths'));
    await tester.pumpAndSettle();
    expect(find.text('Strong lunar emotional intuition.'), findsOneWidget);

    // Switch to Charts & Houses -> tap House 1 -> opens modal
    await reveal(find.byKey(const ValueKey('report-view-tab-charts')));
    await tester.tap(find.byKey(const ValueKey('report-view-tab-charts')));
    await tester.pumpAndSettle();

    await reveal(find.text('House 1'));
    await tester.tap(find.text('House 1'));
    await tester.pumpAndSettle();
    expect(find.text('House 1 • Cancer'), findsOneWidget);
    Navigator.of(tester.element(find.text('House 1 • Cancer'))).pop();
    await tester.pumpAndSettle();

    // Tap planet card to expand and open explanation sheet
    final saturnCardTitle = find.text('Saturn').first;
    await reveal(saturnCardTitle);
    await tester.tap(saturnCardTitle);
    await tester.pumpAndSettle();
    expect(find.text('View full placement sheet'), findsOneWidget);
    await reveal(find.text('View full placement sheet'));
    await tester.tap(find.text('View full placement sheet'));
    await tester.pumpAndSettle();
    expect(find.text('Saturn • Capricorn'), findsOneWidget);
    Navigator.of(tester.element(find.text('Saturn • Capricorn'))).pop();
    await tester.pumpAndSettle();

    // Switch to Timelines -> filter by Dasha
    await reveal(find.byKey(const ValueKey('report-view-tab-timelines')));
    await tester.tap(find.byKey(const ValueKey('report-view-tab-timelines')));
    await tester.pumpAndSettle();

    expect(find.text('Vimshottari Mahadasha Window'), findsOneWidget);
    expect(find.text('Saturn Transit Overview'), findsOneWidget);

    await reveal(find.byKey(const ValueKey('report-timeline-filter-dasha')));
    await tester.tap(find.byKey(const ValueKey('report-timeline-filter-dasha')));
    await tester.pumpAndSettle();
    expect(find.text('Vimshottari Mahadasha Window'), findsOneWidget);
    expect(find.text('Saturn Transit Overview'), findsNothing);

    // Switch to Full Details -> displays configuration from payload
    await reveal(find.byKey(const ValueKey('report-view-tab-details')));
    await tester.tap(find.byKey(const ValueKey('report-view-tab-details')));
    await tester.pumpAndSettle();
    expect(find.text('WHOLE_SIGN'), findsOneWidget);
    expect(find.text('LAHIRI'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
