import 'dart:convert';

import 'package:astro_desktop/features/horoscope_pdf/horoscope_data.dart';
import 'package:astro_desktop/features/horoscope_pdf/horoscope_pdf.dart';
import 'package:astro_desktop/features/horoscope_pdf/horoscope_pdf_screen.dart';
import 'package:astro_desktop/src/charts/chart_geometry.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart' show FilterChip;
import 'package:flutter_test/flutter_test.dart';

import '../helpers.dart';
import 'feature_harness.dart';

/// Real sidecar output for REF_CHART_001 birth data (New Delhi, 1990-05-15 14:30 IST), recorded
/// with engine-sidecar dispatchLine via tsx; see the fixture's `_recorded` note for the requests.
final _fx = fixture('features/horoscope_pdf_birth');
final _birth = BirthInput.fromJson((_fx['_recorded'] as Map)['birth'] as Map<String, Object?>);
Map<String, Object?> _m(String k) => (_fx[k] as Map).cast<String, Object?>();

HoroscopeData _data() => HoroscopeData(
      birth: _birth,
      chart: _m('chart'),
      vargas: _m('vargas'),
      variants: _m('chart_variants'),
      avakhada: _m('avakhada'),
      vimshottari: _m('dasha_vimshottari'),
      yogini: _m('dasha_yogini'),
      strength: _m('strength'),
    );

Object? _handler(String method, Map<String, Object?> p) => switch (method) {
      'chart.compute' => _m('chart'),
      'vargas.compute' => _m('vargas'),
      'chartVariants.compute' => _m('chart_variants'),
      'avakhada.compute' => _m('avakhada'),
      'dasha.compute' => p['system'] == 'YOGINI' ? _m('dasha_yogini') : _m('dasha_vimshottari'),
      'strength.compute' => _m('strength'),
      _ => throw StateError('unexpected $method'),
    };

/// Counts page objects (`/Type /Page`, not `/Pages`) in an uncompressed-dictionary PDF.
int _pageCount(List<int> bytes) => RegExp(r'/Type\s*/Page(?![s\w])').allMatches(latin1.decode(bytes)).length;

void main() {
  test('fixture data reads through the shared models', () {
    final d = _data();
    expect(d.chart.rasi.planets, hasLength(9));
    expect(d.d9.code, 'D9');
    expect(d.d10.code, 'D10');
    expect(d.bhavaSripati.houses, hasLength(12));
    expect(d.vimshottari.periods, isNotEmpty);
    expect(d.vimshottari.periods.first.children, isNotEmpty); // maxLevel 2 -> antardashas
    expect(d.yogini.periods, isNotEmpty);
    expect(d.strength.shadbala, isNotEmpty);
    expect(d.avakhada['nakshatra'], isA<String>());
  });

  test('bhava chalit layout puts each graha in the cell of its engine bhava', () {
    final d = _data();
    final cd = bhavaChartData('Bhava Chalit (Sripati)', d.bhavaSripati);
    final asc = d.bhavaSripati.ascendant.rashiIndex;
    for (final p in d.bhavaSripati.planets) {
      final cell = ((asc - 1 + p.house - 1) % 12) + 1;
      expect(cd.bodies[cell]!.any((b) => b.code == p.name), isTrue, reason: p.name);
    }
  });

  for (final style in ChartStyle.values) {
    test('full horoscope PDF (${style.name}) is a multi-page PDF', () async {
      final bytes = await buildHoroscopePdf(_data(), options: HoroscopePdfOptions(style: style));
      expect(latin1.decode(bytes.sublist(0, 5)), '%PDF-');
      expect(_pageCount(bytes), greaterThan(1));
    });
  }

  test('section selection changes the document (fewer pages with only basics)', () async {
    final all = await buildHoroscopePdf(_data());
    final basics = await buildHoroscopePdf(_data(), options: const HoroscopePdfOptions(sections: {HoroscopeSection.basics}));
    expect(latin1.decode(basics.sublist(0, 5)), '%PDF-');
    expect(_pageCount(basics), lessThan(_pageCount(all)));
    expect(_pageCount(all), greaterThanOrEqualTo(5));
  });

  testWidgets('screen loads every engine result and offers save/print/preview', (tester) async {
    final t = await pumpFeature(tester, HoroscopePdfScreen(birth: _birth), _handler);
    expect(find.text('Horoscope PDF'), findsOneWidget);
    expect(find.text('Save PDF'), findsOneWidget);
    expect(find.text('Print'), findsOneWidget);
    expect(find.text('Preview'), findsOneWidget);
    for (final s in HoroscopeSection.values) {
      expect(find.text(s.label), findsOneWidget);
    }
    expect(find.text('South Indian'), findsOneWidget);
    // Lagna of the fixture chart, straight from the engine output.
    final asc = (_m('chart')['rasi'] as Map)['ascendant'] as Map;
    expect(find.textContaining(asc['sign'] as String), findsWidgets);
    final methods = t.sent.map((m) => m['method']).toSet();
    expect(methods, containsAll(['chart.compute', 'vargas.compute', 'chartVariants.compute', 'avakhada.compute', 'dasha.compute', 'strength.compute']));
    final dashaReqs = t.sent.where((m) => m['method'] == 'dasha.compute').map((m) => (m['params'] as Map)['system']).toSet();
    expect(dashaReqs, {'VIMSHOTTARI', 'YOGINI'});
  });

  testWidgets('the Bhava Chalit page is included by default', (tester) async {
    expect(const HoroscopePdfOptions().sections, contains(HoroscopeSection.bhavaChalit));
    await pumpFeature(tester, HoroscopePdfScreen(birth: _birth), _handler);
    final chip = tester.widget<FilterChip>(find.ancestor(of: find.text(HoroscopeSection.bhavaChalit.label), matching: find.byType(FilterChip)));
    expect(chip.selected, isTrue);
    for (final s in HoroscopeSection.values) {
      expect(tester.widget<FilterChip>(find.ancestor(of: find.text(s.label), matching: find.byType(FilterChip))).selected, isTrue, reason: s.name);
    }
  });

  test('the Bhava Chalit page adds the chart and the madhya/sandhi table', () async {
    final d = _data();
    expect(d.bhavaSripati.houses.every((h) => h.startLongitude != null && h.endLongitude != null), isTrue);
    final all = await buildHoroscopePdf(d);
    final without = await buildHoroscopePdf(d, options: HoroscopePdfOptions(sections: {...HoroscopeSection.values}..remove(HoroscopeSection.bhavaChalit)));
    expect(all.length, greaterThan(without.length));
  });
}
