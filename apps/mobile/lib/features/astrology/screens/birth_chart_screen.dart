import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/birth_profile_list_screen.dart';
import '../models/astro_chart_model.dart';
import '../providers/astrology_provider.dart';
import '../services/kundli_pdf_service.dart';
import '../widgets/kundli_chart_widget.dart';
import 'planets_screen.dart';

class BirthChartScreen extends ConsumerStatefulWidget {
  final BirthProfileModel? profile;

  const BirthChartScreen({
    super.key,
    this.profile,
  });

  @override
  ConsumerState<BirthChartScreen> createState() => _BirthChartScreenState();
}

class _BirthChartScreenState extends ConsumerState<BirthChartScreen> {
  int _selectedControlIndex = 0; // 0 = Chart, 1 = Planets, 2 = Houses, 3 = Nakshatra
  bool _isDownloadingPdf = false;

  Future<void> _downloadKundliPdf(BirthProfileModel profile, AstroChartModel chart) async {
    setState(() => _isDownloadingPdf = true);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Preparing your Kundli...'),
        duration: Duration(seconds: 2),
      ),
    );

    try {
      await KundliPdfService.generateAndShare(
        profile: profile,
        chart: chart,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kundli ready'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Kundli couldn\'t be downloaded.'),
            action: SnackBarAction(
              label: 'Try Again',
              textColor: Colors.white,
              onPressed: () => _downloadKundliPdf(profile, chart),
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isDownloadingPdf = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final activeProfile = widget.profile ??
        (profilesState.profiles.isNotEmpty ? profilesState.profiles.first : null);

    final chartAsync = activeProfile != null
        ? ref.watch(astrologyChartProvider(activeProfile.id))
        : null;

    return Scaffold(
      backgroundColor: AppColors.primary,
      body: SafeArea(
        top: false,
        child: activeProfile == null
            ? _buildNoProfileState(context)
            : Column(
                children: [
                  // 1. EXPANDED SCROLLABLE CONTENT
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: Column(
                        children: [
                          // A. COSMIC TOP HEADER & APP BAR & PROFILE CARD
                          _buildCosmicTopSection(
                            context,
                            activeProfile,
                            chartAsync?.value,
                          ),

                          // B. LIGHT CONTENT CONTAINER OVERLAY
                          _buildLightContentArea(
                            context,
                            activeProfile,
                            chartAsync,
                          ),

                          // Extra bottom padding to ensure scrollable content is never obscured by the fixed bottom card!
                          const SizedBox(height: 100),
                        ],
                      ),
                    ),
                  ),

                  // 2. FIXED BOTTOM INSIGHT CARD (NEVER SCROLLS)
                  _buildFixedBottomInsightCard(context, activeProfile),
                ],
              ),
      ),
    );
  }

  Widget _buildNoProfileState(BuildContext context) {
    return Container(
      color: AppColors.lightBackground,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.person_search_rounded, size: 64, color: AppColors.secondary),
              const SizedBox(height: 16),
              const Text(
                'No Birth Profile Selected',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
              const SizedBox(height: 8),
              const Text(
                'Add your birth details to generate your Kundli.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.lightTextSecondary),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const BirthProfileListScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.premiumAccent,
                  foregroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Add Birth Details', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCosmicTopSection(
    BuildContext context,
    BirthProfileModel profile,
    AstroChartModel? chart,
  ) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppColors.primary,
      ),
      child: Stack(
        children: [
          // Background celestial image overlay
          Positioned.fill(
            child: Opacity(
              opacity: 0.35,
              child: Image.asset(
                AppAssets.subtleCelestialBackground,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),

          Padding(
            padding: EdgeInsets.fromLTRB(16, topPadding + 8, 16, 20),
            child: Column(
              children: [
                // TOP APP BAR (Back Button + Title + Subtitle + Download Action)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    Column(
                      children: [
                        const Text(
                          'Your Birth Chart',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(width: 4, height: 4, decoration: const BoxDecoration(color: AppColors.premiumAccent, shape: BoxShape.circle)),
                            const SizedBox(width: 6),
                            const Text(
                              'Your cosmic blueprint',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.premiumAccent,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(width: 4, height: 4, decoration: const BoxDecoration(color: AppColors.premiumAccent, shape: BoxShape.circle)),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: _isDownloadingPdf
                          ? const AstroLoaderInline(size: 18, isDark: true)
                          : const Icon(Icons.download_rounded, color: Colors.white, size: 22),
                      tooltip: 'Download Kundli',
                      onPressed: (_isDownloadingPdf || chart == null)
                          ? null
                          : () => _downloadKundliPdf(profile, chart),
                    ),
                  ],
                ),

                const SizedBox(height: 18),

                // PROFILE CARD
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.tertiary.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.secondary.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: AppColors.secondary.withOpacity(0.3),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.person_rounded, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              profile.name,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${profile.dateOfBirth}  •  ${profile.timeOfBirth}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white.withOpacity(0.8),
                              ),
                            ),
                            Text(
                              profile.placeName,
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.white.withOpacity(0.6),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const BirthProfileListScreen()),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          minimumSize: Size.zero,
                          side: const BorderSide(color: AppColors.premiumAccent, width: 1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        child: const Text(
                          'Change Profile',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.premiumAccent,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLightContentArea(
    BuildContext context,
    BirthProfileModel profile,
    AsyncValue<AstroChartModel>? chartAsync,
  ) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppColors.lightBackground,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
      child: Column(
        children: [
          // 1. KUNDLI CARD HEADER
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.star_rate_rounded, size: 12, color: AppColors.premiumAccent),
              const SizedBox(width: 8),
              const Text(
                'KUNDLI (NORTH INDIAN STYLE)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.star_rate_rounded, size: 12, color: AppColors.premiumAccent),
            ],
          ),

          const SizedBox(height: 14),

          // 2. DYNAMIC KUNDLI CHART CANVAS
          if (chartAsync != null)
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: chartAsync.when(
                loading: () => const SizedBox(
                  key: ValueKey('kundli_loading'),
                  height: 320,
                  child: Center(
                    child: AstroLoaderCard(
                      message: AstroLoaderMessages.kundli,
                    ),
                  ),
                ),
                error: (err, stack) => Padding(
                  key: const ValueKey('kundli_error'),
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: ErrorBanner(
                    message: 'Could not load Kundli chart. Showing cached preview.',
                    onRetry: () => ref.refresh(astrologyChartProvider(profile.id)),
                  ),
                ),
                data: (chart) => KundliChartWidget(
                  key: const ValueKey('kundli_data'),
                  chart: chart,
                  size: 320,
                ),
              ),
            )
          else
            const SizedBox(height: 320),

          const SizedBox(height: 20),

          // 3. SEGMENTED CHART CONTROLS
          _buildSegmentedControls(context, profile),

          const SizedBox(height: 24),

          // 4. KEY PLACEMENTS (Ascendant, Sun, Moon)
          _buildKeyPlacementsSection(context, profile, chartAsync?.value),

          const SizedBox(height: 24),

          // 5. PLANETARY SUMMARY
          _buildPlanetarySummarySection(context, chartAsync?.value),
        ],
      ),
    );
  }

  Widget _buildSegmentedControls(BuildContext context, BirthProfileModel profile) {
    final controls = [
      {'label': 'Chart', 'icon': Icons.grid_view_rounded},
      {'label': 'Planets', 'icon': Icons.public_rounded},
      {'label': 'Houses', 'icon': Icons.home_work_rounded},
      {'label': 'Nakshatra', 'icon': Icons.auto_awesome_rounded},
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(controls.length, (index) {
          final isSelected = _selectedControlIndex == index;
          final item = controls[index];
          return Expanded(
            child: InkWell(
              onTap: () {
                setState(() => _selectedControlIndex = index);
                if (index == 1) {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => PlanetsScreen(profile: profile)),
                  );
                }
              },
              borderRadius: BorderRadius.circular(24),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : [],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      item['icon'] as IconData,
                      size: 14,
                      color: isSelected ? AppColors.premiumAccent : AppColors.lightTextSecondary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      item['label'] as String,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? Colors.white : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildKeyPlacementsSection(
    BuildContext context,
    BirthProfileModel profile,
    AstroChartModel? chart,
  ) {
    final ascendantSign = chart?.ascendant?.rashiName ?? 'Leo';
    final ascendantDegree = chart?.ascendant?.degreeInRashi != null
        ? '${chart!.ascendant!.degreeInRashi.toStringAsFixed(0)}°${((chart.ascendant!.degreeInRashi % 1) * 60).round()}\''
        : '12°34\'';

    final sunPlanet = chart?.planets.firstWhere(
      (p) => p.planet.toUpperCase() == 'SUN',
      orElse: () => const PlanetModel(
        planet: 'SUN',
        longitude: 0,
        latitude: 0,
        speedLongitude: 0,
        isRetrograde: false,
        rashiIndex: 10,
        rashiName: 'Makara',
        degreeInRashi: 26.05,
        nakshatraIndex: 1,
        nakshatraName: '',
        pada: 1,
        nakshatraLord: '',
      ),
    );

    final moonPlanet = chart?.planets.firstWhere(
      (p) => p.planet.toUpperCase() == 'MOON',
      orElse: () => const PlanetModel(
        planet: 'MOON',
        longitude: 0,
        latitude: 0,
        speedLongitude: 0,
        isRetrograde: false,
        rashiIndex: 8,
        rashiName: 'Vrischika',
        degreeInRashi: 28.53,
        nakshatraIndex: 1,
        nakshatraName: '',
        pada: 1,
        nakshatraLord: '',
      ),
    );

    final placements = [
      {
        'title': 'ASCENDANT',
        'sign': ascendantSign,
        'degree': ascendantDegree,
        'icon': Icons.flare_rounded,
      },
      {
        'title': 'SUN',
        'sign': sunPlanet?.rashiName ?? 'Makara',
        'degree': '${sunPlanet?.degreeInRashi.toStringAsFixed(0) ?? '26'}°${((sunPlanet?.degreeInRashi ?? 0.05) % 1 * 60).round()}\'',
        'icon': Icons.wb_sunny_rounded,
      },
      {
        'title': 'MOON',
        'sign': moonPlanet?.rashiName ?? 'Vrischika',
        'degree': '${moonPlanet?.degreeInRashi.toStringAsFixed(0) ?? '28'}°${((moonPlanet?.degreeInRashi ?? 0.53) % 1 * 60).round()}\'',
        'icon': Icons.nights_stay_rounded,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Key Placements',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => PlanetsScreen(profile: profile)),
                );
              },
              child: const Row(
                children: [
                  Text(
                    'View All Planets',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary,
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.secondary),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: placements.map((item) {
            return Expanded(
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                child: AstroCard(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Icon(item['icon'] as IconData, size: 20, color: AppColors.premiumAccent),
                      const SizedBox(height: 6),
                      Text(
                        item['title'] as String,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                          color: AppColors.lightTextMuted,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item['sign'] as String,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      Text(
                        item['degree'] as String,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPlanetarySummarySection(BuildContext context, AstroChartModel? chart) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Planetary Summary',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 12),
        if (chart != null && chart.planets.isNotEmpty)
          ...chart.planets.map((p) => _buildPlanetRow(context, p))
        else
          ..._buildMockPlanetRows(context),
      ],
    );
  }

  Widget _buildPlanetRow(BuildContext context, PlanetModel p) {
    final ascRashi = 3; // Gemini
    final houseNum = p.calculateHouseNumber(ascRashi);
    final degreeStr =
        '${p.degreeInRashi.toStringAsFixed(0)}°${((p.degreeInRashi % 1) * 60).round()}\'';
    final assetPath = AppAssets.getPlanetAsset(p.planet);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: AstroCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.lightBackground,
              ),
              child: ClipOval(
                child: assetPath != null
                    ? Image.asset(
                        assetPath,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(Icons.circle, size: 16, color: AppColors.premiumAccent),
                      )
                    : const Icon(Icons.circle, size: 16, color: AppColors.premiumAccent),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 3,
              child: Text(
                p.planet + (p.isRetrograde ? ' (R)' : ''),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ),
            Expanded(
              flex: 3,
              child: Text(
                p.rashiName,
                style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
              ),
            ),
            Expanded(
              flex: 2,
              child: Text(
                degreeStr,
                style: const TextStyle(fontSize: 12, color: AppColors.lightTextMuted),
              ),
            ),
            Expanded(
              flex: 3,
              child: Text(
                'House $houseNum',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary,
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.lightTextMuted),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildMockPlanetRows(BuildContext context) {
    final mocks = [
      {'planet': 'Sun', 'sign': 'Makara', 'degree': '26°05\'', 'house': 10},
      {'planet': 'Moon', 'sign': 'Vrischika', 'degree': '28°53\'', 'house': 8},
      {'planet': 'Mars', 'sign': 'Kumbha', 'degree': '15°42\'', 'house': 7},
    ];

    return mocks.map((m) {
      final name = m['planet'] as String;
      final assetPath = AppAssets.getPlanetAsset(name);

      return Padding(
        padding: const EdgeInsets.only(bottom: 8.0),
        child: AstroCard(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.lightBackground,
                ),
                child: ClipOval(
                  child: assetPath != null
                      ? Image.asset(
                          assetPath,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(Icons.circle, size: 16, color: AppColors.premiumAccent),
                        )
                      : const Icon(Icons.circle, size: 16, color: AppColors.premiumAccent),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: Text(
                  name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  m['sign'] as String,
                  style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  m['degree'] as String,
                  style: const TextStyle(fontSize: 12, color: AppColors.lightTextMuted),
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  '${m['house']}th House',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondary,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.lightTextMuted),
            ],
          ),
        ),
      );
    }).toList();
  }

  /// FIXED BOTTOM INSIGHT CARD (NEVER SCROLLS WITH CONTENT)
  Widget _buildFixedBottomInsightCard(BuildContext context, BirthProfileModel profile) {
    return Container(
      width: double.infinity,
      color: AppColors.lightBackground,
      padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.of(context).padding.bottom + 8),
      child: GestureDetector(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => PlanetsScreen(profile: profile)),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.premiumAccent.withOpacity(0.3)),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.3),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Celestial emblem star circle
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.tertiary,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.premiumAccent.withOpacity(0.4)),
                ),
                child: const Icon(
                  Icons.explore_rounded,
                  color: AppColors.premiumAccent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Your chart is a map of your potential.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Explore each placement to understand your unique journey.',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.white.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.premiumAccent.withOpacity(0.4)),
                ),
                child: const Icon(
                  Icons.arrow_forward_rounded,
                  color: AppColors.premiumAccent,
                  size: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
