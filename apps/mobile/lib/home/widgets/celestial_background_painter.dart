import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Lightweight custom painter that renders very subtle celestial line-art
/// (faint orbital arcs, constellation lines, planetary nodes) on a light background.
class CelestialBackgroundPainter extends CustomPainter {
  const CelestialBackgroundPainter();

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Orbital Arcs (Top Right)
    final arcCenterTopRight = Offset(size.width * 0.9, -size.height * 0.05);
    final arcPaint = Paint()
      ..color = AppColors.primary.withOpacity(0.035)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawCircle(arcCenterTopRight, size.width * 0.4, arcPaint);
    canvas.drawCircle(arcCenterTopRight, size.width * 0.65, arcPaint);
    canvas.drawCircle(arcCenterTopRight, size.width * 0.9, arcPaint);

    // 2. Dashed Orbital Arc (Center Left)
    final arcCenterLeft = Offset(-size.width * 0.2, size.height * 0.45);
    final goldArcPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.04)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawCircle(arcCenterLeft, size.width * 0.5, goldArcPaint);
    canvas.drawCircle(arcCenterLeft, size.width * 0.75, goldArcPaint);

    // 3. Faint Constellation Line Nodes (Mid-Right)
    final constellationPaint = Paint()
      ..color = AppColors.secondary.withOpacity(0.04)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;

    final dotPaint = Paint()
      ..color = AppColors.primary.withOpacity(0.06)
      ..style = PaintingStyle.fill;

    final points = [
      Offset(size.width * 0.82, size.height * 0.12),
      Offset(size.width * 0.92, size.height * 0.16),
      Offset(size.width * 0.88, size.height * 0.24),
      Offset(size.width * 0.78, size.height * 0.28),
    ];

    for (int i = 0; i < points.length - 1; i++) {
      canvas.drawLine(points[i], points[i + 1], constellationPaint);
    }
    for (final pt in points) {
      canvas.drawCircle(pt, 1.8, dotPaint);
    }

    // 4. Subtle Bottom Arc
    final bottomCenter = Offset(size.width * 0.5, size.height * 1.05);
    canvas.drawCircle(bottomCenter, size.width * 0.6, arcPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Wrapper widget providing clean light background with subtle celestial decorations
class SubtleCelestialBackground extends StatelessWidget {
  final Widget child;

  const SubtleCelestialBackground({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.lightBackground,
      child: CustomPaint(
        painter: const CelestialBackgroundPainter(),
        child: child,
      ),
    );
  }
}
