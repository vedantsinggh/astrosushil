import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../../util/format.dart';
import '../widgets/common.dart';
import '../widgets/moment_bar.dart';

class PanchangScreen extends ConsumerStatefulWidget {
  const PanchangScreen({super.key, required this.initial});
  final BirthInput initial;
  @override
  ConsumerState<PanchangScreen> createState() => _PanchangScreenState();
}

class _PanchangScreenState extends ConsumerState<PanchangScreen> {
  late BirthInput moment = widget.initial;

  @override
  Widget build(BuildContext context) => PageBody(children: [
        MomentBar(value: moment, onChanged: (m) => setState(() => moment = m), label: 'Panchang for'),
        AsyncView(value: ref.watch(panchangProvider(moment)), builder: (p) => PanchangView(p: p)),
      ]);
}

class PanchangView extends StatelessWidget {
  const PanchangView({super.key, required this.p});
  final PanchangResultModel p;

  String _span(PanchangElement e, int off) =>
      e.end == null ? '' : '  (${e.start == null ? '' : localDateTime(e.start!, off)} – ${localDateTime(e.end!, off)})';

  @override
  Widget build(BuildContext context) {
    final off = p.utcOffsetMinutes;
    final i = p.instant;
    final dd = p.dayDivisions;
    final now = DateTime.now().toUtc();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionCard(
        title: 'Panchanga at the selected moment (${offsetLabel(off)})',
        child: KeyValueGrid(columns: 1, items: [
          ('Tithi', '${i.tithi.name}, ${titleCase(i.tithi.extra ?? '')}${_span(i.tithi, off)}'),
          ('Vara', '${i.vara.name} (lord ${titleCase(i.vara.extra ?? '')})'),
          ('Nakshatra', '${i.nakshatra.name} pada ${i.nakshatra.pada ?? ''}${_span(i.nakshatra, off)}'),
          ('Yoga', '${i.yoga.name}${_span(i.yoga, off)}'),
          ('Karana', '${i.karana.name}${_span(i.karana, off)}'),
          ('Masa', '${i.amantaMasa ?? '—'} (amanta) / ${i.purnimantaMasa ?? '—'} (purnimanta)${i.isAdhika ? ' — Adhika' : ''}'),
          ('Sunrise / sunset', '${localTime(dd.sunrise, off)} / ${localTime(dd.sunset, off)}  (next sunrise ${localTime(dd.nextSunrise, off)})'),
        ]),
      ),
      const SizedBox(height: 12),
      Wrap(spacing: 12, runSpacing: 12, crossAxisAlignment: WrapCrossAlignment.start, children: [
        SizedBox(
          width: 420,
          child: SectionCard(
            title: 'Muhurta windows',
            child: SimpleTable(columns: const ['Period', 'From', 'To'], rows: [for (final k in dd.kaalas) [k.name, localTime(k.start, off), localTime(k.end, off)]]),
          ),
        ),
        SizedBox(
          width: 420,
          child: SectionCard(
            title: 'Kala Hora (planetary hours)',
            child: SimpleTable(
              columns: const ['#', 'Lord', 'Day/Night', 'From', 'To'],
              highlightRows: {for (var k = 0; k < dd.horas.length; k++) if (!now.isBefore(dd.horas[k].start) && now.isBefore(dd.horas[k].end)) k},
              rows: [for (var k = 0; k < dd.horas.length; k++) ['${k + 1}', titleCase(dd.horas[k].lord ?? ''), dd.horas[k].isDay ? 'Day' : 'Night', localTime(dd.horas[k].start, off), localTime(dd.horas[k].end, off)]],
            ),
          ),
        ),
        SizedBox(
          width: 460,
          child: SectionCard(
            title: 'Choghadiya',
            child: SimpleTable(
              columns: const ['Name', 'Quality', 'Day/Night', 'From', 'To'],
              highlightRows: {for (var k = 0; k < dd.choghadiya.length; k++) if (!now.isBefore(dd.choghadiya[k].start) && now.isBefore(dd.choghadiya[k].end)) k},
              rows: [
                for (final c in dd.choghadiya) [titleCase(c.name), titleCase(c.quality ?? ''), c.isDay ? 'Day' : 'Night', localTime(c.start, off), localTime(c.end, off)],
              ],
            ),
          ),
        ),
        SizedBox(
          width: 460,
          child: SectionCard(
            title: 'Transitions on the civil day',
            child: SimpleTable(columns: const ['Event', 'Name', 'Time'], rows: [for (final t in p.transitions) [titleCase(t.type), t.name, localDateTime(t.at, off)]]),
          ),
        ),
      ]),
      const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text('Hora/Choghadiya/Kaala conventions are listed in the engine (muhurta/day-divisions.calculator.ts).', style: TextStyle(fontSize: 11.5)),
      ),
    ]);
  }
}
