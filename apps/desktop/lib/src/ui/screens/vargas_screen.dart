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

class VargasScreen extends ConsumerStatefulWidget {
  const VargasScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  ConsumerState<VargasScreen> createState() => _VargasScreenState();
}

class _VargasScreenState extends ConsumerState<VargasScreen> {
  String selected = 'D9';

  @override
  Widget build(BuildContext context) {
    final style = ref.watch(chartStyleProvider);
    return AsyncView(
      value: ref.watch(vargasProvider(widget.birth)),
      builder: (vargas) {
        final v = vargas[selected]!;
        return PageBody(children: [
          SectionCard(
            title: 'Shodashavarga (16 divisional charts)',
            child: Wrap(spacing: 10, runSpacing: 10, children: [
              for (final e in vargas.entries)
                InkWell(
                  onTap: () => setState(() => selected = e.key),
                  child: Container(
                    decoration: BoxDecoration(border: Border.all(color: e.key == selected ? context.palette.accent : Colors.transparent, width: 2)),
                    padding: const EdgeInsets.all(2),
                    child: ChartView(data: ChartData.fromVarga(e.value), style: style, size: 170, interactive: false),
                  ),
                ),
            ]),
          ),
          SectionCard(
            title: '${v.code} — ${v.name}',
            child: Wrap(spacing: 16, runSpacing: 12, children: [
              ChartView(data: ChartData.fromVarga(v, showDegrees: true), style: style, size: 380, showLegend: true),
              SizedBox(width: 520, child: _VargaTable(v: v)),
            ]),
          ),
        ]);
      },
    );
  }
}

class _VargaTable extends StatelessWidget {
  const _VargaTable({required this.v});
  final VargaChartModel v;
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Rule (engine): ${v.rule}', style: const TextStyle(fontSize: 12)),
        const SizedBox(height: 8),
        SimpleTable(
          columns: const ['Body', 'Sign', 'Degree in varga', 'House'],
          rows: [
            ['Lagna', signNames[v.ascendantRashi - 1], '', '1'],
            for (final name in planetOrder)
              for (final p in v.placements.where((x) => x.body == name))
                [titleCase(p.body) + (p.retrograde ? ' (R)' : ''), p.rashiName, p.degree == null ? '' : dms(p.degree!), '${p.house ?? ''}'],
          ],
        ),
      ]);
}
