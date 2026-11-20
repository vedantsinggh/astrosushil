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
import 'muhurta_extras_models.dart';

/// Durmuhurta, Varjyam and Amrit Kalam for a day at a place, plus a table of Gandmool and
/// Panchaka periods from that day onward. All windows are computed by the engine.
class MuhurtaExtrasScreen extends ConsumerStatefulWidget {
  const MuhurtaExtrasScreen({super.key, required this.initial, this.initialRangeDays = 90});
  final BirthInput initial;
  final int initialRangeDays;

  @override
  ConsumerState<MuhurtaExtrasScreen> createState() => _MuhurtaExtrasScreenState();
}

const rangeChoices = [30, 90, 180, 365];

class _MuhurtaExtrasScreenState extends ConsumerState<MuhurtaExtrasScreen> {
  late BirthInput moment = widget.initial;
  late int rangeDays = rangeChoices.contains(widget.initialRangeDays) ? widget.initialRangeDays : 90;

  JsonMap get _location => {
        'latitude': moment.latitude,
        'longitude': moment.longitude,
        'timezone': moment.timezone,
        if (moment.placeName != null) 'placeName': moment.placeName,
      };

  EngineCall get _dayCall => EngineCall('muhurta.extras', {'date': moment.date, 'location': _location});

  EngineCall _rangeCall(DateTime start) => EngineCall('muhurta.gandmoolPanchaka', {
        'startIso': start.toIso8601String(),
        'endIso': start.add(Duration(days: rangeDays)).toIso8601String(),
        'timezone': moment.timezone,
        'pageSize': 500,
      });

  String get _place => moment.placeName ?? latLon(moment.latitude, moment.longitude);

  @override
  Widget build(BuildContext context) {
    final dayCall = _dayCall;
    final day = ref.watch(engineCallProvider(dayCall)).whenData(MuhurtaExtrasDayModel.new);
    return PageBody(children: [
      MomentBar(value: moment, onChanged: (m) => setState(() => moment = m), label: 'Day'),
      const SizedBox(height: Gap.md),
      AsyncView<MuhurtaExtrasDayModel>(
        value: day,
        onRetry: () => ref.invalidate(engineCallProvider(dayCall)),
        builder: (m) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (m.provisional) ProvisionalBanner(source: m.source),
          const SizedBox(height: Gap.md),
          MuhurtaDayView(model: m, title: 'Muhurta windows - ${civilDate(moment.date)} (${m.weekdayName}), $_place'),
          const SizedBox(height: Gap.lg),
          _rangeSection(m.civilDayStart),
          const SizedBox(height: Gap.md),
          const InterpretationArea(),
        ]),
      ),
    ]);
  }

  Widget _rangeSection(DateTime start) {
    final call = _rangeCall(start);
    final range = ref.watch(engineCallProvider(call)).whenData(GandmoolPanchakaRangeModel.new);
    final subtitle = '${civilDate(moment.date)} + $rangeDays days, $_place (${moment.timezone})';
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ControlBar(children: [
        Text('Gandmool and Panchaka periods', style: TextStyle(fontWeight: FontWeight.w700, color: context.palette.heading)),
        SegmentedButton<int>(
          key: const ValueKey('muhurta-extras-range'),
          segments: [for (final d in rangeChoices) ButtonSegment(value: d, label: Text(d == 365 ? '1 year' : '$d days'))],
          selected: {rangeDays},
          onSelectionChanged: (s) => setState(() => rangeDays = s.first),
        ),
        if (range.hasValue)
          ExportButtons(fileStem: 'Gandmool_Panchaka_${moment.date}', tables: () => [range.value!.exportTable('Gandmool and Panchaka periods', subtitle)]),
      ]),
      const SizedBox(height: Gap.sm),
      AsyncView<GandmoolPanchakaRangeModel>(
        value: range,
        onRetry: () => ref.invalidate(engineCallProvider(call)),
        builder: (r) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (r.provisional) ProvisionalBanner(source: r.source),
          const SizedBox(height: Gap.sm),
          SectionCard(
            title: 'Moon in Gandmool nakshatras / Panchaka',
            subtitle: subtitle,
            child: r.rows.isEmpty
                ? const Note('No Gandmool or Panchaka period in this range.')
                : SimpleTable(showActions: false, title: 'Gandmool_Panchaka', columns: GandmoolPanchakaRangeModel.columns, rows: r.tableRows, maxHeight: 520, dense: true),
          ),
          const SizedBox(height: Gap.sm),
          for (final n in r.conventionNotes) Note(n),
        ]),
      ),
    ]);
  }
}

/// The day's windows (Durmuhurta, Varjyam, Amrit Kalam) and the nakshatras they derive from.
class MuhurtaDayView extends StatelessWidget {
  const MuhurtaDayView({super.key, required this.model, required this.title});
  final MuhurtaExtrasDayModel model;
  final String title;

  @override
  Widget build(BuildContext context) {
    final m = model;
    final off = m.utcOffsetMinutes;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionCard(
        title: title,
        subtitle: 'Times local (${offsetLabel(off)})',
        trailing: ExportButtons(fileStem: 'Muhurta_extras_${localTime(m.civilDayStart, off, pattern: 'yyyy-MM-dd')}', tables: () => [m.exportTable(title)]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          KeyValueGrid(columns: 2, items: [
            ('Sunrise / sunset', '${localTime(m.sunrise, off, pattern: 'HH:mm')} / ${localTime(m.sunset, off, pattern: 'HH:mm')}'),
            ('Next sunrise', localTime(m.nextSunrise, off, pattern: 'dd MMM HH:mm')),
            ('Day muhurta', '${fixed(m.dayMuhurtaMinutes, 1)} min (1/15 of day)'),
            ('Night muhurta', '${fixed(m.nightMuhurtaMinutes, 1)} min (1/15 of night)'),
          ]),
          const SizedBox(height: Gap.md),
          SimpleTable(columns: MuhurtaExtrasDayModel.columns, rows: m.tableRows, showActions: false),
        ]),
      ),
      const SizedBox(height: Gap.md),
      SectionCard(
        title: 'Moon nakshatras used for Varjyam / Amrit Kalam',
        child: SimpleTable(columns: const ['Nakshatra', 'From', 'To'], rows: m.nakshatraRows, showActions: false),
      ),
      const SizedBox(height: Gap.sm),
      for (final n in m.conventionNotes) Note(n),
    ]);
  }
}
