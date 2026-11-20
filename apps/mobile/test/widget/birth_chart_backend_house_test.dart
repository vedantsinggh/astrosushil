// Birth chart house numbers must come from the backend (`planet.house`), not
// be derived in Flutter (AGENTS.md: no astrology logic in the UI).
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/screens/birth_chart_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

void main() {
  late Map<String, dynamic> chartJson;

  final profile = BirthProfileModel(
    id: 'profile-house',
    userId: 'user-house',
    name: 'Rahul Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2024),
    updatedAt: DateTime(2024),
  );

  setUpAll(() {
    final fixtures = jsonDecode(File('test/fixtures_live.json').readAsStringSync()) as Map<String, dynamic>;
    chartJson = fixtures['chart_d1'] as Map<String, dynamic>;
  });

  /// Deep copy of the live D1 fixture with the backend `house` of [planet]
  /// replaced, so a client-side whole-sign derivation would disagree.
  AstroChartModel chartWithHouse(String planet, int house) {
    final copy = jsonDecode(jsonEncode(chartJson)) as Map<String, dynamic>;
    void patch(dynamic node) {
      if (node is Map<String, dynamic>) {
        if (node['planet'] == planet && node.containsKey('house')) node['house'] = house;
        node.values.forEach(patch);
      } else if (node is List) {
        node.forEach(patch);
      }
    }

    patch(copy);
    return AstroChartModel.fromJson(copy);
  }

  Widget app(AstroChartModel chart) => ProviderScope(
        overrides: [
          astrologyChartForProfileProvider(profile).overrideWith((ref) => Future.value(chart)),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: BirthChartScreen(profile: profile),
        ),
      );

  group('PlanetModel.house', () {
    test('parses the backend house number and ignores invalid values', () {
      final base = {'planet': 'SUN', 'rashiIndex': 2, 'degreeInRashi': 1.0};
      expect(PlanetModel.fromJson({...base, 'house': 9}).house, 9);
      expect(PlanetModel.fromJson({...base, 'houseNumber': '4'}).house, 4);
      expect(PlanetModel.fromJson({...base, 'house': 13}).house, isNull);
      expect(PlanetModel.fromJson(base).house, isNull);
      expect(PlanetModel.fromJson({...base, 'house': 7}).toJson()['house'], 7);
    });

    test('live fixture houses match the previous whole-sign display', () {
      // Guards "displayed result identical": for the verified reference chart
      // the backend value equals what the app used to show.
      final chart = AstroChartModel.fromJson(chartJson);
      final asc = chart.ascendant!.rashiIndex;
      for (final p in chart.planets) {
        expect(p.house, isNotNull, reason: p.planet);
        expect(p.house, ((p.rashiIndex - asc + 12) % 12) + 1, reason: p.planet);
      }
    });
  });

  testWidgets('Birth chart shows the backend house, not a client-derived one', (tester) async {
    tester.view.physicalSize = const Size(1200, 4000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    // Live fixture: Sun is in house 9. Pretend the backend says 3; the client
    // whole-sign formula would still give 9.
    await tester.pumpWidget(app(chartWithHouse('SUN', 3)));
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Key Placements'), findsOneWidget);
    expect(find.text('House 3'), findsWidgets);
    expect(find.text('House 9'), findsNothing);

    // Planets tab rows use the same backend value.
    await tester.tap(find.text('Planets'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('House 3'), findsWidgets);
    expect(find.text('House 9'), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('Birth chart renders on Android with the hero profile card', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(app(AstroChartModel.fromJson(chartJson)));
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Your Birth Chart'), findsOneWidget);
    expect(find.text('Rahul Sharma'), findsOneWidget);
    expect(find.text('Change'), findsOneWidget);
    expect(find.byTooltip('Download Kundli PDF'), findsOneWidget);
    expect(find.text('House 9'), findsWidgets); // Sun, from the backend
    expect(tester.takeException(), isNull);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));
}
