import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../src/theme.dart';
import '../../src/util/format.dart';
import 'chakras_models.dart';

/// Same family as the app's Material typography, so painted labels match the rest of the UI.
const _family = 'Roboto';

/// The app fallbacks plus a Devanagari face for the letter and vowel cells.
const _fallback = [...fontFallback, 'Noto Sans Devanagari', 'Lohit Devanagari', 'Mangal', 'Kohinoor Devanagari'];

/// Colours the chakra painters use, taken from the app palette (no hard-coded theme colours).
class ChakraColors {
  ChakraColors.of(BuildContext context)
      : line = context.palette.chartLine,
        bg = context.palette.chartBg,
        text = context.palette.text,
        muted = context.palette.textMuted,
        natal = context.palette.heading,
        transit = context.palette.accent,
        hit = context.palette.warning,
        lagna = context.palette.lagnaFill;
  final Color line, bg, text, muted, natal, transit, hit, lagna;
}

/// Short nakshatra labels so the 9x9 grid stays legible.
const _nakShort = <String, String>{
  'Purva Phalguni': 'P.Phal', 'Uttara Phalguni': 'U.Phal', 'Purva Ashadha': 'P.Ash', 'Uttara Ashadha': 'U.Ash',
  'Purva Bhadrapada': 'P.Bha', 'Uttara Bhadrapada': 'U.Bha', 'Shatabhisha': 'Shatab', 'Mrigashira': 'Mrigas',
};

void _text(Canvas canvas, String s, Offset center, double maxWidth, TextStyle style) {
  final tp = TextPainter(text: TextSpan(text: s, style: style), textAlign: TextAlign.center, textDirection: TextDirection.ltr, maxLines: 2, ellipsis: '…')
    ..layout(maxWidth: maxWidth);
  tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
}

/// 9x9 Sarvatobhadra grid (East at the top, as the engine orients it). Highlights the squares on
/// the [highlight] vedha lines; effective lines are drawn solid, the others faint.
class SarvatobhadraPainter extends CustomPainter {
  SarvatobhadraPainter({required this.data, required this.colors, this.highlight = const [], this.origin});
  final SarvatobhadraData data;
  final ChakraColors colors;
  final List<SbcVedha> highlight;
  final (int, int)? origin;

  @override
  void paint(Canvas canvas, Size size) {
    final side = math.min(size.width, size.height);
    final cs = side / 9;
    final bg = Paint()..color = colors.bg;
    canvas.drawRect(Offset.zero & Size(side, side), bg);

    for (final v in highlight) {
      final fill = Paint()..color = colors.hit.withValues(alpha: v.effective ? 0.30 : 0.10);
      for (final c in v.cells) {
        canvas.drawRect(Rect.fromLTWH(c.col * cs, c.row * cs, cs, cs), fill);
      }
    }
    if (origin != null) {
      canvas.drawRect(Rect.fromLTWH(origin!.$2 * cs, origin!.$1 * cs, cs, cs), Paint()..color = colors.lagna);
    }

    final grid = Paint()
      ..color = colors.line
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (var i = 0; i <= 9; i++) {
      canvas.drawLine(Offset(i * cs, 0), Offset(i * cs, side), grid);
      canvas.drawLine(Offset(0, i * cs), Offset(side, i * cs), grid);
    }
    // Ring outlines, slightly heavier.
    final ring = Paint()
      ..color = colors.line
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    for (var k = 0; k < 4; k++) {
      canvas.drawRect(Rect.fromLTWH(k * cs, k * cs, (9 - 2 * k) * cs, (9 - 2 * k) * cs), ring);
    }

    if (origin != null) {
      for (final v in highlight) {
        if (v.cells.isEmpty || v.direction == 'CORNER_VOWEL') continue;
        final end = v.cells.last;
        final p = Paint()
          ..color = colors.hit.withValues(alpha: v.effective ? 0.95 : 0.35)
          ..strokeWidth = v.effective ? 2.4 : 1.2;
        canvas.drawLine(Offset((origin!.$2 + .5) * cs, (origin!.$1 + .5) * cs), Offset((end.col + .5) * cs, (end.row + .5) * cs), p);
      }
    }

    final labelStyle = TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: colors.text, fontSize: math.max(8, cs * 0.16), height: 1.05);
    final letterStyle = TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: colors.text, fontSize: math.max(10, cs * 0.26), fontWeight: FontWeight.w600);
    for (final c in data.cells) {
      final center = Offset((c.col + .5) * cs, (c.row + .5) * cs);
      final hasPlanets = c.natal.isNotEmpty || c.transit.isNotEmpty;
      final top = hasPlanets ? center - Offset(0, cs * 0.2) : center;
      final String label;
      switch (c.kind) {
        case 'NAKSHATRA':
          label = _nakShort[c.label] ?? c.label;
        case 'TITHI_VARA':
          label = '${c.label}\n${c.weekdays.map((w) => w.substring(0, 3)).join('/')}';
        case 'RASHI':
          label = c.label;
        default:
          label = c.devanagari ?? c.label;
      }
      final isLetter = c.kind == 'VOWEL' || c.kind == 'CONSONANT';
      _text(canvas, label, top, cs - 4, isLetter ? letterStyle : labelStyle);
      if (hasPlanets) {
        final spans = <InlineSpan>[
          for (final p in c.natal) TextSpan(text: '${abbr(p)} ', style: TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: colors.natal, fontWeight: FontWeight.w700)),
          for (final p in c.transit) TextSpan(text: '${abbr(p)} ', style: TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: colors.transit, fontStyle: FontStyle.italic, fontWeight: FontWeight.w700)),
        ];
        final tp = TextPainter(text: TextSpan(children: spans, style: TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, fontSize: math.max(8, cs * 0.17))), textAlign: TextAlign.center, textDirection: TextDirection.ltr, maxLines: 2)
          ..layout(maxWidth: cs - 4);
        tp.paint(canvas, center + Offset(-tp.width / 2, cs * 0.05));
      }
    }
    _text(canvas, 'E', Offset(side / 2, -0.0) + Offset(0, cs * 0.06), cs, TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: colors.muted, fontSize: 9));
  }

  @override
  bool shouldRepaint(covariant SarvatobhadraPainter old) => old.data != data || old.highlight != highlight || old.origin != origin || old.colors.bg != colors.bg;
}

/// Kota chakra: four concentric squares (Bahya outermost .. Stambha innermost), nakshatras on the
/// eight radial lines from the janma nakshatra in the north-east. Drawn with East at the top.
class KotaPainter extends CustomPainter {
  KotaPainter({required this.data, required this.colors});
  final KotaData data;
  final ChakraColors colors;

  /// Unit direction (screen coordinates) with East at the top and North on the left.
  static const dirs = <String, Offset>{
    'E': Offset(0, -1), 'SE': Offset(1, -1), 'S': Offset(1, 0), 'SW': Offset(1, 1),
    'W': Offset(0, 1), 'NW': Offset(-1, 1), 'N': Offset(-1, 0), 'NE': Offset(-1, -1),
  };

  /// Centre-to-label distance (fraction of half side) for depth 1 (Bahya) .. 4 (Stambha).
  static const _band = [0.0, 0.87, 0.65, 0.43, 0.18];

  @override
  void paint(Canvas canvas, Size size) {
    final side = math.min(size.width, size.height);
    final h = side / 2;
    final c = Offset(h, h);
    canvas.drawRect(Offset.zero & Size(side, side), Paint()..color = colors.bg);
    final stroke = Paint()
      ..color = colors.line
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;
    for (final f in [0.98, 0.76, 0.54, 0.32]) {
      canvas.drawRect(Rect.fromCenter(center: c, width: side * f, height: side * f), stroke);
    }
    final guide = Paint()
      ..color = colors.line.withValues(alpha: 0.35)
      ..strokeWidth = 1;
    for (final d in dirs.values) {
      canvas.drawLine(c, c + Offset(d.dx * h * 0.98, d.dy * h * 0.98), guide);
    }
    final byKey = <String, List<KotaPlacement>>{};
    for (final p in data.placements) {
      byKey.putIfAbsent('${p.square.direction}${p.square.depth}', () => []).add(p);
    }
    final fs = math.max(8.0, side / 62);
    for (final s in data.squares) {
      final d = dirs[s.direction] ?? Offset.zero;
      final r = _band[s.depth.clamp(1, 4)];
      final pos = c + Offset(d.dx * h * r, d.dy * h * r);
      final ps = byKey['${s.direction}${s.depth}'] ?? const [];
      final spans = <InlineSpan>[
        TextSpan(text: '${s.count}. ${_nakShort[s.nakshatra] ?? s.nakshatra}', style: TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: s.count == 1 ? colors.natal : colors.text, fontWeight: s.count == 1 ? FontWeight.w800 : FontWeight.w500)),
        if (ps.isNotEmpty) const TextSpan(text: '\n'),
        for (final p in ps)
          TextSpan(
            text: '${abbr(p.planet)}${p.movement == 'ENTERING' ? '↘' : '↗'} ',
            style: TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: p.chart == 'NATAL' ? colors.natal : colors.transit, fontWeight: FontWeight.w700, fontStyle: p.chart == 'NATAL' ? FontStyle.normal : FontStyle.italic),
          ),
      ];
      final tp = TextPainter(text: TextSpan(children: spans, style: TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, fontSize: fs, height: 1.1)), textAlign: TextAlign.center, textDirection: TextDirection.ltr, maxLines: 3)
        ..layout(maxWidth: side * 0.15);
      final rect = Rect.fromCenter(center: pos, width: tp.width + 6, height: tp.height + 4);
      canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(3)), Paint()..color = colors.bg.withValues(alpha: 0.92));
      tp.paint(canvas, pos - Offset(tp.width / 2, tp.height / 2));
    }
    _text(canvas, 'E', Offset(h, side * 0.012 + 6), 20, TextStyle(fontFamily: _family, fontFamilyFallback: _fallback, color: colors.muted, fontSize: 9));
  }

  @override
  bool shouldRepaint(covariant KotaPainter old) => old.data != data || old.colors.bg != colors.bg;
}
