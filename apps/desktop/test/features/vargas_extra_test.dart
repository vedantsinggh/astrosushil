import 'package:astro_desktop/features/common/provisional.dart';
import 'package:astro_desktop/features/vargas_extra/vargas_extra_screen.dart';
import 'package:astro_desktop/src/charts/chart_view.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers.dart';
import 'feature_harness.dart';

const birth = BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

// Real sidecar output (vargasExtra.compute / pushkara.compute / bhriguBindu.compute) for the birth
// above, recorded by running the handlers through the sidecar dispatcher with tsx.
final _vargas = fixture('features/vargas_extra_vargas');
final _pushkara = fixture('features/vargas_extra_pushkara');
final _bhrigu = fixture('features/vargas_extra_bhrigu');

Object? _handler(String method, Map<String, Object?> params) => switch (method) {
      'vargasExtra.compute' => _vargas,
      'pushkara.compute' => _pushkara,
      'bhriguBindu.compute' => _bhrigu,
      _ => throw StateError('unexpected $method'),
    };

void main() {
  testWidgets('shows 8 varga thumbnails, the selected chart, Pushkara and Bhrigu Bindu tables', (tester) async {
    final t = await pumpFeature(tester, const VargasExtraScreen(birth: birth), _handler, size: const Size(1500, 3600));
    expect(t.sent.map((m) => m['method']).toSet(), {'vargasExtra.compute', 'pushkara.compute', 'bhriguBindu.compute'});
    for (final code in ['D5', 'D6', 'D8', 'D11', 'D81', 'D108', 'D144', 'D150']) {
      expect(find.byKey(ValueKey('extra-varga-$code')), findsOneWidget);
    }
    // 8 thumbnails + 1 large chart
    expect(find.byType(ChartView), findsNWidgets(9));
    expect(find.text('D5 — Panchamsa'), findsOneWidget);
    expect(find.byType(ProvisionalBanner), findsNWidgets(3));
    expect(find.text('Pushkara Navamsha and Pushkara Bhaga'), findsOneWidget);
    expect(find.text('Pushkara bhaga'), findsNWidgets(2)); // column in both Pushkara tables
    expect(find.text('Pushya pada 2'), findsOneWidget); // Bhrigu Bindu nakshatra from the recorded output
    expect(find.text('Notes / interpretation'), findsNWidgets(3));
  });

  testWidgets('selecting D150 shows the nadiamsa column', (tester) async {
    await pumpFeature(tester, const VargasExtraScreen(birth: birth), _handler, size: const Size(1500, 3600));
    expect(find.text('Nadiamsa'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('extra-varga-D150')));
    await tester.pumpAndSettle();
    expect(find.text('D150 — Nadiamsa'), findsOneWidget);
    expect(find.text('Nadiamsa'), findsOneWidget);
  });
}
