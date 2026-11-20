import 'package:astro_desktop/src/charts/chart_geometry.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:astro_desktop/src/engine/models.dart';
import 'package:astro_desktop/src/print/chart_pdf.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

const birth = BirthInput(name: 'Reference Chart 001', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi, India');

void main() {
  test('chart summary PDF renders for every chart style', () async {
    final chart = ChartResult(fixture('chart'));
    final dasha = DashaResultModel(fixture('dasha'));
    for (final s in ChartStyle.values) {
      final bytes = await buildChartSummaryPdf(birth: birth, chart: chart, style: s, vimshottari: dasha);
      expect(String.fromCharCodes(bytes.take(5)), '%PDF-');
      expect(bytes.length, greaterThan(3000));
    }
    expect(latin1Safe('Mo℞ — São'), 'Mo(R) - São');
  });
}
