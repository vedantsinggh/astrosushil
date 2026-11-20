import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_exception.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/error_banner.dart';
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

    return AstroPage(
      title: 'Planets',
      actions: [
        AstroNavAction(
          icon: Icons.help_outline_rounded,
          tooltip: 'About planetary positions',
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Planetary positions calculated using Lahiri Sidereal ephemeris.'),
              ),
            );
          },
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'See where each planet was positioned at the time of your birth.',
            style: AppTypography.bodyLarge.copyWith(
              fontSize: 16,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),

          if (chart != null && chart.planets.isNotEmpty && !(chartAsync?.isLoading ?? false)) ...[
            _buildPlanetsSummaryBar(chart),
            const SizedBox(height: 16),
          ],

          // Sushil Sir Explainer Button
          SushilExplainerButton(
            contextBuilder: () => _buildExplanationContext(chart, activeProfile),
            poseAsset: AppAssets.sushilExplaining,
          ),
          const SizedBox(height: 12),

          // Beginner Educational Explanation Card
          AstrologyExplanationCard(
            title: context.l10n.explainPlanetsTitle,
            whatIsText: context.l10n.explainPlanetsWhatIs,
            howToReadText: context.l10n.explainPlanetsHowToRead,
          ),

          const SizedBox(height: 12),
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
            const SizedBox(height: 12),
            const AstroSectionHeading('Planetary Placements'),
            AstroGroupedSection(
              dividerInset: 16 + 44 + 14,
              children: [
                for (final planet in chartAsync.valueOrNull!.planets)
                  _buildPlanetRow(
                    context,
                    planet,
                    chartAsync.valueOrNull?.ascendant?.rashiIndex ?? 1,
                  ),
              ],
            ),
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
    );
  }

  Widget _buildPlanetsSummaryBar(AstroChartModel chart) {
    final total = chart.planets.length;
    final retroCount = chart.planets.where((p) => p.isRetrograde).length;
    final directCount = total - retroCount;
    final divider = Container(height: 36, width: 1, color: Colors.white.withValues(alpha: 0.16));

    return AstroGradientCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 20),
      child: Row(
        children: [
          Expanded(child: _buildMetricItem('Total', '$total', Colors.white)),
          divider,
          Expanded(child: _buildMetricItem('Direct', '$directCount', AppColors.gold)),
          divider,
          Expanded(child: _buildMetricItem('Retro', '$retroCount', retroCount > 0 ? const Color(0xFFFDA4AF) : Colors.white)),
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
          textAlign: TextAlign.center,
          style: AppTypography.headlineLarge.copyWith(fontSize: 28, color: color, height: 1.1),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          textAlign: TextAlign.center,
          style: AppTypography.rowSubtitle.copyWith(fontSize: 14, color: AppColors.textInverseSecondary),
        ),
      ],
    );
  }

  Widget _buildPlanetRow(BuildContext context, PlanetModel planet, [int ascRashiIndex = 1]) {
    final houseNum = planet.calculateHouseNumber(ascRashiIndex);
    final degreeStr =
        '${planet.degreeInRashi.toStringAsFixed(0)}°${((planet.degreeInRashi % 1) * 60).round()}\'';

    void open() {
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
    }

    Widget badge(String text, Color bg, Color fg) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
          child: Text(text, style: TextStyle(fontFamily: AppTypography.bodyFamily, fontSize: 13, fontWeight: FontWeight.w700, color: fg)),
        );

    return MergeSemantics(
      child: Semantics(
        button: true,
        child: InkWell(
          onTap: open,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 64),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  _buildPlanetVisualIdentifier(planet.displayName),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Text(
                              planet.displayNameWithRetro,
                              style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
                            ),
                            if (planet.isRetrograde) badge('Retro', AppColors.tintRoseBg, AppColors.tintRoseText),
                            if (planet.formattedDignity.isNotEmpty)
                              badge(planet.formattedDignity, _getDignityBgColor(planet.dignity), _getDignityTextColor(planet.dignity)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${planet.rashiName} • $degreeStr',
                          style: AppTypography.rowSubtitle.copyWith(fontSize: 15),
                        ),
                        if (planet.nakshatraName.isNotEmpty)
                          Text(
                            '${planet.nakshatraName} • Pada ${planet.pada}',
                            style: AppTypography.rowSubtitle.copyWith(fontSize: 14, color: AppColors.textMuted),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AstroTint.indigo.background,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      'House $houseNum',
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accent,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(AstroIcons.chevron(context), color: AppColors.textMuted, size: 22),
                ],
              ),
            ),
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
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AstroTint.amber.background,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
        ),
        child: ClipOval(
          child: AstroImage(
            assetPath: assetPath,
            width: 40,
            height: 40,
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
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AstroTint.amber.background,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
      ),
      child: Icon(icon, color: AppColors.goldDark, size: 22),
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
}
