import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';
import '../util/format.dart';
import 'chart_data.dart';
import 'chart_geometry.dart';

/// Square Indian-style chart drawn with a CustomPainter (vector, crisp at any size).
///
/// Interactive: hovering a house shows its occupants with degrees and nakshatras (engine
/// values); right-click offers "Show details" and copy commands.
class ChartView extends StatefulWidget {
  const ChartView({super.key, required this.data, required this.style, this.size, this.showTitle = true, this.showLegend = false, this.interactive = true});
  final ChartData data;
  final ChartStyle style;
  final double? size;
  final bool showTitle;
  final bool showLegend;
  final bool interactive;

  @override
  State<ChartView> createState() => _ChartViewState();
}

class _ChartViewState extends State<ChartView> {
  final _tip = OverlayPortalController();
  int? _hoverSign;
  Offset _hoverGlobal = Offset.zero;

  int? _signAt(Offset local, Size size) {
    final s = math.min(size.width, size.height);
    final origin = Offset((size.width - s) / 2, (size.height - s) / 2);
    final q = (local - origin) / s;
    if (q.dx < 0 || q.dy < 0 || q.dx > 1 || q.dy > 1) return null;
    return buildLayout(widget.style, widget.data.ascSign).signAt(Pt(q.dx, q.dy));
  }

  void _onHover(PointerHoverEvent e, Size size) {
    final sign = _signAt(e.localPosition, size);
    setState(() {
      _hoverSign = sign;
      _hoverGlobal = e.position;
    });
    if (sign != null) {
      _tip.show();
    } else {
      _tip.hide();
    }
  }

  void _onExit() {
    _tip.hide();
    setState(() => _hoverSign = null);
  }

  String _cellText(int sign) {
    final items = widget.data.bodies[sign] ?? const <ChartBody>[];
    final house = houseOfSign(sign, widget.data.ascSign);
    return '${signNames[sign - 1]} · house $house\n${items.isEmpty ? 'No planets' : items.map((b) => b.detail ?? b.text).join('\n')}';
  }

  Future<void> _contextMenu(Offset global, Offset local, Size size) async {
    _tip.hide();
    final sign = _signAt(local, size);
    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    final choice = await showMenu<String>(
      context: context,
      position: RelativeRect.fromRect(global & const Size(1, 1), Offset.zero & overlay.size),
      items: [
        if (sign != null) PopupMenuItem(value: 'details', child: Text('Show details for ${signNames[sign - 1]}…')),
        if (sign != null) const PopupMenuItem(value: 'copyCell', child: Text('Copy this house')),
        const PopupMenuItem(value: 'copyAll', child: Text('Copy whole chart as text')),
      ],
    );
    if (!mounted) return;
    switch (choice) {
      case 'details':
        await showDialog<void>(context: context, builder: (_) => _CellDetailsDialog(data: widget.data, sign: sign!));
      case 'copyCell':
        await Clipboard.setData(ClipboardData(text: _cellText(sign!)));
        _toast('House copied');
      case 'copyAll':
        await Clipboard.setData(ClipboardData(text: widget.data.asText()));
        _toast('Chart copied as text');
    }
  }

  void _toast(String m) => ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(m), duration: const Duration(seconds: 2)));

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final painterWidget = LayoutBuilder(builder: (context, c) {
      final size = Size(c.maxWidth, c.maxHeight);
      final paint = CustomPaint(
        size: size,
        painter: ChartPainter(data: widget.data, style: widget.style, palette: pal, hoverSign: _hoverSign, baseStyle: DefaultTextStyle.of(context).style),
      );
      if (!widget.interactive) return paint;
      return MouseRegion(
        onHover: (e) => _onHover(e, size),
        onExit: (_) => _onExit(),
        child: GestureDetector(
          onSecondaryTapUp: (d) => _contextMenu(d.globalPosition, d.localPosition, size),
          onLongPressStart: (d) => _contextMenu(d.globalPosition, d.localPosition, size),
          child: paint,
        ),
      );
    });

    final chart = AspectRatio(
      aspectRatio: 1,
      child: Semantics(
        label: '${widget.data.title} chart, ${widget.style.label} style',
        child: OverlayPortal(
          controller: _tip,
          overlayChildBuilder: (ctx) {
            final sign = _hoverSign;
            if (sign == null) return const SizedBox.shrink();
            final screen = MediaQuery.sizeOf(ctx);
            const w = 300.0;
            final left = math.min(_hoverGlobal.dx + 16, screen.width - w - 8);
            final top = math.min(_hoverGlobal.dy + 16, screen.height - 160);
            return Positioned(left: left, top: top, width: w, child: IgnorePointer(child: _HoverCard(data: widget.data, sign: sign)));
          },
          child: painterWidget,
        ),
      ),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (widget.showTitle)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              widget.data.subtitle == null ? widget.data.title : '${widget.data.title} — ${widget.data.subtitle}',
              style: TextStyle(fontWeight: FontWeight.w600, color: pal.heading, fontSize: 13),
            ),
          ),
        if (widget.size != null) SizedBox(width: widget.size, height: widget.size, child: chart) else Flexible(child: chart),
        if (widget.showLegend) Padding(padding: const EdgeInsets.only(top: 8), child: SizedBox(width: widget.size, child: ChartLegend(data: widget.data))),
      ],
    );
  }
}

class _HoverCard extends StatelessWidget {
  const _HoverCard({required this.data, required this.sign});
  final ChartData data;
  final int sign;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final items = data.bodies[sign] ?? const <ChartBody>[];
    final house = houseOfSign(sign, data.ascSign);
    return Material(
      color: pal.card,
      elevation: 6,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(side: BorderSide(color: pal.border), borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text('${signNames[sign - 1]} · house $house${house == 1 ? ' (Lagna)' : ''}', style: TextStyle(fontWeight: FontWeight.w700, color: pal.heading, fontSize: 13)),
          const SizedBox(height: 4),
          if (items.isEmpty) Text('No planets', style: TextStyle(color: pal.textMuted, fontSize: 12.5)),
          for (final b in items)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(b.detail ?? b.text, style: TextStyle(fontSize: 12.5, color: b.retrograde ? pal.retro : pal.text, fontFeatures: tabularFigures)),
            ),
          const SizedBox(height: 4),
          Text('Right-click for details and copy', style: TextStyle(fontSize: 11, color: pal.textMuted)),
        ]),
      ),
    );
  }
}

class _CellDetailsDialog extends StatelessWidget {
  const _CellDetailsDialog({required this.data, required this.sign});
  final ChartData data;
  final int sign;
  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final items = data.bodies[sign] ?? const <ChartBody>[];
    final house = houseOfSign(sign, data.ascSign);
    return AlertDialog(
      title: Text('${signNames[sign - 1]} — house $house'),
      content: SizedBox(
        width: 460,
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${data.title}${data.subtitle == null ? '' : ' (${data.subtitle})'}', style: TextStyle(color: pal.textMuted)),
          const SizedBox(height: Gap.md),
          if (items.isEmpty) const Text('No planets in this house.'),
          for (final b in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SizedBox(width: 48, child: Text(b.text.split(' ').first, style: TextStyle(fontWeight: FontWeight.w700, color: b.highlight ? pal.accentText : pal.heading))),
                Expanded(child: SelectableText(b.detail ?? b.text, style: TextStyle(fontFeatures: tabularFigures, color: b.retrograde ? pal.retro : pal.text))),
              ]),
            ),
        ]),
      ),
      actions: [
        TextButton(
          onPressed: () => Clipboard.setData(ClipboardData(text: items.map((b) => b.detail ?? b.text).join('\n'))),
          child: const Text('Copy'),
        ),
        FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
      ],
    );
  }
}

/// Key to the abbreviations used in charts.
class ChartLegend extends StatelessWidget {
  const ChartLegend({super.key, required this.data});
  final ChartData data;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final codes = <String>{for (final l in data.bodies.values) for (final b in l) if (b.code != null) b.code!};
    final hasRetro = data.bodies.values.any((l) => l.any((b) => b.retrograde));
    final st = TextStyle(fontSize: 11.5, color: pal.textMuted);
    Widget item(String a, String label, {Color? color}) => Text.rich(
          TextSpan(children: [
            TextSpan(text: a, style: TextStyle(fontWeight: FontWeight.w700, color: color ?? pal.text)),
            TextSpan(text: ' $label'),
          ]),
          style: st,
        );
    return Wrap(spacing: 10, runSpacing: 2, alignment: WrapAlignment.center, children: [
      if (codes.contains('LAGNA')) item('As', 'Lagna', color: pal.accentText),
      for (final p in planetOrder)
        if (codes.contains(p)) item(abbr(p), planetName(p)),
      if (hasRetro) item('R', 'retrograde', color: pal.retro),
    ]);
  }
}

class ChartPainter extends CustomPainter {
  ChartPainter({required this.data, required this.style, AppPalette? palette, this.hoverSign, this.baseStyle}) : palette = palette ?? AppPalette.light;
  /// The app's text style (font family); sizes and colours are set per label.
  final TextStyle? baseStyle;
  TextStyle _st(TextStyle s) => (baseStyle ?? const TextStyle()).merge(s).copyWith(height: 1.15, decoration: TextDecoration.none);
  final ChartData data;
  final ChartStyle style;
  final AppPalette palette;
  final int? hoverSign;

  @override
  void paint(Canvas canvas, Size size) {
    final pal = palette;
    final s = math.min(size.width, size.height);
    final origin = Offset((size.width - s) / 2, (size.height - s) / 2);
    Offset at(Pt p) => origin + Offset(p.x * s, p.y * s);
    Path poly(List<Pt> pts) {
      final path = Path()..moveTo(at(pts.first).dx, at(pts.first).dy);
      for (final p in pts.skip(1)) {
        path.lineTo(at(p).dx, at(p).dy);
      }
      return path..close();
    }

    final layout = buildLayout(style, data.ascSign);

    canvas.drawRect(Rect.fromLTWH(origin.dx, origin.dy, s, s), Paint()..color = pal.chartBg);

    // Lagna highlight (the ascendant sign's cell) and hover highlight.
    final asc = layout.cellForSign(data.ascSign);
    if (asc.polygon.isNotEmpty) canvas.drawPath(poly(asc.polygon), Paint()..color = pal.lagnaFill);
    if (hoverSign != null) {
      final h = layout.cellForSign(hoverSign!);
      if (h.polygon.isNotEmpty) canvas.drawPath(poly(h.polygon), Paint()..color = pal.accent.withValues(alpha: 0.12));
    }

    final line = Paint()
      ..color = pal.chartLine
      ..strokeWidth = math.max(1.0, s / 340)
      ..style = PaintingStyle.stroke
      ..isAntiAlias = true;
    for (final seg in layout.lines) {
      canvas.drawLine(at(seg.a), at(seg.b), line);
    }
    canvas.drawRect(Rect.fromLTWH(origin.dx, origin.dy, s, s), Paint()
      ..color = pal.chartLine
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1.5, s / 200));
    if (layout.ascMarker != null) {
      canvas.drawLine(at(layout.ascMarker!.a), at(layout.ascMarker!.b), Paint()
        ..color = pal.accentText
        ..strokeCap = StrokeCap.round
        ..strokeWidth = math.max(1.5, s / 160));
    }

    // Title in the empty centre of South / East charts.
    if (style != ChartStyle.north && s >= 150) {
      _text(canvas, data.title, at(const Pt(0.5, 0.48)), s / 24, pal.heading, FontWeight.w600);
      if (data.subtitle != null && s >= 260) _text(canvas, data.subtitle!, at(const Pt(0.5, 0.55)), s / 40, pal.textMuted, FontWeight.w400);
    }

    final base = s / 23;
    for (final cell in layout.cells) {
      // sign number (North) or short sign name (South/East)
      final label = style == ChartStyle.north ? '${cell.sign}' : signShort[cell.sign - 1];
      _text(canvas, label, at(cell.signLabelAnchor), base * 0.64, pal.textMuted, FontWeight.w500);

      final items = data.bodies[cell.sign] ?? const <ChartBody>[];
      if (items.isEmpty) continue;
      final perRow = items.length > 4 ? 3 : (items.length > 2 ? 2 : 1);
      final rows = <List<ChartBody>>[];
      for (var i = 0; i < items.length; i += perRow) {
        rows.add(items.sublist(i, math.min(i + perRow, items.length)));
      }
      final fontSize = base * cell.capacity.clamp(0.6, 1.0) * (rows.length > 2 ? 0.82 : 1.0) * (perRow > 1 ? 0.88 : 1.0);
      final lineH = fontSize * 1.28;
      final top = at(cell.anchor).dy - lineH * rows.length / 2 + lineH / 2;
      for (var r = 0; r < rows.length; r++) {
        final spans = <InlineSpan>[];
        for (var k = 0; k < rows[r].length; k++) {
          final b = rows[r][k];
          if (k > 0) spans.add(const TextSpan(text: '  '));
          final color = b.highlight ? pal.accentText : (b.retrograde ? pal.retro : pal.text);
          spans.add(TextSpan(text: b.text, style: TextStyle(color: color, fontWeight: b.highlight ? FontWeight.w700 : FontWeight.w600)));
          if (b.retrograde) spans.add(TextSpan(text: 'R', style: TextStyle(color: color, fontSize: fontSize * 0.68, fontWeight: FontWeight.w700)));
        }
        final tp = TextPainter(
          text: TextSpan(style: _st(TextStyle(fontSize: fontSize, fontFeatures: tabularFigures)), children: spans),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(canvas, Offset(at(cell.anchor).dx - tp.width / 2, top + r * lineH - tp.height / 2));
      }
    }
  }

  void _text(Canvas canvas, String text, Offset center, double size, Color color, FontWeight weight) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: _st(TextStyle(fontSize: size, color: color, fontWeight: weight))),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(covariant ChartPainter old) => old.baseStyle != baseStyle || old.data != data || old.style != style || old.palette != palette || old.hoverSign != hoverSign;
}
