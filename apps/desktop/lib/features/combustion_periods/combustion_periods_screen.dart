import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/util/format.dart';
import '../../src/ui/widgets/common.dart';
import '../common/date_controls.dart';
import '../common/engine_call.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';

/// Combustion (asta) periods over a range, from the engine (`combustion.periods`), using the
/// engine's existing orbs (provisional, ADR-016 §6).
class CombustionPeriodsScreen extends ConsumerStatefulWidget {
  const CombustionPeriodsScreen({super.key, required this.timezone, this.initialYear});
  final String timezone;
  final int? initialYear;
  @override
  ConsumerState<CombustionPeriodsScreen> createState() => _CombustionPeriodsScreenState();
}

const _planets = ['MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];

/// Table rows for combustion periods (display formatting only).
ExportTable combustionTable(JsonMap j, String title) {
  String t(JsonMap p, String k, String off) => isoLocal(asStr(p[k]), asInt(p[off]) ?? 0);
  return ExportTable(
    title: title,
    subtitle: 'Local times in ${asStr(j['timezone'], 'UTC')}. Orbs: provisional – pending client review.',
    footnote: asStr(j['source']),
    columns: ['Planet', 'Enters combustion', 'Leaves combustion', 'Days', 'Closest (° from Sun)', 'Closest at', 'Motion at closest', 'Orb in / out'],
    rows: [
      for (final p in asMapList(j['periods']))
        [
          planetName(asStr(p['planet'])),
          p['startsBeforeRange'] == true ? 'before ${t(p, 'startIso', 'startOffsetMinutes')}' : t(p, 'startIso', 'startOffsetMinutes'),
          p['endsAfterRange'] == true ? 'after ${t(p, 'endIso', 'endOffsetMinutes')}' : t(p, 'endIso', 'endOffsetMinutes'),
          (asDouble(p['durationDays']) ?? 0).toStringAsFixed(1),
          dms(asDouble(p['minSeparation']) ?? 0, seconds: false),
          t(p, 'minSeparationIso', 'startOffsetMinutes'),
          p['retrogradeAtClosest'] == true ? 'Retrograde' : 'Direct',
          '${(asDouble(p['orbAtStart']) ?? 0).toStringAsFixed(0)}° / ${(asDouble(p['orbAtEnd']) ?? 0).toStringAsFixed(0)}°',
        ],
    ],
  );
}

class _CombustionPeriodsScreenState extends ConsumerState<CombustionPeriodsScreen> {
  late int year = widget.initialYear ?? DateTime.now().year;
  final selected = {..._planets}..remove('MOON');

  @override
  Widget build(BuildContext context) {
    final call = EngineCall('combustion.periods', {
      'startIso': '$year-01-01T00:00:00Z',
      'endIso': '${year + 1}-01-01T00:00:00Z',
      'timezone': widget.timezone,
      'planets': [for (final p in _planets) if (selected.contains(p)) p],
    });
    return PageBody(children: [
      ControlBar(children: [
        Stepper2(label: 'Year', value: '$year', onPrev: () => setState(() => year--), onNext: () => setState(() => year++)),
        for (final p in _planets)
          FilterChip(
            label: Text(planetName(p)),
            selected: selected.contains(p),
            onSelected: (v) => setState(() => v ? selected.add(p) : (selected.length > 1 ? selected.remove(p) : null)),
          ),
      ]),
      AsyncView(
        value: ref.watch(engineCallProvider(call)),
        builder: (j) {
          final t = combustionTable(j, 'Combustion periods $year');
          return SectionCard(
            title: 'Combustion periods $year',
            subtitle: t.subtitle,
            trailing: ExportButtons(tables: () => [t], fileStem: 'Combustion_$year'),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              ProvisionalBanner(source: asStr(j['source'])),
              const SizedBox(height: 8),
              SimpleTable(showActions: false, title: t.title, columns: t.columns, rows: t.rows),
              const SizedBox(height: 6),
              for (final n in (j['notes'] as List? ?? const [])) Note('$n'),
            ]),
          );
        },
      ),
    ]);
  }
}
