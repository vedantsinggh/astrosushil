import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/charts/chart_geometry.dart';
import '../../src/charts/chart_view.dart';
import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'tajika_models.dart';

/// Tajika view (ADR-016 §2 and §6): the 16 Tajika yogas and Pancha-vargiya Bala of the Varshaphala
/// chart, and the Tithi Pravesha moment and chart, for a year chosen with the stepper. Renders the
/// sidecar's `tajika.yogas`, `tajika.panchaVargiya` and `tajika.tithiPravesha` output only.
class TajikaScreen extends ConsumerStatefulWidget {
  const TajikaScreen({super.key, required this.birth, this.initialYear, this.chartStyle = ChartStyle.north});
  final BirthInput birth;

  /// Year to open on; defaults to the current calendar year (never before the birth year).
  final int? initialYear;
  final ChartStyle chartStyle;

  @override
  ConsumerState<TajikaScreen> createState() => _TajikaScreenState();
}

class _TajikaScreenState extends ConsumerState<TajikaScreen> {
  late int _year;

  int get _birthYear => int.tryParse(widget.birth.date.split('-').first) ?? 1900;

  @override
  void initState() {
    super.initState();
    _year = (widget.initialYear ?? DateTime.now().year).clamp(_birthYear, 2200);
  }

  void _step(int delta) => setState(() => _year = (_year + delta).clamp(_birthYear, 2200));

  Map<String, Object?> get _params => {'birth': widget.birth.toJson(), 'targetYear': _year};

  Widget _notes(List<String> notes) => ExpansionTile(
        dense: true,
        tilePadding: EdgeInsets.zero,
        title: const Text('Conventions used', style: TextStyle(fontSize: 13)),
        children: [for (final n in notes) Padding(padding: const EdgeInsets.only(bottom: 4), child: Note(n))],
      );

  Widget _async(EngineCall call, Widget Function(JsonMap) builder) => AsyncView<JsonMap>(
        value: ref.watch(engineCallProvider(call)),
        onRetry: () => ref.invalidate(engineCallProvider(call)),
        builder: builder,
      );

  @override
  Widget build(BuildContext context) {
    final yogaCall = EngineCall('tajika.yogas', _params);
    final balaCall = EngineCall('tajika.panchaVargiya', _params);
    final tpCall = EngineCall('tajika.tithiPravesha', _params);
    return PageBody(children: [
      ControlBar(children: [
        Stepper2(
          key: const ValueKey('tajika-year-stepper'),
          label: 'Year',
          value: '$_year',
          prevTooltip: 'Previous year',
          nextTooltip: 'Next year',
          onPrev: () => _step(-1),
          onNext: () => _step(1),
        ),
      ]),
      _async(yogaCall, (j) {
        final m = TajikaYogasModel.fromJson(j);
        final summary = m.summaryTable;
        final evidence = m.evidenceTable;
        final planets = m.planetTable;
        return SectionCard(
          title: 'Tajika yogas (16)',
          subtitle: 'Varshaphala chart of ${m.targetYear} · solar return ${m.solarReturnLocal.replaceFirst('T', ' ')} (local)',
          trailing: ExportButtons(tables: () => [summary, evidence, planets], fileStem: 'Tajika_yogas_${m.targetYear}'),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (m.provisional) ProvisionalBanner(source: m.source),
            const SizedBox(height: Gap.md),
            SimpleTable(showActions: false, 
              key: const ValueKey('tajika-yoga-table'),
              title: summary.title,
              columns: summary.columns,
              rows: summary.rows,
              highlightRows: {for (final (i, y) in m.yogas.indexed) if (y.present) i},
              dense: true,
            ),
            const SizedBox(height: Gap.md),
            if (evidence.rows.isNotEmpty)
              SimpleTable(showActions: false, key: const ValueKey('tajika-evidence-table'), title: evidence.title, columns: evidence.columns, rows: evidence.rows, dense: true)
            else
              const Note('No yoga is present in this annual chart.'),
            const SizedBox(height: Gap.md),
            SimpleTable(showActions: false, title: planets.title, columns: planets.columns, rows: planets.rows, dense: true),
            _notes(m.conventionNotes),
          ]),
        );
      }),
      _async(balaCall, (j) {
        final m = TajikaPanchaVargiyaModel.fromJson(j);
        final t = m.table;
        return SectionCard(
          title: 'Pancha-vargiya Bala',
          subtitle: '${t.subtitle} of $_year · five vargas in vimshopaka units; total ÷ 4 is the figure used for Varshesha selection',
          trailing: ExportButtons(tables: () => [t], fileStem: 'Pancha_vargiya_$_year'),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (m.provisional) ProvisionalBanner(source: m.source),
            const SizedBox(height: Gap.md),
            SimpleTable(showActions: false, key: const ValueKey('tajika-bala-table'), title: t.title, columns: t.columns, rows: t.rows, numericColumns: const {3, 7, 8}, dense: true),
            _notes(m.conventionNotes),
          ]),
        );
      }),
      _async(tpCall, (j) {
        final m = TithiPraveshaModel.fromJson(j);
        final c = m.candidateTable;
        return SectionCard(
          title: 'Tithi Pravesha',
          subtitle: 'Sun–Moon elongation equal to the natal one, Sun in its natal sign; chart for the birth place',
          trailing: ExportButtons(tables: () => [ExportTable(title: 'Tithi Pravesha ${m.targetYear}', columns: const ['Item', 'Value'], rows: [for (final (k, v) in m.facts) [k, v]]), c], fileStem: 'Tithi_Pravesha_${m.targetYear}'),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (m.provisional) ProvisionalBanner(source: m.source),
            const SizedBox(height: Gap.md),
            Wrap(spacing: Gap.lg, runSpacing: Gap.md, crossAxisAlignment: WrapCrossAlignment.start, children: [
              ChartView(key: const ValueKey('tajika-tithi-pravesha-chart'), data: m.chartData, style: widget.chartStyle, size: 340),
              SizedBox(
                width: 520,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  KeyValueGrid(items: m.facts, columns: 1),
                  const SizedBox(height: Gap.md),
                  SimpleTable(title: c.title, columns: c.columns, rows: c.rows, dense: true, showActions: false),
                ]),
              ),
            ]),
            _notes(m.conventionNotes),
          ]),
        );
      }),
      const InterpretationArea(),
    ]);
  }
}
