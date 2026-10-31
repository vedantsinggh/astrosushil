import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme_tokens.dart';
import 'astro_card.dart';

/// Item model for a single column inside [AstroDataSummaryCard]
class AstroDataSummaryItem {
  final String label;
  final String value;
  final String? subValue;
  final IconData? icon;
  final Color? iconColor;

  const AstroDataSummaryItem({
    required this.label,
    required this.value,
    this.subValue,
    this.icon,
    this.iconColor,
  });
}

/// Reusable structured data summary card for Panchang, Dashas, Transits, etc.
///
/// Features:
/// - Crisp warm card surface
/// - Header with section title and optional "View Full →" action
/// - Clean horizontal columns with subtle vertical micro-dividers
/// - Supports 2 to 4 data items
class AstroDataSummaryCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? leadingIcon;
  final String? actionLabel;
  final VoidCallback? onActionTap;
  final List<AstroDataSummaryItem> items;
  final VoidCallback? onCardTap;

  const AstroDataSummaryCard({
    super.key,
    required this.title,
    this.subtitle,
    this.leadingIcon,
    this.actionLabel = 'View Full →',
    this.onActionTap,
    required this.items,
    this.onCardTap,
  });

  @override
  Widget build(BuildContext context) {
    return AstroCard(
      variant: AstroCardVariant.warm,
      padding: const EdgeInsets.all(16),
      onTap: onCardTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Row(
                  children: [
                    if (leadingIcon != null) ...[
                      Icon(leadingIcon, size: 18, color: AppColors.primary),
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: AppTypography.titleMedium.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (subtitle != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              subtitle!,
                              style: AppTypography.caption.copyWith(
                                color: AppColors.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (actionLabel != null && onActionTap != null)
                ConstrainedBox(
                  constraints: const BoxConstraints(
                    minHeight: AppTouchTargets.minTouchTarget,
                  ),
                  child: InkWell(
                    onTap: onActionTap,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                      child: Text(
                        actionLabel!,
                        style: AppTypography.labelMedium.copyWith(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.secondary,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.cardBorderSubtle),
          const SizedBox(height: 14),

          // Structured Items Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (int i = 0; i < items.length; i++) ...[
                if (i > 0)
                  Container(
                    height: 40,
                    width: 1,
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    color: AppColors.cardBorderSubtle,
                  ),
                Expanded(
                  child: _buildItemColumn(items[i]),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildItemColumn(AstroDataSummaryItem item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (item.icon != null) ...[
              Icon(
                item.icon,
                size: 12,
                color: item.iconColor ?? AppColors.secondary,
              ),
              const SizedBox(width: 4),
            ],
            Flexible(
              child: Text(
                item.label,
                style: AppTypography.caption.copyWith(
                  color: AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          item.value,
          style: AppTypography.titleSmall.copyWith(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        if (item.subValue != null) ...[
          const SizedBox(height: 2),
          Text(
            item.subValue!,
            style: AppTypography.caption.copyWith(
              fontSize: 10,
              color: AppColors.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }
}
