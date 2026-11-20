import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/table_pdf.dart';

/// Planetary relationships (natural, temporary, compound / Panchadha Maitri) from the engine
/// (`relationships.compute`). Rows: the planet whose view is given; columns: the other planet.
class RelationshipsScreen extends ConsumerWidget {
  const RelationshipsScreen({super.key, required this.birth});
  final BirthInput birth;

  static const _labels = {
    'GREAT_FRIEND': 'Great friend',
    'FRIEND': 'Friend',
    'NEUTRAL': 'Neutral',
    'ENEMY': 'Enemy',
    'GREAT_ENEMY': 'Great enemy',
  };

  static ExportTable matrix(JsonMap j, String kind, String title) {
    final planets = [for (final p in (j['planets'] as List? ?? const [])) '$p'];
    final cells = asMapList(j['cells']);
    String v(String a, String b) => a == b ? '—' : (_labels[asStr(cells.firstWhere((c) => c['from'] == a && c['to'] == b, orElse: () => const {})[kind])] ?? '');
    return ExportTable(
      title: title,
      columns: ['Planet \\ towards', for (final p in planets) abbr(p)],
      rows: [for (final a in planets) [planetName(a), for (final b in planets) v(a, b)]],
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncView(
        value: ref.watch(engineCallProvider(EngineCall('relationships.compute', {'birth': birth.toJson()}))),
        builder: (j) {
          final tables = [
            matrix(j, 'natural', 'Natural (Naisargika) relationships'),
            matrix(j, 'temporal', 'Temporary (Tatkalika) relationships'),
            matrix(j, 'compound', 'Compound (Panchadha) relationships'),
          ];
          final signs = asMap(j['signs']);
          return PageBody(children: [
            Align(alignment: Alignment.centerRight, child: ExportButtons(tables: () => tables, fileStem: 'Relationships_${birth.name ?? birth.date}')),
            for (final t in tables) SectionCard(title: t.title, child: _ColouredMatrix(table: t)),
            Note('Temporary relationship uses each planet’s sign: ${[for (final e in signs.entries) '${abbr(e.key)} ${signShort[((asInt(e.value) ?? 1) - 1).clamp(0, 11)]}'].join(', ')}. ${asStr(j['source'])}'),
            const InterpretationArea(),
          ]);
        },
      );
}

class _ColouredMatrix extends StatelessWidget {
  const _ColouredMatrix({required this.table});
  final ExportTable table;
  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    Color? bg(String v) => switch (v) {
          'Great friend' => pal.success.withValues(alpha: 0.22),
          'Friend' => pal.success.withValues(alpha: 0.10),
          'Enemy' => pal.error.withValues(alpha: 0.10),
          'Great enemy' => pal.error.withValues(alpha: 0.22),
          _ => null,
        };
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Table(
        defaultColumnWidth: const IntrinsicColumnWidth(),
        border: TableBorder.all(color: pal.border),
        children: [
          TableRow(decoration: BoxDecoration(color: pal.tableHeader), children: [
            for (final c in table.columns) Padding(padding: const EdgeInsets.all(6), child: Text(c, style: TextStyle(fontWeight: FontWeight.w700, color: pal.heading, fontSize: 12.5))),
          ]),
          for (final r in table.rows)
            TableRow(children: [
              for (var i = 0; i < r.length; i++)
                Container(
                  color: i == 0 ? null : bg(r[i]),
                  padding: const EdgeInsets.all(6),
                  child: Text(r[i], style: TextStyle(fontSize: 12.5, fontWeight: i == 0 ? FontWeight.w600 : FontWeight.normal)),
                ),
            ]),
        ],
      ),
    );
  }
}
