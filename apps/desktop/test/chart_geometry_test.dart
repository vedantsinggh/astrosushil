import 'package:astro_desktop/src/charts/chart_data.dart';
import 'package:astro_desktop/src/charts/chart_geometry.dart';
import 'package:astro_desktop/src/engine/models.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  test('houseOfSign / signOfHouse are inverse whole-sign counts', () {
    for (var asc = 1; asc <= 12; asc++) {
      for (var s = 1; s <= 12; s++) {
        expect(signOfHouse(houseOfSign(s, asc), asc), s);
      }
      expect(houseOfSign(asc, asc), 1);
    }
  });

  test('North Indian: ascendant sign occupies the top diamond (house 1)', () {
    final l = buildLayout(ChartStyle.north, 8);
    expect(l.cellForSign(8).house, 1);
    expect(l.cellForSign(8).anchor, const Pt(0.5, 0.25));
    expect(l.cellForSign(9).anchor, const Pt(0.25, 0.085)); // house 2: top-left triangle
    expect(l.cellForSign(2).anchor, const Pt(0.5, 0.75)); // house 7: bottom diamond
  });

  test('South Indian: signs are fixed (Pisces top-left, Aries next, Virgo bottom-right)', () {
    for (var asc = 1; asc <= 12; asc++) {
      final l = buildLayout(ChartStyle.south, asc);
      expect(l.cellForSign(12).anchor.x, lessThan(0.25));
      expect(l.cellForSign(12).anchor.y, lessThan(0.25));
      expect(l.cellForSign(1).anchor.x, inInclusiveRange(0.25, 0.5));
      expect(l.cellForSign(6).anchor.x, greaterThan(0.75));
      expect(l.cellForSign(6).anchor.y, greaterThan(0.75));
      expect(l.ascMarker, isNotNull);
    }
  });

  test('East Indian: Aries top centre, Libra bottom centre, anticlockwise', () {
    final l = buildLayout(ChartStyle.east, 1);
    expect(l.cellForSign(1).anchor.x, closeTo(0.5, 1e-9));
    expect(l.cellForSign(1).anchor.y, lessThan(1 / 3));
    expect(l.cellForSign(7).anchor.y, greaterThan(2 / 3));
    expect(l.cellForSign(4).anchor.x, lessThan(1 / 3)); // Cancer on the left
    expect(l.cellForSign(10).anchor.x, greaterThan(2 / 3)); // Capricorn on the right
  });

  test('every style has 12 distinct cells inside the unit square', () {
    for (final s in ChartStyle.values) {
      final l = buildLayout(s, 5);
      expect(l.cells, hasLength(12));
      expect(l.cells.map((c) => c.anchor).toSet(), hasLength(12));
      for (final c in l.cells) {
        expect(c.anchor.x, inInclusiveRange(0, 1));
        expect(c.anchor.y, inInclusiveRange(0, 1));
      }
    }
  });

  test('ChartData groups engine placements by sign without recomputing', () {
    final r = ChartResult(fixture('chart'));
    final d = ChartData.fromNormalized('Rasi', r.rasi);
    expect(d.ascSign, r.rasi.ascendant.rashiIndex);
    final total = d.bodies.values.fold<int>(0, (s, l) => s + l.length);
    expect(total, 10); // 9 grahas + ascendant
    for (final p in r.rasi.planets) {
      expect(d.bodies[p.rashiIndex]!.any((b) => b.retrograde == p.retrograde), isTrue);
    }
  });
}
