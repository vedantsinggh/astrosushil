import 'package:flutter/material.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';

/// Large Hero Card for Home Screen representing main birth chart entry point
class HeroAstrologyCard extends StatelessWidget {
  final VoidCallback onViewChartTap;

  const HeroAstrologyCard({
    super.key,
    required this.onViewChartTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.premiumAccent.withOpacity(0.4),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.25),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Celestial Background Image / Custom Geometry Fallback
            Positioned.fill(
              child: Image.asset(
                AppAssets.homeHero,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return CustomPaint(
                    painter: _HeroCelestialGeometryPainter(),
                  );
                },
              ),
            ),

            // Gradient Overlay for optimal legibility
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      AppColors.primary.withOpacity(0.92),
                      AppColors.primary.withOpacity(0.75),
                      AppColors.tertiary.withOpacity(0.45),
                    ],
                  ),
                ),
              ),
            ),

            // Hero Card Content
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Gold pill badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.premiumAccent.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.premiumAccent.withOpacity(0.5),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.auto_awesome,
                          size: 12,
                          color: AppColors.premiumAccent,
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'BIRTH CHART & KUNDLI',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                            color: AppColors.premiumAccent,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  const Text(
                    'Your Cosmic Journey',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.5,
                      height: 1.2,
                    ),
                  ),

                  const SizedBox(height: 8),

                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 240),
                    child: Text(
                      'Explore your birth chart, planetary positions and personalized insights.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withOpacity(0.85),
                        height: 1.4,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),


                  const SizedBox(height: 20),

                  // CTA Button
                  ElevatedButton(
                    onPressed: onViewChartTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.premiumAccent,
                      foregroundColor: AppColors.primary,
                      elevation: 4,
                      shadowColor: AppColors.premiumAccent.withOpacity(0.4),
                      minimumSize: const Size(150, 44),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'View Your Chart',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 16,
                        ),
                      ],
                    ),
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

/// Fallback custom painter rendering fine gold celestial geometry circles
class _HeroCelestialGeometryPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.85, size.height * 0.5);
    final paint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    for (int i = 1; i <= 4; i++) {
      canvas.drawCircle(center, i * 40.0, paint);
    }

    final dashPaint = Paint()
      ..color = AppColors.secondary.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawCircle(center, 90.0, dashPaint);
    canvas.drawCircle(center, 130.0, dashPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
