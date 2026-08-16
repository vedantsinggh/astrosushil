import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';

/// Large Hero Card for Home Screen representing main birth chart entry point
class HeroAstrologyCard extends StatelessWidget {
  final VoidCallback onViewChartTap;
  final bool hasBirthProfile;

  const HeroAstrologyCard({
    super.key,
    required this.onViewChartTap,
    this.hasBirthProfile = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.premiumAccent.withOpacity(0.35),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Celestial Background Zodiac Wheel Artwork (Right Aligned)
            Positioned(
              right: -35,
              top: -20,
              bottom: -20,
              width: 260,
              child: Image.asset(
                AppAssets.homeHero,
                fit: BoxFit.contain,
                alignment: Alignment.centerRight,
                errorBuilder: (context, error, stackTrace) {
                  return CustomPaint(
                    painter: _HeroZodiacWheelPainter(),
                  );
                },
              ),
            ),

            // Gradient Overlay for crisp text contrast
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      AppColors.primary,
                      AppColors.primary.withOpacity(0.92),
                      AppColors.primary.withOpacity(0.35),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.45, 0.75, 1.0],
                  ),
                ),
              ),
            ),

            // Hero Content
            Padding(
              padding: const EdgeInsets.all(22.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Gold pill badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.premiumAccent.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.premiumAccent.withOpacity(0.4),
                        width: 0.8,
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.auto_awesome,
                          size: 11,
                          color: AppColors.premiumAccent,
                        ),
                        SizedBox(width: 5),
                        Text(
                          'BIRTH CHART & KUNDLI',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                            color: AppColors.premiumAccent,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Main Heading (Dual-color title: White + Gold)
                  RichText(
                    text: TextSpan(
                      children: hasBirthProfile
                          ? const [
                              TextSpan(
                                text: 'Your Cosmic\n',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                              TextSpan(
                                text: 'Journey',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.premiumAccent,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                            ]
                          : const [
                              TextSpan(
                                text: 'Create Your\n',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                              TextSpan(
                                text: 'Birth Profile',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.premiumAccent,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                            ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 210),
                    child: Text(
                      hasBirthProfile
                          ? 'Explore your birth chart, planetary positions and personalized insights.'
                          : 'Add your birth details to generate your Kundli.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withOpacity(0.85),
                        height: 1.35,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Primary Gold CTA Button
                  ElevatedButton(
                    onPressed: onViewChartTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.premiumAccent,
                      foregroundColor: AppColors.primary,
                      elevation: 2,
                      shadowColor: AppColors.premiumAccent.withOpacity(0.4),
                      minimumSize: const Size(140, 42),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          hasBirthProfile ? 'View Your Chart' : 'Add Birth Details',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 15,
                          color: AppColors.primary,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Hero Carousel Indicators (Subtle dots)
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 6,
                        decoration: BoxDecoration(
                          color: AppColors.premiumAccent,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.25),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.25),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Fallback custom painter rendering a rich gold circular zodiac wheel illustration with planets
class _HeroZodiacWheelPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.7, size.height * 0.5);
    final maxRadius = size.height * 0.45;

    // Gold Stroke Paint
    final goldPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final faintPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;

    // Outer and Inner Concentric Circles
    canvas.drawCircle(center, maxRadius, goldPaint);
    canvas.drawCircle(center, maxRadius * 0.85, faintPaint);
    canvas.drawCircle(center, maxRadius * 0.65, goldPaint);
    canvas.drawCircle(center, maxRadius * 0.4, faintPaint);

    // Center Glowing Sun
    final sunGlowPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.25)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, maxRadius * 0.22, sunGlowPaint);

    final sunCorePaint = Paint()
      ..color = AppColors.premiumAccent
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, maxRadius * 0.12, sunCorePaint);

    // Sun Rays
    final rayPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.6)
      ..strokeWidth = 1.2;
    for (int i = 0; i < 8; i++) {
      final angle = i * math.pi / 4;
      final start = Offset(
        center.dx + math.cos(angle) * (maxRadius * 0.14),
        center.dy + math.sin(angle) * (maxRadius * 0.14),
      );
      final end = Offset(
        center.dx + math.cos(angle) * (maxRadius * 0.26),
        center.dy + math.sin(angle) * (maxRadius * 0.26),
      );
      canvas.drawLine(start, end, rayPaint);
    }

    // Zodiac Division Spoke Lines & Symbols
    const zodiacSymbols = [
      '♈', '♉', '♊', '♋', '♌', '♍',
      '♎', '♏', '♐', '♑', '♒', '♓'
    ];

    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (int i = 0; i < 12; i++) {
      final angle = i * (2 * math.pi / 12);
      final inner = Offset(
        center.dx + math.cos(angle) * (maxRadius * 0.65),
        center.dy + math.sin(angle) * (maxRadius * 0.65),
      );
      final outer = Offset(
        center.dx + math.cos(angle) * maxRadius,
        center.dy + math.sin(angle) * maxRadius,
      );
      canvas.drawLine(inner, outer, faintPaint);

      // Render Zodiac Symbol on wheel ring
      final symbolAngle = angle + (math.pi / 12);
      final symbolPos = Offset(
        center.dx + math.cos(symbolAngle) * (maxRadius * 0.75),
        center.dy + math.sin(symbolAngle) * (maxRadius * 0.75),
      );

      textPainter.text = TextSpan(
        text: zodiacSymbols[i],
        style: TextStyle(
          fontSize: 10,
          color: AppColors.premiumAccent.withOpacity(0.7),
        ),
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        symbolPos - Offset(textPainter.width / 2, textPainter.height / 2),
      );
    }

    // Colorful Glossy Planetary Spheres on orbits
    final planets = [
      (angle: 0.6, dist: 0.52, color: const Color(0xFF38BDF8), radius: 5.0),
      (angle: 1.8, dist: 0.88, color: const Color(0xFFF97316), radius: 6.5),
      (angle: 3.4, dist: 0.65, color: const Color(0xFFA855F7), radius: 4.5),
      (angle: 4.7, dist: 0.95, color: const Color(0xFFEAB308), radius: 7.0),
      (angle: 5.5, dist: 0.42, color: const Color(0xFFEC4899), radius: 4.0),
    ];

    for (final p in planets) {
      final pos = Offset(
        center.dx + math.cos(p.angle) * (maxRadius * p.dist),
        center.dy + math.sin(p.angle) * (maxRadius * p.dist),
      );
      final planetPaint = Paint()
        ..color = p.color
        ..style = PaintingStyle.fill;

      // Glow halo
      canvas.drawCircle(pos, p.radius * 1.5, Paint()..color = p.color.withOpacity(0.3));
      // Planet core
      canvas.drawCircle(pos, p.radius, planetPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
