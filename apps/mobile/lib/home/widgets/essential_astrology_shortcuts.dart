import 'package:flutter/material.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/astro_feature_tile.dart';
import '../../shared/widgets/astro_section_header.dart';

/// Essential Astrology Shortcuts section on Home Screen directly inspired by the benchmark mockup.
/// Features compact, visually distinct pastel tiles for Birth Chart, Planetary Positions,
/// Dasha Timeline, and Kundli Matching with minimum 48x48dp touch bounds.
class EssentialAstrologyShortcutsGrid extends StatelessWidget {
  final VoidCallback onBirthChartTap;
  final VoidCallback onPlanetsTap;
  final VoidCallback onDashaTap;
  final VoidCallback onMatchmakingTap;
  final VoidCallback? onReportsTap;
  final VoidCallback? onConsultTap;

  const EssentialAstrologyShortcutsGrid({
    super.key,
    required this.onBirthChartTap,
    required this.onPlanetsTap,
    required this.onDashaTap,
    required this.onMatchmakingTap,
    this.onReportsTap,
    this.onConsultTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AstroSectionHeader(
          title: l10n.sectionKeyFeatures,
          leadingIcon: Icons.stars_rounded,
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: AstroFeatureTile(
                label: l10n.toolBirthChart,
                icon: Icons.auto_awesome_rounded,
                backgroundColor: AppColors.tintVioletBg,
                iconColor: AppColors.tintVioletText,
                borderColor: AppColors.tintVioletBorder,
                onTap: onBirthChartTap,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AstroFeatureTile(
                label: l10n.toolPlanets,
                icon: Icons.public_rounded,
                backgroundColor: AppColors.tintSkyBg,
                iconColor: AppColors.tintSkyText,
                borderColor: AppColors.tintSkyBorder,
                onTap: onPlanetsTap,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AstroFeatureTile(
                label: l10n.toolDasha,
                icon: Icons.timeline_rounded,
                backgroundColor: AppColors.tintAmberBg,
                iconColor: AppColors.tintAmberText,
                borderColor: AppColors.tintAmberBorder,
                onTap: onDashaTap,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AstroFeatureTile(
                label: l10n.toolMatchmaking,
                icon: Icons.favorite_rounded,
                backgroundColor: AppColors.tintRoseBg,
                iconColor: AppColors.tintRoseText,
                borderColor: AppColors.tintRoseBorder,
                onTap: onMatchmakingTap,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

