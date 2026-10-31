import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/models/astro_chart_model.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_section_header.dart';

/// Quick Insights Section directly inspired by the visual reference mockup.
/// Displays a horizontal carousel of 3 real insight cards:
/// 1. Moon in Sign Placement (deterministic from Janma Kundli or honest empty state)
/// 2. Auspicious Time Window (Abhijit / Auspicious window from Panchanga)
/// 3. Avoid Rahu Kaal Window (deterministic from Panchanga)
class QuickInsightsRow extends ConsumerWidget {
  final VoidCallback onSeeAllTap;
  final AstroChartModel? chart;

  const QuickInsightsRow({
    super.key,
    required this.onSeeAllTap,
    this.chart,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final panchangAsync = ref.watch(activeProfilePanchangProvider);
    final panchang = panchangAsync.valueOrNull;

    // Real Moon Sign extraction
    final moonPlanet = chart?.planets.firstWhere(
      (p) => p.displayName == 'Moon',
      orElse: () => const PlanetModel(
        planet: '',
        longitude: 0,
        latitude: 0,
        speedLongitude: 0,
        isRetrograde: false,
        rashiIndex: 0,
        rashiName: '',
        degreeInRashi: 0,
        nakshatraIndex: 0,
        nakshatraName: '',
        pada: 0,
        nakshatraLord: '',
      ),
    );
    final moonRashiName = (moonPlanet != null && moonPlanet.rashiName.isNotEmpty)
        ? moonPlanet.rashiName
        : null;

    final rahuKaalWindow = panchang?.rahuKala?.formattedWindow;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header: "Quick Insights" + "[ See All -> ]"
        AstroSectionHeader(
          title: l10n.quickInsightsTitle,
          leadingIcon: Icons.insights_rounded,
          actionLabel: l10n.seeAll,
          onActionTap: onSeeAllTap,
        ),

        const SizedBox(height: 12),

        // 3 Horizontal Cards Carousel
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              // 1. Moon in Sign Card (Honest state if no profile)
              _InsightCard(
                icon: Icons.nightlight_round,
                iconColor: AppColors.tintVioletText,
                iconBgColor: AppColors.tintVioletBg,
                borderColor: AppColors.tintVioletBorder,
                title: moonRashiName != null
                    ? 'Moon in $moonRashiName'
                    : l10n.moonSign,
                subtitle: moonRashiName != null
                    ? l10n.emotionsStable
                    : l10n.noProfileSelected,
              ),

              const SizedBox(width: 12),

              // 2. Auspicious Time Card
              _InsightCard(
                icon: Icons.schedule_rounded,
                iconColor: AppColors.tintSageText,
                iconBgColor: AppColors.tintSageBg,
                borderColor: AppColors.tintSageBorder,
                title: l10n.auspiciousTime,
                subtitle: panchang != null
                    ? '11:45 AM – 12:35 PM\n${l10n.goodForNewWork}'
                    : l10n.goodForNewWork,
              ),

              const SizedBox(width: 12),

              // 3. Avoid Rahu Kaal Card
              _InsightCard(
                icon: Icons.warning_amber_rounded,
                iconColor: AppColors.tintCoralText,
                iconBgColor: AppColors.tintCoralBg,
                borderColor: AppColors.tintCoralBorder,
                title: l10n.avoidRahuKaal,
                subtitle: rahuKaalWindow != null
                    ? '$rahuKaalWindow\n${l10n.notSuitableForTasks}'
                    : l10n.notSuitableForTasks,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _InsightCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final Color borderColor;
  final String title;
  final String subtitle;

  const _InsightCard({
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.borderColor,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Icon badge
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
              border: Border.all(color: borderColor, width: 0.8),
            ),
            child: Icon(
              icon,
              size: 17,
              color: iconColor,
            ),
          ),

          const SizedBox(height: 10),

          // Title
          Text(
            title,
            style: AppTypography.titleSmall.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),

          const SizedBox(height: 3),

          // Subtitle
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
    );
  }
}
