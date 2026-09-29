import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Visually distinct flagship product card for Gupta Nadi analysis
class GuptaNadiCard extends StatelessWidget {
  final VoidCallback onExploreTap;

  const GuptaNadiCard({
    super.key,
    required this.onExploreTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.premiumAccent.withOpacity(0.5),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // Gold Sacred Geometry Star / Mandala Artwork on Left
            Positioned(
              left: -20,
              top: -20,
              bottom: -20,
              width: 140,
              child: CustomPaint(
                painter: _SacredGeometryMandalaPainter(),
              ),
            ),

            // Top Right PREMIUM Badge
            Positioned(
              top: 14,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.premiumAccent.withOpacity(0.5),
                    width: 0.8,
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '👑',
                      style: TextStyle(fontSize: 10),
                    ),
                    SizedBox(width: 4),
                    Text(
                      'PREMIUM',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: AppColors.premiumAccent,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Main Card Content
            Padding(
              padding: const EdgeInsets.fromLTRB(100, 18, 16, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Gupta Nadi',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.premiumAccent,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Explore deeper insights through Gupta Nadi analysis.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.85),
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Gold CTA Button
                  Align(
                    alignment: Alignment.centerLeft,
                    child: ElevatedButton(
                      onPressed: onExploreTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.premiumAccent,
                        foregroundColor: AppColors.primary,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Explore Gupta Nadi',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                            SizedBox(width: 6),
                            Icon(
                              Icons.arrow_forward_rounded,
                              size: 14,
                              color: AppColors.primary,
                            ),
                          ],
                        ),
                      ),
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

/// Custom painter for gold star mandala sacred geometry on left of Gupta Nadi card
class _SacredGeometryMandalaPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.4, size.height * 0.5);
    final radius = size.height * 0.4;

    final paint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // Draw concentric circles
    canvas.drawCircle(center, radius, paint);
    canvas.drawCircle(center, radius * 0.65, paint);

    // Draw overlapping star triangles
    final path1 = Path();
    final path2 = Path();

    for (int i = 0; i < 3; i++) {
      final a1 = i * (2 * math.pi / 3) - (math.pi / 2);
      final p1 = Offset(center.dx + math.cos(a1) * radius, center.dy + math.sin(a1) * radius);
      if (i == 0) path1.moveTo(p1.dx, p1.dy); else path1.lineTo(p1.dx, p1.dy);

      final a2 = i * (2 * math.pi / 3) + (math.pi / 2);
      final p2 = Offset(center.dx + math.cos(a2) * radius, center.dy + math.sin(a2) * radius);
      if (i == 0) path2.moveTo(p2.dx, p2.dy); else path2.lineTo(p2.dx, p2.dy);
    }
    path1.close();
    path2.close();

    canvas.drawPath(path1, paint);
    canvas.drawPath(path2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
