import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_exception.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_explanation_card.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../models/astro_chart_model.dart';
import '../providers/astrology_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import 'planet_detail_screen.dart';

class PlanetsScreen extends ConsumerWidget {
  final BirthProfileModel? profile;

  const PlanetsScreen({
    super.key,
    this.profile,
  });

  ExplanationContext _buildExplanationContext(
    AstroChartModel? chart,
    BirthProfileModel? profile,
  ) {
    final planetsData = chart != null && chart.planets.isNotEmpty
        ? {
            'ascendant': {
              'rashi': chart.ascendant?.rashiName,
              'degree': chart.ascendant?.degreeInRashi,
            },
            'planets': chart.planets.map((p) => {
              'name': p.displayName,
              'rashi': p.rashiName,
              'degree': p.degreeInRashi,
              'isRetrograde': p.isRetrograde,
              'house': p.calculateHouseNumber(chart.ascendant?.rashiIndex ?? 1),
              'nakshatra': p.nakshatraName,
            }).toList(),
          }
        : <String, dynamic>{};

    return ExplanationContext(
      feature: 'planets',
      screenTitle: 'Planetary Placements',
      purpose: 'Explain what the displayed planetary positions and house alignments indicate in plain, accessible terms.',
      astrologyData: planetsData,
      importantValues: {
        'totalPlanets': chart?.planets.length ?? 0,
        'retrogradeCount': chart?.planets.where((p) => p.isRetrograde).length ?? 0,
      },
      userProfileContext: profile != null ? {
        'name': profile.name,
      } : null,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedProfile = ref.watch(selectedBirthProfileProvider);
    final activeProfile = profile ?? selectedProfile;

    final chartAsync = activeProfile != null
        ? ref.watch(astrologyChartForProfileProvider(activeProfile))
        : null;
    final chart = chartAsync?.valueOrNull;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AstroAppBar(
        title: 'Planets',
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded, color: AppColors.primary),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Planetary positions calculated using Lahiri Sidereal ephemeris.'),
                ),
              );
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'See where each planet was positioned at the time of your birth.',
                  style: TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 14,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 14),

                // Sushil Sir Explainer Button
                SushilExplainerButton(
                  contextBuilder: () => _buildExplanationContext(chart, activeProfile),
                  poseAsset: AppAssets.sushilExplaining,
                ),

                // Beginner Educational Explanation Card
                AstrologyExplanationCard(
                  title: context.l10n.explainPlanetsTitle,
                  whatIsText: context.l10n.explainPlanetsWhatIs,
                  howToReadText: context.l10n.explainPlanetsHowToRead,
                ),

                const SizedBox(height: 8),
                if (chartAsync != null && chartAsync.isLoading)
                  const AstroLoaderCard(
                    message: AstroLoaderMessages.planetaryData,
                  )
                else if (chartAsync != null && chartAsync.hasError)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12.0),
                    child: ErrorBanner(
                      message: chartAsync.error is AppException
                          ? (chartAsync.error as AppException).message
                          : 'Something went wrong while loading your chart.',
                      onRetry: activeProfile != null
                          ? () => ref.refresh(astrologyChartForProfileProvider(activeProfile))
                          : null,
                    ),
                  )
                else if (chartAsync != null &&
                    chartAsync.valueOrNull != null &&
                    chartAsync.valueOrNull!.planets.isNotEmpty) ...[
                  _buildPlanetsSummaryBar(chartAsync.valueOrNull!),
                  ...chartAsync.valueOrNull!.planets.map((planet) => _buildPlanetRow(
                        context,
                        planet,
                        chartAsync.valueOrNull?.ascendant?.rashiIndex ?? 1,
                      )),
                ]
                else
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20.0),
                    child: AstrologyEmptyState(
                      title: context.l10n.dataNotAvailable,
                      message: activeProfile != null
                          ? 'No planetary placements calculated for ${activeProfile.name}.'
                          : 'Please select or add a birth profile to view planetary positions.',
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlanetsSummaryBar(AstroChartModel chart) {
    final total = chart.planets.length;
    final retroCount = chart.planets.where((p) => p.isRetrograde).length;
    final directCount = total - retroCount;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceParchment,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorderSubtle, width: 1.0),
      ),
      child: Row(
        children: [
          Expanded(child: _buildMetricItem('TOTAL', '$total', AppColors.primary)),
          Container(height: 24, width: 1, color: AppColors.cardBorder),
          Expanded(child: _buildMetricItem('DIRECT', '$directCount', AppColors.tintSageText)),
          Container(height: 24, width: 1, color: AppColors.cardBorder),
          Expanded(child: _buildMetricItem('RETRO', '$retroCount', retroCount > 0 ? AppColors.tintRoseText : AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: TextStyle(
            fontFamily: AppTypography.headingFamily,
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 9.5,
            fontWeight: FontWeight.w600,
            color: AppColors.textMuted,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildPlanetRow(BuildContext context, PlanetModel planet, [int ascRashiIndex = 1]) {
    final houseNum = planet.calculateHouseNumber(ascRashiIndex);
    final degreeStr =
        '${planet.degreeInRashi.toStringAsFixed(0)}°${((planet.degreeInRashi % 1) * 60).round()}\'';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => PlanetDetailScreen(
                planetName: planet.displayNameWithRetro,
                signName: planet.rashiName,
                degree: degreeStr,
                houseNumber: houseNum,
                isRetrograde: planet.isRetrograde,
                nakshatraName: planet.nakshatraName,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.cardSurfaceWarm,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.cardBorder, width: 1.0),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              _buildPlanetVisualIdentifier(planet.displayName),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 2,
                      children: [
                        Text(
                          planet.displayNameWithRetro,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        if (planet.isRetrograde)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.tintRoseBg,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: AppColors.tintRoseBorder, width: 0.8),
                            ),
                            child: const Text(
                              'RETRO',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: AppColors.tintRoseText,
                              ),
                            ),
                          ),
                        if (planet.formattedDignity.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getDignityBgColor(planet.dignity),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: _getDignityBorderColor(planet.dignity), width: 0.8),
                            ),
                            child: Text(
                              planet.formattedDignity,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: _getDignityTextColor(planet.dignity),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${planet.rashiName} • $degreeStr',
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    if (planet.nakshatraName.isNotEmpty)
                      Text(
                        '${planet.nakshatraName} • Pada ${planet.pada}',
                        style: const TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'House $houseNum',
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted,
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanetVisualIdentifier(String name) {
    final cleanName = name.replaceAll('(R)', '').trim();
    final assetPath = AppAssets.getPlanetAsset(cleanName);

    if (assetPath != null) {
      return Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.06),
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.cardBorder),
        ),
        child: ClipOval(
          child: AstroImage(
            assetPath: assetPath,
            width: 36,
            height: 36,
            fit: BoxFit.contain,
            fallback: AstroImageFallback.icon,
            semanticLabel: '$cleanName planet',
          ),
        ),
      );
    }
    return _buildFallbackVectorIcon(cleanName);
  }

  Widget _buildFallbackVectorIcon(String cleanName) {
    IconData icon;
    switch (cleanName.toUpperCase()) {
      case 'SUN':
        icon = Icons.wb_sunny_rounded;
        break;
      case 'MOON':
        icon = Icons.nights_stay_rounded;
        break;
      case 'MARS':
        icon = Icons.local_fire_department_rounded;
        break;
      case 'MERCURY':
        icon = Icons.auto_awesome_rounded;
        break;
      case 'JUPITER':
        icon = Icons.military_tech_rounded;
        break;
      case 'VENUS':
        icon = Icons.favorite_rounded;
        break;
      case 'SATURN':
        icon = Icons.hourglass_bottom_rounded;
        break;
      case 'RAHU':
        icon = Icons.all_inclusive_rounded;
        break;
      case 'KETU':
        icon = Icons.trip_origin_rounded;
        break;
      default:
        icon = Icons.circle_outlined;
    }

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Icon(icon, color: AppColors.gold, size: 20),
    );
  }

  Color _getDignityBgColor(String? dignity) {
    final d = dignity?.toUpperCase() ?? '';
    if (d.contains('EXALT') || d.contains('UCHA')) return AppColors.tintSageBg;
    if (d.contains('DEBIL') || d.contains('NICHA')) return AppColors.tintRoseBg;
    if (d.contains('OWN') || d.contains('SWA')) return AppColors.tintAmberBg;
    if (d.contains('MOOLA')) return AppColors.tintVioletBg;
    return AppColors.cardSurfaceParchment;
  }

  Color _getDignityTextColor(String? dignity) {
    final d = dignity?.toUpperCase() ?? '';
    if (d.contains('EXALT') || d.contains('UCHA')) return AppColors.tintSageText;
    if (d.contains('DEBIL') || d.contains('NICHA')) return AppColors.tintRoseText;
    if (d.contains('OWN') || d.contains('SWA')) return AppColors.tintAmberText;
    if (d.contains('MOOLA')) return AppColors.tintVioletText;
    return AppColors.textSecondary;
  }

  Color _getDignityBorderColor(String? dignity) {
    final d = dignity?.toUpperCase() ?? '';
    if (d.contains('EXALT') || d.contains('UCHA')) return AppColors.tintSageBorder;
    if (d.contains('DEBIL') || d.contains('NICHA')) return AppColors.tintRoseBorder;
    if (d.contains('OWN') || d.contains('SWA')) return AppColors.tintAmberBorder;
    if (d.contains('MOOLA')) return AppColors.tintVioletBorder;
    return AppColors.cardBorder;
  }
}
