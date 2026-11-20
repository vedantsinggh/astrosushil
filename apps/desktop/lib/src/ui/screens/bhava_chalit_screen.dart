import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../features/horoscope_pdf/horoscope_pdf.dart' show bhavaChartData;
import '../../charts/chart_view.dart';
import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../widgets/common.dart';

/// Sripati Bhava Chalit from `chartVariants.compute` → `bhavaSripati` (engine 0.2.0, ADR-017):
/// bhava madhyas from the real MC and Lagna, sandhis between them, planets placed by sandhi.
/// Every value is engine output; this screen only lays it out.
class BhavaChalitScreen extends ConsumerWidget {
  const BhavaChalitScreen({super.key, required this.birth});
  final BirthInput birth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final style = ref.watch(chartStyleProvider);
    final key = rawKey('chartVariants.compute', {'birth': birth.toJson()});
    return AsyncView(
      value: ref.watch(rawProvider(key)),
      onRetry: () => ref.invalidate(rawProvider(key)),
      builder: (j) {
        final variant = j['bhavaSripati'] is Map ? (j['bhavaSripati'] as Map).cast<String, Object?>() : const <String, Object?>{};
        final chart = NormalizedChartModel(variant['chart'] is Map ? (variant['chart'] as Map).cast<String, Object?>() : const {});
        if (chart.houses.isEmpty) {
          return const EmptyState(icon: Icons.view_quilt_outlined, title: 'Bhava Chalit not available', message: 'The engine did not return a Sripati Bhava Chalit for this chart.');
        }
        final title = variant['title'] is String ? variant['title'] as String : 'Sripati Bhava Chalit';
        String lon(double? v) => v == null ? '' : signDms(v);
        final byBhava = <int, List<String>>{};
        for (final p in chart.planets) {
          byBhava.putIfAbsent(p.house, () => []).add(abbr(p.name));
        }
        final bhavaTable = SimpleTable(
          key: const Key('bhava-table'),
          title: 'Bhava madhya and sandhi',
          columns: const ['Bhava', 'Begins (sandhi)', 'Madhya', 'Ends (sandhi)', 'Sign', 'Lord', 'Planets'],
          numericColumns: const {0},
          rows: [
            for (final h in chart.houses)
              ['${h.number}', lon(h.startLongitude), lon(h.cuspLongitude), lon(h.endLongitude), h.sign, titleCase(h.lord), (byBhava[h.number] ?? const []).join(' ')],
          ],
        );
        final planetTable = SimpleTable(
          title: 'Planets by bhava',
          columns: const ['Body', 'Longitude', 'Sign', 'Nakshatra', 'Bhava'],
          numericColumns: const {4},
          rows: [
            ['Lagna', signDms(chart.ascendant.absoluteDegree), chart.ascendant.sign, '${chart.ascendant.nakshatra} ${chart.ascendant.pada}', '1'],
            for (final p in chart.planets) [planetName(p.name), signDms(p.absoluteDegree), p.sign, '${p.nakshatra} ${p.pada}', '${p.house}'],
          ],
        );
        return LayoutBuilder(builder: (context, c) {
          final wide = c.maxWidth >= 1000;
          final size = math.min(wide ? 380.0 : c.maxWidth - 120, 420.0).clamp(220.0, 420.0);
          final chartCard = SectionCard(
            title: title,
            subtitle: 'Each planet is drawn in the bhava the engine placed it in',
            child: Center(child: ChartView(data: bhavaChartData('Bhava Chalit', chart), style: style, size: size, showTitle: false, showLegend: true)),
          );
          final tableCard = SectionCard(title: 'Bhavas', subtitle: 'Madhya = bhava middle; sandhi = boundary between bhavas', child: bhavaTable);
          return PageBody(children: [
            if (wide)
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SizedBox(width: size + 48, child: chartCard),
                const SizedBox(width: Gap.lg),
                Expanded(child: tableCard),
              ])
            else ...[chartCard, tableCard],
            SectionCard(title: 'Planets', child: planetTable),
          ]);
        });
      },
    );
  }
}
