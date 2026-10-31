import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme_tokens.dart';

/// Reusable high-impact Vedic Astrology Hero Card for Astro Sushil.
///
/// Features:
/// - Royal midnight plum-to-navy cosmic gradient
/// - Custom geometric Vedic diamond orbit watermark
/// - Greeting & subtitle
/// - Floating active profile selector with direct action button
/// - Deterministic astrology highlight badges (Lagna, Moon, Dasha)
class AstroHeroCard extends StatelessWidget {
  final String greeting;
  final String headline;
  final String? subtitle;
  final String? activeProfileName;
  final String? profileSubtitle;
  final VoidCallback? onProfileTap;
  final String actionButtonLabel;
  final VoidCallback? onActionButtonTap;
  final List<AstroHeroHighlight>? highlights;
  final Widget? trailingHeaderWidget;

  const AstroHeroCard({
    super.key,
    this.greeting = 'Namaste 🙏',
    this.headline = 'How can we guide you today?',
    this.subtitle = 'Explore your birth chart, get insights, learn astrology and more.',
    this.activeProfileName,
    this.profileSubtitle,
    this.onProfileTap,
    this.actionButtonLabel = 'View Chart →',
    this.onActionButtonTap,
    this.highlights,
    this.trailingHeaderWidget,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: AppGradients.heroCosmic,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppShadows.heroGlow,
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.25),
          width: 1.2,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // 1. Subtle Vedic Chart Geometric Watermark
            Positioned(
              right: -30,
              top: -30,
              width: 200,
              height: 200,
              child: Opacity(
                opacity: 0.12,
                child: CustomPaint(
                  painter: _AstroHeroVedicWatermarkPainter(),
                ),
              ),
            ),

            // 2. Main Content Layout
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Greeting & Trailing Action
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        greeting,
                        style: AppTypography.titleMedium.copyWith(
                          color: AppColors.gold,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (trailingHeaderWidget != null) trailingHeaderWidget!,
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Headline
                  Text(
                    headline,
                    style: AppTypography.displayMedium.copyWith(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                  ),

                  if (subtitle != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      subtitle!,
                      style: AppTypography.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.8),
                        height: 1.35,
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // 3. Floating Active Profile Card
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Vedic Diamond Symbol
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppColors.tintVioletBg,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.tintVioletBorder,
                              width: 1,
                            ),
                          ),
                          child: const Icon(
                            Icons.auto_awesome,
                            color: AppColors.tintVioletText,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Profile Details
                        Expanded(
                          child: InkWell(
                            onTap: onProfileTap,
                            borderRadius: BorderRadius.circular(8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  profileSubtitle ?? 'My Birth Profile',
                                  style: AppTypography.caption.copyWith(
                                    color: AppColors.textMuted,
                                    fontSize: 11,
                                  ),
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Flexible(
                                      child: Text(
                                        activeProfileName ?? 'Select Profile',
                                        style: AppTypography.titleMedium.copyWith(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (onProfileTap != null) ...[
                                      const SizedBox(width: 4),
                                      const Icon(
                                        Icons.keyboard_arrow_down_rounded,
                                        size: 18,
                                        color: AppColors.primary,
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Action Button
                        if (onActionButtonTap != null)
                          ElevatedButton(
                            onPressed: onActionButtonTap,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              minimumSize: const Size(80, 38),
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: Text(
                              actionButtonLabel,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),

                  // 4. Optional Highlights Row (Lagna, Moon, Dasha)
                  if (highlights != null && highlights!.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: highlights!.map((h) => _buildHighlightBadge(h)).toList(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightBadge(AstroHeroHighlight h) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.3),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (h.icon != null) ...[
            Icon(h.icon, size: 12, color: AppColors.gold),
            const SizedBox(width: 5),
          ],
          Text(
            '${h.label}: ',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
          Text(
            h.value,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// Metadata model for highlights inside [AstroHeroCard]
class AstroHeroHighlight {
  final String label;
  final String value;
  final IconData? icon;

  const AstroHeroHighlight({
    required this.label,
    required this.value,
    this.icon,
  });
}

/// Custom painter rendering geometric North Indian Kundli diamond lines
class _AstroHeroVedicWatermarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;

    final rect = Offset.zero & size;
    // Outer square
    canvas.drawRect(rect, paint);
    // Diagonals
    canvas.drawLine(rect.topLeft, rect.bottomRight, paint);
    canvas.drawLine(rect.topRight, rect.bottomLeft, paint);
    // Inner diamond
    final path = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width, size.height / 2)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(0, size.height / 2)
      ..close();
    canvas.drawPath(path, paint);

    // Subtle celestial concentric circle
    canvas.drawCircle(
      Offset(size.width / 2, size.height / 2),
      size.width * 0.35,
      paint..strokeWidth = 0.8,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
