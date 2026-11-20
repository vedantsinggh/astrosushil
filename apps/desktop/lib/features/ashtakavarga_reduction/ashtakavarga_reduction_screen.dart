import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';
import 'ashtakavarga_reduction_models.dart';

/// Trikona Shodhana, Ekadhipatya Shodhana and Shodhya Pinda tables from `ashtakavarga.compute`.
/// The engine does every reduction; this screen only lays the numbers out.
class AshtakavargaReductionScreen extends ConsumerStatefulWidget {
  const AshtakavargaReductionScreen({super.key, required this.birth});
  final BirthInput birth;

  @override
  ConsumerState<AshtakavargaReductionScreen> createState() => _State();
}

class _State extends ConsumerState<AshtakavargaReductionScreen> {
  String? _planet; // null = all planets

  @override
  Widget build(BuildContext context) {
    final call = EngineCall('ashtakavarga.compute', {'birth': widget.birth.toJson()});
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(call)),
      onRetry: () => ref.invalidate(engineCallProvider(call)),
      builder: (j) {
        final d = AshtakavargaReductionData.fromJson(j);
        if (d.rows.isEmpty) {
          return const EmptyState(icon: Icons.grid_off_outlined, title: 'No Ashtakavarga data', message: 'The engine returned no Bhinnashtakavarga.');
        }
        final shown = _planet == null ? d.rows : d.rows.where((r) => r.planet == _planet).toList();
        return PageBody(children: [
          ControlBar(children: [
            Wrap(spacing: Gap.sm, runSpacing: Gap.xs, children: [
              ChoiceChip(label: const Text('All planets'), selected: _planet == null, onSelected: (_) => setState(() => _planet = null)),
              for (final r in d.rows)
                ChoiceChip(label: Text(planetName(r.planet)), selected: _planet == r.planet, onSelected: (_) => setState(() => _planet = r.planet)),
            ]),
            ExportButtons(tables: d.exportTables, fileStem: 'Ashtakavarga_reductions'),
          ]),
          const Note('Signs Ar..Pi = Mesha..Meena. Shaded cells changed in that reduction step. '
              'Reductions and pindas are calculated by the engine (BPHS ch. 73 tables).'),
          if (!d.hasShodhana) const Note('The engine returned no Shodhana data for this chart.'),
          Wrap(spacing: Gap.md, runSpacing: Gap.md, children: [
            for (final r in shown)
              SizedBox(
                width: 640,
                child: SectionCard(
                  key: ValueKey('reduction-${r.planet}'),
                  title: '${planetName(r.planet)}: BAV before / after each reduction',
                  child: _ReductionTable(table: d.planetTable(r), row: r),
                ),
              ),
          ]),
          if (d.hasShodhana) ...[
            SectionCard(title: 'Trikona Shodhana (all planets)', child: _plain(d.trikonaTable)),
            SectionCard(title: 'Ekadhipatya Shodhana (all planets)', child: _plain(d.ekadhipatyaTable)),
          ],
          if (d.hasPinda)
            Align(
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: 560,
                child: SectionCard(
                  title: 'Rashi Pinda, Graha Pinda and Shodhya Pinda',
                  subtitle: 'From the Ekadhipatya-reduced BAV',
                  child: _plain(d.pindaTable),
                ),
              ),
            ),
        ]);
      },
    );
  }

  Widget _plain(ExportTable t) => SimpleTable(showActions: false, columns: t.columns, rows: t.rows, numericColumns: {for (var i = 1; i < t.columns.length; i++) i});
}

/// Stage x sign grid; cells that differ from the previous stage are shaded.
class _ReductionTable extends StatelessWidget {
  const _ReductionTable({required this.table, required this.row});
  final ExportTable table;
  final ReductionRow row;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final stages = [row.bav, if (row.trikona.isNotEmpty) row.trikona, if (row.ekadhipatya.isNotEmpty) row.ekadhipatya];
    final style = TextStyle(fontSize: 12.5, color: pal.text, fontFeatures: tabularFigures);
    final head = style.copyWith(fontWeight: FontWeight.w700, color: pal.heading);
    Widget cell(String s, {TextStyle? st, Color? bg, bool left = false}) => Container(
          color: bg,
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
          alignment: left ? Alignment.centerLeft : Alignment.centerRight,
          child: Text(s, style: st ?? style),
        );
    return Table(
      border: TableBorder.all(color: pal.border, width: 0.8),
      columnWidths: const {0: IntrinsicColumnWidth()},
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      children: [
        TableRow(decoration: BoxDecoration(color: pal.tableHeader), children: [
          for (var c = 0; c < table.columns.length; c++) cell(table.columns[c], st: head, left: c == 0),
        ]),
        for (var s = 0; s < table.rows.length; s++)
          TableRow(children: [
            for (var c = 0; c < table.columns.length; c++)
              cell(
                table.rows[s][c],
                left: c == 0,
                st: c == table.columns.length - 1 ? style.copyWith(fontWeight: FontWeight.w700) : null,
                bg: (s > 0 && c >= 1 && c <= 12 && ReductionRow.changed(stages[s - 1], stages[s]).contains(c - 1)) ? pal.highlightRow : null,
              ),
          ]),
      ],
    );
  }
}
