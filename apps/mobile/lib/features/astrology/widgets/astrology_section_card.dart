import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/astro_lists.dart';
import '../../../shared/widgets/astro_surfaces.dart';

/// Reusable container card for grouping related astrological features or data sections.
/// Features a structured header with optional leading icon, badge, subtitle, and action button.
///
/// Header text wraps rather than clipping so it stays readable at large
/// system text sizes.
class AstrologySectionCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final Color? iconBackgroundColor;
  final String? badgeText;
  final Color? badgeColor;
  final Widget? trailing;
  final VoidCallback? onTrailingTap;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onTap;
  final AstroCardVariant variant;

  const AstrologySectionCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.iconBackgroundColor,
    this.badgeText,
    this.badgeColor,
    this.trailing,
    this.onTrailingTap,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin = const EdgeInsets.only(bottom: 16),
    this.onTap,
    this.variant = AstroCardVariant.elevated,
  });

  @override
  Widget build(BuildContext context) {
    final accent = iconColor ?? AppColors.secondary;
    final badge = badgeColor ?? AppColors.secondary;

    return Padding(
      padding: margin,
      // `variant` is kept for API compatibility; every section now uses the
      // shared white surface (radius 20, soft shadow, hairline edge).
      child: AstroSurfaceCard(
        padding: padding,
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  AstroIconSquare(
                    icon: icon!,
                    size: 38,
                    tint: AstroTint(accent, iconBackgroundColor ?? accent.withValues(alpha: 0.12)),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          Semantics(
                            header: true,
                            child: Text(
                              title,
                              style: AppTypography.headlineLarge.copyWith(fontSize: 19, height: 1.25, letterSpacing: -0.2),
                            ),
                          ),
                          if (badgeText != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: badge.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                badgeText!,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: badge,
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.lightTextSecondary,
                            height: 1.35,
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) ...[
                  const SizedBox(width: 8),
                  if (onTrailingTap != null)
                    InkWell(
                      onTap: onTrailingTap,
                      borderRadius: BorderRadius.circular(12),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                        child: Center(child: trailing!),
                      ),
                    )
                  else
                    trailing!,
                ],
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}
