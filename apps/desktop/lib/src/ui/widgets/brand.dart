import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme.dart';

/// Astro Sushil mark: a navy disc with a gold eight-pointed star and orbit (drawn, no assets).
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 32});
  final double size;
  @override
  Widget build(BuildContext context) => SizedBox(width: size, height: size, child: CustomPaint(painter: _BrandPainter()));
}

class _BrandPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    canvas.drawCircle(c, r, Paint()..color = DesktopColors.primary);
    canvas.drawCircle(c, r * 0.94, Paint()
      ..color = DesktopColors.gold.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1, r * 0.05));
    canvas.drawOval(Rect.fromCenter(center: c, width: r * 1.5, height: r * 0.62), Paint()
      ..color = const Color(0xFF9EA1C9).withValues(alpha: 0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(0.8, r * 0.04));
    final star = Path();
    for (var i = 0; i < 16; i++) {
      final a = -math.pi / 2 + i * math.pi / 8;
      final rr = i.isEven ? r * 0.56 : r * 0.2;
      final p = c + Offset(math.cos(a) * rr, math.sin(a) * rr);
      i == 0 ? star.moveTo(p.dx, p.dy) : star.lineTo(p.dx, p.dy);
    }
    star.close();
    canvas.drawPath(star, Paint()..color = DesktopColors.gold);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// "Astro Sushil" wordmark with a small gold "DESKTOP" line.
class BrandWordmark extends StatelessWidget {
  const BrandWordmark({super.key, this.color = Colors.white, this.size = 16});
  final Color color;
  final double size;
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text('Astro Sushil', maxLines: 1, overflow: TextOverflow.fade, softWrap: false, style: TextStyle(fontSize: size, fontWeight: FontWeight.w700, color: color, height: 1.1)),
        Text('DESKTOP', style: TextStyle(fontSize: size * 0.62, fontWeight: FontWeight.w600, color: DesktopColors.gold, letterSpacing: 2.2, height: 1.2)),
      ]);
}
