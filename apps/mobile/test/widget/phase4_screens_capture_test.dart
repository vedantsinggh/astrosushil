import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/strength_model.dart';
import 'package:astro_mobile/features/astrology/models/ashtakavarga_model.dart';
import 'package:astro_mobile/features/astrology/models/yoga_model.dart';
import 'package:astro_mobile/features/astrology/models/special_points_model.dart';
import 'package:astro_mobile/features/astrology/models/jaimini_model.dart';
import 'package:astro_mobile/features/astrology/models/kp_model.dart';
import 'package:astro_mobile/features/astrology/models/gochara_model.dart';
import 'package:astro_mobile/features/astrology/models/varshaphala_model.dart';
import 'package:astro_mobile/features/astrology/models/prashna_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/screens/divisional_charts_screen.dart';
import 'package:astro_mobile/features/astrology/screens/ashtakavarga_screen.dart';
import 'package:astro_mobile/features/astrology/screens/shadbala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/bhava_bala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/yogas_screen.dart';
import 'package:astro_mobile/features/astrology/screens/jaimini_screen.dart';
import 'package:astro_mobile/features/astrology/screens/kp_astrology_screen.dart';
import 'package:astro_mobile/features/astrology/screens/special_points_screen.dart';
import 'package:astro_mobile/features/astrology/screens/gochara_screen.dart';
import 'package:astro_mobile/features/astrology/screens/varshaphala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/prashna_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  late AstroChartModel canonicalChartD1;
  late ComprehensiveStrengthModel canonicalStrength;
  late AshtakavargaResultModel canonicalAshtakavarga;
  late YogaEvaluationReportModel canonicalYogas;
  late SpecialPointsReportModel canonicalSpecialPoints;
  late JaiminiReportModel canonicalJaimini;
  late KPReportModel canonicalKP;
  late TransitSnapshotModel canonicalGochara;
  late VarshaphalaChartModel canonicalVarshaphala;
  late PrashnaChartModel canonicalPrashna;

  final testBirthProfile = BirthProfileModel(
    id: 'bp_phase4_123',
    userId: 'usr_phase4_123',
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
    canonicalStrength = ComprehensiveStrengthModel.fromJson(
        (fixtures['strength']['data'] ?? fixtures['strength']) as Map<String, dynamic>);
    canonicalAshtakavarga = AshtakavargaResultModel.fromJson(
        (fixtures['ashtakavarga']['data'] ?? fixtures['ashtakavarga']) as Map<String, dynamic>);
    canonicalYogas = YogaEvaluationReportModel.fromJson(
        (fixtures['yogas']['data'] ?? fixtures['yogas']) as Map<String, dynamic>);
    canonicalSpecialPoints = SpecialPointsReportModel.fromJson(
        (fixtures['special_points']['data'] ?? fixtures['special_points']) as Map<String, dynamic>);
    canonicalJaimini = JaiminiReportModel.fromJson(
        (fixtures['jaimini']['data'] ?? fixtures['jaimini']) as Map<String, dynamic>);
    canonicalKP = KPReportModel.fromJson(
        (fixtures['kp']['data'] ?? fixtures['kp']) as Map<String, dynamic>);
    canonicalGochara = TransitSnapshotModel.fromJson(
        (fixtures['gochara']['data'] ?? fixtures['gochara']) as Map<String, dynamic>);
    canonicalVarshaphala = VarshaphalaChartModel.fromJson(
        (fixtures['varshaphala']['data'] ?? fixtures['varshaphala']) as Map<String, dynamic>);
    canonicalPrashna = PrashnaChartModel.fromJson(
        (fixtures['prashna']['data'] ?? fixtures['prashna']) as Map<String, dynamic>);
  });

  Widget buildCaptureWidget({
    required GlobalKey boundaryKey,
    required Widget child,
    required bool hasProfile,
    required Locale locale,
  }) {
    return ProviderScope(
      overrides: [
        selectedBirthProfileProvider.overrideWith((ref) => hasProfile ? testBirthProfile : null),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => _MockBirthProfilesNotifier(hasProfile ? [testBirthProfile] : []),
        ),
        activeProfileDivisionalChartProvider('D1').overrideWith(
          (ref) => hasProfile ? canonicalChartD1 : null,
        ),
        activeProfileDivisionalChartProvider('D9').overrideWith(
          (ref) => hasProfile ? canonicalChartD1 : null,
        ),
        activeProfileDivisionalChartProvider('D10').overrideWith(
          (ref) => hasProfile ? canonicalChartD1 : null,
        ),
        divisionalChartProvider(DivisionalChartQuery(profile: testBirthProfile, vargaType: 'D1')).overrideWith(
          (ref) => canonicalChartD1,
        ),
        divisionalChartProvider(DivisionalChartQuery(profile: testBirthProfile, vargaType: 'D9')).overrideWith(
          (ref) => canonicalChartD1,
        ),
        divisionalChartProvider(DivisionalChartQuery(profile: testBirthProfile, vargaType: 'D10')).overrideWith(
          (ref) => canonicalChartD1,
        ),
        gocharaForProfileProvider(testBirthProfile).overrideWith(
          (ref) => canonicalGochara,
        ),
        ashtakavargaForProfileProvider(testBirthProfile).overrideWith(
          (ref) => canonicalAshtakavarga,
        ),
        strengthForProfileProvider(testBirthProfile).overrideWith(
          (ref) => canonicalStrength,
        ),
        activeProfileStrengthProvider.overrideWith(
          (ref) => hasProfile ? canonicalStrength : null,
        ),
        activeProfileShadbalaProvider.overrideWith(
          (ref) => hasProfile ? canonicalStrength.shadbala : null,
        ),
        activeProfileBhavaBalaProvider.overrideWith(
          (ref) => hasProfile ? canonicalStrength.bhavaBala : null,
        ),
        specialPointsForProfileProvider(testBirthProfile).overrideWith(
          (ref) => canonicalSpecialPoints,
        ),
        yogasForProfileProvider(YogaEvaluationQuery(profile: testBirthProfile, varga: 'D1')).overrideWith(
          (ref) => canonicalYogas,
        ),
        activeProfileYogasProvider.overrideWith(
          (ref) => hasProfile ? canonicalYogas : null,
        ),
        activeProfileSpecialPointsProvider.overrideWith(
          (ref) => hasProfile ? canonicalSpecialPoints : null,
        ),
        activeProfileJaiminiProvider.overrideWith(
          (ref) => hasProfile ? canonicalJaimini : null,
        ),
        activeProfileKPProvider.overrideWith(
          (ref) => hasProfile ? canonicalKP : null,
        ),
        activeProfileVarshaphalaProvider.overrideWith(
          (ref) => hasProfile ? canonicalVarshaphala : null,
        ),
        prashnaProvider.overrideWith(
          (ref) => _MockPrashnaNotifier(PrashnaState(result: canonicalPrashna)),
        ),
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
        home: RepaintBoundary(
          key: boundaryKey,
          child: child,
        ),
      ),
    );
  }

  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_4');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  group('Phase 4 Advanced Astrology Screens Capture', () {
    const widths = [360.0, 390.0];
    const locales = [Locale('en'), Locale('hi')];

    final screens = <String, Widget Function(bool hasProfile)>{
      'divisional_charts': (_) => const DivisionalChartsScreen(),
      'ashtakavarga': (_) => const AshtakavargaScreen(),
      'shadbala': (_) => const ShadbalaScreen(),
      'bhava_bala': (_) => const BhavaBalaScreen(),
      'yogas': (_) => const YogasScreen(),
      'jaimini': (_) => const JaiminiScreen(),
      'kp_astrology': (_) => const KPAstrologyScreen(),
      'special_points': (_) => const SpecialPointsScreen(),
      'gochara': (_) => const GocharaScreen(),
      'varshaphala': (_) => const VarshaphalaScreen(),
      'prashna': (_) => const PrashnaScreen(),
    };

    // 1. With Profile (360 & 390, en & hi)
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

    // 2. Without Profile (390w en & hi)
    final profileRequiredScreens = [
      'divisional_charts',
      'ashtakavarga',
      'shadbala',
      'bhava_bala',
      'yogas',
      'jaimini',
      'kp_astrology',
      'special_points',
      'gochara',
      'varshaphala',
    ];

    for (final screenKey in profileRequiredScreens) {
      final screenBuilder = screens[screenKey]!;

      for (final locale in locales) {
        testWidgets('Capture $screenKey 390w ${locale.languageCode} noprofile', (tester) async {
          final boundaryKey = GlobalKey();
          tester.view.physicalSize = const Size(390 * 2, 844 * 2);
          tester.view.devicePixelRatio = 2.0;

          await tester.pumpWidget(
            buildCaptureWidget(
              boundaryKey: boundaryKey,
              child: screenBuilder(false),
              hasProfile: false,
              locale: locale,
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
                '${outDir.path}/${screenKey}_390w_${locale.languageCode}_noprofile.png',
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

class _MockPrashnaNotifier extends StateNotifier<PrashnaState>
    implements PrashnaNotifier {
  _MockPrashnaNotifier(super.initialState);

  @override
  void clear() {
    state = const PrashnaState();
  }

  @override
  Future<void> submitPrashna({
    required DateTime questionTime,
    required String timezone,
    required double latitude,
    required double longitude,
    required String placeName,
    int? questionNumber,
    String? questionNumberSystem,
    String? questionText,
  }) async {}
}
