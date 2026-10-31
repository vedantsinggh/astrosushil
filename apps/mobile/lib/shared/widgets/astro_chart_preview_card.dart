import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'astro_card.dart';

/// Reusable Chart Preview Card with geometric Vedic Kundli visualization.
///
/// Complies strictly with AGENTS.md:
/// - Displays real, deterministic chart parameters (Lagna sign, Moon sign)
/// - Never fabricates fake planetary positions
/// - Clear CTA to open full interactive chart
class AstroChartPreviewCard extends StatelessWidget {
  final String chartTitle;
  final String? lagnaSign;
  final String? moonSign;
  final String? profileName;
  final VoidCallback onTap;
  final String ctaLabel;

  const AstroChartPreviewCard({
    super.key,
    this.chartTitle = 'Lagna Chart (D1)',
    this.lagnaSign,
    this.moonSign,
    this.profileName,
    required this.onTap,
    this.ctaLabel = 'View Full Chart →',
  });

  @override
  Widget build(BuildContext context) {
    return AstroCard(
      variant: AstroCardVariant.warm,
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 1. Mini Geometric Vedic Diamond Canvas
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              color: AppColors.canvas,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.gold.withValues(alpha: 0.35),
                width: 1,
              ),
            ),
            child: CustomPaint(
              painter: _MiniVedicKundliPainter(),
            ),
          ),
          const SizedBox(width: 16),

          // 2. Chart Metadata & Deterministic Placements
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.tintVioletBg,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: AppColors.tintVioletBorder, width: 0.8),
                      ),
                      child: Text(
                        'VEDIC BLUEPRINT',
                        style: AppTypography.labelSmall.copyWith(
                          fontSize: 9,
                          color: AppColors.tintVioletText,
                        ),
                      ),
                    ),
                    const Spacer(),
                    const Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 13,
                      color: AppColors.textMuted,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  chartTitle,
                  style: AppTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (profileName != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    profileName!,
                    style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                  ),
                ],
                const SizedBox(height: 8),

                // Deterministic Sign Badges
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    if (lagnaSign != null)
                      _buildChip('Lagna', lagnaSign!, AppColors.primary),
                    if (moonSign != null)
                      _buildChip('Moon', moonSign!, AppColors.secondary),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _MiniVedicKundliPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.goldDark.withValues(alpha: 0.6)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final rect = Offset.zero & size;
    // Outer border
    canvas.drawRect(rect, paint);
    // Diagonals
    canvas.drawLine(rect.topLeft, rect.bottomRight, paint);
    canvas.drawLine(rect.topRight, rect.bottomLeft, paint);
    // Diamond
    final path = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width, size.height / 2)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(0, size.height / 2)
      ..close();
    canvas.drawPath(path, paint);

    // Center Ascendant marker (ॐ / Asc)
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'ॐ',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: AppColors.goldDark,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(
      canvas,
      Offset((size.width - textPainter.width) / 2, (size.height - textPainter.height) / 2),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
