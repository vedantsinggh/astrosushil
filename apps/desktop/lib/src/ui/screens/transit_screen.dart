import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../charts/chart_data.dart';
import '../../charts/chart_view.dart';
import '../../engine/inputs.dart';
import '../../state/providers.dart';
import '../../util/format.dart';
import '../widgets/common.dart';
import '../widgets/moment_bar.dart';

class TransitScreen extends ConsumerStatefulWidget {
  const TransitScreen({super.key, required this.birth, required this.initialMoment});
  final BirthInput birth;
  final BirthInput initialMoment;
  @override
  ConsumerState<TransitScreen> createState() => _TransitScreenState();
}

class _TransitScreenState extends ConsumerState<TransitScreen> {
  late BirthInput moment = widget.initialMoment;

  @override
  Widget build(BuildContext context) {
    final style = ref.watch(chartStyleProvider);
    final natal = ref.watch(chartResultProvider(widget.birth)).valueOrNull;
    return PageBody(children: [
      MomentBar(value: moment, onChanged: (m) => setState(() => moment = m), label: 'Transit moment'),
      AsyncView(
        value: ref.watch(transitProvider((widget.birth, moment))),
        builder: (t) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 12, runSpacing: 12, children: [
            if (natal != null) SectionCard(title: 'Natal Rasi', child: ChartView(data: ChartData.fromNormalized('Natal', natal.rasi), style: style, size: 330)),
            SectionCard(title: 'Transits', child: ChartView(data: ChartData.fromTransit(t, natalAsc: natal?.rasi.ascendant.rashiIndex), style: style, size: 330)),
          ]),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Transit positions',
            child: SimpleTable(
              columns: const ['Planet', 'Sign', 'Degree', 'Nakshatra', 'Pada', 'House (natal Lagna)', 'R'],
              rows: [
                for (final name in planetOrder)
                  for (final p in t.planets.where((x) => x.planet == name))
                    [titleCase(p.planet), p.rashiName, dms(p.degree), p.nakshatra, '${p.pada}', '${p.house ?? ''}', p.retrograde ? 'R' : ''],
              ],
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Gochara from natal Moon (Vedha per engine rule, natal BAV bindus)',
            child: SimpleTable(
              columns: const ['Planet', 'House from Moon', 'Favourable house', 'Vedha obstructed', 'BAV'],
              rows: [for (final r in t.toMoon) [titleCase(r.planet), '${r.houseFromMoon}', r.favourable ? 'Yes' : 'No', r.obstructed ? 'Yes' : 'No', '${r.bav ?? ''}']],
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(title: 'Kakshya', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [for (final k in t.kakshas) SelectableText(k, style: const TextStyle(fontSize: 12.5))])),
        ]),
      ),
    ]);
  }
}
