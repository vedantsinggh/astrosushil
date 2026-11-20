import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/date_controls.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

const _allPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];

/// Transit tables (sign ingress, nakshatra ingress with pada, retrograde/direct stations) and a
/// yearly transit timeline graphic, for one calendar year in the chart's time zone. Events come
/// from the engine (`transit.tables`); the starting signs from `ephemeris.positions`.
class TransitTablesScreen extends ConsumerStatefulWidget {
  const TransitTablesScreen({super.key, required this.place, this.initialYear, this.showTimeline = true});

  /// Show the yearly sign timeline graphic above the tables.
  final bool showTimeline;

  /// Time zone and place used for local times (the date/time fields are ignored).
  final BirthInput place;
  final int? initialYear;
  @override
  ConsumerState<TransitTablesScreen> createState() => _TransitTablesScreenState();
}

class TransitEvent {
  TransitEvent(JsonMap j)
      : type = asStr(j['eventType']),
        planet = asStr(j['planet']),
        iso = asStr(j['timestampIso']),
        offset = asInt(j['utcOffsetMinutes']) ?? 0,
        longitude = asDouble(j['longitude']) ?? 0,
        fromSign = asInt(asMap(j['fromSign'])['index']),
        toSign = asInt(asMap(j['toSign'])['index']),
        fromNak = asStr(asMap(j['fromNakshatra'])['name']),
        toNak = asStr(asMap(j['toNakshatra'])['name']),
        pada = asInt(j['pada']),
        stationSign = asStr(j['rashiName']);
  final String type, planet, iso, fromNak, toNak, stationSign;
  final int offset;
  final double longitude;
  final int? fromSign, toSign, pada;
  DateTime get time => DateTime.parse(iso);
  String get local => isoLocal(iso, offset);
}

List<ExportTable> transitTables(List<TransitEvent> ev, String subtitle) {
  String sign(int? i) => i == null ? '' : signNames[(i - 1).clamp(0, 11)];
  final s = ev.where((e) => e.type == 'SIGN_INGRESS').toList();
  final n = ev.where((e) => e.type == 'NAKSHATRA_INGRESS').toList();
  final st = ev.where((e) => e.type.endsWith('STATION')).toList();
  return [
    ExportTable(title: 'Sign ingresses', subtitle: subtitle, columns: ['Date and time', 'Planet', 'From', 'Into', 'Motion'], rows: [
      for (final e in s) [e.local, planetName(e.planet), sign(e.fromSign), sign(e.toSign), ((e.toSign! - e.fromSign! + 12) % 12) == 11 ? 'Retrograde' : 'Direct'],
    ]),
    ExportTable(title: 'Nakshatra ingresses', subtitle: subtitle, columns: ['Date and time', 'Planet', 'From', 'Into', 'Pada', 'Sign'], rows: [
      for (final e in n) [e.local, planetName(e.planet), e.fromNak, e.toNak, '${e.pada ?? ''}', signDms(e.longitude).substring(0, 2)],
    ]),
    ExportTable(title: 'Retrograde and direct stations', subtitle: subtitle, columns: ['Date and time', 'Planet', 'Station', 'Sign', 'Longitude'], rows: [
      for (final e in st) [e.local, planetName(e.planet), e.type == 'RETROGRADE_STATION' ? 'Turns retrograde' : 'Turns direct', e.stationSign, signDms(e.longitude)],
    ]),
  ];
}

class _TransitTablesScreenState extends ConsumerState<TransitTablesScreen> {
  late int year = widget.initialYear ?? DateTime.now().year;
  final planets = {..._allPlanets}..remove('MOON');
  int tab = 0;

  @override
  Widget build(BuildContext context) {
    final tz = widget.place.timezone;
    final events = ref.watch(engineCallProvider(EngineCall('transit.tables', {
      'startIso': '$year-01-01T00:00:00Z',
      'endIso': '${year + 1}-01-01T00:00:00Z',
      'timezone': tz,
      'planets': [for (final p in _allPlanets) if (planets.contains(p)) p],
      'pageSize': 2000,
    })));
    final start = ref.watch(engineCallProvider(EngineCall('ephemeris.positions', {
      'moment': widget.place.copyWith(date: '$year-01-01', time: '00:00:00', timezone: 'UTC').toJson(),
      'includeMagnitude': false,
    })));
    return PageBody(children: [
      ControlBar(children: [
        Stepper2(label: 'Year', value: '$year', onPrev: () => setState(() => year--), onNext: () => setState(() => year++)),
        for (final p in _allPlanets)
          FilterChip(label: Text(planetName(p)), selected: planets.contains(p), onSelected: (v) => setState(() => v ? planets.add(p) : (planets.length > 1 ? planets.remove(p) : null))),
      ]),
      AsyncView(
        value: events,
        builder: (j) {
          final ev = [for (final r in asMapList(j['rows'])) TransitEvent(r)]..sort((a, b) => a.iso.compareTo(b.iso));
          final subtitle = 'Local times in $tz (sidereal, engine ayanamsa)';
          final ts = transitTables(ev, subtitle);
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (widget.showTimeline) ...[
            SectionCard(
              title: 'Transit timeline $year',
              subtitle: 'Sign occupied by each planet through the year; hatched = retrograde. Hover for dates.',
              child: start.when(
                data: (s) => TransitTimeline(year: year, events: ev, startBodies: asMapList(s['bodies']), planets: [for (final p in _allPlanets) if (planets.contains(p)) p], utcOffsetMinutes: ev.isEmpty ? 0 : ev.first.offset),
                loading: () => const SkeletonBlock(lines: 4),
                error: (e, _) => ErrorPanel(error: e),
              ),
            ),
            const SizedBox(height: Gap.lg),
            ],
            SectionCard(
              title: 'Transit tables $year',
              subtitle: '$subtitle · ${ev.length} events',
              trailing: ExportButtons(tables: () => ts, fileStem: 'Transits_$year'),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SegmentedButton<int>(
                  segments: [for (var i = 0; i < ts.length; i++) ButtonSegment(value: i, label: Text('${ts[i].title} (${ts[i].rows.length})'))],
                  selected: {tab},
                  onSelectionChanged: (s) => setState(() => tab = s.first),
                ),
                const SizedBox(height: 8),
                SimpleTable(showActions: false, title: ts[tab].title, columns: ts[tab].columns, rows: ts[tab].rows, dense: true),
              ]),
            ),
          ]);
        },
      ),
    ]);
  }
}

/// One planet's sign spans (display assembly from engine events only).
class _Span {
  _Span(this.sign, this.start, this.end);
  final int sign;
  final DateTime start, end;
}

/// Gantt-style yearly transit timeline: one row per planet, coloured by sign, with retrograde
/// intervals hatched and month gridlines. It only lays out engine events.
class TransitTimeline extends StatefulWidget {
  const TransitTimeline({super.key, required this.year, required this.events, required this.startBodies, required this.planets, required this.utcOffsetMinutes});
  final int year;
  final List<TransitEvent> events;
  final List<JsonMap> startBodies;
  final List<String> planets;
  final int utcOffsetMinutes;

  @override
  State<TransitTimeline> createState() => _TransitTimelineState();
}

class _TransitTimelineState extends State<TransitTimeline> {
  String? _hover;

  ({List<_Span> signs, List<(DateTime, DateTime)> retro}) _rows(String p) {
    final y0 = DateTime.utc(widget.year);
    final y1 = DateTime.utc(widget.year + 1);
    final b = widget.startBodies.where((x) => x['body'] == p).firstOrNull ?? const {};
    var sign = asInt(b['rashiIndex']) ?? 1;
    var retro = b['isRetrograde'] == true && p != 'RAHU' && p != 'KETU';
    final spans = <_Span>[];
    final retros = <(DateTime, DateTime)>[];
    var t = y0;
    DateTime? retroStart = retro ? y0 : null;
    for (final e in widget.events.where((e) => e.planet == p)) {
      if (e.type == 'SIGN_INGRESS') {
        spans.add(_Span(sign, t, e.time));
        sign = e.toSign ?? sign;
        t = e.time;
      } else if (e.type == 'RETROGRADE_STATION') {
        retroStart = e.time;
      } else if (e.type == 'DIRECT_STATION') {
        retros.add((retroStart ?? y0, e.time));
        retroStart = null;
      }
    }
    spans.add(_Span(sign, t, y1));
    if (retroStart != null) retros.add((retroStart, y1));
    if (p == 'RAHU' || p == 'KETU') retros.add((y0, y1));
    return (signs: spans, retro: retros);
  }

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final rows = {for (final p in widget.planets) p: _rows(p)};
    return LayoutBuilder(builder: (context, c) {
      const labelW = 78.0;
      const rowH = 26.0;
      final w = math.max(400.0, c.maxWidth - labelW);
      final y0 = DateTime.utc(widget.year).millisecondsSinceEpoch;
      final y1 = DateTime.utc(widget.year + 1).millisecondsSinceEpoch;
      double x(DateTime t) => (t.millisecondsSinceEpoch - y0) / (y1 - y0) * w;
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const SizedBox(width: labelW),
          SizedBox(
            width: w,
            height: 18,
            child: Stack(children: [
              for (var m = 1; m <= 12; m++)
                Positioned(left: x(DateTime.utc(widget.year, m)) + 3, child: Text(const ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1], style: TextStyle(fontSize: 11, color: pal.textMuted))),
            ]),
          ),
        ]),
        for (final p in widget.planets)
          SizedBox(
            height: rowH + 4,
            child: Row(children: [
              SizedBox(width: labelW, child: Text(planetName(p), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
              SizedBox(
                width: w,
                height: rowH,
                child: Stack(clipBehavior: Clip.none, children: [
                  for (final s in rows[p]!.signs)
                    Positioned(
                      left: x(s.start),
                      width: math.max(1, x(s.end) - x(s.start)),
                      top: 0,
                      bottom: 0,
                      child: MouseRegion(
                        onEnter: (_) => setState(() => _hover = '${planetName(p)} in ${signNames[s.sign - 1]}: ${isoLocal(s.start.toIso8601String(), widget.utcOffsetMinutes)} – ${isoLocal(s.end.toIso8601String(), widget.utcOffsetMinutes)}'),
                        child: Tooltip(
                          message: '${planetName(p)} in ${signNames[s.sign - 1]}\n${isoLocal(s.start.toIso8601String(), widget.utcOffsetMinutes)} – ${isoLocal(s.end.toIso8601String(), widget.utcOffsetMinutes)}',
                          child: Container(
                            decoration: BoxDecoration(
                              color: HSLColor.fromAHSL(1, (s.sign - 1) * 30.0, 0.45, Theme.of(context).brightness == Brightness.dark ? 0.32 : 0.78).toColor(),
                              border: Border.all(color: pal.card, width: 0.8),
                            ),
                            alignment: Alignment.center,
                            child: x(s.end) - x(s.start) > 26 ? Text(signShort[s.sign - 1], style: TextStyle(fontSize: 11, color: pal.text), overflow: TextOverflow.clip) : null,
                          ),
                        ),
                      ),
                    ),
                  for (final (a, b) in rows[p]!.retro)
                    Positioned(left: x(a), width: math.max(1, x(b) - x(a)), bottom: 0, height: 5, child: IgnorePointer(child: Container(color: pal.retro.withValues(alpha: 0.85)))),
                ]),
              ),
            ]),
          ),
        const SizedBox(height: 6),
        Row(children: [
          Container(width: 18, height: 5, color: pal.retro),
          const SizedBox(width: 6),
          Text('Retrograde (Rahu and Ketu always move backwards)', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(width: 16),
          if (_hover != null) Expanded(child: Text(_hover!, style: Theme.of(context).textTheme.bodySmall, overflow: TextOverflow.ellipsis)),
        ]),
      ]);
    });
  }
}
