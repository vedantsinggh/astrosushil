import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// Native Flutter [CustomPainter] rendering a deterministic solar-system style loader.
///
/// Features:
/// - Pulsing central Sun with radial glow (#D9B13B)
/// - Concentric orbit paths with restrained gold/purple/burgundy opacities
/// - Stylized planets orbiting at different angular velocities
/// - Subtle background twinkling starfield (10-20 stars)
/// - Supports reduced-motion static rendering
class SolarSystemLoaderPainter extends CustomPainter {
  final Animation<double> animation;
  final bool isDark;
  final int numOrbits;
  final bool showStars;
  final bool reducedMotion;

  SolarSystemLoaderPainter({
    required this.animation,
    this.isDark = false,
    this.numOrbits = 3,
    this.showStars = true,
    this.reducedMotion = false,
  }) : super(repaint: animation);

  // Fixed deterministic star positions relative to center radius [dx, dy, size, phase]
  static const List<List<double>> _starOffsets = [
    [-0.82, -0.65, 1.2, 0.0],
    [0.75, -0.78, 1.4, 1.2],
    [-0.60, 0.82, 1.0, 2.5],
    [0.85, 0.60, 1.3, 0.7],
    [-0.35, -0.88, 1.1, 3.1],
    [0.42, -0.85, 1.5, 1.8],
    [-0.90, 0.25, 0.9, 0.5],
    [0.92, -0.20, 1.2, 2.2],
    [-0.15, 0.92, 1.4, 1.0],
    [0.55, 0.88, 1.0, 2.9],
    [-0.78, -0.22, 1.1, 0.3],
    [0.22, -0.55, 1.3, 1.6],
    [-0.45, 0.45, 0.8, 2.1],
    [0.68, -0.42, 1.2, 3.5],
    [-0.28, -0.42, 1.0, 0.9],
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final double t = reducedMotion ? 0.25 : animation.value;
    final Offset center = Offset(size.width / 2, size.height / 2);
    final double maxRadius = math.min(size.width, size.height) / 2;

    if (maxRadius <= 0) return;

    // 1. Draw subtle background stars
    if (showStars && maxRadius >= 24.0) {
      _drawStars(canvas, center, maxRadius, t);
    }

    // 2. Draw orbital rings
    final List<double> orbitRadii = _calculateOrbitRadii(maxRadius);
    _drawOrbitRings(canvas, center, orbitRadii);

    // 3. Draw planets along orbit paths
    _drawPlanets(canvas, center, orbitRadii, t);

    // 4. Draw central Sun with radial glow & subtle pulse
    _drawSun(canvas, center, maxRadius, t);
  }

  void _drawStars(Canvas canvas, Offset center, double maxRadius, double t) {
    final int count = numOrbits <= 2 ? 8 : _starOffsets.length;
    for (int i = 0; i < count; i++) {
      final data = _starOffsets[i];
      final double dx = center.dx + data[0] * maxRadius * 0.95;
      final double dy = center.dy + data[1] * maxRadius * 0.95;
      final double baseSize = data[2];
      final double phase = data[3];

      final double alphaSignal = (math.sin(t * 2 * math.pi + phase) + 1.0) / 2.0;
      final double opacity = (0.25 + 0.50 * alphaSignal).clamp(0.0, 1.0);

      final Color starColor = isDark
          ? Colors.white.withOpacity(opacity * 0.8)
          : AppColors.primary.withOpacity(opacity * 0.35);

      final Paint starPaint = Paint()
        ..color = starColor
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(dx, dy), baseSize * (maxRadius / 80.0).clamp(0.6, 1.2), starPaint);
    }
  }

  List<double> _calculateOrbitRadii(double maxRadius) {
    if (numOrbits == 1) {
      return [maxRadius * 0.65];
    } else if (numOrbits == 2) {
      return [maxRadius * 0.48, maxRadius * 0.82];
    } else {
      return [maxRadius * 0.38, maxRadius * 0.64, maxRadius * 0.88];
    }
  }

  void _drawOrbitRings(Canvas canvas, Offset center, List<double> radii) {
    final List<Color> ringColors = [
      AppColors.premiumAccent,
      AppColors.secondary,
      AppColors.supportingAccent,
    ];

    for (int i = 0; i < radii.length; i++) {
      final double radius = radii[i];
      final Color baseColor = ringColors[i % ringColors.length];
      final double opacity = isDark ? 0.28 : 0.20;

      final Paint ringPaint = Paint()
        ..color = baseColor.withOpacity(opacity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = (radius / 50.0).clamp(0.8, 1.5);

      final Rect ovalRect = Rect.fromCenter(
        center: center,
        width: radius * 2.0,
        height: radius * 1.90,
      );

      canvas.drawOval(ovalRect, ringPaint);
    }
  }

  void _drawPlanets(Canvas canvas, Offset center, List<double> radii, double t) {
    final List<Map<String, dynamic>> planetSpecs = [
      {
        'speed': 1.8,
        'offset': 0.0,
        'color': AppColors.secondary,
        'sizeRatio': 0.055,
      },
      {
        'speed': -1.1,
        'offset': math.pi / 3,
        'color': AppColors.supportingAccent,
        'sizeRatio': 0.070,
      },
      {
        'speed': 0.7,
        'offset': 4 * math.pi / 3,
        'color': AppColors.premiumAccent,
        'sizeRatio': 0.065,
      },
    ];

    for (int i = 0; i < radii.length; i++) {
      final double rx = radii[i];
      final double ry = radii[i] * 0.95;
      final spec = planetSpecs[i % planetSpecs.length];

      final double speed = spec['speed'] as double;
      final double offset = spec['offset'] as double;
      final Color planetColor = spec['color'] as Color;
      final double sizeRatio = spec['sizeRatio'] as double;

      final double angle = offset + (speed * t * 2 * math.pi);
      final double px = center.dx + rx * math.cos(angle);
      final double py = center.dy + ry * math.sin(angle);
      final Offset planetPos = Offset(px, py);

      final double planetRadius = (radii.last * sizeRatio).clamp(2.5, 7.0);

      final Paint haloPaint = Paint()
        ..color = planetColor.withOpacity(0.3)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(planetPos, planetRadius * 1.4, haloPaint);

      final Paint planetPaint = Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.3, -0.3),
          radius: 0.8,
          colors: [
            Color.lerp(planetColor, Colors.white, 0.45)!,
            planetColor,
            Color.lerp(planetColor, Colors.black, 0.35)!,
          ],
        ).createShader(Rect.fromCircle(center: planetPos, radius: planetRadius));

      canvas.drawCircle(planetPos, planetRadius, planetPaint);
    }
  }

  void _drawSun(Canvas canvas, Offset center, double maxRadius, double t) {
    final double pulse = reducedMotion
        ? 1.0
        : 1.0 + 0.04 * math.sin(t * 2 * math.pi);

    final double baseSunRadius = (maxRadius * 0.16).clamp(5.0, 20.0);
    final double sunRadius = baseSunRadius * pulse;
    final double glowRadius = sunRadius * 2.4;

    final Paint glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          AppColors.premiumAccent.withOpacity(isDark ? 0.45 : 0.35),
          AppColors.premiumAccent.withOpacity(isDark ? 0.15 : 0.10),
          AppColors.premiumAccent.withOpacity(0.0),
        ],
        stops: const [0.0, 0.50, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: glowRadius));

    canvas.drawCircle(center, glowRadius, glowPaint);

    final Paint sunPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.25, -0.25),
        radius: 0.85,
        colors: const [
          Color(0xFFFFF59D),
          AppColors.premiumAccent,
          Color(0xFFB78A1E),
        ],
        stops: const [0.0, 0.65, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: sunRadius));

    canvas.drawCircle(center, sunRadius, sunPaint);
  }

  @override
  bool shouldRepaint(covariant SolarSystemLoaderPainter oldDelegate) {
    return oldDelegate.animation.value != animation.value ||
        oldDelegate.isDark != isDark ||
        oldDelegate.numOrbits != numOrbits ||
        oldDelegate.showStars != showStars ||
        oldDelegate.reducedMotion != reducedMotion;
  }
}
