import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'astro_card.dart';

/// Reusable course card for the Astro Sushil Learning / Courses Hub.
///
/// Features:
/// - Course thumbnail cover image
/// - Course title and instructor attribution
/// - Metadata row (lessons count, difficulty badge)
/// - Price tag and chevron action
class AstroCourseCard extends StatelessWidget {
  final String title;
  final String? instructorName;
  final String? lessonsCount;
  final String? levelBadge;
  final String? price;
  final String? imageAsset;
  final String? imageUrl;
  final VoidCallback onTap;

  const AstroCourseCard({
    super.key,
    required this.title,
    this.instructorName = 'Astro Sushil',
    this.lessonsCount,
    this.levelBadge,
    this.price,
    this.imageAsset,
    this.imageUrl,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AstroCard(
      variant: AstroCardVariant.warm,
      padding: const EdgeInsets.all(12),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 1. Course Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 72,
              height: 72,
              color: AppColors.canvas,
              child: _buildImage(),
            ),
          ),
          const SizedBox(width: 14),

          // 2. Details Column
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (levelBadge != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.tintAmberBg,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: AppColors.tintAmberBorder, width: 0.8),
                    ),
                    child: Text(
                      levelBadge!.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 8.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.tintAmberText,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                Text(
                  title,
                  style: AppTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                    fontSize: 14,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (lessonsCount != null) ...[
                      const Icon(Icons.play_circle_outline_rounded, size: 13, color: AppColors.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        lessonsCount!,
                        style: AppTypography.caption.copyWith(fontSize: 11),
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (price != null)
                      Text(
                        price!,
                        style: AppTypography.priceTag.copyWith(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(width: 8),
          const Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: AppColors.textMuted,
          ),
        ],
      ),
    );
  }

  Widget _buildImage() {
    if (imageAsset != null) {
      return Image.asset(
        imageAsset!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackIcon(),
      );
    }
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Image.network(
        imageUrl!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackIcon(),
      );
    }
    return _buildFallbackIcon();
  }

  Widget _buildFallbackIcon() {
    return const Center(
      child: Icon(
        Icons.menu_book_rounded,
        size: 30,
        color: AppColors.secondary,
      ),
    );
  }
}
