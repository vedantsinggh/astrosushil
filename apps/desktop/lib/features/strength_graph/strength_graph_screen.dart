import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';
import 'strength_graph_models.dart';

/// Shadbala and Bhava Bala bar graphs over `strength.compute` (values drawn as returned by the
/// engine; nothing is calculated here beyond scaling bars to the largest value).
class StrengthGraphScreen extends ConsumerWidget {
  const StrengthGraphScreen({super.key, required this.birth});
  final BirthInput birth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final call = EngineCall('strength.compute', {'birth': birth.toJson()});
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(call)),
      onRetry: () => ref.invalidate(engineCallProvider(call)),
      builder: (j) {
        final g = StrengthGraphData.fromJson(j);
        return PageBody(children: [
          Align(alignment: Alignment.centerRight, child: ExportButtons(tables: () => g.exportTables(), fileStem: 'Strength_graphs')),
          SectionCard(
            title: 'Shadbala: total vs required minimum (rupas)',
            subtitle: 'Bar = total Shadbala; marker = the minimum the engine reports for that planet',
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _Legend(items: [
                (context.palette.success, 'Total (meets minimum)'),
                (context.palette.error, 'Total (below minimum)'),
                (context.palette.heading, 'Required minimum'),
              ]),
              const SizedBox(height: Gap.sm),
              SizedBox(
                height: 260,
                child: BarGraph(
                  key: const ValueKey('shadbala-total-graph'),
                  axisLabel: 'Rupas',
                  groups: [
                    for (final p in g.planets)
                      BarGroup(
                          label: abbr(p.planet),
                          tooltip: '${planetName(p.planet)}: ${fixed(p.totalRupas)} rupas (required ${fixed(p.requiredRupas)})',
                          segments: [
                            BarSegment(p.totalRupas, p.isStrong ? context.palette.success : context.palette.error),
                          ],
                          marker: p.requiredRupas),
                  ],
                ),
              ),
            ]),
          ),
          SectionCard(
            title: 'Shadbala components (shashtiamsas)',
            subtitle: 'Stacked by the six components; negative Drik Bala is drawn below zero',
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _Legend(items: [for (var i = 0; i < shadbalaComponents.length; i++) (componentColor(context, i), shadbalaComponents[i])]),
              const SizedBox(height: Gap.sm),
              SizedBox(
                height: 300,
                child: BarGraph(
                  key: const ValueKey('shadbala-components-graph'),
                  axisLabel: 'Shashtiamsas',
                  groups: [
                    for (final p in g.planets)
                      BarGroup(
                        label: abbr(p.planet),
                        tooltip: [
                          planetName(p.planet),
                          for (var i = 0; i < shadbalaComponents.length; i++) '${shadbalaComponents[i]}: ${fixed(p.components[i])}',
                          'Total: ${fixed(p.totalShashtiamsas)}',
                        ].join('\n'),
                        segments: [for (var i = 0; i < p.components.length; i++) BarSegment(p.components[i], componentColor(context, i))],
                      ),
                  ],
                ),
              ),
              const SizedBox(height: Gap.md),
              SimpleTable(showActions: false, 
                columns: g.shadbalaTable.columns,
                rows: g.shadbalaTable.rows,
                numericColumns: {for (var i = 1; i < g.shadbalaTable.columns.length - 1; i++) i},
              ),
            ]),
          ),
          SectionCard(
            title: 'Bhava Bala (12 houses, rupas)',
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _Legend(items: [(context.palette.accent, 'Bhava Bala total')]),
              const SizedBox(height: Gap.sm),
              SizedBox(
                height: 240,
                child: BarGraph(
                  key: const ValueKey('bhava-bala-graph'),
                  axisLabel: 'Rupas',
                  groups: [
                    for (final h in g.houses)
                      BarGroup(
                        label: 'H${h.house}',
                        tooltip: 'House ${h.house} (${h.sign}, lord ${planetName(h.lord)}): ${fixed(h.rupas)} rupas, rank ${h.rank}',
                        segments: [BarSegment(h.rupas, context.palette.accent)],
                      ),
                  ],
                ),
              ),
              const SizedBox(height: Gap.md),
              SimpleTable(showActions: false, columns: g.bhavaTable.columns, rows: g.bhavaTable.rows, numericColumns: const {3, 4, 5}),
            ]),
          ),
        ]);
      },
    );
  }
}

/// One segment of a bar (stacked bottom-up for positives, downward for negatives).
class BarSegment {
  const BarSegment(this.value, this.color);
  final double value;
  final Color color;
}

class BarGroup {
  const BarGroup({required this.label, required this.segments, this.marker, this.tooltip});
  final String label;
  final List<BarSegment> segments;

  /// Optional reference value drawn as a horizontal tick across the bar.
  final double? marker;
  final String? tooltip;
}

/// A small, theme-aware stacked bar graph with a y axis, gridlines and per-bar tooltips.
class BarGraph extends StatelessWidget {
  const BarGraph({super.key, required this.groups, required this.axisLabel});
  final List<BarGroup> groups;
  final String axisLabel;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    var maxV = 0.0, minV = 0.0;
    for (final g in groups) {
      var pos = 0.0, neg = 0.0;
      for (final s in g.segments) {
        if (s.value >= 0) {
          pos += s.value;
        } else {
          neg += s.value;
        }
      }
      maxV = math.max(maxV, math.max(pos, g.marker ?? 0));
      minV = math.min(minV, neg);
    }
    final step = niceStep((maxV - minV) / 5);
    final top = (maxV / step).ceil() * step;
    final bottom = (minV / step).floor() * step;
    final range = (top - bottom) == 0 ? 1.0 : top - bottom;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(axisLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: pal.textMuted)),
      const SizedBox(height: 6),
      Expanded(child: _plot(context, top, bottom, step, range)),
    ]);
  }

  Widget _plot(BuildContext context, double top, double bottom, double step, double range) {
    final pal = context.palette;
    const axisW = 56.0, labelH = 22.0;
    return LayoutBuilder(builder: (context, c) {
      final plotH = c.maxHeight - labelH;
      final plotW = c.maxWidth - axisW;
      double y(double v) => (top - v) / range * plotH;
      final slot = groups.isEmpty ? 0.0 : plotW / groups.length;
      final barW = math.min(44.0, slot * 0.6);
      final tickStyle = TextStyle(fontSize: 11, color: pal.textMuted, fontFeatures: tabularFigures);
      return Stack(clipBehavior: Clip.none, children: [
        Positioned.fill(
            child: CustomPaint(painter: _GridPainter(top: top, bottom: bottom, step: step, axisW: axisW, plotH: plotH, line: pal.border, zero: pal.textMuted))),
        for (var v = bottom; v <= top + 1e-9; v += step)
          Positioned(left: 0, width: axisW - 6, top: y(v) - 7, child: Text(_tick(v), textAlign: TextAlign.right, style: tickStyle)),
        for (var i = 0; i < groups.length; i++) ...[
          Positioned(
            left: axisW + slot * i + (slot - barW) / 2,
            width: barW,
            top: 0,
            height: plotH,
            child: Tooltip(
              message: groups[i].tooltip ?? groups[i].label,
              child: CustomPaint(painter: _BarPainter(group: groups[i], y: y, markerColor: pal.heading)),
            ),
          ),
          Positioned(
            left: axisW + slot * i,
            width: slot,
            top: plotH + 4,
            child: Text(groups[i].label, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: pal.text, fontWeight: FontWeight.w600)),
          ),
        ],
      ]);
    });
  }

  static String _tick(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1);
}

/// 1/2/5 × 10^n step for axis ticks (display scaling only).
double niceStep(double raw) {
  if (raw <= 0 || !raw.isFinite) return 1;
  final mag = math.pow(10, (math.log(raw) / math.ln10).floor()).toDouble();
  final f = raw / mag;
  final n = f <= 1 ? 1 : (f <= 2 ? 2 : (f <= 5 ? 5 : 10));
  return n * mag;
}

class _GridPainter extends CustomPainter {
  _GridPainter({required this.top, required this.bottom, required this.step, required this.axisW, required this.plotH, required this.line, required this.zero});
  final double top, bottom, step, axisW, plotH;
  final Color line, zero;

  @override
  void paint(Canvas canvas, Size size) {
    final range = (top - bottom) == 0 ? 1.0 : top - bottom;
    final p = Paint()..strokeWidth = 1;
    for (var v = bottom; v <= top + 1e-9; v += step) {
      final y = (top - v) / range * plotH;
      p.color = v.abs() < 1e-9 ? zero : line;
      canvas.drawLine(Offset(axisW, y), Offset(size.width, y), p);
    }
    p.color = zero;
    canvas.drawLine(Offset(axisW, 0), Offset(axisW, plotH), p);
  }

  @override
  bool shouldRepaint(_GridPainter old) => old.top != top || old.bottom != bottom || old.line != line || old.plotH != plotH;
}

class _BarPainter extends CustomPainter {
  _BarPainter({required this.group, required this.y, required this.markerColor});
  final BarGroup group;
  final double Function(double) y;
  final Color markerColor;

  @override
  void paint(Canvas canvas, Size size) {
    var pos = 0.0, neg = 0.0;
    for (final s in group.segments) {
      final from = s.value >= 0 ? pos : neg;
      final to = from + s.value;
      if (s.value >= 0) {
        pos = to;
      } else {
        neg = to;
      }
      final r = Rect.fromLTRB(0, math.min(y(from), y(to)), size.width, math.max(y(from), y(to)));
      canvas.drawRect(r, Paint()..color = s.color);
    }
    final m = group.marker;
    if (m != null) {
      final my = y(m);
      canvas.drawLine(
          Offset(-6, my),
          Offset(size.width + 6, my),
          Paint()
            ..color = markerColor
            ..strokeWidth = 2.5);
    }
  }

  @override
  bool shouldRepaint(_BarPainter old) => true;
}

/// Colour for the i-th Shadbala component (derived from theme tokens so both themes work).
Color componentColor(BuildContext context, int i) {
  final pal = context.palette;
  final base = [pal.accent, pal.success, pal.warning, pal.retro, pal.heading, pal.error];
  return base[i % base.length].withValues(alpha: 0.85);
}

class _Legend extends StatelessWidget {
  const _Legend({required this.items});
  final List<(Color, String)> items;

  @override
  Widget build(BuildContext context) => Wrap(spacing: Gap.lg, runSpacing: Gap.xs, children: [
        for (final (c, label) in items)
          Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 12, height: 12, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(2))),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 12, color: context.palette.text)),
          ]),
      ]);
}
