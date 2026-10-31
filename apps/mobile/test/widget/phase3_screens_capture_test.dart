import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/dasha_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/screens/birth_chart_screen.dart';
import 'package:astro_mobile/features/astrology/screens/planets_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vimshottari_dasha_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  late AstroChartModel canonicalChartD1;

  final testBirthProfile = BirthProfileModel(
    id: 'bp_phase3_123',
    userId: 'usr_phase3_123',
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

  setUpAll(() {
    final file = File('test/fixtures_live.json');
    final fixtures = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    canonicalChartD1 = AstroChartModel.fromJson(fixtures['chart_d1'] as Map<String, dynamic>);
  });

  DashaTreeModel createSampleDashaTree() {
    final now = DateTime.now();
    return DashaTreeModel(
      system: 'VIMSHOTTARI',
      totalSpanYears: 120,
      mahadashas: [
        DashaPeriodModel(
          planet: 'SUN',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 1,
          startDate: now.subtract(const Duration(days: 365 * 10)),
          endDate: now.subtract(const Duration(days: 365 * 4)),
          durationYears: 6.0,
          subPeriods: const [],
        ),
        DashaPeriodModel(
          planet: 'MOON',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 2,
          startDate: now.subtract(const Duration(days: 365 * 4)),
          endDate: now.add(const Duration(days: 365 * 6)),
          durationYears: 10.0,
          isActive: true,
          subPeriods: [
            DashaPeriodModel(
              planet: 'MOON',
              level: 'ANTARDASHA',
              levelNumber: 2,
              order: 1,
              startDate: now.subtract(const Duration(days: 365 * 4)),
              endDate: now.subtract(const Duration(days: 365 * 3)),
              durationYears: 0.83,
              subPeriods: const [],
            ),
            DashaPeriodModel(
              planet: 'MARS',
              level: 'ANTARDASHA',
              levelNumber: 2,
              order: 2,
              startDate: now.subtract(const Duration(days: 365 * 3)),
              endDate: now.add(const Duration(days: 365 * 2)),
              durationYears: 0.58,
              isActive: true,
              subPeriods: [
                DashaPeriodModel(
                  planet: 'MARS',
                  level: 'PRATYANTARDASHA',
                  levelNumber: 3,
                  order: 1,
                  startDate: now.subtract(const Duration(days: 60)),
                  endDate: now.subtract(const Duration(days: 10)),
                  durationYears: 0.05,
                  subPeriods: const [],
                ),
                DashaPeriodModel(
                  planet: 'RAHU',
                  level: 'PRATYANTARDASHA',
                  levelNumber: 3,
                  order: 2,
                  startDate: now.subtract(const Duration(days: 10)),
                  endDate: now.add(const Duration(days: 50)),
                  durationYears: 0.12,
                  isActive: true,
                  subPeriods: const [],
                ),
              ],
            ),
          ],
        ),
        DashaPeriodModel(
          planet: 'MARS',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 3,
          startDate: now.add(const Duration(days: 365 * 6)),
          endDate: now.add(const Duration(days: 365 * 13)),
          durationYears: 7.0,
          subPeriods: const [],
        ),
      ],
    );
  }

  Widget buildCaptureWidget({
    required GlobalKey boundaryKey,
    required Widget child,
    required bool hasProfile,
    required Locale locale,
    required DashaTreeModel dashaTree,
  }) {
    return ProviderScope(
      overrides: [
        if (hasProfile) ...[
          selectedBirthProfileProvider.overrideWith((ref) => testBirthProfile),
          birthProfilesListNotifierProvider.overrideWith((ref) => _MockBirthProfilesNotifier([testBirthProfile])),
          astrologyChartForProfileProvider(testBirthProfile).overrideWith((ref) => Future.value(canonicalChartD1)),
          vimshottariDashaForProfileProvider(testBirthProfile).overrideWith((ref) => Future.value(dashaTree)),
        ] else ...[
          selectedBirthProfileProvider.overrideWith((ref) => null),
          birthProfilesListNotifierProvider.overrideWith((ref) => _MockBirthProfilesNotifier(const [])),
        ],
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: RepaintBoundary(
          key: boundaryKey,
          child: child,
        ),
      ),
    );
  }

  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_3');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  group('Phase 3 Core Astrology Screens Capture', () {
    final dashaTree = createSampleDashaTree();
    const widths = [320.0, 360.0, 390.0, 414.0];
    const locales = [Locale('en'), Locale('hi')];

    // Define the 5 screens
    final screens = <String, Widget Function(bool hasProfile)>{
      'birth_chart': (hasProfile) => BirthChartScreen(
            profile: hasProfile ? testBirthProfile : null,
            initialTabIndex: 0,
          ),
      'planets': (hasProfile) => PlanetsScreen(
            profile: hasProfile ? testBirthProfile : null,
          ),
      'houses': (hasProfile) => BirthChartScreen(
            profile: hasProfile ? testBirthProfile : null,
            initialTabIndex: 2,
          ),
      'nakshatras': (hasProfile) => BirthChartScreen(
            profile: hasProfile ? testBirthProfile : null,
            initialTabIndex: 3,
          ),
      'dasha': (hasProfile) => const VimshottariDashaScreen(),
    };

    // 1. With Profile (All 4 widths, en & hi)
    for (final screenEntry in screens.entries) {
      final screenKey = screenEntry.key;
      final screenBuilder = screenEntry.value;

      for (final width in widths) {
        for (final locale in locales) {
          testWidgets('Capture $screenKey ${width.toInt()}w ${locale.languageCode} profile', (tester) async {
            final boundaryKey = GlobalKey();
            tester.view.physicalSize = Size(width * 2, 844 * 2);
            tester.view.devicePixelRatio = 2.0;

            await tester.pumpWidget(
              buildCaptureWidget(
                boundaryKey: boundaryKey,
                child: screenBuilder(true),
                hasProfile: true,
                locale: locale,
                dashaTree: dashaTree,
              ),
            );
            await tester.pump(Duration.zero);
            await tester.pump(const Duration(milliseconds: 300));

            await tester.runAsync(() async {
              final RenderRepaintBoundary boundary =
                  boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
              final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
              final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
              if (byteData != null) {
                final file = File(
                  '${outDir.path}/${screenKey}_${width.toInt()}w_${locale.languageCode}_profile.png',
                );
                await file.writeAsBytes(byteData.buffer.asUint8List());
              }
            });

            addTearDown(() {
              tester.view.resetPhysicalSize();
              tester.view.resetDevicePixelRatio();
            });
          });
        }
      }
    }

    // 2. Missing Profile States (320w and 390w, en & hi)
    const missingProfileWidths = [320.0, 390.0];
    for (final screenEntry in screens.entries) {
      final screenKey = screenEntry.key;
      final screenBuilder = screenEntry.value;

      for (final width in missingProfileWidths) {
        for (final locale in locales) {
          testWidgets('Capture $screenKey ${width.toInt()}w ${locale.languageCode} noprofile', (tester) async {
            final boundaryKey = GlobalKey();
            tester.view.physicalSize = Size(width * 2, 844 * 2);
            tester.view.devicePixelRatio = 2.0;

            await tester.pumpWidget(
              buildCaptureWidget(
                boundaryKey: boundaryKey,
                child: screenBuilder(false),
                hasProfile: false,
                locale: locale,
                dashaTree: dashaTree,
              ),
            );
            await tester.pump(Duration.zero);
            await tester.pump(const Duration(milliseconds: 300));

            await tester.runAsync(() async {
              final RenderRepaintBoundary boundary =
                  boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
              final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
              final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
              if (byteData != null) {
                final file = File(
                  '${outDir.path}/${screenKey}_${width.toInt()}w_${locale.languageCode}_noprofile.png',
                );
                await file.writeAsBytes(byteData.buffer.asUint8List());
              }
            });

            addTearDown(() {
              tester.view.resetPhysicalSize();
              tester.view.resetDevicePixelRatio();
            });
          });
        }
      }
    }
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
