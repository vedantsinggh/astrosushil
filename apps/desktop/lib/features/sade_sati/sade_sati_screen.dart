import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/date_controls.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/table_pdf.dart';

/// Sade Sati as a neutral calculated table (ADR-016 §5): Saturn's transits of the 12th, 1st and
/// 2nd signs from the natal Moon, from birth for 100 years (`sadeSati.periods`). No
/// interpretation is shown.
class SadeSatiScreen extends ConsumerWidget {
  const SadeSatiScreen({super.key, required this.birth});
  final BirthInput birth;

  static String _phase(int h) => switch (h) { 12 => '12th from Moon', 1 => 'Moon sign (peak)', 2 => '2nd from Moon', 4 => '4th from Moon', 8 => '8th from Moon', _ => '${h}th from Moon (retrograde excursion)' };

  static List<ExportTable> tables(JsonMap j) {
    final off = asInt(j['utcOffsetMinutes']) ?? 0;
    String d(String? iso) => iso == null ? '—' : isoLocal(iso, off).substring(0, 10);
    final cycles = asMapList(j['cycles']);
    return [
      ExportTable(
        title: 'Sade Sati cycles',
        subtitle: 'Natal Moon in ${asStr(j['natalMoonRashiName'])}. Dates in ${asStr(j['timezone'], 'UTC')}.',
        footnote: asStr(j['definition']),
        columns: ['Cycle', 'Begins', 'Peak begins', 'Peak ends', 'Ends', 'Note'],
        rows: [
          for (final c in cycles)
            [
              '${c['cycle']}',
              d(asStr(c['startIso'])),
              d(c['peakStartIso'] as String?),
              d(c['peakEndIso'] as String?),
              d(asStr(c['endIso'])),
              [if (c['startsBeforeRange'] == true) 'running at birth', if (c['endsAfterRange'] == true) 'continues past the range'].join('; '),
            ],
        ],
      ),
      ExportTable(
        title: 'Saturn sign segments within each cycle',
        columns: ['Cycle', 'Saturn in', 'Position', 'From', 'To', 'Entry'],
        rows: [
          for (final c in cycles)
            for (final s in asMapList(c['segments']))
              ['${c['cycle']}', asStr(s['rashiName']), _phase(asInt(s['houseFromMoon']) ?? 0), d(asStr(s['startIso'])), d(asStr(s['endIso'])), s['retrogradeEntry'] == true ? 'retrograde re-entry' : ''],
        ],
      ),
      ExportTable(
        title: 'Saturn in the 4th and 8th signs from the Moon',
        columns: ['Saturn in', 'Position', 'From', 'To'],
        rows: [for (final s in asMapList(j['fourthAndEighth'])) [asStr(s['rashiName']), _phase(asInt(s['houseFromMoon']) ?? 0), d(asStr(s['startIso'])), d(asStr(s['endIso']))]],
      ),
    ];
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncView(
        value: ref.watch(engineCallProvider(EngineCall('sadeSati.periods', {'birth': birth.toJson()}))),
        builder: (j) {
          final ts = tables(j);
          return PageBody(children: [
            Align(alignment: Alignment.centerRight, child: ExportButtons(tables: () => ts, fileStem: 'Sade_Sati_${birth.name ?? birth.date}')),
            for (final t in ts)
              SectionCard(title: t.title, subtitle: t.subtitle.isEmpty ? null : t.subtitle, child: SimpleTable(showActions: false, title: t.title, columns: t.columns, rows: t.rows)),
            Note('${asStr(j['definition'])} ${asStr(j['source'])}'),
            Note('Planet names: ${planetName('SATURN')} transits; positions from the engine (sidereal, engine ayanamsa).'),
            const InterpretationArea(),
          ]);
        },
      );
}
