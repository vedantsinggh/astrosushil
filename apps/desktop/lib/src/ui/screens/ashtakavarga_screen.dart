import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../charts/chart_data.dart';
import '../../charts/chart_view.dart';
import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../../util/format.dart';
import '../widgets/common.dart';

class AshtakavargaScreen extends ConsumerStatefulWidget {
  const AshtakavargaScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  ConsumerState<AshtakavargaScreen> createState() => _AshtakavargaScreenState();
}

class _AshtakavargaScreenState extends ConsumerState<AshtakavargaScreen> {
  String prastaraPlanet = 'SUN';

  @override
  Widget build(BuildContext context) {
    final style = ref.watch(chartStyleProvider);
    final chart = ref.watch(chartResultProvider(widget.birth));
    return AsyncView(
      value: ref.watch(ashtakavargaProvider(widget.birth)),
      builder: (a) {
        final planets = planetOrder.where(a.bav.containsKey).toList();
        final asc = chart.valueOrNull?.rasi.ascendant.rashiIndex ?? 1;
        final pr = a.prastara[prastaraPlanet] ?? const {};
        return PageBody(children: [
          SectionCard(
            title: 'Bhinnashtakavarga and Sarvashtakavarga (bindus by sign)',
            child: SimpleTable(
              title: 'Ashtakavarga BAV and SAV',
              columns: const ['Planet', ...signShort, 'Total'],
              numericColumns: {for (var i = 1; i <= 13; i++) i},
              highlightRows: {planets.length},
              rows: [
                for (final p in planets) [titleCase(p), ...a.bav[p]!.map((x) => '$x'), '${a.bav[p]!.fold<int>(0, (s, x) => s + x)}'],
                ['SAV', ...a.sav.map((x) => '$x'), '${a.sav.fold<int>(0, (s, x) => s + x)}'],
              ],
            ),
          ),
          Wrap(spacing: 12, runSpacing: 12, children: [
            SizedBox(
                width: 372,
                child: SectionCard(
                  title: 'SAV chart',
                  child: ChartView(
                    data: ChartData(title: 'SAV', ascSign: asc, bodies: {
                      for (var s = 1; s <= 12; s++) s: [savBody(a.sav[s - 1])]
                    }),
                    style: style,
                    size: 320,
                    showTitle: false,
                    interactive: false,
                  ),
                )),
            SizedBox(
              width: 760,
              child: SectionCard(
                title: 'Prastara (contributors) for ${titleCase(prastaraPlanet)}',
                trailing: DropdownButton<String>(
                  value: prastaraPlanet,
                  items: [for (final p in planets) DropdownMenuItem(value: p, child: Text(titleCase(p)))],
                  onChanged: (v) => setState(() => prastaraPlanet = v!),
                ),
                child: SimpleTable(
                  title: 'Prastara ${titleCase(prastaraPlanet)}',
                  columns: const ['Contributor', ...signShort],
                  rows: [
                    for (final e in pr.entries) [titleCase(e.key), ...e.value.map((x) => x == 1 ? '•' : '')]
                  ],
                ),
              ),
            ),
          ]),
          if (a.shodhana.isNotEmpty) ShodhanaCard(a: a, planets: planets),
          if (a.pinda.isNotEmpty) PindaCard(a: a, planets: planets),
        ]);
      },
    );
  }
}

/// Trikona and Ekadhipatya Shodhana (reduced bindus) exactly as returned by the engine.
class ShodhanaCard extends StatefulWidget {
  const ShodhanaCard({super.key, required this.a, required this.planets});
  final AshtakavargaModel a;
  final List<String> planets;
  @override
  State<ShodhanaCard> createState() => _ShodhanaCardState();
}

class _ShodhanaCardState extends State<ShodhanaCard> {
  bool ekadhipatya = true;
  @override
  Widget build(BuildContext context) {
    final ps = widget.planets.where(widget.a.shodhana.containsKey).toList();
    List<int> row(String p) => ekadhipatya ? widget.a.shodhana[p]!.ekadhipatya : widget.a.shodhana[p]!.trikona;
    int? total(String p) => ekadhipatya ? widget.a.shodhana[p]!.ekadhipatyaTotal : widget.a.shodhana[p]!.trikonaTotal;
    return SectionCard(
      key: const Key('shodhana-card'),
      title: 'Shodhana (reduced bindus)',
      subtitle: ekadhipatya ? 'After Trikona and then Ekadhipatya Shodhana' : 'After Trikona Shodhana only',
      trailing: SegmentedButton<bool>(
        key: const Key('shodhana-stage'),
        showSelectedIcon: false,
        segments: const [ButtonSegment(value: false, label: Text('Trikona')), ButtonSegment(value: true, label: Text('Ekadhipatya'))],
        selected: {ekadhipatya},
        onSelectionChanged: (v) => setState(() => ekadhipatya = v.first),
      ),
      child: SimpleTable(
        title: ekadhipatya ? 'Ekadhipatya Shodhana' : 'Trikona Shodhana',
        columns: const ['Planet', ...signShort, 'Total'],
        numericColumns: {for (var i = 1; i <= 13; i++) i},
        rows: [
          for (final p in ps) [planetName(p), ...row(p).map((x) => '$x'), '${total(p) ?? row(p).fold<int>(0, (s, x) => s + x)}']
        ],
      ),
    );
  }
}

/// Rashi, Graha and Shodhya Pinda exactly as returned by the engine.
class PindaCard extends StatelessWidget {
  const PindaCard({super.key, required this.a, required this.planets});
  final AshtakavargaModel a;
  final List<String> planets;
  @override
  Widget build(BuildContext context) {
    String v(int? x) => x == null ? '—' : '$x';
    final ps = planets.where(a.pinda.containsKey).toList();
    return SizedBox(
      width: 640,
      child: SectionCard(
        key: const Key('pinda-card'),
        title: 'Shodhya Pinda',
        subtitle: 'Rashi Pinda + Graha Pinda, from the reduced bindus',
        child: SimpleTable(
          title: 'Shodhya Pinda',
          columns: const ['Planet', 'Rashi Pinda', 'Graha Pinda', 'Shodhya Pinda'],
          numericColumns: const {1, 2, 3},
          rows: [
            for (final p in ps) [planetName(p), v(a.pinda[p]!.rashiPinda), v(a.pinda[p]!.grahaPinda), v(a.pinda[p]!.shodhyaPinda)]
          ],
        ),
      ),
    );
  }
}

/// A numeric label body for SAV charts (28+ bindus highlighted, display only).

ChartBody savBody(int n) => ChartBody('$n', highlight: n >= 28);
