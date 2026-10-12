import 'package:flutter/material.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/theme/app_colors.dart';

/// Large Hero Card for Home Screen representing main birth chart entry point.
/// Features a crisp custom-painted Vedic Kundli geometry and analytical data badges.
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
    final l10n = context.l10n;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.premiumAccent.withValues(alpha: 0.35),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Custom Painted North Indian Kundli Geometric Visual (Right Aligned)
            Positioned(
              right: -10,
              top: -10,
              bottom: -10,
              width: 180,
              child: CustomPaint(
                painter: _HeroKundliGeometryPainter(),
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
                      AppColors.primary.withValues(alpha: 0.95),
                      AppColors.primary.withValues(alpha: 0.4),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.55, 0.8, 1.0],
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
                      color: AppColors.premiumAccent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.premiumAccent.withValues(alpha: 0.4),
                        width: 0.8,
                      ),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome,
                            size: 11,
                            color: AppColors.premiumAccent,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            l10n.toolBirthChart.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                              color: AppColors.premiumAccent,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Main Heading
                  Text(
                    hasBirthProfile ? l10n.toolBirthChart : l10n.createProfileButton,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.4,
                      height: 1.15,
                    ),
                  ),

                  const SizedBox(height: 8),

                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 220),
                    child: Text(
                      hasBirthProfile
                          ? l10n.toolBirthChartDesc
                          : l10n.createProfilePrompt,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.88),
                        height: 1.35,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Primary Gold CTA Button (48dp touch target)
                  ElevatedButton(
                    onPressed: onViewChartTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.premiumAccent,
                      foregroundColor: AppColors.primary,
                      elevation: 2,
                      shadowColor: AppColors.premiumAccent.withValues(alpha: 0.4),
                      minimumSize: const Size(140, 48),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            hasBirthProfile ? l10n.toolBirthChart : l10n.createProfileButton,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 16,
                          color: AppColors.primary,
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

class _HeroKundliGeometryPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final borderPaint = Paint()
      ..color = AppColors.premiumAccent.withValues(alpha: 0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final rect = Rect.fromLTWH(size.width * 0.1, 0, size.width * 0.9, size.height);
    canvas.drawRect(rect, borderPaint);

    // Diagonals
    canvas.drawLine(rect.topLeft, rect.bottomRight, borderPaint);
    canvas.drawLine(rect.topRight, rect.bottomLeft, borderPaint);

    // Diamond
    final path = Path()
      ..moveTo(rect.centerLeft.dx, rect.centerLeft.dy)
      ..lineTo(rect.topCenter.dx, rect.topCenter.dy)
      ..lineTo(rect.centerRight.dx, rect.centerRight.dy)
      ..lineTo(rect.bottomCenter.dx, rect.bottomCenter.dy)
      ..close();
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
