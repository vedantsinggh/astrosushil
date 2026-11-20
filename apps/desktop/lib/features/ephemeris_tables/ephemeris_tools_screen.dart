import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/state/providers.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/ui/widgets/moment_bar.dart';
import '../../src/util/format.dart';
import '../chart_wheel/chart_wheel.dart';
import '../common/date_controls.dart';
import '../common/engine_call.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'ephemeris_models.dart';

/// Ephemeris tools: a paged sidereal/tropical ephemeris table (daily, weekly or monthly, at a
/// fixed local time or at local sunrise), positions at any moment, and the Lagna rising table.
/// Every value comes from the engine sidecar (`ephemeris.table`, `ephemeris.positions`,
/// `ascendant.rising`).
class EphemerisToolsScreen extends StatelessWidget {
  const EphemerisToolsScreen({super.key, required this.initial, this.initialTab = 0});

  /// Starting date, time and place (e.g. now at the chart's place).
  final BirthInput initial;
  final int initialTab;

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 3,
        initialIndex: initialTab,
        child: Column(children: [
          const TabBar(isScrollable: true, tabAlignment: TabAlignment.start, tabs: [
            Tab(text: 'Ephemeris table'),
            Tab(text: 'Positions at a moment'),
            Tab(text: 'Lagna rising'),
          ]),
          Expanded(
            child: TabBarView(children: [
              EphemerisTableView(initial: initial),
              PositionsView(initial: initial),
              AscendantRisingView(initial: initial),
            ]),
          ),
        ]),
      );
}

// ---------------------------------------------------------------------------
// Ephemeris table
// ---------------------------------------------------------------------------

class EphemerisTableView extends ConsumerStatefulWidget {
  const EphemerisTableView({super.key, required this.initial});
  final BirthInput initial;

  @override
  ConsumerState<EphemerisTableView> createState() => _EphemerisTableViewState();
}

class _EphemerisTableViewState extends ConsumerState<EphemerisTableView> {
  late BirthInput moment = widget.initial.copyWith(date: '${widget.initial.date.substring(0, 8)}01', time: '05:30:00');
  late String endDate = _monthEnd(moment.date);
  String step = 'DAY';
  bool sunrise = false;
  bool local = true; // include the place: Lagna column (local ephemeris)
  String zodiac = 'SIDEREAL';
  bool outer = false;
  bool magnitude = false;
  int page = 0;
  String detailBody = ''; // '' = overview
  static const pageSize = 100;

  static String _monthEnd(String start) {
    final d = parseYmd(start) ?? DateTime.utc(2026);
    return ymd(DateTime.utc(d.year, d.month + 1, 0));
  }

  Map<String, Object?> _params(int p, int size) => {
        'startDate': moment.date,
        'endDate': endDate,
        'step': step,
        'timezone': moment.timezone,
        if (!sunrise) 'time': moment.time,
        if (sunrise) 'sunrise': true,
        if (local || sunrise) 'location': {'latitude': moment.latitude, 'longitude': moment.longitude},
        'zodiac': zodiac,
        'includeOuterPlanets': outer,
        'includeMagnitude': magnitude,
        'page': p,
        'pageSize': size,
      };

  void _set(VoidCallback f) => setState(() {
        f();
        page = 0;
      });

  String get _subtitle =>
      '${zodiac == 'SIDEREAL' ? 'Sidereal (${ayanamsaShort(ref.read(calcOptionsProvider).ayanamsa)} ayanamsa)' : 'Tropical'} · ${sunrise ? 'at local sunrise' : 'at ${moment.time.substring(0, 5)}'} · ${moment.timezone}'
      '${(local || sunrise) ? ' · ${moment.placeName ?? latLon(moment.latitude, moment.longitude)}' : ''}';

  Future<List<ExportTable>> _exportAll() async {
    final engine = await ref.read(calcEngineProvider.future);
    final rows = <EphRow>[];
    for (var p = 0;; p++) {
      final r = EphTablePage(await engine.raw('ephemeris.table', _params(p, 400)));
      rows.addAll(r.rows);
      if (p + 1 >= r.pageCount || rows.length >= 4000) break;
    }
    final title = 'Ephemeris ${moment.date} to $endDate';
    return [
      detailBody.isEmpty ? overviewTable(rows, title: title, subtitle: _subtitle, footnote: 'R = retrograde. Positions: astronomy-engine (about ±1 arc-minute).') : bodyDetailTable(rows, detailBody, title: '$title · ${bodyLabel(detailBody)}', subtitle: _subtitle),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(engineCallProvider(EngineCall('ephemeris.table', _params(page, pageSize))));
    return PageBody(children: [
      MomentBar(value: moment, onChanged: (m) => _set(() => moment = m), label: 'Start date, time and place'),
      ControlBar(children: [
        DateField(label: 'End date', value: endDate, onChanged: (v) => _set(() => endDate = v)),
        DropdownButton<String>(
          value: step,
          items: const [DropdownMenuItem(value: 'DAY', child: Text('Daily')), DropdownMenuItem(value: 'WEEK', child: Text('Weekly')), DropdownMenuItem(value: 'MONTH', child: Text('Monthly'))],
          onChanged: (v) => _set(() => step = v ?? step),
        ),
        DropdownButton<String>(
          value: zodiac,
          items: const [DropdownMenuItem(value: 'SIDEREAL', child: Text('Sidereal (Indian)')), DropdownMenuItem(value: 'TROPICAL', child: Text('Tropical (Western)'))],
          onChanged: (v) => _set(() => zodiac = v ?? zodiac),
        ),
        FilterChip(label: const Text('At sunrise'), selected: sunrise, onSelected: (v) => _set(() => sunrise = v)),
        FilterChip(label: const Text('Local (Lagna)'), selected: local || sunrise, onSelected: sunrise ? null : (v) => _set(() => local = v)),
        FilterChip(label: const Text('Uranus, Neptune, Pluto'), selected: outer, onSelected: (v) => _set(() => outer = v)),
        FilterChip(label: const Text('Magnitude'), selected: magnitude, onSelected: (v) => _set(() => magnitude = v)),
      ]),
      AsyncView(
        value: value,
        builder: (j) {
          final t = EphTablePage(j);
          final codes = t.bodyCodes;
          final table = detailBody.isEmpty || !codes.contains(detailBody)
              ? overviewTable(t.rows, title: 'Ephemeris')
              : bodyDetailTable(t.rows, detailBody, title: 'Ephemeris · ${bodyLabel(detailBody)}');
          return SectionCard(
            title: 'Ephemeris ${civilDate(moment.date)} – ${civilDate(endDate)}',
            subtitle: '$_subtitle · ${t.totalRows} rows',
            trailing: ExportButtons(asyncTables: _exportAll, fileStem: 'Ephemeris_${moment.date}_$endDate'),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (t.provisional) ...[ProvisionalBanner(source: 'Uranus, Neptune and Pluto (ADR-016 §6). ${t.source}'), const SizedBox(height: 8)],
              Wrap(spacing: 6, runSpacing: 6, children: [
                ChoiceChip(label: const Text('All bodies'), selected: detailBody.isEmpty, onSelected: (_) => setState(() => detailBody = '')),
                for (final c in codes) ChoiceChip(label: Text(bodyLabel(c)), selected: detailBody == c, onSelected: (_) => setState(() => detailBody = c)),
              ]),
              const SizedBox(height: 8),
              SimpleTable(title: table.title, columns: table.columns, rows: table.rows, dense: true, showActions: false),
              const SizedBox(height: 8),
              Row(children: [
                IconButton(tooltip: 'Previous page', onPressed: t.page > 0 ? () => setState(() => page = t.page - 1) : null, icon: const Icon(Icons.chevron_left)),
                Text('Page ${t.page + 1} of ${t.pageCount}'),
                IconButton(tooltip: 'Next page', onPressed: t.page + 1 < t.pageCount ? () => setState(() => page = t.page + 1) : null, icon: const Icon(Icons.chevron_right)),
                const SizedBox(width: 12),
                if (t.rows.isNotEmpty) Text('Ayanamsa on ${civilDate(t.rows.first.date)}: ${dms(t.rows.first.ayanamsa)}', style: Theme.of(context).textTheme.bodySmall),
              ]),
              for (final n in t.notes) Note(n),
            ]),
          );
        },
      ),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Positions at a moment
// ---------------------------------------------------------------------------

class PositionsView extends ConsumerStatefulWidget {
  const PositionsView({super.key, required this.initial});
  final BirthInput initial;
  @override
  ConsumerState<PositionsView> createState() => _PositionsViewState();
}

class _PositionsViewState extends ConsumerState<PositionsView> {
  late BirthInput moment = widget.initial;
  String zodiac = 'SIDEREAL';
  bool outer = true;
  String stepUnit = 'DAY';
  Timer? _play;

  @override
  void dispose() {
    _play?.cancel();
    super.dispose();
  }

  /// Civil (wall-clock) date arithmetic for stepping the input moment; the engine resolves it.
  void _step(int dir) {
    final d = parseYmd(moment.date);
    if (d == null) return;
    final t = moment.time.split(':').map(int.parse).toList();
    var dt = DateTime.utc(d.year, d.month, d.day, t[0], t[1], t.length > 2 ? t[2] : 0);
    dt = switch (stepUnit) {
      'HOUR' => dt.add(Duration(hours: dir)),
      'WEEK' => dt.add(Duration(days: 7 * dir)),
      'MONTH' => DateTime.utc(dt.year, dt.month + dir, dt.day, dt.hour, dt.minute, dt.second),
      _ => dt.add(Duration(days: dir)),
    };
    String p(int n) => n.toString().padLeft(2, '0');
    setState(() => moment = moment.copyWith(date: ymd(dt), time: '${p(dt.hour)}:${p(dt.minute)}:${p(dt.second)}'));
  }

  void _togglePlay() => setState(() {
        if (_play != null) {
          _play!.cancel();
          _play = null;
        } else {
          _play = Timer.periodic(const Duration(milliseconds: 900), (_) => _step(1));
        }
      });

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(engineCallProvider(EngineCall('ephemeris.positions', {'moment': moment.toJson(), 'zodiac': zodiac, 'includeOuterPlanets': outer, 'includeMagnitude': true})));
    return PageBody(children: [
      MomentBar(value: moment, onChanged: (m) => setState(() => moment = m), label: 'Moment and place'),
      ControlBar(children: [
        DropdownButton<String>(
          value: zodiac,
          items: const [DropdownMenuItem(value: 'SIDEREAL', child: Text('Sidereal (Indian)')), DropdownMenuItem(value: 'TROPICAL', child: Text('Tropical (Western)'))],
          onChanged: (v) => setState(() => zodiac = v ?? zodiac),
        ),
        FilterChip(label: const Text('Uranus, Neptune, Pluto'), selected: outer, onSelected: (v) => setState(() => outer = v)),
        const SizedBox(width: 12),
        const Text('Step through time:'),
        DropdownButton<String>(
          value: stepUnit,
          items: const [
            DropdownMenuItem(value: 'HOUR', child: Text('1 hour')),
            DropdownMenuItem(value: 'DAY', child: Text('1 day')),
            DropdownMenuItem(value: 'WEEK', child: Text('1 week')),
            DropdownMenuItem(value: 'MONTH', child: Text('1 month')),
          ],
          onChanged: (v) => setState(() => stepUnit = v ?? stepUnit),
        ),
        IconButton(tooltip: 'Step back', onPressed: () => _step(-1), icon: const Icon(Icons.skip_previous_rounded)),
        IconButton(tooltip: _play == null ? 'Play (animate transits)' : 'Pause', onPressed: _togglePlay, icon: Icon(_play == null ? Icons.play_arrow_rounded : Icons.pause_rounded)),
        IconButton(tooltip: 'Step forward', onPressed: () => _step(1), icon: const Icon(Icons.skip_next_rounded)),
      ]),
      AsyncView(
        value: value,
        builder: (j) {
          final row = EphRow(j);
          final t = positionsTable(row, title: 'Positions');
          return SectionCard(
            title: 'Positions at ${civilDate(moment.date)} ${moment.time}',
            subtitle: t.subtitle,
            trailing: ExportButtons(tables: () => [positionsTable(EphRow(j), title: 'Positions at ${moment.date} ${moment.time} ${moment.placeName ?? ''}')], fileStem: 'Positions_${moment.date}'),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (outer) ...[const ProvisionalBanner(source: 'Uranus, Neptune and Pluto from astronomy-engine (ADR-016 §6).'), const SizedBox(height: 8)],
              Wrap(spacing: 16, runSpacing: 16, crossAxisAlignment: WrapCrossAlignment.start, children: [
                if (row.ascendant != null)
                  ChartWheel(
                    size: 360,
                    ascendant: row.ascendant!.longitude,
                    bodies: [for (final b in row.bodies) WheelBody(b.body.length > 2 ? '${b.body[0]}${b.body[1].toLowerCase()}' : b.body, b.longitude, retrograde: b.isRetrograde && b.body != 'RAHU' && b.body != 'KETU')],
                  ),
                ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1000), child: SimpleTable(showActions: false, title: t.title, columns: t.columns, rows: t.rows, numericColumns: const {3, 8})),
              ]),
              const SizedBox(height: 6),
              const Note('Geocentric apparent positions. Magnitude: astronomy-engine Illumination() (visual magnitude; about ±0.15 against JPL Horizons). Speed in degrees per day.'),
            ]),
          );
        },
      ),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Lagna rising table
// ---------------------------------------------------------------------------

class AscendantRisingView extends ConsumerStatefulWidget {
  const AscendantRisingView({super.key, required this.initial});
  final BirthInput initial;
  @override
  ConsumerState<AscendantRisingView> createState() => _AscendantRisingViewState();
}

class _AscendantRisingViewState extends ConsumerState<AscendantRisingView> {
  late BirthInput moment = widget.initial;
  String span = 'CIVIL_DAY';

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(engineCallProvider(EngineCall('ascendant.rising', {'date': moment.date, 'location': moment.location.toJson(), 'span': span})));
    return PageBody(children: [
      MomentBar(value: moment, onChanged: (m) => setState(() => moment = m), label: 'Date and place'),
      ControlBar(children: [
        SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'CIVIL_DAY', label: Text('Midnight to midnight')), ButtonSegment(value: 'SUNRISE_TO_SUNRISE', label: Text('Sunrise to sunrise'))],
          selected: {span},
          onSelectionChanged: (s) => setState(() => span = s.first),
        ),
      ]),
      AsyncView(
        value: value,
        builder: (j) {
          final t = risingTable(j, title: 'Lagna rising ${moment.date}');
          return SectionCard(
            title: 'Lagna rising times, ${civilDate(moment.date)}',
            subtitle: '${moment.placeName ?? latLon(moment.latitude, moment.longitude)} · ${t.subtitle}',
            trailing: ExportButtons(tables: () => [risingTable(j, title: 'Lagna rising ${moment.date} ${moment.placeName ?? ''}')], fileStem: 'Lagna_rising_${moment.date}'),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
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
