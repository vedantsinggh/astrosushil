import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/charts/chart_data.dart';
import '../../src/charts/chart_view.dart';
import '../../src/engine/inputs.dart';
import '../../src/engine/models.dart';
import '../../src/state/providers.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../dasha_timeline/dasha_timeline_models.dart';

/// Dasha Pravesh: the chart cast for the instant a chosen mahadasha / antardasha begins, at the
/// birth place. The start instant comes from `dasha.compute`, is converted to local civil time by
/// `time.local`, and the chart is computed by `chart.compute`; nothing is calculated in Dart.
class DashaPraveshScreen extends ConsumerStatefulWidget {
  const DashaPraveshScreen({super.key, required this.birth, this.initialSystem = 'VIMSHOTTARI', this.now});
  final BirthInput birth;
  final String initialSystem;

  /// Used only to pre-select the running period (defaults to the current time).
  final DateTime? now;

  @override
  ConsumerState<DashaPraveshScreen> createState() => _DashaPraveshScreenState();
}

class _DashaPraveshScreenState extends ConsumerState<DashaPraveshScreen> {
  late String _system = widget.initialSystem;
  int? _md;
  int? _ad; // null = the mahadasha's own start
  bool _adTouched = false;

  @override
  Widget build(BuildContext context) {
    final call = dashaCall(widget.birth, _system);
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(call)),
      onRetry: () => ref.invalidate(engineCallProvider(call)),
      builder: (j) => _body(context, DashaResultModel(j)),
    );
  }

  Widget _body(BuildContext context, DashaResultModel r) {
    final now = (widget.now ?? DateTime.now()).toUtc();
    final controls = ControlBar(children: [
      const Text('System'),
      DropdownButton<String>(
        key: const ValueKey('pravesh-system'),
        value: _system,
        items: [for (final e in dashaSystemLabels.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
        onChanged: (v) => setState(() {
          if (v != null) _system = v;
          _md = null;
          _ad = null;
          _adTouched = false;
        }),
      ),
    ]);
    if (!r.isEligible || r.periods.isEmpty) {
      return PageBody(children: [
        controls,
        EmptyState(icon: Icons.timeline_outlined, title: 'No periods', message: r.eligibilityReason ?? 'The engine returned no periods for this system.'),
      ]);
    }
    final mds = r.periods;
    final mdIndex = (_md != null && _md! < mds.length) ? _md! : (indexAt(mds, now) ?? 0);
    final md = mds[mdIndex];
    final adIndex = _adTouched ? (_ad != null && _ad! < md.children.length ? _ad : null) : indexAt(md.children, now);
    final period = adIndex == null ? md : md.children[adIndex];
    final periodName = adIndex == null ? '${longLabel(md)} mahadasha' : '${longLabel(period)} antardasha of ${longLabel(md)} mahadasha';

    return PageBody(children: [
      ControlBar(children: [
        ...controls.children,
        const Text('Mahadasha'),
        DropdownButton<int>(
          key: const ValueKey('pravesh-md'),
          value: mdIndex,
          items: [
            for (var i = 0; i < mds.length; i++)
              DropdownMenuItem(value: i, child: Text('${longLabel(mds[i])} (${localDate(mds[i].start, r.utcOffsetMinutes)})')),
          ],
          onChanged: (v) => setState(() {
            _md = v;
            _ad = null;
            _adTouched = true;
          }),
        ),
        const Text('Antardasha'),
        DropdownButton<int?>(
          key: const ValueKey('pravesh-ad'),
          value: adIndex,
          items: [
            const DropdownMenuItem<int?>(value: null, child: Text('— mahadasha start —')),
            for (var i = 0; i < md.children.length; i++)
              DropdownMenuItem<int?>(value: i, child: Text('${longLabel(md.children[i])} (${localDate(md.children[i].start, r.utcOffsetMinutes)})')),
          ],
          onChanged: (v) => setState(() {
            _ad = v;
            _adTouched = true;
          }),
        ),
      ]),
      if (period.isBirthDasha)
        const Note('This period was already running at birth; the engine starts it at the birth moment, so this chart is the birth chart.'),
      _PraveshChart(birth: widget.birth, period: period, periodName: periodName),
    ]);
  }
}

class _PraveshChart extends ConsumerWidget {
  const _PraveshChart({required this.birth, required this.period, required this.periodName});
  final BirthInput birth;
  final DashaPeriodNode period;
  final String periodName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tCall = EngineCall('time.local', {'timezone': birth.timezone, 'utcIso': period.start.toUtc().toIso8601String()});
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(tCall)),
      onRetry: () => ref.invalidate(engineCallProvider(tCall)),
      builder: (t) {
        final date = asStr(t['date']), time = asStr(t['time']);
        final off = asInt(t['utcOffsetMinutes']) ?? 0;
        final moment = birth.copyWith(name: 'Dasha Pravesh: $periodName', date: date, time: time);
        final cCall = EngineCall('chart.compute', {'birth': moment.toJson()});
        return AsyncView<JsonMap>(
          value: ref.watch(engineCallProvider(cCall)),
          skeleton: const ChartSkeleton(),
          onRetry: () => ref.invalidate(engineCallProvider(cCall)),
          builder: (cj) => _chart(context, ref, ChartResult(cj), date, time, off),
        );
      },
    );
  }

  Widget _chart(BuildContext context, WidgetRef ref, ChartResult c, String date, String time, int off) {
    final style = ref.watch(chartStyleProvider);
    final pal = context.palette;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionCard(
        key: const ValueKey('pravesh-header'),
        title: 'Chart at period start',
        subtitle: periodName,
        child: KeyValueGrid(items: [
          ('Local time', '${civilDate(date)} $time (${offsetLabel(off)})'),
          ('UTC', '${period.start.toUtc().toIso8601String().replaceFirst('T', ' ').split('.').first} UTC'),
          ('Place', birth.placeName ?? latLon(birth.latitude, birth.longitude)),
          ('Lagna', '${c.rasi.ascendant.sign} ${dms(c.rasi.ascendant.degree)}'),
        ]),
      ),
      const SizedBox(height: Gap.lg),
      LayoutBuilder(builder: (context, k) {
        final size = math.min((k.maxWidth - Gap.lg) / 2 - 40, 440.0).clamp(220.0, 440.0);
        Widget card(String title, ChartData d) => SizedBox(
              width: size + 40,
              child: SectionCard(title: title, child: Center(child: ChartView(data: d, style: style, size: size, showTitle: false, showLegend: true))),
            );
        return Wrap(spacing: Gap.lg, runSpacing: Gap.lg, children: [
          card('Rasi (D1) at period start', ChartData.fromNormalized('Rasi', c.rasi)),
          card('Navamsa (D9) at period start', ChartData.fromNormalized('Navamsa', c.navamsa, showDegrees: false)),
        ]);
      }),
      const SizedBox(height: Gap.lg),
      SectionCard(
        title: 'Planets at period start',
        child: SimpleTable(
          columns: const ['Planet', 'Sign', 'Degree', 'Nakshatra', 'Pada', 'House', 'Retrograde'],
          numericColumns: const {4, 5},
          rows: [
            ['Lagna', c.rasi.ascendant.sign, dms(c.rasi.ascendant.degree), c.rasi.ascendant.nakshatra, '${c.rasi.ascendant.pada}', '1', ''],
            for (final name in planetOrder)
              for (final p in c.rasi.planets.where((x) => x.name == name))
                [planetName(p.name), p.sign, dms(p.degree), p.nakshatra, '${p.pada}', '${p.house}', p.retrograde ? 'R' : ''],
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.only(top: Gap.sm),
        child:
            Text('Cast for the birth place; the period start instant is the one reported by the engine.', style: TextStyle(fontSize: 12, color: pal.textMuted)),
      ),
    ]);
  }
}
