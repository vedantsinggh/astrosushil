import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/ui/widgets/moment_bar.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'chakra_painters.dart';
import 'chakras_models.dart';

/// Sarvatobhadra, Kota and Tripataki chakras in one tabbed screen.
class ChakrasScreen extends StatelessWidget {
  const ChakrasScreen({super.key, required this.birth, this.initialMoment, this.initialYear});
  final BirthInput birth;
  final BirthInput? initialMoment;
  final int? initialYear;

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 3,
        child: Column(children: [
          const TabBar(isScrollable: true, tabs: [Tab(text: 'Sarvatobhadra'), Tab(text: 'Kota'), Tab(text: 'Tripataki')]),
          Expanded(
            child: TabBarView(children: [
              SarvatobhadraScreen(birth: birth, initialMoment: initialMoment),
              KotaChakraScreen(birth: birth, initialMoment: initialMoment),
              TripatakiScreen(birth: birth, initialYear: initialYear),
            ]),
          ),
        ]),
      );
}

Widget _notes(ProvisionalInfo info) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [for (final n in info.notes) Padding(padding: const EdgeInsets.only(bottom: 4), child: Note(n))],
    );

String _dir(String d) => titleCase(d.replaceAll('_', ' '));

/// Transit toggle + moment picker shared by the Sarvatobhadra and Kota screens.
class _TransitControls extends StatelessWidget {
  const _TransitControls({required this.enabled, required this.moment, required this.onEnabled, required this.onMoment});
  final bool enabled;
  final BirthInput moment;
  final ValueChanged<bool> onEnabled;
  final ValueChanged<BirthInput> onMoment;
  @override
  Widget build(BuildContext context) => ControlBar(children: [
        FilterChip(label: const Text('Show transit planets'), selected: enabled, onSelected: onEnabled),
        if (enabled) MomentBar(value: moment, onChanged: onMoment, label: 'Transit moment'),
      ]);
}

BirthInput _defaultMoment(BirthInput birth) {
  final now = DateTime.now();
  String two(int v) => v.toString().padLeft(2, '0');
  return birth.copyWith(name: 'Transit', date: '${now.year}-${two(now.month)}-${two(now.day)}', time: '${two(now.hour)}:${two(now.minute)}');
}

class SarvatobhadraScreen extends ConsumerStatefulWidget {
  const SarvatobhadraScreen({super.key, required this.birth, this.initialMoment});
  final BirthInput birth;
  final BirthInput? initialMoment;
  @override
  ConsumerState<SarvatobhadraScreen> createState() => _SarvatobhadraScreenState();
}

class _SarvatobhadraScreenState extends ConsumerState<SarvatobhadraScreen> {
  late BirthInput moment = widget.initialMoment ?? _defaultMoment(widget.birth);
  late bool transit = widget.initialMoment != null;
  String? selected; // 'NATAL:SUN'

  @override
  Widget build(BuildContext context) {
    final call = EngineCall('chakra.sarvatobhadra', {'birth': widget.birth.toJson(), if (transit) 'moment': moment.toJson()});
    return PageBody(children: [
      _TransitControls(enabled: transit, moment: moment, onEnabled: (v) => setState(() => transit = v), onMoment: (m) => setState(() => moment = m)),
      AsyncView(value: ref.watch(engineCallProvider(call)), builder: (j) => _body(context, SarvatobhadraData(j))),
    ]);
  }

  Widget _body(BuildContext context, SarvatobhadraData d) {
    final colors = ChakraColors.of(context);
    final sel = selected ?? (d.placements.isEmpty ? null : '${d.placements.first.chart}:${d.placements.first.planet}');
    final selPl = d.placements.where((p) => '${p.chart}:${p.planet}' == sel).firstOrNull;
    final selV = d.vedhas.where((v) => '${v.chart}:${v.planet}' == sel).toList();
    List<String> vRow(SbcVedha v) =>
        [titleCase(v.chart), planetName(v.planet), v.from, _dir(v.direction), v.effective ? 'Yes' : 'No', v.cells.map((c) => c.display).join(', ')];
    const vCols = ['Chart', 'Planet', 'From', 'Line', 'Effective (motion rule)', 'Squares pierced'];
    const pCols = ['Chart', 'Planet', 'Nakshatra (28)', 'Pada', 'Longitude', 'R'];
    List<String> pRow(SbcPlacement p) =>
        [titleCase(p.chart), planetName(p.planet), p.nakshatra, p.pada?.toString() ?? '-', signDms(p.longitude), p.retro ? 'R' : ''];
    const hCols = ['Chart', 'Planet', 'Line', 'Effective', 'Natal reference', 'Square'];
    List<String> hRow(SbcRefHit h) => [titleCase(h.chart), planetName(h.planet), _dir(h.direction), h.effective ? 'Yes' : 'No', _dir(h.reference), h.label];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (d.info.provisional) ProvisionalBanner(source: d.info.source),
      const SizedBox(height: Gap.md),
      Wrap(spacing: Gap.lg, runSpacing: Gap.lg, crossAxisAlignment: WrapCrossAlignment.start, children: [
        SizedBox(
          width: 636,
          child: SectionCard(
            title: 'Sarvatobhadra Chakra',
            subtitle: 'East at top. Bold = natal, italic = transit. Shaded: vedha squares of the selected planet.',
            child: SizedBox(
              width: 600,
              height: 600,
              child: CustomPaint(
                key: const ValueKey('sbc-grid'),
                painter: SarvatobhadraPainter(data: d, colors: colors, highlight: selV, origin: selPl == null ? null : (selPl.row, selPl.col)),
              ),
            ),
          ),
        ),
        SizedBox(
          width: 420,
          child: SectionCard(
            title: 'Select planet',
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Wrap(spacing: 6, runSpacing: 6, children: [
                for (final p in d.placements)
                  ChoiceChip(
                    label: Text('${p.chart == 'NATAL' ? '' : 'T '}${planetName(p.planet)}'),
                    selected: '${p.chart}:${p.planet}' == sel,
                    onSelected: (_) => setState(() => selected = '${p.chart}:${p.planet}'),
                  ),
              ]),
              const SizedBox(height: Gap.md),
              KeyValueGrid(columns: 1, items: [
                ('Janma nakshatra', d.janma),
                ('Moon rashi', d.moonRashi),
                if (d.lagnaRashi.isNotEmpty) ('Lagna rashi', d.lagnaRashi),
              ]),
            ]),
          ),
        ),
      ]),
      const SizedBox(height: Gap.lg),
      SectionCard(title: 'Placements', child: SimpleTable(showActions: false, title: 'Sarvatobhadra placements', columns: pCols, rows: [for (final p in d.placements) pRow(p)])),
      const SizedBox(height: Gap.lg),
      SectionCard(title: 'Vedha lines', child: SimpleTable(showActions: false, title: 'Sarvatobhadra vedhas', columns: vCols, rows: [for (final v in d.vedhas) vRow(v)])),
      const SizedBox(height: Gap.lg),
      SectionCard(
        title: 'Vedha on natal references',
        subtitle: 'Janma nakshatra, Moon rashi and Lagna rashi squares lying on a vedha line',
        child: SimpleTable(showActions: false, title: 'Sarvatobhadra reference hits', columns: hCols, rows: [for (final h in d.hits) hRow(h)]),
      ),
      const SizedBox(height: Gap.lg),
      SectionCard(title: 'Conventions', child: _notes(d.info)),
      const SizedBox(height: Gap.md),
      ExportButtons(
        fileStem: 'Sarvatobhadra',
        tables: () => [
          ExportTable(title: 'Sarvatobhadra placements', columns: pCols, rows: [for (final p in d.placements) pRow(p)], footnote: d.info.source),
          ExportTable(title: 'Sarvatobhadra vedhas', columns: vCols, rows: [for (final v in d.vedhas) vRow(v)]),
          ExportTable(title: 'Vedha on natal references', columns: hCols, rows: [for (final h in d.hits) hRow(h)]),
        ],
      ),
      const SizedBox(height: Gap.md),
      const InterpretationArea(),
    ]);
  }
}

class KotaChakraScreen extends ConsumerStatefulWidget {
  const KotaChakraScreen({super.key, required this.birth, this.initialMoment});
  final BirthInput birth;
  final BirthInput? initialMoment;
  @override
  ConsumerState<KotaChakraScreen> createState() => _KotaChakraScreenState();
}

class _KotaChakraScreenState extends ConsumerState<KotaChakraScreen> {
  late BirthInput moment = widget.initialMoment ?? _defaultMoment(widget.birth);
  late bool transit = widget.initialMoment != null;

  @override
  Widget build(BuildContext context) {
    final call = EngineCall('chakra.kota', {'birth': widget.birth.toJson(), if (transit) 'moment': moment.toJson()});
    return PageBody(children: [
      _TransitControls(enabled: transit, moment: moment, onEnabled: (v) => setState(() => transit = v), onMoment: (m) => setState(() => moment = m)),
      AsyncView(value: ref.watch(engineCallProvider(call)), builder: (j) => _body(context, KotaData(j))),
    ]);
  }

  Widget _body(BuildContext context, KotaData d) {
    const cols = ['Chart', 'Planet', 'Nakshatra', 'Count', 'Division', 'Direction', 'Path', 'Movement', 'R', 'Role'];
    List<String> row(KotaPlacement p) => [
          titleCase(p.chart),
          planetName(p.planet),
          p.square.nakshatra,
          '${p.square.count}',
          titleCase(p.square.division),
          p.square.direction,
          titleCase(p.square.path),
          titleCase(p.movement),
          p.retro ? 'R' : '',
          [if (p.isSwami) 'Kota Swami', if (p.isPala) 'Kota Pala'].join(', '),
        ];
    const sCols = ['Count', 'Nakshatra', 'Division', 'Direction', 'Path'];
    List<String> sRow(KotaSquare s) => ['${s.count}', s.nakshatra, titleCase(s.division), s.direction, titleCase(s.path)];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (d.info.provisional) ProvisionalBanner(source: d.info.source),
      const SizedBox(height: Gap.md),
      Wrap(spacing: Gap.lg, runSpacing: Gap.lg, children: [
        SizedBox(
          width: 636,
          child: SectionCard(
            title: 'Kota Chakra',
            subtitle: 'East at top; janma nakshatra (1) in the north-east. ↘ entering, ↗ exiting.',
            child: SizedBox(
                width: 600,
                height: 600,
                child: CustomPaint(key: const ValueKey('kota-chart'), painter: KotaPainter(data: d, colors: ChakraColors.of(context)))),
          ),
        ),
        SizedBox(
          width: 380,
          child: SectionCard(
            title: 'Fort',
            child: KeyValueGrid(columns: 1, keyWidth: 130, items: [
              ('Janma nakshatra', '${d.janma}${d.janmaPada == null ? '' : ' pada ${d.janmaPada}'}'),
              ('Kota Swami', '${planetName(d.swami)} (lord of ${d.swamiRashi})'),
              ('Kota Pala', '${planetName(d.pala)} (letter ${d.palaLetter})'),
            ]),
          ),
        ),
      ]),
      const SizedBox(height: Gap.lg),
      SectionCard(title: 'Planets in the Kota', child: SimpleTable(showActions: false, title: 'Kota placements', columns: cols, rows: [for (final p in d.placements) row(p)])),
      const SizedBox(height: Gap.lg),
      SectionCard(title: '28 squares', child: SimpleTable(showActions: false, title: 'Kota squares', columns: sCols, rows: [for (final s in d.squares) sRow(s)], dense: true)),
      const SizedBox(height: Gap.lg),
      SectionCard(title: 'Conventions', child: _notes(d.info)),
      const SizedBox(height: Gap.md),
      ExportButtons(
          fileStem: 'Kota_Chakra',
          tables: () => [
                ExportTable(title: 'Kota placements', columns: cols, rows: [for (final p in d.placements) row(p)], footnote: d.info.source),
                ExportTable(title: 'Kota squares', columns: sCols, rows: [for (final s in d.squares) sRow(s)]),
              ]),
      const SizedBox(height: Gap.md),
      const InterpretationArea(),
    ]);
  }
}

class TripatakiScreen extends ConsumerStatefulWidget {
  const TripatakiScreen({super.key, required this.birth, this.initialYear});
  final BirthInput birth;
  final int? initialYear;
  @override
  ConsumerState<TripatakiScreen> createState() => _TripatakiScreenState();
}

class _TripatakiScreenState extends ConsumerState<TripatakiScreen> {
  late int birthYear = int.tryParse(widget.birth.date.split('-').first) ?? DateTime.now().year;
  late int year = widget.initialYear ?? DateTime.now().year;

  @override
  Widget build(BuildContext context) {
    final call = EngineCall('chakra.tripataki', {'birth': widget.birth.toJson(), 'targetYear': year});
    return PageBody(children: [
      ControlBar(children: [
        Stepper2(
          label: 'Year',
          value: '$year',
          onPrev: () => setState(() => year = year > birthYear ? year - 1 : year),
          onNext: () => setState(() => year = year + 1),
          prevTooltip: 'Previous year',
          nextTooltip: 'Next year',
        ),
      ]),
      AsyncView(value: ref.watch(engineCallProvider(call)), builder: (j) => _body(TripatakiData(j))),
    ]);
  }

  Widget _body(TripatakiData d) {
    const cols = ['Planet', 'Natal sign', 'Cycle (years)', 'Direction', 'Count', 'Tripataki sign', 'House from Varsha Lagna'];
    List<String> row(TripatakiPlacement p) => [
          planetName(p.planet),
          p.natalRashi >= 1 && p.natalRashi <= 12 ? rashiNamesSa[p.natalRashi - 1] : '',
          '${p.divisor}',
          titleCase(p.direction),
          '${p.count}',
          p.rashi,
          p.house?.toString() ?? '',
        ];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (d.info.provisional) ProvisionalBanner(source: d.info.source),
      const SizedBox(height: Gap.md),
      SectionCard(
        title: 'Year ${d.targetYear}',
        child: KeyValueGrid(items: [
          ('Completed years', '${d.completedYears}'),
          ('Running year', '${d.runningYear}'),
          ('Solar return (UTC)', d.solarReturnUtc),
          ('Varsha Lagna', d.varshaLagna),
        ]),
      ),
      const SizedBox(height: Gap.lg),
      SectionCard(
          title: 'Tripataki placements', child: SimpleTable(showActions: false, title: 'Tripataki placements', columns: cols, rows: [for (final p in d.placements) row(p)])),
      const SizedBox(height: Gap.md),
      const Note('Vedha on the Moon is not shown: the Tripataki lattice could not be sourced reliably (pending client review).'),
      const SizedBox(height: Gap.lg),
      SectionCard(title: 'Conventions', child: _notes(d.info)),
      const SizedBox(height: Gap.md),
      ExportButtons(
          fileStem: 'Tripataki_${d.targetYear}',
          tables: () => [
                ExportTable(title: 'Tripataki ${d.targetYear}', columns: cols, rows: [for (final p in d.placements) row(p)], footnote: d.info.source)
              ]),
      const SizedBox(height: Gap.md),
      const InterpretationArea(),
    ]);
  }
}
