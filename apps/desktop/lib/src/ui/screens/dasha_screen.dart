import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../widgets/common.dart';

const dashaSystems = <String, String>{
  'VIMSHOTTARI': 'Vimshottari (120 y)',
  'ASHTOTTARI': 'Ashtottari (108 y)',
  'YOGINI': 'Yogini (36 y)',
  'KALACHAKRA': 'Kalachakra',
  'CHARA': 'Chara (Jaimini)',
  'NARAYANA': 'Narayana (Jaimini)',
  'STHIRA': 'Sthira',
  'SHOOLA': 'Shoola',
  'DWISAPTATI_SAMA': 'Dwisaptati Sama (72 y)',
  'SHATABDIKA': 'Shatabdika (100 y)',
  'CHATURASEETI_SAMA': 'Chaturaseeti Sama (84 y)',
  'DWADASHOTTARI': 'Dwadashottari (112 y)',
  'PANCHOTTARI': 'Panchottari (105 y)',
};

const levelNames = ['Mahadasha', 'Antardasha', 'Pratyantardasha', 'Sookshma', 'Prana'];

/// Levels fetched eagerly; deeper levels load on demand when a node is expanded.
const eagerLevels = 3;

/// Bar colours per planet lord (presentation only); other labels use a stable fallback hue.
const _lordColors = <String, Color>{
  'SUN': Color(0xFFF2B36B), 'MOON': Color(0xFFB9C7E0), 'MARS': Color(0xFFE38D80), 'MERCURY': Color(0xFF9CCB9A),
  'JUPITER': Color(0xFFF1D27A), 'VENUS': Color(0xFFE9B8D0), 'SATURN': Color(0xFF8E9BC4), 'RAHU': Color(0xFFA8A4B8), 'KETU': Color(0xFFC9A98C),
};

/// Display name: planet names for graha dashas, the engine label otherwise (signs, yoginis).
String dashaLabel(DashaPeriodNode p) => (p.signName == null && p.yoginiName == null && p.lord != null) ? planetName(p.lord!) : titleCase(p.label);

Color dashaColor(DashaPeriodNode p) {
  final c = _lordColors[p.lord];
  if (c != null && p.signName == null) return c;
  final hues = [20.0, 50.0, 90.0, 140.0, 180.0, 210.0, 240.0, 270.0, 300.0, 330.0, 0.0, 120.0];
  return HSLColor.fromAHSL(1, hues[p.label.hashCode.abs() % hues.length], 0.45, 0.75).toColor();
}

class DashaScreen extends ConsumerStatefulWidget {
  const DashaScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  ConsumerState<DashaScreen> createState() => _DashaScreenState();
}

class _DashaScreenState extends ConsumerState<DashaScreen> {
  String system = 'VIMSHOTTARI';
  int levels = 3;

  @override
  Widget build(BuildContext context) {
    final fetch = levels > eagerLevels ? eagerLevels : levels;
    final value = ref.watch(dashaProvider((widget.birth, system, fetch)));
    final birthUtc = ref.watch(chartResultProvider(widget.birth)).valueOrNull?.utc;
    return PageBody(children: [
      ControlBar(children: [
        DropdownButton<String>(
          key: const Key('dasha-system'),
          value: system,
          items: [for (final e in dashaSystems.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
          onChanged: (v) => setState(() => system = v!),
        ),
        DropdownButton<int>(
          key: const Key('dasha-depth'),
          value: levels,
          items: [for (var i = 1; i <= 5; i++) DropdownMenuItem(value: i, child: Text('Show down to: ${levelNames[i - 1]}'))],
          onChanged: (v) => setState(() => levels = v!),
        ),
      ]),
      AsyncView(
        value: value,
        onRetry: () => ref.invalidate(dashaProvider((widget.birth, system, fetch))),
        builder: (d) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (d.isEligible && d.periods.isNotEmpty) ...[
            SectionCard(
              title: 'Timeline',
              subtitle: 'Click a period to see its sub-periods. The gold line is today.',
              child: DashaTimeline(result: d, birthUtc: birthUtc),
            ),
            const SizedBox(height: Gap.lg),
          ],
          DashaTreeView(result: d, birth: widget.birth, levels: levels),
        ]),
      ),
    ]);
  }
}

/// Horizontal bar timeline: mahadashas across life, then the sub-periods of the selected one.
class DashaTimeline extends StatefulWidget {
  const DashaTimeline({super.key, required this.result, this.birthUtc});
  final DashaResultModel result;
  final DateTime? birthUtc;
  @override
  State<DashaTimeline> createState() => _DashaTimelineState();
}

class _DashaTimelineState extends State<DashaTimeline> {
  DashaPeriodNode? _md;
  DashaPeriodNode? _ad;

  DashaPeriodNode? _active(List<DashaPeriodNode> list, DateTime now) => list.where((p) => p.contains(now)).firstOrNull;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now().toUtc();
    final periods = widget.result.periods;
    final md = (_md != null && periods.contains(_md)) ? _md! : (_active(periods, now) ?? periods.first);
    final ad = (_ad != null && md.children.contains(_ad)) ? _ad! : (_active(md.children, now) ?? (md.children.isEmpty ? null : md.children.first));
    final off = widget.result.utcOffsetMinutes;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _BarRow(
        key: const Key('dasha-row-1'),
        title: levelNames[0],
        periods: periods,
        selected: md,
        offset: off,
        ageFrom: widget.birthUtc,
        onTap: (p) => setState(() {
          _md = p;
          _ad = null;
        }),
      ),
      if (md.children.isNotEmpty) ...[
        const SizedBox(height: 10),
        _BarRow(key: const Key('dasha-row-2'), title: '${levelNames[1]} in ${dashaLabel(md)}', periods: md.children, selected: ad, offset: off, onTap: (p) => setState(() => _ad = p)),
      ],
      if (ad != null && ad.children.isNotEmpty) ...[
        const SizedBox(height: 10),
        _BarRow(key: const Key('dasha-row-3'), title: '${levelNames[2]} in ${dashaLabel(md)} / ${dashaLabel(ad)}', periods: ad.children, offset: off),
      ],
    ]);
  }
}

class _BarRow extends StatelessWidget {
  const _BarRow({super.key, required this.title, required this.periods, required this.offset, this.selected, this.onTap, this.ageFrom});
  final String title;
  final List<DashaPeriodNode> periods;
  final DashaPeriodNode? selected;
  final int offset;
  final ValueChanged<DashaPeriodNode>? onTap;
  final DateTime? ageFrom;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final start = periods.first.start, end = periods.last.end;
    final total = end.difference(start).inSeconds.toDouble();
    final now = DateTime.now().toUtc();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.w700, color: pal.heading, fontSize: 13)),
        const Spacer(),
        Text('${localDate(start, offset)} – ${localDate(end, offset)}', style: TextStyle(fontSize: 12, color: pal.textMuted, fontFeatures: tabularFigures)),
      ]),
      const SizedBox(height: 4),
      LayoutBuilder(builder: (context, c) {
        final w = c.maxWidth;
        double x(DateTime t) => (t.difference(start).inSeconds / total).clamp(0.0, 1.0) * w;
        final ages = <(double, int)>[];
        if (ageFrom != null) {
          for (var a = 10; a <= 130; a += 10) {
            final t = DateTime.utc(ageFrom!.year + a, ageFrom!.month, ageFrom!.day);
            if (t.isAfter(start) && t.isBefore(end)) ages.add((x(t), a));
          }
        }
        return SizedBox(
          height: ageFrom != null ? 52 : 36,
          child: Stack(clipBehavior: Clip.none, children: [
            for (final p in periods)
              Positioned(
                left: x(p.start),
                width: (x(p.end) - x(p.start)).clamp(1.0, w),
                top: 0,
                height: 36,
                child: Tooltip(
                  message: '${dashaLabel(p)}  ${localDate(p.start, offset)} – ${localDate(p.end, offset)}\n${p.durationYears.toStringAsFixed(2)} years',
                  child: MouseRegion(
                    cursor: onTap == null ? MouseCursor.defer : SystemMouseCursors.click,
                    child: GestureDetector(
                      onTap: onTap == null ? null : () => onTap!(p),
                      child: AnimatedContainer(
                        duration: Motion.fast,
                        decoration: BoxDecoration(
                          color: dashaColor(p).withValues(alpha: p == selected || selected == null ? 0.95 : 0.55),
                          border: Border.all(color: p == selected ? pal.heading : pal.card, width: p == selected ? 2 : 1),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          (x(p.end) - x(p.start)) > 60 ? dashaLabel(p) : abbr(p.lord ?? dashaLabel(p)),
                          maxLines: 1,
                          overflow: TextOverflow.clip,
                          softWrap: false,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1A1B3A)),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            if (now.isAfter(start) && now.isBefore(end))
              Positioned(left: x(now) - 1.5, top: -4, height: 44, child: Container(width: 3, decoration: BoxDecoration(color: pal.accentText, borderRadius: BorderRadius.circular(2)))),
            for (final (ax, a) in ages)
              Positioned(left: ax - 12, top: 38, child: SizedBox(width: 24, child: Text('$a', textAlign: TextAlign.center, style: TextStyle(fontSize: 10.5, color: pal.textMuted)))),
            if (ages.isNotEmpty) Positioned(right: 0, top: 38, child: Text('age', style: TextStyle(fontSize: 10.5, color: pal.textMuted))),
          ]),
        );
      }),
    ]);
  }
}

class DashaTreeView extends StatelessWidget {
  const DashaTreeView({super.key, required this.result, required this.birth, this.levels = 3});
  final DashaResultModel result;
  final BirthInput birth;
  final int levels;

  @override
  Widget build(BuildContext context) {
    if (!result.isEligible) {
      return SectionCard(
        title: '${dashaSystems[result.system] ?? result.system}: not applicable to this chart',
        child: Text(result.eligibilityReason ?? 'The engine eligibility rule for this system is not met.'),
      );
    }
    final now = DateTime.now().toUtc();
    return SectionCard(
      title: '${dashaSystems[result.system] ?? result.system} — periods',
      subtitle: 'Expand a period to see its sub-periods. The current period is highlighted.',
      trailing: result.balanceAtBirthYears == null ? null : Text('Balance at birth: ${result.balanceAtBirthYears!.toStringAsFixed(3)} y', style: Theme.of(context).textTheme.bodySmall),
      child: Column(children: [
        _header(context),
        for (final p in result.periods) _DashaNode(node: p, now: now, offset: result.utcOffsetMinutes, birth: birth, system: result.system, levels: levels),
      ]),
    );
  }

  Widget _header(BuildContext context) {
    final st = TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: context.palette.heading);
    return Container(
      color: context.palette.tableHeader,
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        const SizedBox(width: 40),
        SizedBox(width: 260, child: Text('Period', style: st)),
        SizedBox(width: 130, child: Text('Starts', style: st)),
        SizedBox(width: 130, child: Text('Ends', style: st)),
        Text('Length', style: st),
      ]),
    );
  }
}

class _DashaNode extends ConsumerWidget {
  const _DashaNode({required this.node, required this.now, required this.offset, required this.birth, required this.system, required this.levels});
  final DashaPeriodNode node;
  final DateTime now;
  final int offset;
  final BirthInput birth;
  final String system;
  final int levels;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final p = node;
    final active = p.contains(now);
    final ts = TextStyle(fontFeatures: tabularFigures, fontSize: 13, color: pal.text);
    final title = Row(children: [
      Container(width: 10, height: 10, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: dashaColor(p), shape: BoxShape.circle)),
      SizedBox(
        width: 250 - 16.0 * (p.level - 1),
        child: Text(dashaLabel(p), style: TextStyle(fontWeight: active ? FontWeight.w700 : FontWeight.w500, color: active ? pal.accentText : pal.text, fontSize: 13.5)),
      ),
      SizedBox(width: 130, child: Text(localDate(p.start, offset), style: ts)),
      SizedBox(width: 130, child: Text(localDate(p.end, offset), style: ts)),
      Text('${p.durationYears.toStringAsFixed(2)} y${p.isBirthDasha ? '  (balance at birth)' : ''}', style: TextStyle(fontSize: 12, color: pal.textMuted, fontFeatures: tabularFigures)),
      if (active) ...[const SizedBox(width: 8), Text('now', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: pal.accentText))],
    ]);

    final lazy = p.level == eagerLevels && levels > eagerLevels;
    final hasChildren = p.children.isNotEmpty || lazy;
    if (!hasChildren || p.level >= levels) {
      return Container(
        color: active ? pal.highlightRow : null,
        padding: EdgeInsets.only(left: 16.0 * p.level + 24, top: 6, bottom: 6),
        child: title,
      );
    }
    return Container(
      decoration: BoxDecoration(border: Border(left: BorderSide(color: active ? pal.accent : Colors.transparent, width: 3))),
      child: ExpansionTile(
        key: PageStorageKey('$system-${p.path.join('.')}'),
        initiallyExpanded: active && p.level == 1,
        dense: true,
        controlAffinity: ListTileControlAffinity.leading,
        tilePadding: EdgeInsets.only(left: 16.0 * (p.level - 1)),
        title: title,
        children: [
          if (lazy)
            _LazyChildren(node: p, now: now, offset: offset, birth: birth, system: system, levels: levels)
          else
            for (final c in p.children) _DashaNode(node: c, now: now, offset: offset, birth: birth, system: system, levels: levels),
        ],
      ),
    );
  }
}

/// Levels 4-5 are fetched only when a level-3 node is opened (`dasha.subPeriods`).
class _LazyChildren extends ConsumerWidget {
  const _LazyChildren({required this.node, required this.now, required this.offset, required this.birth, required this.system, required this.levels});
  final DashaPeriodNode node;
  final DateTime now;
  final int offset;
  final BirthInput birth;
  final String system;
  final int levels;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final v = ref.watch(dashaSubPeriodsProvider((birth, system, levels, jsonEncode(node.path))));
    return AsyncView(
      value: v,
      skeleton: const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator(minHeight: 2)),
      builder: (list) => Column(children: [
        for (final c in list) _DashaNode(node: c, now: now, offset: offset, birth: birth, system: system, levels: levels),
      ]),
    );
  }
}
