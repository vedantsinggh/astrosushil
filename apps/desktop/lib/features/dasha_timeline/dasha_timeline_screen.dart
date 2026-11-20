import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/engine/models.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';
import 'dasha_timeline_models.dart';

/// Life timeline of mahadashas with antardasha bands beneath, a "now" marker and a zoomed view
/// of one selected mahadasha. Periods and dates come from `dasha.compute` unchanged.
class DashaTimelineScreen extends ConsumerStatefulWidget {
  const DashaTimelineScreen({super.key, required this.birth, this.initialSystem = 'VIMSHOTTARI', this.now});
  final BirthInput birth;
  final String initialSystem;

  /// The instant marked as "now" (defaults to the current time; tests pass a fixed value).
  final DateTime? now;

  @override
  ConsumerState<DashaTimelineScreen> createState() => _DashaTimelineScreenState();
}

class _DashaTimelineScreenState extends ConsumerState<DashaTimelineScreen> {
  late String _system = widget.initialSystem;
  int? _selected;

  @override
  Widget build(BuildContext context) {
    final call = dashaCall(widget.birth, _system);
    final now = (widget.now ?? DateTime.now()).toUtc();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
        child: ControlBar(children: [
          const Text('Dasha system'),
          DropdownButton<String>(
            key: const ValueKey('dasha-system'),
            value: _system,
            items: [for (final e in dashaSystemLabels.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
            onChanged: (v) => setState(() {
              if (v != null) _system = v;
              _selected = null;
            }),
          ),
        ]),
      ),
      Expanded(
        child: AsyncView<JsonMap>(
          value: ref.watch(engineCallProvider(call)),
          onRetry: () => ref.invalidate(engineCallProvider(call)),
          builder: (j) => _body(context, DashaResultModel(j), now),
        ),
      ),
    ]);
  }

  Widget _body(BuildContext context, DashaResultModel r, DateTime now) {
    if (!r.isEligible || r.periods.isEmpty) {
      return EmptyState(
        icon: Icons.timeline_outlined,
        title: 'No periods for ${dashaSystemLabels[_system] ?? _system}',
        message: r.eligibilityReason ?? 'The engine returned no periods for this chart.',
      );
    }
    final mds = r.periods;
    final current = indexAt(mds, now);
    final sel = (_selected != null && _selected! < mds.length) ? _selected! : (current ?? 0);
    final md = mds[sel];
    final offset = r.utcOffsetMinutes;
    final lifeStart = mds.first.start, lifeEnd = mds.last.end;
    final nowInRange = !now.isBefore(lifeStart) && now.isBefore(lifeEnd);
    return PageBody(children: [
      SectionCard(
        title: 'Life timeline',
        subtitle: 'Mahadashas (top) with antardasha bands beneath. Hover for dates; tap a mahadasha to zoom.',
        trailing: ExportButtons(
            tables: () => [_table(mds, offset, 'Mahadashas'), _table(md.children, offset, '${longLabel(md)} antardashas')], fileStem: 'Dasha_timeline'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _Timeline(
            from: lifeStart,
            to: lifeEnd,
            now: now,
            rows: [
              _Row(
                  periods: mds,
                  height: 40,
                  keyPrefix: 'md',
                  levelName: 'mahadasha',
                  offset: offset,
                  selected: sel,
                  onTap: (i) => setState(() => _selected = i)),
              _Row(
                periods: [for (final m in mds) ...m.children],
                keys: [
                  for (var i = 0; i < mds.length; i++)
                    for (var k = 0; k < mds[i].children.length; k++) 'ad-$i-$k'
                ],
                height: 18,
                keyPrefix: 'ad',
                levelName: 'antardasha',
                offset: offset,
                showLabels: false,
              ),
            ],
          ),
          const SizedBox(height: Gap.sm),
          Text(
            nowInRange
                ? 'Now: ${localDate(now, offset)}'
                : 'Now (${localDate(now, offset)}) is outside the computed range ${localDate(lifeStart, offset)} – ${localDate(lifeEnd, offset)}.',
            style: TextStyle(fontSize: 12, color: context.palette.textMuted),
          ),
        ]),
      ),
      SectionCard(
        key: const ValueKey('zoom-card'),
        title: '${longLabel(md)} mahadasha: ${periodRange(md, offset)}',
        subtitle: 'Antardashas within the selected mahadasha',
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (md.children.isEmpty)
            const Note('The engine returned no antardashas for this period.')
          else
            _Timeline(
              from: md.start,
              to: md.end,
              now: now,
              rows: [_Row(periods: md.children, height: 46, keyPrefix: 'zoom-ad', levelName: 'antardasha', offset: offset)],
            ),
          const SizedBox(height: Gap.md),
          SimpleTable(showActions: false, 
            columns: _table(md.children, offset, '').columns,
            rows: _table(md.children, offset, '').rows,
            numericColumns: const {3},
            highlightRows: {if (indexAt(md.children, now) != null) indexAt(md.children, now)!},
          ),
        ]),
      ),
      SectionCard(
        title: 'Mahadashas',
        child: SimpleTable(showActions: false, 
          columns: _table(mds, offset, '').columns,
          rows: _table(mds, offset, '').rows,
          numericColumns: const {3},
          highlightRows: {sel},
          selectedRow: sel,
          onRowTap: (i) => setState(() => _selected = i),
        ),
      ),
    ]);
  }

  ExportTable _table(List<DashaPeriodNode> list, int offset, String title) => ExportTable(
        title: title,
        subtitle: dashaSystemLabels[_system] ?? _system,
        columns: const ['Period', 'Start', 'End', 'Years'],
        rows: [
          for (final p in list) [longLabel(p), localDateTime(p.start, offset), localDateTime(p.end, offset), p.durationYears.toStringAsFixed(2)]
        ],
      );
}

class _Row {
  const _Row({
    required this.periods,
    required this.height,
    required this.keyPrefix,
    required this.levelName,
    required this.offset,
    this.keys,
    this.selected,
    this.onTap,
    this.showLabels = true,
  });
  final List<DashaPeriodNode> periods;
  final List<String>? keys;
  final double height;
  final String keyPrefix;
  final String levelName;
  final int offset;
  final int? selected;
  final ValueChanged<int>? onTap;
  final bool showLabels;
}

/// Horizontal time axis [from, to] with one or more bands of periods, year ticks and a now line.
class _Timeline extends StatelessWidget {
  const _Timeline({required this.from, required this.to, required this.now, required this.rows});
  final DateTime from, to, now;
  final List<_Row> rows;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final b = Theme.of(context).brightness;
    final span = math.max(1, to.difference(from).inSeconds).toDouble();
    const gap = 4.0, axisH = 20.0;
    final bandsH = rows.fold<double>(0, (a, r) => a + r.height + gap);
    return LayoutBuilder(builder: (context, c) {
      final w = c.maxWidth;
      double x(DateTime t) => (t.difference(from).inSeconds / span).clamp(0.0, 1.0) * w;
      final children = <Widget>[];
      var top = 0.0;
      for (final row in rows) {
        for (var i = 0; i < row.periods.length; i++) {
          final p = row.periods[i];
          final left = x(p.start), width = math.max(1.0, x(p.end) - left);
          final selected = row.selected == i;
          final label = shortLabel(p);
          children.add(Positioned(
            left: left,
            top: top,
            width: width,
            height: row.height,
            child: Tooltip(
              message: periodTooltip(p, row.offset, row.levelName),
              waitDuration: const Duration(milliseconds: 250),
              child: GestureDetector(
                key: ValueKey(row.keys?[i] ?? '${row.keyPrefix}-$i'),
                onTap: row.onTap == null ? null : () => row.onTap!(i),
                child: Container(
                  decoration: BoxDecoration(
                    color: periodColor(p, b),
                    border: Border.all(color: selected ? pal.heading : pal.card, width: selected ? 2 : 0.6),
                  ),
                  alignment: Alignment.center,
                  child: row.showLabels && width > label.length * 7.0 + 6
                      ? Text(label, maxLines: 1, overflow: TextOverflow.clip, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: pal.text))
                      : null,
                ),
              ),
            ),
          ));
        }
        top += row.height + gap;
      }
      // Year ticks (display only): about 8-12 labels across the width.
      final years = to.year - from.year + 1;
      final every = [1, 2, 5, 10, 20, 25, 50].firstWhere((s) => years / s <= 12, orElse: () => 100);
      for (var y = (from.year ~/ every + 1) * every; y <= to.year; y += every) {
        final tx = x(DateTime.utc(y));
        children.add(Positioned(left: tx, top: bandsH - gap, width: 1, height: 5, child: ColoredBox(color: pal.textMuted)));
        children.add(Positioned(
          left: tx - 20,
          width: 40,
          top: bandsH + 2,
          child: Text('$y', textAlign: TextAlign.center, style: TextStyle(fontSize: 10.5, color: pal.textMuted, fontFeatures: tabularFigures)),
        ));
      }
      if (!now.isBefore(from) && now.isBefore(to)) {
        final nx = x(now);
        children.add(Positioned(
          key: const ValueKey('now-marker'),
          left: nx - 1,
          top: -4,
          width: 2,
          height: bandsH + 2,
          child: IgnorePointer(child: ColoredBox(color: pal.error)),
        ));
        children.add(Positioned(
          left: math.min(nx + 3, w - 30),
          top: -4,
          child: IgnorePointer(child: Text('now', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: pal.error))),
        ));
      }
      return SizedBox(height: bandsH + axisH, child: Stack(clipBehavior: Clip.none, children: children));
    });
  }
}
