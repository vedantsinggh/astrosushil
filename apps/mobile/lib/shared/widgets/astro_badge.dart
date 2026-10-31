import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme_tokens.dart';

enum AstroBadgeStyle {
  solid,
  pastel,
  outline,
  gold,
}

/// Reusable status badge and metadata label.
class AstroBadge extends StatelessWidget {
  final String text;
  final AstroBadgeStyle style;
  final Color? color;
  final IconData? icon;
  final EdgeInsetsGeometry padding;

  const AstroBadge({
    super.key,
    required this.text,
    this.style = AstroBadgeStyle.pastel,
    this.color,
    this.icon,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
  });

  /// Factory constructor for "Most Popular" or premium highlight
  const AstroBadge.popular({
    super.key,
    this.text = 'Most Popular',
    this.icon = Icons.star_rounded,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
  })  : style = AstroBadgeStyle.gold,
        color = null;

  /// Factory constructor for "100% Deterministic" verified calculation engine
  const AstroBadge.deterministic({
    super.key,
    this.text = '100% Deterministic',
    this.icon = Icons.verified_rounded,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
  })  : style = AstroBadgeStyle.pastel,
        color = AppColors.success;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Border? border;

    final primaryColor = color ?? AppColors.primary;

    switch (style) {
      case AstroBadgeStyle.solid:
        bg = primaryColor;
        fg = Colors.white;
        break;
      case AstroBadgeStyle.pastel:
        bg = primaryColor.withValues(alpha: 0.10);
        fg = primaryColor;
        border = Border.all(color: primaryColor.withValues(alpha: 0.25), width: 1);
        break;
      case AstroBadgeStyle.outline:
        bg = Colors.transparent;
        fg = primaryColor;
        border = Border.all(color: primaryColor, width: 1);
        break;
      case AstroBadgeStyle.gold:
        bg = AppColors.saffronLight;
        fg = AppColors.goldDark;
        border = Border.all(color: AppColors.gold.withValues(alpha: 0.4), width: 1);
        break;
    }

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: border,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: AppTypography.labelSmall.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: fg,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}

/// Interactive metadata chip for profile switching, categories, and filters
class AstroMetadataChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final IconData? leadingIcon;
  final Color? activeColor;

  const AstroMetadataChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.leadingIcon,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveActiveColor = activeColor ?? AppColors.primary;

    return ConstrainedBox(
      constraints: const BoxConstraints(
        minHeight: AppTouchTargets.minTouchTarget,
        minWidth: AppTouchTargets.minTouchTarget,
      ),
      child: Center(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected ? effectiveActiveColor : AppColors.cardSurfaceWarm,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isSelected ? effectiveActiveColor : AppColors.cardBorder,
                width: 1,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: effectiveActiveColor.withValues(alpha: 0.18),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (leadingIcon != null) ...[
                  Icon(
                    leadingIcon,
                    size: 14,
                    color: isSelected ? Colors.white : AppColors.secondary,
                  ),
                  const SizedBox(width: 6),
                ],
                Text(
                  label,
                  style: AppTypography.labelMedium.copyWith(
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
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
