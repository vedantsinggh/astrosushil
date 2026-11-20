import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/charts/chart_data.dart';
import '../../src/charts/chart_view.dart';
import '../../src/engine/inputs.dart';
import '../../src/state/providers.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'vargas_extra_models.dart';

/// Extra divisional charts (D5, D6, D8, D11, D81, D108, D144, D150), Pushkara Navamsha / Bhaga
/// and Bhrigu Bindu (ADR-016 §6, provisional conventions). Everything shown is engine output from
/// `vargasExtra.compute`, `pushkara.compute` and `bhriguBindu.compute`; no astrology in Dart.
class VargasExtraScreen extends ConsumerStatefulWidget {
  const VargasExtraScreen({super.key, required this.birth, this.initialVarga = 'D5'});
  final BirthInput birth;
  final String initialVarga;

  @override
  ConsumerState<VargasExtraScreen> createState() => _VargasExtraScreenState();
}

class _VargasExtraScreenState extends ConsumerState<VargasExtraScreen> {
  late String _selected = widget.initialVarga;

  @override
  Widget build(BuildContext context) {
    final birth = {'birth': widget.birth.toJson()};
    final vCall = EngineCall('vargasExtra.compute', birth);
    final pCall = EngineCall('pushkara.compute', birth);
    final bCall = EngineCall('bhriguBindu.compute', birth);
    final style = ref.watch(chartStyleProvider);

    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(vCall)),
      onRetry: () => ref.invalidate(engineCallProvider(vCall)),
      builder: (vj) {
        final res = ExtraVargasResult(vj);
        if (res.vargas.isEmpty) return const EmptyState(icon: Icons.grid_view_outlined, title: 'No divisional charts returned', message: 'The engine returned no extra varga charts for this birth.');
        final sel = res.vargas[_selected] ?? res.vargas.values.first;
        final table = sel.table;
        return PageBody(children: [
          if (sel.provisional) ProvisionalBanner(source: sel.source),
          SectionCard(
            title: 'Extra divisional charts',
            subtitle: 'D5, D6, D8, D11, D81, D108, D144, D150 — select a chart for details',
            child: Wrap(spacing: 10, runSpacing: 10, children: [
              for (final e in res.vargas.entries)
                InkWell(
                  key: ValueKey('extra-varga-${e.key}'),
                  onTap: () => setState(() => _selected = e.key),
                  child: Container(
                    decoration: BoxDecoration(border: Border.all(color: e.key == sel.chart.code ? context.palette.accent : Colors.transparent, width: 2)),
                    padding: const EdgeInsets.all(2),
                    child: ChartView(data: ChartData.fromVarga(e.value.chart), style: style, size: 170, interactive: false),
                  ),
                ),
            ]),
          ),
          SectionCard(
            title: '${sel.chart.code} — ${sel.chart.name}',
            trailing: ExportButtons(tables: () => [table], fileStem: 'Varga_${sel.chart.code}'),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Wrap(spacing: Gap.lg, runSpacing: Gap.md, children: [
                ChartView(data: ChartData.fromVarga(sel.chart, showDegrees: true), style: style, size: 380, showLegend: true),
                SizedBox(
                  width: 560,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Rule (engine): ${sel.chart.rule}', style: const TextStyle(fontSize: 12)),
                    const SizedBox(height: Gap.sm),
                    SimpleTable(showActions: false, columns: table.columns, rows: table.rows, title: table.title, dense: true),
                  ]),
                ),
              ]),
              const SizedBox(height: Gap.sm),
              for (final n in sel.conventionNotes) Note(n),
              const InterpretationArea(),
            ]),
          ),
          _PushkaraSection(call: pCall),
          _BhriguBinduSection(call: bCall),
        ]);
      },
    );
  }
}

class _PushkaraSection extends ConsumerWidget {
  const _PushkaraSection({required this.call});
  final EngineCall call;

  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncView<JsonMap>(
        value: ref.watch(engineCallProvider(call)),
        onRetry: () => ref.invalidate(engineCallProvider(call)),
        builder: (j) {
          final m = PushkaraResultModel(j);
          final bodies = m.bodiesTable;
          final refTable = m.referenceTable;
          final hits = <int>{for (var i = 0; i < bodies.rows.length; i++) if (bodies.rows[i][5].isNotEmpty || bodies.rows[i][8].isNotEmpty) i};
          return SectionCard(
            title: 'Pushkara Navamsha and Pushkara Bhaga',
            trailing: ExportButtons(tables: () => [bodies, refTable], fileStem: 'Pushkara'),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (m.provisional) ProvisionalBanner(source: m.source),
              const SizedBox(height: Gap.sm),
              SimpleTable(showActions: false, columns: bodies.columns, rows: bodies.rows, title: bodies.title, highlightRows: hits, dense: true),
              const SizedBox(height: Gap.md),
              SimpleTable(showActions: false, columns: refTable.columns, rows: refTable.rows, title: refTable.title, dense: true),
              const SizedBox(height: Gap.sm),
              for (final n in m.conventionNotes) Note(n),
              const InterpretationArea(),
            ]),
          );
        },
      );
}

class _BhriguBinduSection extends ConsumerWidget {
  const _BhriguBinduSection({required this.call});
  final EngineCall call;

  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncView<JsonMap>(
        value: ref.watch(engineCallProvider(call)),
        onRetry: () => ref.invalidate(engineCallProvider(call)),
        builder: (j) {
          final m = BhriguBinduModel(j);
          final t = m.table;
          return SectionCard(
            title: 'Bhrigu Bindu',
            subtitle: 'Midpoint of Moon and Rahu (arc from Rahu to Moon)',
            trailing: ExportButtons(tables: () => [t], fileStem: 'Bhrigu_Bindu'),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (m.provisional) ProvisionalBanner(source: m.source),
              const SizedBox(height: Gap.sm),
              SizedBox(width: 560, child: SimpleTable(showActions: false, columns: t.columns, rows: t.rows, title: t.title, dense: true)),
              const SizedBox(height: Gap.sm),
              for (final n in m.conventionNotes) Note(n),
              const InterpretationArea(),
            ]),
          );
        },
      );
}
