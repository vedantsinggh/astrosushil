import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_exception.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../models/astro_chart_model.dart';
import '../providers/astrology_provider.dart';
import 'planet_detail_screen.dart';

class PlanetsScreen extends ConsumerWidget {
  final BirthProfileModel? profile;

  const PlanetsScreen({
    super.key,
    this.profile,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedProfile = ref.watch(selectedBirthProfileProvider);
    final activeProfile = profile ?? selectedProfile;

    final chartAsync = activeProfile != null
        ? ref.watch(astrologyChartForProfileProvider(activeProfile))
        : null;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
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
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'See where each planet was positioned at the time of your birth.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.lightTextSecondary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 18),
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
                    chartAsync.valueOrNull!.planets.isNotEmpty)
                  ...chartAsync.valueOrNull!.planets.map((planet) => _buildPlanetRow(
                        context,
                        planet,
                        chartAsync.valueOrNull?.ascendant?.rashiIndex ?? 1,
                      ))
                else
                  ..._buildMockPlanetRows(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlanetRow(BuildContext context, PlanetModel planet, [int ascRashiIndex = 1]) {
    final houseNum = planet.calculateHouseNumber(ascRashiIndex);
    final degreeStr =
        '${planet.degreeInRashi.toStringAsFixed(0)}°${((planet.degreeInRashi % 1) * 60).round()}\'';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: AstroCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
        child: Row(
          children: [
            _buildPlanetVisualIdentifier(planet.displayName),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    planet.displayNameWithRetro,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${planet.rashiName} • $degreeStr',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              'House $houseNum',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.secondary,
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.lightTextMuted,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildMockPlanetRows(BuildContext context) {
    final mockPlanets = [
      {'name': 'Sun', 'sign': 'Leo', 'degree': '18°24\'', 'house': 5, 'retro': false},
      {'name': 'Moon', 'sign': 'Scorpio', 'degree': '02°14\'', 'house': 6, 'retro': false},
      {'name': 'Mars', 'sign': 'Virgo', 'degree': '24°11\'', 'house': 4, 'retro': false},
      {'name': 'Mercury', 'sign': 'Leo', 'degree': '09°33\'', 'house': 5, 'retro': false},
      {'name': 'Jupiter', 'sign': 'Cancer', 'degree': '14°02\'', 'house': 2, 'retro': false},
      {'name': 'Venus', 'sign': 'Gemini', 'degree': '27°41\'', 'house': 1, 'retro': false},
      {'name': 'Saturn (R)', 'sign': 'Taurus', 'degree': '21°18\'', 'house': 12, 'retro': true},
      {'name': 'Rahu', 'sign': 'Gemini', 'degree': '10°05\'', 'house': 1, 'retro': false},
      {'name': 'Ketu', 'sign': 'Sagittarius', 'degree': '10°05\'', 'house': 7, 'retro': false},
    ];

    return mockPlanets.map((m) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 10.0),
        child: AstroCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => PlanetDetailScreen(
                  planetName: m['name'] as String,
                  signName: m['sign'] as String,
                  degree: m['degree'] as String,
                  houseNumber: m['house'] as int,
                  isRetrograde: m['retro'] as bool,
                ),
              ),
            );
          },
          child: Row(
            children: [
              _buildPlanetVisualIdentifier(m['name'] as String),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m['name'] as String,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${m['sign']} • ${m['degree']}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                'House ${m['house']}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.lightTextMuted,
                size: 20,
              ),
            ],
          ),
        ),
      );
    }).toList();
  }

  Widget _buildPlanetVisualIdentifier(String name) {
    final cleanName = name.replaceAll('(R)', '').trim();
    final assetPath = AppAssets.getPlanetAsset(cleanName);

    if (assetPath != null) {
      return Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.lightSurface,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.lightBorder),
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
        color: AppColors.primary.withOpacity(0.06),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.primary.withOpacity(0.1)),
      ),
      child: Icon(icon, color: AppColors.premiumAccent, size: 20),
    );
  }
}
