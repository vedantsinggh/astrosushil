import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/date_controls.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/table_pdf.dart';

/// Birth-time sensitivity (rectification aid): how far the recorded birth time is from the next
/// change of Lagna sign, nakshatra, pada/Navamsa, D10, D12, D60 and the Moon's nakshatra/pada, and
/// the exact instants of those changes (`rectification.sensitivity`). No judgement is made.
class RectificationScreen extends ConsumerStatefulWidget {
  const RectificationScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  ConsumerState<RectificationScreen> createState() => _RectificationScreenState();
}

class _RectificationScreenState extends ConsumerState<RectificationScreen> {
  int window = 30;

  static String _part(String key, int part) {
    if (key == 'LAGNA_SIGN') return signNames[part % 12];
    if (key.endsWith('NAKSHATRA')) return 'Nakshatra ${part + 1}';
    if (key.endsWith('PADA') || key.endsWith('PADA_D9')) return 'Nakshatra ${part ~/ 4 + 1} pada ${part % 4 + 1}';
    return 'Part ${part + 1}';
  }

  static String _min(double? m) => m == null ? 'beyond window' : '${m.toStringAsFixed(1)} min';

  static List<ExportTable> tables(JsonMap j) {
    final off = asInt(j['utcOffsetMinutes']) ?? 0;
    return [
      ExportTable(
        title: 'Margin from the recorded birth time',
        columns: ['Factor', 'At birth', 'Last change before', 'Next change after'],
        rows: [
          for (final m in asMapList(j['margins']))
            [asStr(m['label']), _part(asStr(m['key']), asInt(m['part']) ?? 0), _min(asDouble(m['minutesSincePrevious'])), _min(asDouble(m['minutesToNext']))],
        ],
      ),
      ExportTable(
        title: 'Boundary crossings in the window',
        columns: ['Local time', 'Offset (min)', 'Factor', 'From', 'To', 'Boundary'],
        rows: [
          for (final c in asMapList(j['changes']))
            [
              isoLocal(asStr(c['instantIso']), off, seconds: true),
              (asDouble(c['offsetMinutes']) ?? 0).toStringAsFixed(1),
              asStr(c['label']),
              _part(asStr(c['key']), asInt(c['fromPart']) ?? 0),
              _part(asStr(c['key']), asInt(c['toPart']) ?? 0),
              signDms(asDouble(c['boundary']) ?? 0),
            ],
        ],
      ),
    ];
  }

  @override
  Widget build(BuildContext context) => PageBody(children: [
        ControlBar(children: [
          const Text('Window around the birth time:'),
          SegmentedButton<int>(
            segments: const [ButtonSegment(value: 10, label: Text('±10 min')), ButtonSegment(value: 30, label: Text('±30 min')), ButtonSegment(value: 60, label: Text('±1 h')), ButtonSegment(value: 120, label: Text('±2 h'))],
            selected: {window},
            onSelectionChanged: (s) => setState(() => window = s.first),
          ),
        ]),
        AsyncView(
          value: ref.watch(engineCallProvider(EngineCall('rectification.sensitivity', {'birth': widget.birth.toJson(), 'windowMinutes': window}))),
          builder: (j) {
            final ts = tables(j);
            return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Align(alignment: Alignment.centerRight, child: ExportButtons(tables: () => ts, fileStem: 'Birth_time_sensitivity')),
              for (final t in ts) Padding(padding: const EdgeInsets.only(bottom: 16), child: SectionCard(title: t.title, child: SimpleTable(showActions: false, title: t.title, columns: t.columns, rows: t.rows))),
              Note(asStr(j['source'])),
              const InterpretationArea(),
            ]);
          },
        ),
      ]);
}
