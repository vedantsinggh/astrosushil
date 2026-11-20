import 'package:astro_desktop/src/engine/models.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

/// Fixtures are real sidecar output for engine fixture REF_CHART_001 (tool/record_fixtures.sh).
void main() {
  test('ChartResult parses the normalized Rasi and Navamsa', () {
    final r = ChartResult(fixture('chart'));
    expect(r.utc, DateTime.utc(1990, 5, 15, 9));
    expect(r.julianDayUT, closeTo(2448026.875, 1e-6));
    expect(r.utcOffsetMinutes, 330);
    expect(r.ayanamsaName, 'LAHIRI');
    expect(r.rasi.planets, hasLength(9));
    expect(r.rasi.houses, hasLength(12));
    expect(r.navamsa.planets, hasLength(9));
    final sun = r.rasi.planets.firstWhere((p) => p.name == 'SUN');
    expect(sun.rashiIndex, 2); // Taurus, just after Vrishabha Sankranti (independent check)
    expect(sun.degree, lessThan(1.5));
    expect(r.panchang.tithi.name, isNotEmpty);
  });

  test('VargaChartModel parses all 16 vargas', () {
    final v = (fixture('vargas')['vargas'] as Map).cast<String, Object?>();
    expect(v.keys, hasLength(16));
    final d9 = VargaChartModel(v['D9'] as Json);
    expect(d9.division, 9);
    expect(d9.placements.map((p) => p.body), containsAll(['SUN', 'MOON', 'RAHU', 'KETU']));
  });

  test('Vimshottari dasha tree: 9 mahadashas, nested antardashas, contiguous', () {
    final d = DashaResultModel(fixture('dasha'));
    expect(d.isEligible, isTrue);
    expect(d.periods, hasLength(9));
    expect(d.periods.first.isBirthDasha, isTrue);
    expect(d.periods.first.children, isNotEmpty);
    for (var i = 1; i < d.periods.length; i++) {
      expect(d.periods[i].start, d.periods[i - 1].end);
    }
  });

  test('Panchang + day divisions', () {
    final p = PanchangResultModel(fixture('panchang'));
    expect(p.utcOffsetMinutes, 330);
    expect(p.dayDivisions.horas, hasLength(24));
    expect(p.dayDivisions.choghadiya, hasLength(16));
    expect(p.dayDivisions.kaalas, hasLength(4));
    expect(p.dayDivisions.weekdayLord, 'VENUS'); // 2024-06-21 is a Friday
  });

  test('Ashtakavarga: 7 BAVs + SAV totalling 337', () {
    final a = AshtakavargaModel(fixture('ashtakavarga'));
    expect(a.sav.fold<int>(0, (s, x) => s + x), 337);
    for (final row in a.bav.values) {
      expect(row, hasLength(12));
    }
  });

  test('Strength, transit, matchmaking, KP, eclipses, Sudarshana', () {
    final s = StrengthModel(fixture('strength'));
    expect(s.shadbala, hasLength(7));
    expect(s.bhavaBala, hasLength(12));
    expect(s.ishtaKashta, hasLength(7));
    final t = TransitModel(fixture('transit'));
    expect(t.planets, hasLength(9));
    final m = MatchModel(fixture('match'));
    expect(m.kootas, hasLength(8));
    expect(m.max, 36);
    expect(m.kootas.fold<double>(0, (s, k) => s + k.obtained), closeTo(m.total, 1e-9));
    final kp = KpModel(fixture('kp'));
    expect(kp.cusps, hasLength(12));
    final e = EclipseModel.listFrom(fixture('eclipses'));
    expect(e, hasLength(4)); // 2024: 2 solar + 2 lunar (NASA catalogue)
    final rings = SudarshanaRingModel.listFrom(fixture('sudarshana'));
    expect(rings.map((r) => r.ring), ['LAGNA', 'CHANDRA', 'SURYA']);
  });
}
