import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/dasha_model.dart';
import 'package:astro_mobile/features/astrology/models/panchang_model.dart';
import 'package:astro_mobile/features/astrology/models/strength_model.dart';
import 'package:astro_mobile/features/astrology/models/ashtakavarga_model.dart';
import 'package:astro_mobile/features/astrology/models/yoga_model.dart';
import 'package:astro_mobile/features/astrology/models/special_points_model.dart';
import 'package:astro_mobile/features/astrology/models/jaimini_model.dart';
import 'package:astro_mobile/features/astrology/models/kp_model.dart';
import 'package:astro_mobile/features/astrology/models/gochara_model.dart';
import 'package:astro_mobile/features/astrology/models/varshaphala_model.dart';
import 'package:astro_mobile/features/astrology/models/prashna_model.dart';
import 'package:astro_mobile/features/astrology/models/matchmaking_model.dart';

void main() {
  group('Live API Fixtures E2E Model Parsing Tests', () {
    late Map<String, dynamic> fixtures;

    setUpAll(() {
      final file = File('test/fixtures_live.json');
      final content = file.readAsStringSync();
      fixtures = jsonDecode(content) as Map<String, dynamic>;
    });

    test('1. AstroChartModel D1 & D9 parsing', () {
      final chartD1Json = fixtures['chart_d1'] as Map<String, dynamic>;
      final chartD1 = AstroChartModel.fromJson(chartD1Json);
      expect(chartD1.planets.length, equals(9));
      expect(chartD1.houses.length, equals(12));
      expect(chartD1.ascendant, isNotNull);
      expect(chartD1.ascendant!.rashiName, isNotEmpty);

      final chartD9Json = fixtures['chart_d9'] as Map<String, dynamic>;
      final chartD9 = AstroChartModel.fromJson(chartD9Json);
      expect(chartD9.planets.length, equals(9));
      expect(chartD9.houses.length, equals(12));
    });

    test('2. DashaTreeModel parsing', () {
      final dashaJson = fixtures['dasha'] as Map<String, dynamic>;
      final dashaTree = DashaTreeModel.fromJson(dashaJson);
      expect(dashaTree.system, equals('VIMSHOTTARI'));
      expect(dashaTree.mahadashas.length, equals(9));
      expect(dashaTree.getCurrentMahadasha(), isNotNull);
      expect(dashaTree.getCurrentAntardasha(), isNotNull);
    });

    test('3. PanchangModel parsing', () {
      final panchangJson = fixtures['panchang'] as Map<String, dynamic>;
      final panchang = PanchangModel.fromJson(panchangJson);
      expect(panchang.tithi.name, isNotEmpty);
      expect(panchang.vara.name, isNotEmpty);
      expect(panchang.nakshatra.name, isNotEmpty);
      expect(panchang.yoga.name, isNotEmpty);
      expect(panchang.karana.name, isNotEmpty);
    });

    test('4. ComprehensiveStrengthModel (Shadbala & Bhava Bala) parsing', () {
      final strengthJson = fixtures['strength'] as Map<String, dynamic>;
      final strength = ComprehensiveStrengthModel.fromJson(strengthJson);
      expect(strength.shadbala.planets.length, equals(7));
      expect(strength.bhavaBala.houses.length, equals(12));
      for (final p in strength.shadbala.planets.values) {
        expect(p.totalRupas, greaterThan(0));
        expect(p.totalShashtiamsas, greaterThan(0));
      }
      for (final h in strength.bhavaBala.houses) {
        expect(h.totalRupas, greaterThan(0));
        expect(h.totalShashtiamsas, greaterThan(0));
      }
    });

    test('5. AshtakavargaResultModel parsing', () {
      final avJson = fixtures['ashtakavarga'] as Map<String, dynamic>;
      final av = AshtakavargaResultModel.fromJson(avJson);
      expect(av.sav.grandTotal, equals(337));
      expect(av.sav.signList.length, equals(12));
      expect(av.bav.length, equals(7));
    });

    test('6. YogaEvaluationReportModel parsing', () {
      final yogasJson = fixtures['yogas'] as Map<String, dynamic>;
      final yogas = YogaEvaluationReportModel.fromJson(yogasJson);
      expect(yogas.totalEvaluated, greaterThan(0));
      expect(yogas.detectedYogas.length, equals(yogas.detectedCount));
    });

    test('7. SpecialPointsReportModel parsing', () {
      final spJson = fixtures['special_points'] as Map<String, dynamic>;
      final sp = SpecialPointsReportModel.fromJson(spJson);
      expect(sp.upagrahas.allPoints.length, equals(7));
      expect(sp.specialLagnas.allLagnas.length, greaterThanOrEqualTo(5));
      expect(sp.yogiPoints.yogiPlanet, isNotEmpty);
    });

    test('8. JaiminiReportModel parsing', () {
      final jaiminiJson = fixtures['jaimini'] as Map<String, dynamic>;
      final jaimini = JaiminiReportModel.fromJson(jaiminiJson);
      expect(jaimini.charaKarakas.length, equals(7));
      expect(jaimini.arudhaPadas.length, equals(12));
      expect(jaimini.arudhaLagna?.rashiName, isNotEmpty);
    });

    test('9. KPReportModel parsing', () {
      final kpJson = fixtures['kp'] as Map<String, dynamic>;
      final kp = KPReportModel.fromJson(kpJson);
      expect(kp.cusps.length, equals(12));
      expect(kp.planets.length, equals(9));
      expect(kp.houseSignificators.length, equals(12));
      expect(kp.rulingPlanets.dayLord, isNotEmpty);
    });

    test('10. TransitSnapshotModel (Gochara) parsing', () {
      final gocharaJson = fixtures['gochara'] as Map<String, dynamic>;
      final gochara = TransitSnapshotModel.fromJson(gocharaJson);
      expect(gochara.planets.length, equals(9));
      expect(gochara.transitToMoon.length, equals(9));
    });

    test('11. VarshaphalaChartModel parsing', () {
      final vpJson = fixtures['varshaphala'] as Map<String, dynamic>;
      final vp = VarshaphalaChartModel.fromJson(vpJson);
      expect(vp.varshesha.planet, isNotEmpty);
      expect(vp.muntha.rashiName, isNotEmpty);
      expect(vp.planets.length, equals(9));
      expect(vp.houses.length, equals(12));
    });

    test('12. PrashnaChartModel parsing', () {
      final prashnaJson = fixtures['prashna'] as Map<String, dynamic>;
      final prashna = PrashnaChartModel.fromJson(prashnaJson);
      expect(prashna.prashnaLagna.rashiName, isNotEmpty);
      expect(prashna.planets.length, equals(9));
      expect(prashna.houses.length, equals(12));
    });

    test('13. MatchmakingReportModel parsing', () {
      final mmJson = fixtures['matchmaking'] as Map<String, dynamic>;
      final mm = MatchmakingReportModel.fromJson(mmJson);
      expect(mm.ashtakoota.totalObtainedPoints, inInclusiveRange(0, 36));
      expect(mm.ashtakoota.kootaList.length, equals(8));
      expect(mm.manglikComparison.personA.isManglik, isNotNull);
      expect(mm.manglikComparison.personB.isManglik, isNotNull);
    });
  });
}
