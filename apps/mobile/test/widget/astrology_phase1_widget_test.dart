import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/astrology/screens/astrology_hub_screen.dart';
import 'package:astro_mobile/features/astrology/widgets/astrology_widgets.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

void main() {
  final testProfile1 = BirthProfileModel(
    id: 'profile-1',
    userId: 'user-1',
    name: 'Aarav Sharma',
    dateOfBirth: '1995-05-15',
    timeOfBirth: '08:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  final testProfile2 = BirthProfileModel(
    id: 'profile-2',
    userId: 'user-1',
    name: 'Ananya Verma',
    dateOfBirth: '1998-11-22',
    timeOfBirth: '17:15:00',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
    createdAt: DateTime(2026, 1, 2),
    updatedAt: DateTime(2026, 1, 2),
  );

  Widget createTestWidget({
    List<BirthProfileModel> profiles = const [],
    String? selectedProfileId,
    Widget? child,
  }) {
    return ProviderScope(
      overrides: [
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => _MockBirthProfilesNotifier(profiles),
        ),
        if (selectedProfileId != null)
          selectedBirthProfileIdProvider.overrideWith((ref) => selectedProfileId),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: child ?? const AstrologyHubScreen(),
      ),
    );
  }

  group('Astrology Hub Screen & Navigation Tests', () {
    testWidgets('Renders Astrology Hub with empty state when no birth profile exists', (tester) async {
      await tester.pumpWidget(createTestWidget(profiles: []));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Astrology'), findsOneWidget);
      expect(find.text('No Birth Profile Available'), findsOneWidget);
      expect(find.text('Add Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders complete Vedic hierarchy sections when profile is active', (tester) async {
      await tester.pumpWidget(createTestWidget(profiles: [testProfile1]));
      await tester.pump(const Duration(milliseconds: 100));

      // Active Profile Selector Header
      expect(find.text('Aarav Sharma'), findsOneWidget);
      expect(find.textContaining('1995-05-15'), findsOneWidget);

      // Category filter tabs
      expect(find.text('All Systems'), findsOneWidget);
      expect(find.text('Charts & Kundli'), findsWidgets);
      expect(find.text('Timing & Dashas'), findsOneWidget);

      // Section Cards
      expect(find.text('Charts & Kundli'), findsWidgets);
      expect(find.text('Birth Chart (Kundli)'), findsOneWidget);
      expect(find.text('Planetary Placements'), findsOneWidget);
      expect(find.text('Divisional Charts (Vargas)'), findsOneWidget);

      expect(find.text('Timing & Periods'), findsOneWidget);
      expect(find.text('Vimshottari Dasha'), findsOneWidget);
      expect(find.text('Transits (Gochara)'), findsOneWidget);
      expect(find.text('Panchanga'), findsOneWidget);
      expect(find.text('Vedic Yogas'), findsOneWidget);

      expect(find.text('Planetary & House Strength'), findsOneWidget);
      expect(find.text('Advanced Astrological Systems'), findsOneWidget);
      expect(find.text('Matchmaking & Compatibility'), findsOneWidget);
    });

    testWidgets('ActiveBirthProfileSelector displays active profile and allows profile switching', (tester) async {
      await tester.pumpWidget(createTestWidget(profiles: [testProfile1, testProfile2]));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Aarav Sharma'), findsOneWidget);

      // Tap Switch button
      await tester.tap(find.text('Switch'));
      await tester.pumpAndSettle();

      expect(find.text('Ananya Verma'), findsOneWidget);
      expect(find.text('Add New Profile'), findsOneWidget);

      // Select Ananya Verma
      await tester.tap(find.text('Ananya Verma'));
      await tester.pumpAndSettle();

      expect(find.text('Ananya Verma'), findsOneWidget);
      expect(find.textContaining('1998-11-22'), findsOneWidget);
    });

    testWidgets('Category tabs filter displayed sections appropriately', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createTestWidget(profiles: [testProfile1]));
      await tester.pump(const Duration(milliseconds: 100));

      // Tap on "Timing & Dashas" tab
      await tester.tap(find.text('Timing & Dashas'));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Timing & Periods'), findsOneWidget);
      expect(find.text('Vimshottari Dasha'), findsOneWidget);
      expect(find.text('Birth Chart (Kundli)'), findsNothing);

      // Scroll tab bar to reveal "Matchmaking" tab and tap
      await tester.ensureVisible(find.text('Matchmaking'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Matchmaking'), warnIfMissed: false);
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Matchmaking & Compatibility'), findsOneWidget);
      expect(find.text('Kundli Matchmaking (Guna Milan)'), findsOneWidget);
    });

    testWidgets('Tapping Kundli Matchmaking navigates to Matchmaking screen', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createTestWidget(profiles: [testProfile1]));
      await tester.pump(const Duration(milliseconds: 100));

      // Tap to expand Matchmaking & Compatibility then tap Kundli Matchmaking
      await tester.ensureVisible(find.text('Matchmaking & Compatibility'));
      await tester.tap(find.text('Matchmaking & Compatibility'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Kundli Matchmaking (Guna Milan)'));
      await tester.tap(find.text('Kundli Matchmaking (Guna Milan)'));
      await tester.pumpAndSettle();

      expect(find.text('Kundli Matchmaking (Guna Milan)'), findsWidgets);
      expect(find.textContaining('Person A'), findsOneWidget);
      expect(find.textContaining('Person B'), findsOneWidget);
      expect(find.text('Calculate Compatibility'), findsOneWidget);
    });
  });

  group('Reusable Astrology UI Components Tests', () {
    testWidgets('PlanetChip displays name, retrograde indicator, and responds to tap', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: Scaffold(
          body: Center(
            child: PlanetChip(
              planetName: 'Saturn',
              isRetrograde: true,
              houseOrSign: '10th House',
              onTap: () => tapped = true,
            ),
          ),
        ),
      ));

      expect(find.text('Saturn'), findsOneWidget);
      expect(find.text('R'), findsOneWidget);
      expect(find.text('• 10th House'), findsOneWidget);

      await tester.tap(find.byType(PlanetChip));
      expect(tapped, isTrue);
    });

    testWidgets('SignChip displays zodiac glyph and Sanskrit name', (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: Center(
            child: SignChip(
              signName: 'Leo',
              sanskritName: 'Simha',
              houseNumber: 5,
            ),
          ),
        ),
      ));

      expect(find.text('♌'), findsOneWidget);
      expect(find.text('Leo'), findsOneWidget);
      expect(find.text('(Simha)'), findsOneWidget);
      expect(find.text('H5'), findsOneWidget);
    });

    testWidgets('DegreeValueDisplay formats degrees, minutes, and seconds properly', (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: Center(
            child: DegreeValueDisplay(
              degree: 18.4088,
              label: 'Longitude',
              showSeconds: true,
            ),
          ),
        ),
      ));

      expect(find.text('Longitude'), findsOneWidget);
      expect(find.text('18° 24′ 32″'), findsOneWidget);
    });

    testWidgets('ExpandableAstrologyCard toggles accordion content on tap', (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: SingleChildScrollView(
            child: ExpandableAstrologyCard(
              title: 'Shadbala Potency',
              subtitle: 'Sixfold strength analysis',
              expandedChild: Text('Detailed Shadbala Virupas Matrix'),
            ),
          ),
        ),
      ));

      expect(find.text('Shadbala Potency'), findsOneWidget);

      // Tap header to expand
      await tester.tap(find.text('Shadbala Potency'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Detailed Shadbala Virupas Matrix'), findsOneWidget);
    });

    testWidgets('AstrologyDataTable renders headers and formatted rows', (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: AstrologyDataTable(
            columns: [
              AstrologyTableColumn(header: 'Graha', flex: 2),
              AstrologyTableColumn(header: 'Rashi', flex: 2),
              AstrologyTableColumn(header: 'Degree', flex: 2),
            ],
            rows: [
              ['Sun', 'Leo', '18° 24′'],
              ['Moon', 'Taurus', '03° 12′'],
            ],
          ),
        ),
      ));

      expect(find.text('Graha'), findsOneWidget);
      expect(find.text('Sun'), findsOneWidget);
      expect(find.text('Moon'), findsOneWidget);
      expect(find.text('Leo'), findsOneWidget);
      expect(find.text('Taurus'), findsOneWidget);
      expect(find.text('18° 24′'), findsOneWidget);
      expect(find.text('03° 12′'), findsOneWidget);
    });

    testWidgets('AstrologyEmptyState and AstrologyErrorState render cleanly with actions', (tester) async {
      bool actionTapped = false;
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: Scaffold(
          body: SingleChildScrollView(
            child: Column(
              children: [
                AstrologyEmptyState(
                  title: 'Empty State Test',
                  message: 'No active profile found',
                  actionLabel: 'Create Now',
                  onAction: () => actionTapped = true,
                ),
                AstrologyErrorState(
                  customMessage: 'Network error occurred',
                  onRetry: () {},
                ),
              ],
            ),
          ),
        ),
      ));

      expect(find.text('Empty State Test'), findsOneWidget);
      expect(find.text('No active profile found'), findsOneWidget);
      expect(find.text('Create Now'), findsOneWidget);
      expect(find.text('Network error occurred'), findsOneWidget);

      await tester.tap(find.text('Create Now'));
      expect(actionTapped, isTrue);
    });
  });
}

class _MockBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  _MockBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}

  @override
  Future<BirthProfileModel?> createProfile(CreateBirthProfileDto dto) async => null;

  @override
  Future<BirthProfileModel?> migrateGuestProfile(CreateBirthProfileDto dto) async => null;
}
