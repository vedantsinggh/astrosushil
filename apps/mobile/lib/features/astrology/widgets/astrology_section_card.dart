import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_card.dart';

/// Reusable container card for grouping related astrological features or data sections.
/// Features a structured header with optional leading icon, badge, subtitle, and action button.
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
    this.variant = AstroCardVariant.warm,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin,
      child: AstroCard(
        padding: padding,
        onTap: onTap,
        variant: variant,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Section Header
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: iconBackgroundColor ??
                          (iconColor != null
                              ? iconColor!.withValues(alpha: 0.12)
                              : AppColors.secondary.withValues(alpha: 0.12)),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Icon(
                        icon,
                        size: 16,
                        color: iconColor ?? AppColors.secondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                                letterSpacing: -0.2,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (badgeText != null) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: (badgeColor ?? AppColors.premiumAccent).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: (badgeColor ?? AppColors.premiumAccent).withValues(alpha: 0.4),
                                  width: 0.7,
                                ),
                              ),
                              child: Text(
                                badgeText!,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.4,
                                  color: badgeColor ?? AppColors.premiumAccent,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.lightTextSecondary,
                            height: 1.25,
                          ),
                          maxLines: 2,
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
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.all(4.0),
                        child: trailing!,
                      ),
                    )
                  else
                    trailing!,
                ],
              ],
            ),
            const SizedBox(height: 14),
            // Section Content Body
            child,
          ],
        ),
      ),
    );
  }
}
