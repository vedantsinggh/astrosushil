import 'package:flutter/material.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';

/// Visually distinct flagship product card for Gupta Nadi analysis and video masterclass.
/// Uses the actual course title, official course cover thumbnail, and authoritative catalog pricing (₹5,999).
/// Tapping it opens the course detail route.
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
          color: AppColors.gold.withValues(alpha: 0.5),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onExploreTap,
          borderRadius: BorderRadius.circular(20),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                // Top Right PREMIUM Badge
                Positioned(
                  top: 14,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.gold.withValues(alpha: 0.5),
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          '👑',
                          style: TextStyle(fontSize: 10),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'PREMIUM',
                          style: AppTypography.caption.copyWith(
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.gold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Main Content
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Course Cover Thumbnail
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: 90,
                          height: 90,
                          decoration: BoxDecoration(
                            color: AppColors.cardSurfaceDark,
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: 0.3),
                              width: 1,
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Image.asset(
                            AppAssets.courseGuptNadi,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Center(
                              child: Icon(
                                Icons.school_rounded,
                                color: AppColors.gold,
                                size: 36,
                              ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(width: 14),

                      // Course Details & CTA
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Gupta Nadi',
                              style: AppTypography.titleLarge.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.gold,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Brihaspati Nandi Nadi (BNN) Masterclass',
                              style: AppTypography.caption.copyWith(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                Text(
                                  '₹5,999',
                                  style: AppTypography.priceTag.copyWith(
                                    color: AppColors.gold,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  '₹10,999',
                                  style: AppTypography.caption.copyWith(
                                    color: Colors.white.withValues(alpha: 0.5),
                                    decoration: TextDecoration.lineThrough,
                                    fontSize: 11,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.success.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '13 Lessons',
                                    style: AppTypography.caption.copyWith(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.tintSageText,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // CTA Button: [ Explore Gupta Nadi -> ] (>= 48dp touch bounds)
                            ConstrainedBox(
                              constraints: const BoxConstraints(minHeight: AppTouchTargets.minTouchTarget),
                              child: ElevatedButton(
                                onPressed: onExploreTap,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.gold,
                                  foregroundColor: AppColors.primary,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Explore Gupta Nadi',
                                        style: AppTypography.labelSmall.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(
                                        Icons.arrow_forward_rounded,
                                        size: 13,
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
