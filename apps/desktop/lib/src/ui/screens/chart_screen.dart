import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../charts/chart_data.dart';
import '../../charts/chart_view.dart';
import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../widgets/common.dart';
import '../widgets/split_pane.dart';

/// Rasi and Navamsa on the left; birth summary and tables on the right (resizable).
class ChartScreen extends ConsumerWidget {
  const ChartScreen({super.key, required this.birth});
  final BirthInput birth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final style = ref.watch(chartStyleProvider);
    final fraction = ref.watch(prefsProvider.select((p) => p.splitFraction));
    return AsyncView(
      value: ref.watch(chartResultProvider(birth)),
      skeleton: const ChartSkeleton(),
      onRetry: () => ref.invalidate(chartResultProvider(birth)),
      builder: (r) => SplitPane(
        fraction: fraction,
        onChanged: (f) => ref.read(prefsProvider.notifier).update((p) => p.copyWith(splitFraction: f)),
        minLeft: 360,
        minRight: 340,
        left: LayoutBuilder(builder: (context, c) {
          final two = c.maxWidth >= 700;
          final size = math.min(two ? (c.maxWidth - 48 - Gap.lg) / 2 - 32 : c.maxWidth - 80, 520.0).clamp(220.0, 520.0);
          final charts = [
            SectionCard(
              title: 'Rasi (D1)',
              subtitle: 'Hover a house for details; right-click to copy',
              child: Center(child: ChartView(data: ChartData.fromNormalized('Rasi', r.rasi), style: style, size: size, showTitle: false, showLegend: true)),
            ),
            SectionCard(
              title: 'Navamsa (D9)',
              child: Center(child: ChartView(data: ChartData.fromNormalized('Navamsa', r.navamsa, showDegrees: false), style: style, size: size, showTitle: false, showLegend: true)),
            ),
          ];
          return PageBody(
            padding: const EdgeInsets.fromLTRB(24, 12, 12, 32),
            children: [
              if (two) Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: charts[0]), const SizedBox(width: Gap.lg), Expanded(child: charts[1])]) else ...charts,
              SectionCard(title: 'Planetary positions', child: PlanetTable(chart: r.rasi)),
            ],
          );
        }),
        right: PageBody(
          padding: const EdgeInsets.fromLTRB(12, 12, 24, 32),
          children: [
            BirthSummary(birth: birth, r: r),
            SectionCard(title: 'Houses', subtitle: '${houseSystemLabel(r.houseSystem)} houses', child: HouseTable(chart: r.rasi)),
          ],
        ),
      ),
    );
  }
}

class BirthSummary extends StatelessWidget {
  const BirthSummary({super.key, required this.birth, required this.r});
  final BirthInput birth;
  final ChartResult r;

  @override
  Widget build(BuildContext context) {
    final p = r.panchang;
    return SectionCard(
      title: 'Birth data',
      child: KeyValueGrid(columns: 1, keyWidth: 130, items: [
        ('Name', birth.name ?? '—'),
        ('Date / time', '${civilDate(birth.date)}  ${birth.time}'),
        ('Zone', '${birth.timezone} (${offsetLabel(r.utcOffsetMinutes)})'),
        ('UTC', localDateTime(r.utc, 0)),
        ('Place', birth.placeName ?? '—'),
        ('Coordinates', latLon(birth.latitude, birth.longitude)),
        ('Julian day (UT)', r.julianDayUT.toStringAsFixed(5)),
        ('Ayanamsa', '${ayanamsaLabel(r.ayanamsaName)} ${dms(r.ayanamsa)}'),
        ('Rahu / Ketu', nodeLabel(r.nodeCalculation)),
        ('Houses', houseSystemLabel(r.houseSystem)),
        ('Lagna', '${r.rasi.ascendant.sign} ${dms(r.rasi.ascendant.degree)}'),
        ('Lagna nakshatra', '${r.rasi.ascendant.nakshatra} ${r.rasi.ascendant.pada}'),
        ('Day / night birth', r.isDayBirth ? 'Day' : 'Night'),
        ('Tithi', '${p.tithi.name} (${titleCase(p.tithi.extra ?? '')})'),
        ('Vara', '${p.vara.name} (${titleCase(p.vara.extra ?? '')})'),
        ('Nakshatra', '${p.nakshatra.name} ${p.nakshatra.pada ?? ''}'),
        ('Yoga / Karana', '${p.yoga.name} / ${p.karana.name}'),
      ]),
    );
  }
}

class PlanetTable extends StatelessWidget {
  const PlanetTable({super.key, required this.chart});
  final NormalizedChartModel chart;

  @override
  Widget build(BuildContext context) {
    final a = chart.ascendant;
    final rows = <List<String>>[
      ['Lagna', a.sign, dms(a.degree), a.nakshatra, '${a.pada}', titleCase(a.lord), '1', '', '', '', ''],
      for (final p in chart.planets)
        [
          planetName(p.name),
          p.sign,
          dms(p.degree),
          p.nakshatra,
          '${p.pada}',
          titleCase(p.nakshatraLord),
          '${p.house}',
          titleCase(p.dignity),
          [if (p.retrograde) 'R', if (p.combust) 'C'].join(' '),
          p.charaKaraka ?? '',
          p.speed == null ? '' : p.speed!.toStringAsFixed(4),
        ],
    ];
    return SimpleTable(
      title: 'Planetary positions',
      columns: const ['Body', 'Sign', 'Degree', 'Nakshatra', 'Pada', 'Nak. lord', 'House', 'Dignity', 'R / C', 'Karaka', 'Speed °/day'],
      numericColumns: const {2, 4, 6, 10},
      highlightRows: const {0},
      rows: rows,
    );
  }
}

class HouseTable extends StatelessWidget {
  const HouseTable({super.key, required this.chart});
  final NormalizedChartModel chart;
  @override
  Widget build(BuildContext context) => SimpleTable(
        title: 'Houses',
        columns: const ['House', 'Sign', 'Lord', 'Occupants'],
        numericColumns: const {0},
        rows: [for (final h in chart.houses) ['${h.number}', h.sign, titleCase(h.lord), h.occupants.map(abbr).join(' ')]],
      );
}
