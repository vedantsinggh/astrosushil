import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../widgets/common.dart';

/// Soft, distinct colours for the 12 signs (presentation only).
const signColors = <Color>[
  Color(0xFFE8B4A0), Color(0xFFB9D3A8), Color(0xFFF1D58A), Color(0xFFA8C8E0), Color(0xFFF0C08A), Color(0xFFC9D8B0),
  Color(0xFFD6C1E6), Color(0xFFE6A9A9), Color(0xFFB3D7CF), Color(0xFFC8C1A8), Color(0xFFA9C0E8), Color(0xFFCFE0E8),
];

/// Display grouping of engine ingress events into "planet in sign" spans. No astrology here:
/// spans begin and end exactly at the engine's SIGN_INGRESS events; the sign before the first
/// ingress is that event's `fromSign`, or (if none in range) the engine snapshot at the start.
class SignSpan {
  const SignSpan(this.sign, this.name, this.start, this.end);
  final int sign;
  final String name;
  final DateTime start;
  final DateTime end;
}

List<SignSpan> signSpans(String planet, List<TimelineEvent> events, DateTime start, DateTime end, {int? initialSign, String? initialName}) {
  final ing = events.where((e) => e.planet == planet && e.isSignIngress).toList()..sort((a, b) => a.at.compareTo(b.at));
  final out = <SignSpan>[];
  var cursor = start;
  int? sign = ing.isNotEmpty ? ing.first.fromIndex : initialSign;
  String? name = ing.isNotEmpty ? ing.first.fromName : initialName;
  for (final e in ing) {
    if (sign != null) out.add(SignSpan(sign, name ?? '', cursor, e.at));
    cursor = e.at;
    sign = e.toIndex;
    name = e.toName;
  }
  if (sign != null) out.add(SignSpan(sign, name ?? '', cursor, end));
  return out;
}

class TransitTimelineScreen extends ConsumerStatefulWidget {
  const TransitTimelineScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  ConsumerState<TransitTimelineScreen> createState() => _TransitTimelineScreenState();
}

class _TransitTimelineScreenState extends ConsumerState<TransitTimelineScreen> {
  late DateTime month = DateTime.utc(DateTime.now().year, DateTime.now().month);
  int months = 6;
  final planets = <String>{'SUN', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'};
  bool showSigns = true, showNakshatras = false, showStations = true;

  DateTime get end => DateTime.utc(month.year, month.month + months);

  @override
  Widget build(BuildContext context) {
    final tz = widget.birth.timezone;
    final value = ref.watch(transitTimelineProvider((month, end, tz)));
    final startMoment = BirthInput(date: DateFormat('yyyy-MM-dd').format(month), time: '00:00:00', timezone: tz, latitude: widget.birth.latitude, longitude: widget.birth.longitude, placeName: widget.birth.placeName);
    final snapshot = ref.watch(transitProvider((null, startMoment))).valueOrNull;

    final controls = ControlBar(children: [
      Stepper2(
        label: 'From',
        value: DateFormat('MMM yyyy').format(month),
        prevTooltip: 'Earlier month',
        nextTooltip: 'Later month',
        onPrev: () => setState(() => month = DateTime.utc(month.year, month.month - 1)),
        onNext: () => setState(() => month = DateTime.utc(month.year, month.month + 1)),
      ),
      SegmentedButton<int>(
        key: const Key('timeline-span'),
        showSelectedIcon: false,
        segments: const [
          ButtonSegment(value: 1, label: Text('1 month')),
          ButtonSegment(value: 3, label: Text('3 months')),
          ButtonSegment(value: 6, label: Text('6 months')),
          ButtonSegment(value: 12, label: Text('1 year')),
          ButtonSegment(value: 36, label: Text('3 years')),
        ],
        selected: {months},
        onSelectionChanged: (s) => setState(() => months = s.first),
      ),
      TextButton(onPressed: () => setState(() => month = DateTime.utc(DateTime.now().year, DateTime.now().month)), child: const Text('This month')),
    ]);

    final filters = Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
      Text('Planets:', style: TextStyle(color: context.palette.textMuted, fontSize: 13)),
      for (final p in [...planetOrder])
        FilterChip(
          key: Key('timeline-planet-$p'),
          label: Text(planetName(p)),
          selected: planets.contains(p),
          onSelected: (v) => setState(() => v ? planets.add(p) : planets.remove(p)),
        ),
      const SizedBox(width: 12),
      Text('Events:', style: TextStyle(color: context.palette.textMuted, fontSize: 13)),
      FilterChip(label: const Text('Sign changes'), selected: showSigns, onSelected: (v) => setState(() => showSigns = v)),
      FilterChip(key: const Key('timeline-nakshatra'), label: const Text('Nakshatra changes'), selected: showNakshatras, onSelected: (v) => setState(() => showNakshatras = v)),
      FilterChip(label: const Text('Stations (R / D)'), selected: showStations, onSelected: (v) => setState(() => showStations = v)),
    ]);

    return PageBody(children: [
      controls,
      filters,
      AsyncView(
        value: value,
        onRetry: () => ref.invalidate(transitTimelineProvider((month, end, tz))),
        skeleton: const SkeletonBlock(lines: 9),
        builder: (t) {
          final order = planetOrder.where(planets.contains).toList();
          final events = t.events
              .where((e) => planets.contains(e.planet) && ((e.isSignIngress && showSigns) || (e.isNakshatraIngress && showNakshatras) || (e.isStation && showStations)))
              .toList()
            ..sort((a, b) => a.at.compareTo(b.at));
          final fallbackOffset = ref.watch(chartResultProvider(widget.birth)).valueOrNull?.utcOffsetMinutes ?? 0;
          String when(TimelineEvent e) => localDateTime(e.at, e.utcOffsetMinutes ?? fallbackOffset);
          String desc(TimelineEvent e) => switch (e.type) {
                'SIGN_INGRESS' => 'enters ${e.toName} (from ${e.fromName})',
                'NAKSHATRA_INGRESS' => 'enters ${e.toName} nakshatra${e.pada == null ? '' : ', pada ${e.pada}'}',
                'RETROGRADE_STATION' => 'turns retrograde in ${e.toName ?? ''}',
                'DIRECT_STATION' => 'turns direct in ${e.toName ?? ''}',
                _ => titleCase(e.type),
              };
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SectionCard(
              title: 'Planets through the signs',
              subtitle: 'Each band is the sign a planet occupies; ▼ marks a retrograde station, ▲ a direct station. Hover for dates.',
              child: order.isEmpty
                  ? const EmptyState(icon: Icons.filter_alt_off_outlined, title: 'No planets selected', message: 'Choose at least one planet above.')
                  : TransitGantt(
                      timeline: t,
                      planets: order,
                      initialSigns: {for (final p in snapshot?.planets ?? const <TransitPlanetRow>[]) p.planet: (p.rashiIndex, p.rashiName)},
                      offsetMinutes: fallbackOffset,
                    ),
            ),
            const SizedBox(height: Gap.lg),
            SectionCard(
              title: 'Events (${events.length})',
              subtitle: 'Times are local to ${widget.birth.placeName ?? tz} ($tz), including summer time.',
              child: events.isEmpty
                  ? const EmptyState(icon: Icons.event_busy_outlined, title: 'No events in this range', message: 'Try a longer span, or turn on more event types or planets.')
                  : SimpleTable(
                      title: 'Transit events ${DateFormat('yyyy-MM').format(month)}',
                      columns: const ['Date and time', 'Planet', 'Event'],
                      rows: [for (final e in events) [when(e), planetName(e.planet), desc(e)]],
                    ),
            ),
            const SizedBox(height: Gap.sm),
            const Note('Ingresses and stations are found by the engine (transitTimeline.compute, sidereal Lahiri). The Moon changes sign every 2–3 days, so it is hidden by default.'),
          ]);
        },
      ),
    ]);
  }
}

/// Horizontal "planet in sign" bands over the selected range.
class TransitGantt extends StatelessWidget {
  const TransitGantt({super.key, required this.timeline, required this.planets, required this.initialSigns, required this.offsetMinutes});
  final TransitTimelineModel timeline;
  final List<String> planets;
  final Map<String, (int, String)> initialSigns;
  final int offsetMinutes;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final start = timeline.start, end = timeline.end;
    final total = end.difference(start).inSeconds.toDouble();
    final now = DateTime.now().toUtc();
    const labelW = 92.0, rowH = 30.0;
    return LayoutBuilder(builder: (context, c) {
      final w = c.maxWidth - labelW;
      double x(DateTime t) => (t.difference(start).inSeconds / total).clamp(0.0, 1.0) * w;
      // month ticks
      final ticks = <DateTime>[];
      for (var m = DateTime.utc(start.year, start.month); !m.isAfter(end); m = DateTime.utc(m.year, m.month + 1)) {
        if (!m.isBefore(start)) ticks.add(m);
      }
      final tickEvery = (ticks.length / 12).ceil().clamp(1, 12);
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          height: 20,
          child: Stack(children: [
            for (var i = 0; i < ticks.length; i += tickEvery)
              Positioned(left: labelW + x(ticks[i]) + 2, top: 0, child: Text(DateFormat(ticks.length > 14 ? 'MMM yy' : 'MMM').format(ticks[i]), style: TextStyle(fontSize: 11, color: pal.textMuted))),
          ]),
        ),
        for (final planet in planets)
          SizedBox(
            height: rowH + 4,
            child: Row(children: [
              SizedBox(width: labelW, child: Text(planetName(planet), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
              Expanded(
                child: Stack(clipBehavior: Clip.none, children: [
                  Positioned.fill(child: Container(margin: const EdgeInsets.symmetric(vertical: 2), decoration: BoxDecoration(color: pal.canvasAlt, borderRadius: BorderRadius.circular(4)))),
                  for (final s in signSpans(planet, timeline.events, start, end, initialSign: initialSigns[planet]?.$1, initialName: initialSigns[planet]?.$2))
                    Positioned(
                      left: x(s.start),
                      width: (x(s.end) - x(s.start)).clamp(1.0, w),
                      top: 2,
                      bottom: 2,
                      child: Tooltip(
                        message: '${planetName(planet)} in ${s.name}\n${localDate(s.start, offsetMinutes)} – ${localDate(s.end, offsetMinutes)}',
                        child: Container(
                          decoration: BoxDecoration(
                            color: signColors[(s.sign - 1) % 12].withValues(alpha: Theme.of(context).brightness == Brightness.dark ? 0.55 : 0.9),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: pal.card, width: 1),
                          ),
                          alignment: Alignment.centerLeft,
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: Text(s.name, maxLines: 1, overflow: TextOverflow.clip, softWrap: false, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF1A1B3A))),
                        ),
                      ),
                    ),
                  for (final e in timeline.events.where((e) => e.planet == planet && e.isStation))
                    Positioned(
                      left: x(e.at) - 7,
                      top: 6,
                      child: Tooltip(
                        message: '${planetName(planet)} ${e.type == 'RETROGRADE_STATION' ? 'retrograde' : 'direct'} station\n${localDateTime(e.at, e.utcOffsetMinutes ?? offsetMinutes)}',
                        child: Text(e.type == 'RETROGRADE_STATION' ? '▼' : '▲', style: TextStyle(fontSize: 13, color: e.type == 'RETROGRADE_STATION' ? pal.retro : pal.success)),
                      ),
                    ),
                  if (now.isAfter(start) && now.isBefore(end))
                    Positioned(left: x(now) - 1, top: 0, bottom: 0, child: Container(width: 2, color: pal.accentText)),
                ]),
              ),
            ]),
          ),
        const SizedBox(height: 6),
        Row(children: [
          const SizedBox(width: labelW),
          Container(width: 10, height: 10, color: pal.accentText),
          const SizedBox(width: 6),
          Text('Today', style: TextStyle(fontSize: 11.5, color: pal.textMuted)),
        ]),
      ]);
    });
  }
}
