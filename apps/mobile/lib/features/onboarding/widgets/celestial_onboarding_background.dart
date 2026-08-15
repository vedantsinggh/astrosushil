import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Animated celestial backdrop featuring rotating zodiac rings, twinkling stars, & ambient halos
class CelestialOnboardingBackground extends StatefulWidget {
  final Widget child;

  const CelestialOnboardingBackground({
    super.key,
    required this.child,
  });

  @override
  State<CelestialOnboardingBackground> createState() => _CelestialOnboardingBackgroundState();
}

class _CelestialOnboardingBackgroundState extends State<CelestialOnboardingBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 40),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          children: [
            // Dark Primary Surface
            Positioned.fill(
              child: Container(
                color: AppColors.primary,
              ),
            ),

            // Top-left Ambient Purple Glow
            Positioned(
              top: -80,
              left: -80,
              width: 320,
              height: 320,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppColors.secondary.withOpacity(0.35),
                      AppColors.primary.withOpacity(0.0),
                    ],
                  ),
                ),
              ),
            ),

            // Center-right Ambient Gold Halos
            Positioned(
              top: 220,
              right: -100,
              width: 350,
              height: 350,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppColors.premiumAccent.withOpacity(0.18),
                      AppColors.primary.withOpacity(0.0),
                    ],
                  ),
                ),
              ),
            ),

            // Canvas Painter for Rotating Zodiac Wheel and Starfield
            Positioned.fill(
              child: CustomPaint(
                painter: _CelestialCanvasPainter(
                  rotationValue: _controller.value,
                ),
              ),
            ),

            // Foreground Content (PageView + Footer)
            Positioned.fill(
              child: widget.child,
            ),
          ],
        );
      },
    );
  }
}

class _CelestialCanvasPainter extends CustomPainter {
  final double rotationValue;

  _CelestialCanvasPainter({required this.rotationValue});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.38);
    final radius = math.min(size.width, size.height) * 0.42;

    // 1. Draw Starfield
    final starPaint = Paint()..color = Colors.white;
    final goldStarPaint = Paint()..color = AppColors.premiumAccent;

    final math.Random random = math.Random(42); // Deterministic seed
    for (int i = 0; i < 45; i++) {
      final x = random.nextDouble() * size.width;
      final y = random.nextDouble() * size.height;
      final starSize = random.nextDouble() * 1.8 + 0.6;
      final opacity = (math.sin((rotationValue * math.pi * 4) + i) + 1.0) * 0.35 + 0.2;

      starPaint.color = Colors.white.withOpacity(opacity.clamp(0.1, 0.8));
      canvas.drawCircle(Offset(x, y), starSize, starPaint);

      // Draw subtle diamond shine for gold stars
      if (i % 7 == 0) {
        goldStarPaint.color = AppColors.premiumAccent.withOpacity(opacity.clamp(0.2, 0.9));
        canvas.drawCircle(Offset(x, y), starSize * 1.3, goldStarPaint);
      }
    }

    // 2. Draw Rotating Zodiac Orbit Ring
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotationValue * 2 * math.pi);

    final ringPaint = Paint()
      ..color = AppColors.secondary.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawCircle(Offset.zero, radius, ringPaint);
    canvas.drawCircle(Offset.zero, radius * 0.85, ringPaint);

    // Draw 12 Zodiac Radial Spoke Ticks
    final tickPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.3)
      ..strokeWidth = 1.2;

    for (int i = 0; i < 12; i++) {
      final angle = (i * 30) * math.pi / 180;
      final inner = Offset((radius * 0.85) * math.cos(angle), (radius * 0.85) * math.sin(angle));
      final outer = Offset(radius * math.cos(angle), radius * math.sin(angle));
      canvas.drawLine(inner, outer, tickPaint);
    }

    canvas.restore();

    // 3. Draw Constellation Connecting Lines
    final linePaint = Paint()
      ..color = AppColors.secondary.withOpacity(0.15)
      ..strokeWidth = 0.8;

    final List<Offset> constellationPoints = [
      Offset(size.width * 0.15, size.height * 0.12),
      Offset(size.width * 0.28, size.height * 0.08),
      Offset(size.width * 0.38, size.height * 0.16),
      Offset(size.width * 0.52, size.height * 0.09),
      Offset(size.width * 0.72, size.height * 0.14),
      Offset(size.width * 0.85, size.height * 0.07),
    ];

    for (int i = 0; i < constellationPoints.length - 1; i++) {
      canvas.drawLine(constellationPoints[i], constellationPoints[i + 1], linePaint);
      canvas.drawCircle(constellationPoints[i], 2.0, starPaint..color = AppColors.premiumAccent.withOpacity(0.6));
    }
  }

  @override
  bool shouldRepaint(covariant _CelestialCanvasPainter oldDelegate) {
    return oldDelegate.rotationValue != rotationValue;
  }
}
