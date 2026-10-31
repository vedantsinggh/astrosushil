import 'package:flutter/material.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_section_header.dart';

/// 2x2 Business & Learning Shortcuts Grid directly inspired by the visual reference mockup.
/// Provides visually rich entry points to Personalized Reports, Consultations, Courses, and Shop.
class BusinessShortcutsGrid extends StatelessWidget {
  final VoidCallback onReportsTap;
  final VoidCallback onConsultTap;
  final VoidCallback onCoursesTap;
  final VoidCallback onShopTap;

  const BusinessShortcutsGrid({
    super.key,
    required this.onReportsTap,
    required this.onConsultTap,
    required this.onCoursesTap,
    required this.onShopTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AstroSectionHeader(
          title: 'Explore Astro Sushil',
          leadingIcon: Icons.explore_rounded,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _BusinessShortcutTile(
                title: l10n.reportsTitle,
                subtitle: 'Detailed PDF reports for deeper insights',
                icon: Icons.description_rounded,
                iconColor: AppColors.tintRoseText,
                backgroundColor: AppColors.tintRoseBg,
                borderColor: AppColors.tintRoseBorder,
                onTap: onReportsTap,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _BusinessShortcutTile(
                title: 'Consultations',
                subtitle: 'Book an online consultation',
                icon: Icons.support_agent_rounded,
                iconColor: AppColors.tintAmberText,
                backgroundColor: AppColors.tintAmberBg,
                borderColor: AppColors.tintAmberBorder,
                onTap: onConsultTap,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _BusinessShortcutTile(
                title: l10n.coursesShortcutTitle,
                subtitle: l10n.coursesShortcutSubtitle,
                icon: Icons.school_rounded,
                iconColor: AppColors.tintSkyText,
                backgroundColor: AppColors.tintSkyBg,
                borderColor: AppColors.tintSkyBorder,
                onTap: onCoursesTap,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _BusinessShortcutTile(
                title: l10n.shopShortcutTitle,
                subtitle: l10n.shopShortcutSubtitle,
                icon: Icons.shopping_bag_rounded,
                iconColor: AppColors.tintSageText,
                backgroundColor: AppColors.tintSageBg,
                borderColor: AppColors.tintSageBorder,
                onTap: onShopTap,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _BusinessShortcutTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color backgroundColor;
  final Color borderColor;
  final VoidCallback onTap;

  const _BusinessShortcutTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.backgroundColor,
    required this.borderColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$title: $subtitle',
      child: Material(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            constraints: const BoxConstraints(minHeight: 112),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: borderColor,
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: iconColor.withValues(alpha: 0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top: Icon badge + circular arrow
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.8),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor, width: 0.8),
                      ),
                      child: Icon(
                        icon,
                        size: 20,
                        color: iconColor,
                      ),
                    ),
                    Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        size: 16,
                        color: iconColor,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Bottom: Title and Subtitle
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: AppTypography.titleSmall.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: -0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: AppTypography.caption.copyWith(
                        color: AppColors.lightTextSecondary,
                        height: 1.25,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
