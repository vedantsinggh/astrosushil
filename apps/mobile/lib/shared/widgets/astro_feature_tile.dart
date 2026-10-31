import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme_tokens.dart';

/// Reusable compact feature shortcut tile for Astro Sushil dashboard and hubs.
///
/// Implements the soft pastel rounded tiles from the benchmark reference image:
/// - Distinct pastel background tint
/// - High-contrast matching icon
/// - Refined typography
/// - Minimum 48x48 touch target
class AstroFeatureTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final Color backgroundColor;
  final Color iconColor;
  final Color? borderColor;
  final String? badgeText;
  final double iconSize;

  const AstroFeatureTile({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
    this.backgroundColor = AppColors.tintVioletBg,
    this.iconColor = AppColors.tintVioletText,
    this.borderColor,
    this.badgeText,
    this.iconSize = 24,
  });

  /// Factory for Birth Chart / Kundli (Lavender / Violet)
  factory AstroFeatureTile.kundli({
    Key? key,
    required String label,
    required VoidCallback onTap,
    String? badgeText,
  }) {
    return AstroFeatureTile(
      key: key,
      label: label,
      icon: Icons.auto_awesome_rounded,
      onTap: onTap,
      backgroundColor: AppColors.tintVioletBg,
      iconColor: AppColors.tintVioletText,
      borderColor: AppColors.tintVioletBorder,
      badgeText: badgeText,
    );
  }

  /// Factory for Dashas (Warm Gold / Amber)
  factory AstroFeatureTile.dashas({
    Key? key,
    required String label,
    required VoidCallback onTap,
    String? badgeText,
  }) {
    return AstroFeatureTile(
      key: key,
      label: label,
      icon: Icons.wb_sunny_rounded,
      onTap: onTap,
      backgroundColor: AppColors.tintAmberBg,
      iconColor: AppColors.tintAmberText,
      borderColor: AppColors.tintAmberBorder,
      badgeText: badgeText,
    );
  }

  /// Factory for Transits / Gochara (Celestial Blue)
  factory AstroFeatureTile.transits({
    Key? key,
    required String label,
    required VoidCallback onTap,
    String? badgeText,
  }) {
    return AstroFeatureTile(
      key: key,
      label: label,
      icon: Icons.public_rounded,
      onTap: onTap,
      backgroundColor: AppColors.tintSkyBg,
      iconColor: AppColors.tintSkyText,
      borderColor: AppColors.tintSkyBorder,
      badgeText: badgeText,
    );
  }

  /// Factory for Match Making (Blush Rose)
  factory AstroFeatureTile.matchmaking({
    Key? key,
    required String label,
    required VoidCallback onTap,
    String? badgeText,
  }) {
    return AstroFeatureTile(
      key: key,
      label: label,
      icon: Icons.favorite_rounded,
      onTap: onTap,
      backgroundColor: AppColors.tintRoseBg,
      iconColor: AppColors.tintRoseText,
      borderColor: AppColors.tintRoseBorder,
      badgeText: badgeText,
    );
  }

  /// Factory for Panchanga (Warm Terracotta / Coral)
  factory AstroFeatureTile.panchanga({
    Key? key,
    required String label,
    required VoidCallback onTap,
    String? badgeText,
  }) {
    return AstroFeatureTile(
      key: key,
      label: label,
      icon: Icons.calendar_month_rounded,
      onTap: onTap,
      backgroundColor: AppColors.tintCoralBg,
      iconColor: AppColors.tintCoralText,
      borderColor: AppColors.tintCoralBorder,
      badgeText: badgeText,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(
        minWidth: AppTouchTargets.minTouchTarget,
        minHeight: AppTouchTargets.minTouchTarget,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: borderColor ?? backgroundColor,
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: iconColor.withValues(alpha: 0.12),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Icon(
                      icon,
                      size: iconSize,
                      color: iconColor,
                    ),
                  ),
                ),
                if (badgeText != null)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.gold,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText!,
                        style: const TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: 68,
              child: Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.titleSmall.copyWith(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.15,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
