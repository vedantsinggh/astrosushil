import 'package:flutter/material.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/astro_feature_tile.dart';

/// Quick-Access Feature Row directly inspired by the visual reference mockup.
/// Displays 5 core astrology destinations: Birth Chart, Dashas, Transits, Match Making, Panchanga
/// using standardized [AstroFeatureTile] with accessible touch targets (>= 48x48dp).
class QuickFeatureRow extends StatelessWidget {
  final VoidCallback onBirthChartTap;
  final VoidCallback onDashasTap;
  final VoidCallback onTransitsTap;
  final VoidCallback onMatchmakingTap;
  final VoidCallback onPanchangaTap;

  const QuickFeatureRow({
    super.key,
    required this.onBirthChartTap,
    required this.onDashasTap,
    required this.onTransitsTap,
    required this.onMatchmakingTap,
    required this.onPanchangaTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: AstroFeatureTile(
            icon: Icons.auto_awesome_rounded,
            label: l10n.toolBirthChart,
            backgroundColor: AppColors.tintVioletBg,
            iconColor: AppColors.tintVioletText,
            borderColor: AppColors.tintVioletBorder,
            onTap: onBirthChartTap,
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: AstroFeatureTile(
            icon: Icons.timeline_rounded,
            label: l10n.dashasShort,
            backgroundColor: AppColors.tintAmberBg,
            iconColor: AppColors.tintAmberText,
            borderColor: AppColors.tintAmberBorder,
            onTap: onDashasTap,
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: AstroFeatureTile(
            icon: Icons.sync_alt_rounded,
            label: l10n.transitsShort,
            backgroundColor: AppColors.tintSkyBg,
            iconColor: AppColors.tintSkyText,
            borderColor: AppColors.tintSkyBorder,
            onTap: onTransitsTap,
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: AstroFeatureTile(
            icon: Icons.favorite_rounded,
            label: l10n.matchmakingShort,
            backgroundColor: AppColors.tintRoseBg,
            iconColor: AppColors.tintRoseText,
            borderColor: AppColors.tintRoseBorder,
            onTap: onMatchmakingTap,
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: AstroFeatureTile(
            icon: Icons.spa_rounded,
            label: l10n.toolPanchanga,
            backgroundColor: AppColors.tintCoralBg,
            iconColor: AppColors.tintCoralText,
            borderColor: AppColors.tintCoralBorder,
            onTap: onPanchangaTap,
          ),
        ),
      ],
    );
  }
}

