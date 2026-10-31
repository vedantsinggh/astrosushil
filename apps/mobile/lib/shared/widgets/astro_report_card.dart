import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'astro_card.dart';

/// Reusable report item card inspired by the benchmark visual reference.
///
/// Features:
/// - Circular dark thumbnail with colored cosmic icon/emblem
/// - Report title and prominent formatted price tag (e.g. ₹299)
/// - Concise explanatory description
/// - Status badge and action CTA
/// - Warm parchment card surface with crisp border
class AstroReportCard extends StatelessWidget {
  final String title;
  final String description;
  final String? price;
  final IconData icon;
  final Color iconColor;
  final Color? thumbnailBgColor;
  final String? badgeText;
  final String actionLabel;
  final VoidCallback onTap;
  final bool isCompleted;
  final bool isProcessing;
  final int? progressPercent;
  final VoidCallback? onDownloadTap;

  const AstroReportCard({
    super.key,
    required this.title,
    required this.description,
    this.price,
    this.icon = Icons.auto_awesome_rounded,
    this.iconColor = AppColors.gold,
    this.thumbnailBgColor,
    this.badgeText,
    this.actionLabel = 'Generate Report',
    required this.onTap,
    this.isCompleted = false,
    this.isProcessing = false,
    this.progressPercent,
    this.onDownloadTap,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveThumbnailBg = thumbnailBgColor ?? AppColors.primary;

    return AstroCard(
      variant: AstroCardVariant.warm,
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Dark Circular Cosmic Thumbnail
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: effectiveThumbnailBg,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: iconColor.withValues(alpha: 0.4),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: effectiveThumbnailBg.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Center(
                  child: Icon(icon, size: 22, color: iconColor),
                ),
              ),
              const SizedBox(width: 14),

              // 2. Title & Price Row
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            title,
                            style: AppTypography.titleLarge.copyWith(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (price != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            price!,
                            style: AppTypography.priceTag.copyWith(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.goldDark,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.35,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
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

          // 3. Status Badge & Actions Row
          if (badgeText != null || isProcessing || isCompleted) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppColors.cardBorderSubtle),
            const SizedBox(height: 10),
            Row(
              children: [
                if (badgeText != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.tintVioletBg,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.tintVioletBorder, width: 0.8),
                    ),
                    child: Text(
                      badgeText!,
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: AppColors.tintVioletText,
                      ),
                    ),
                  ),
                if (isProcessing) ...[
                  const SizedBox(width: 8),
                  Text(
                    'Generating (${progressPercent ?? 0}%)',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.warning,
                    ),
                  ),
                ],
                const Spacer(),
                if (isCompleted && onDownloadTap != null)
                  TextButton.icon(
                    onPressed: onDownloadTap,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: const Size(60, 32),
                    ),
                    icon: const Icon(Icons.download_rounded, size: 14, color: AppColors.secondary),
                    label: const Text(
                      'Download PDF',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.secondary),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
