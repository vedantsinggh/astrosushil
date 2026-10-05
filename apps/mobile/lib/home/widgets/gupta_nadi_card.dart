import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Visually distinct flagship product card for Gupta Nadi analysis.
/// Features a deterministic Brihaspati Nandi Nadi (BNN) trine aspect interaction visual.
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
          color: AppColors.premiumAccent.withValues(alpha: 0.5),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // BNN Trine Planetary Aspect Interaction Visual on Left
            Positioned(
              left: 4,
              top: 0,
              bottom: 0,
              width: 105,
              child: CustomPaint(
                painter: _BnnTrineAspectPainter(),
              ),
            ),

            // Top Right PREMIUM Badge
            Positioned(
              top: 14,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.premiumAccent.withValues(alpha: 0.5),
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
                        fontSize: 8.5,
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
              padding: const EdgeInsets.fromLTRB(115, 18, 16, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Gupta Nadi',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.premiumAccent,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '100% deterministic Brihaspati Nandi Nadi (BNN) planetary aspect trines (1-5-9, 2-12, 3-7-11).',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: Colors.white.withValues(alpha: 0.85),
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 12),

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

/// Custom painter rendering Brihaspati Nandi Nadi (BNN) 1-5-9 planetary trine aspect geometry
class _BnnTrineAspectPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.48, size.height * 0.5);
    final radius = size.height * 0.36;

    final circlePaint = Paint()
      ..color = AppColors.premiumAccent.withValues(alpha: 0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final trinePaint = Paint()
      ..color = AppColors.premiumAccent.withValues(alpha: 0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    final nodePaint = Paint()
      ..color = AppColors.premiumAccent
      ..style = PaintingStyle.fill;

    // Draw outer orbital circle
    canvas.drawCircle(center, radius, circlePaint);

    // Draw 1-5-9 Trine Triangle
    final p1 = Offset(center.dx, center.dy - radius);
    final p2 = Offset(center.dx + radius * math.cos(math.pi / 6), center.dy + radius * math.sin(math.pi / 6));
    final p3 = Offset(center.dx - radius * math.cos(math.pi / 6), center.dy + radius * math.sin(math.pi / 6));

    final trinePath = Path()
      ..moveTo(p1.dx, p1.dy)
      ..lineTo(p2.dx, p2.dy)
      ..lineTo(p3.dx, p3.dy)
      ..close();
    canvas.drawPath(trinePath, trinePaint);

    // Draw planetary node circles
    canvas.drawCircle(p1, 3.5, nodePaint);
    canvas.drawCircle(p2, 3.5, nodePaint);
    canvas.drawCircle(p3, 3.5, nodePaint);

    // Draw planet labels (Ju, Su, Ma)
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    const style = TextStyle(
      fontSize: 8,
      fontWeight: FontWeight.bold,
      color: AppColors.premiumAccent,
    );

    textPainter.text = const TextSpan(text: 'Ju (1)', style: style);
    textPainter.layout();
    textPainter.paint(canvas, Offset(p1.dx - textPainter.width / 2, p1.dy - 12));

    textPainter.text = const TextSpan(text: 'Su (5)', style: style);
    textPainter.layout();
    textPainter.paint(canvas, Offset(p2.dx + 2, p2.dy - 2));

    textPainter.text = const TextSpan(text: 'Ma (9)', style: style);
    textPainter.layout();
    textPainter.paint(canvas, Offset(p3.dx - textPainter.width - 2, p3.dy - 2));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
