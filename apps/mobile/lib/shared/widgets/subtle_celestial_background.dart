import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Reusable subtle celestial background painter providing a "quietly astrological"
/// aesthetic with low opacity orbital rings and constellation geometry.
class SubtleCelestialBackground extends StatelessWidget {
  final Widget child;
  final Color? backgroundColor;

  const SubtleCelestialBackground({
    super.key,
    required this.child,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          color: backgroundColor ?? AppColors.lightBackground,
        ),
        Positioned.fill(
          child: CustomPaint(
            painter: _SubtleCelestialPainter(),
          ),
        ),
        child,
      ],
    );
  }
}

class _SubtleCelestialPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.28);
    final maxRadius = math.max(size.width, size.height) * 0.45;

    final linePaint = Paint()
      ..color = AppColors.primary.withOpacity(0.035)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final accentLinePaint = Paint()
      ..color = AppColors.secondary.withOpacity(0.04)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // 1. Concentric subtle celestial orbital rings
    canvas.drawCircle(center, maxRadius * 0.35, linePaint);
    canvas.drawCircle(center, maxRadius * 0.65, accentLinePaint);
    canvas.drawCircle(center, maxRadius * 0.95, linePaint);

    // 2. Faint cardinal axis lines
    canvas.drawLine(
      Offset(center.dx - maxRadius * 0.8, center.dy),
      Offset(center.dx + maxRadius * 0.8, center.dy),
      linePaint,
    );
    canvas.drawLine(
      Offset(center.dx, center.dy - maxRadius * 0.8),
      Offset(center.dx, center.dy + maxRadius * 0.8),
      linePaint,
    );

    // 3. Faint constellation star points
    final dotPaint = Paint()
      ..color = AppColors.primary.withOpacity(0.06)
      ..style = PaintingStyle.fill;

    final starPositions = [
      Offset(size.width * 0.15, size.height * 0.12),
      Offset(size.width * 0.85, size.height * 0.18),
      Offset(size.width * 0.75, size.height * 0.42),
      Offset(size.width * 0.22, size.height * 0.55),
      Offset(size.width * 0.88, size.height * 0.72),
      Offset(size.width * 0.12, size.height * 0.82),
    ];

    for (final pos in starPositions) {
      canvas.drawCircle(pos, 1.5, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
