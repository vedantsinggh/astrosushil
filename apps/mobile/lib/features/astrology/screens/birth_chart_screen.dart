import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/astro_chart_model.dart';
import '../providers/astrology_provider.dart';
import '../services/kundli_pdf_service.dart';
import '../widgets/astrology_adaptive_grid.dart';
import '../widgets/astrology_explanation_card.dart';
import '../widgets/astrology_tab_bar.dart';
import '../widgets/kundli_chart_widget.dart';
import 'divisional_charts_screen.dart';
import 'planet_detail_screen.dart';

/// Redesigned Birth Chart Screen (Janma Kundli)
/// Prominent North Indian Kundli chart using real calculated placements,
/// interactive tabs for Chart, Planets, Houses, and Nakshatra,
/// and complete beginner educational layer.
class BirthChartScreen extends ConsumerStatefulWidget {
  final BirthProfileModel? profile;
  final int initialTabIndex;

  const BirthChartScreen({
    super.key,
    this.profile,
    this.initialTabIndex = 0,
  });

  @override
  ConsumerState<BirthChartScreen> createState() => _BirthChartScreenState();
}

class _BirthChartScreenState extends ConsumerState<BirthChartScreen> {
  late int _selectedControlIndex; // 0 = Chart, 1 = Planets, 2 = Houses, 3 = Nakshatra
  bool _isDownloadingPdf = false;
  BirthProfileModel? _selectedProfileOverride;

  @override
  void initState() {
    super.initState();
    _selectedControlIndex = widget.initialTabIndex;
  }

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
    final selectedProfile = ref.watch(selectedBirthProfileProvider);
    final activeProfile = _selectedProfileOverride ?? widget.profile ?? selectedProfile;

    final chartAsync = activeProfile != null
        ? ref.watch(astrologyChartForProfileProvider(activeProfile))
        : null;
    final chart = chartAsync?.valueOrNull;

    if (activeProfile == null) return _buildNoProfileState(context);

    return AstroPage(
      title: 'Your Birth Chart',
      actions: [
        if (_isDownloadingPdf)
          const SizedBox(
            width: 48,
            height: 48,
            child: Center(child: AstroLoaderInline(size: 18, isDark: false)),
          )
        else
          AstroNavAction(
            icon: Icons.download_rounded,
            tooltip: 'Download Kundli PDF',
            onPressed: chart == null ? null : () => _downloadKundliPdf(activeProfile, chart),
          ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // A. PROFILE SUMMARY (the one hero card)
          _buildProfileHero(context, activeProfile, profilesState.profiles),
          const SizedBox(height: 20),

          // B. MAIN CONTENT (tabs, Sushil Sir explainer, chart data)
          _buildLightContentArea(
            context,
            activeProfile,
            chartAsync,
            explainer: SushilExplainerButton(
              contextData: _buildExplanationContext(activeProfile, chart),
              isCompact: false,
            ),
          ),

          // C. INTEGRATED CLOSING INSIGHT BANNER
          _buildClosingInsightCard(context, activeProfile),
        ],
      ),
    );
  }

  Widget _buildNoProfileState(BuildContext context) {
    return AstroPage(
      title: 'Your Birth Chart',
      child: Padding(
        padding: const EdgeInsets.only(top: 24),
        child: AstroSurfaceCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: AstroStateView.empty(
            compact: true,
            icon: Icons.person_search_rounded,
            tint: AstroTint.amber,
            title: 'No Birth Profile Selected',
            message: 'Add your birth details to generate your Kundli.',
            actionLabel: 'Add Birth Details',
            onAction: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
              );
            },
          ),
        ),
      ),
    );
  }

  Future<void> _pickProfile(BirthProfileModel activeProfile, List<BirthProfileModel> allProfiles) async {
    final value = await showAstroActionSheet<Object>(
      context: context,
      title: 'Change Profile',
      actions: [
        for (final p in allProfiles)
          AstroSheetAction<Object>(
            label: p.name,
            value: p,
            icon: Icons.person_outline_rounded,
            selected: p.id == activeProfile.id,
          ),
        const AstroSheetAction<Object>(
          label: 'Add New Profile',
          value: 'add_new',
          icon: Icons.add_circle_outline_rounded,
        ),
      ],
    );
    if (!mounted || value == null) return;
    if (value is BirthProfileModel) {
      ref.read(selectedBirthProfileIdProvider.notifier).state = value.id;
      setState(() {
        _selectedProfileOverride = value;
      });
    } else if (value == 'add_new') {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
      );
    }
  }

  /// Navy gradient profile summary under the large title: avatar, name,
  /// birth date / time / place and the "Change" profile action.
  Widget _buildProfileHero(
    BuildContext context,
    BirthProfileModel activeProfile,
    List<BirthProfileModel> allProfiles,
  ) {
    final secondary = AppTypography.rowSubtitle.copyWith(
      fontSize: 15,
      color: Colors.white.withValues(alpha: 0.82),
      height: 1.35,
    );
    return AstroGradientCard(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final textScale = MediaQuery.textScalerOf(context).scale(1.0);
          // Move the Change button below the details when space is tight.
          final stacked = constraints.maxWidth / textScale < 300;
          final info = Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.08),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.55), width: 1.2),
                ),
                child: const Icon(Icons.person_rounded, color: AppColors.gold, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activeProfile.name,
                      style: AppTypography.headlineLarge.copyWith(fontSize: 21, color: Colors.white, height: 1.2),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Icon(Icons.event_rounded, size: 16, color: AppColors.gold.withValues(alpha: 0.9)),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text('${activeProfile.dateOfBirth}  •  ${activeProfile.timeOfBirth}', style: secondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Icon(Icons.place_rounded, size: 16, color: AppColors.gold.withValues(alpha: 0.9)),
                        ),
                        const SizedBox(width: 6),
                        Expanded(child: Text(activeProfile.placeName, style: secondary)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          );
          final change = AstroSecondaryButton(
            label: 'Change',
            icon: Icons.swap_horiz_rounded,
            variant: AstroSecondaryVariant.onDark,
            expand: stacked,
            onPressed: () => _pickProfile(activeProfile, allProfiles),
          );
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              info,
              const SizedBox(height: 16),
              Container(height: 0.5, color: Colors.white.withValues(alpha: 0.16)),
              const SizedBox(height: 12),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: Tooltip(message: 'Change Profile', excludeFromSemantics: true, child: change),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildLightContentArea(
    BuildContext context,
    BirthProfileModel profile,
    AsyncValue<AstroChartModel>? chartAsync, {
    required Widget explainer,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        children: [
          // 1. SEGMENTED NAVIGATION CONTROLS (CHART | PLANETS | HOUSES | NAKSHATRA)
          _buildSegmentedControls(context),

          const SizedBox(height: 16),
          explainer,
          const SizedBox(height: 20),

          // 2. DYNAMIC TAB CONTENT VIEW DRIVEN BY ASTROCHART
          if (chartAsync != null)
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: chartAsync.when(
                loading: () => const SizedBox(
                  key: ValueKey('kundli_loading'),
                  height: 320,
                  child: Center(
                    child: AstroLoaderCard(
                      message: AstroLoaderMessages.kundli,
                      isDark: false,
                    ),
                  ),
                ),
                error: (err, stack) {
                  final String errorMessage;
                  if (err is AppException) {
                    errorMessage = err.message;
                  } else if (err.toString().contains('offline') || err.toString().contains('reach')) {
                    errorMessage = 'Unable to reach Astro Sushil servers. You appear to be offline.';
                  } else {
                    errorMessage = 'Could not load chart details. Please try again.';
                  }

                  return Padding(
                    key: const ValueKey('kundli_error'),
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: ErrorBanner(
                      message: errorMessage,
                      onRetry: () => ref.refresh(astrologyChartForProfileProvider(profile)),
                    ),
                  );
                },
                data: (chart) => _buildTabContent(context, profile, chart),
              ),
            )
          else
            const SizedBox(height: 320),
        ],
      ),
    );
  }

  Widget _buildSegmentedControls(BuildContext context) {
    return AstrologyTabBar(
      selectedIndex: _selectedControlIndex,
      onTabSelected: (index) => setState(() => _selectedControlIndex = index),
      tabs: const [
        AstrologyTabItem(label: 'Chart'),
        AstrologyTabItem(label: 'Planets'),
        AstrologyTabItem(label: 'Houses'),
        AstrologyTabItem(label: 'Nakshatra'),
      ],
    );
  }

  Widget _buildTabContent(BuildContext context, BirthProfileModel profile, AstroChartModel chart) {
    switch (_selectedControlIndex) {
      case 0:
        return _buildChartTabContent(context, profile, chart);
      case 1:
        return _buildPlanetsTabContent(context, chart);
      case 2:
        return _buildHousesTabContent(context, chart);
      case 3:
        return _buildNakshatraTabContent(context, chart);
      default:
        return _buildChartTabContent(context, profile, chart);
    }
  }

  // ==========================================
  // TAB 0: CHART TAB
  // ==========================================
  Widget _buildChartTabContent(BuildContext context, BirthProfileModel profile, AstroChartModel chart) {
    return Column(
      key: const ValueKey('tab_chart'),
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainBirthChartTitle,
          whatIsText: context.l10n.explainBirthChartWhatIs,
          howToReadText: context.l10n.explainBirthChartHowToRead,
        ),
        const SizedBox(height: 14),

        // 1-2. KUNDLI HEADING + CHART (the widget draws its own white frame)
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 6,
          runSpacing: 4,
          children: [
            const Icon(Icons.star_rate_rounded, size: 14, color: AppColors.gold),
            Text(
              'Kundli',
              style: AppTypography.headlineLarge.copyWith(fontSize: 20, height: 1.2),
            ),
            Text(
              '•  North Indian Style',
              style: AppTypography.rowSubtitle.copyWith(fontSize: 14, fontWeight: FontWeight.w500),
            ),
            const Icon(Icons.star_rate_rounded, size: 14, color: AppColors.gold),
          ],
        ),
        const SizedBox(height: 12),
        KundliChartWidget(
          key: const ValueKey('kundli_canvas'),
          chart: chart,
          size: 360,
          showTitle: false,
          showLegend: true,
        ),

        const SizedBox(height: 14),

        // 2.5 DIVISIONAL CHARTS (VARGAS) 1-TAP ACTION
        AstroGroupedSection(
          children: [
            AstroListRow(
              icon: Icons.pie_chart_outline_rounded,
              tint: AstroTint.violet,
              title: 'Divisional Charts (वर्ग D1–D60)',
              subtitle: 'Explore Navamsha (D9), Dashamsha (D10) & 16 Vargas',
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const DivisionalChartsScreen()),
                );
              },
            ),
          ],
        ),

        const SizedBox(height: 24),

        // 3. "AT A GLANCE" FACTUAL SUMMARY CARDS
        _buildAtAGlanceSection(context, chart),

        const SizedBox(height: 24),

        // 4. KEY PLACEMENTS (ASCENDANT, SUN, MOON)
        _buildKeyPlacementsSection(context, profile, chart),

        const SizedBox(height: 24),

        // 5. PLANETARY OVERVIEW SUMMARY
        _buildPlanetarySummarySection(context, chart),
      ],
    );
  }

  Widget _buildAtAGlanceSection(BuildContext context, AstroChartModel chart) {
    final ascendantSign = chart.ascendant?.rashiName ?? 'N/A';
    final ascDegreeStr = chart.ascendant != null ? _formatDegree(chart.ascendant!.degreeInRashi) : 'N/A';

    final moonPlanet = chart.planets.where(
      (p) => p.planet.toUpperCase() == 'MOON' || p.planet.toUpperCase() == 'CHANDRA' || p.displayName.toUpperCase() == 'MOON',
    ).firstOrNull;

    final sunPlanet = chart.planets.where(
      (p) => p.planet.toUpperCase() == 'SUN' || p.planet.toUpperCase() == 'SURYA' || p.displayName.toUpperCase() == 'SUN',
    ).firstOrNull;

    final items = [
      {
        'label': 'Ascendant',
        'val': ascendantSign,
        'sub': ascDegreeStr,
        'icon': Icons.flare_rounded,
        'tint': AstroTint.amber,
      },
      {
        'label': 'Moon Sign',
        'val': moonPlanet?.rashiName ?? 'N/A',
        'sub': moonPlanet != null ? _formatDegree(moonPlanet.degreeInRashi) : '—',
        'icon': Icons.nights_stay_rounded,
        'tint': AstroTint.indigo,
      },
      {
        'label': 'Sun Sign',
        'val': sunPlanet?.rashiName ?? 'N/A',
        'sub': sunPlanet != null ? _formatDegree(sunPlanet.degreeInRashi) : '—',
        'icon': Icons.wb_sunny_rounded,
        'tint': AstroTint.coral,
      },
      {
        'label': 'Birth Nakshatra',
        'val': moonPlanet != null && moonPlanet.nakshatraName.isNotEmpty ? moonPlanet.nakshatraName : 'N/A',
        'sub': moonPlanet != null ? 'Pada ${moonPlanet.pada} • ${moonPlanet.nakshatraLord}' : '—',
        'icon': Icons.auto_awesome_rounded,
        'tint': AstroTint.violet,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AstroSectionHeading('At a Glance'),
        AstrologyAdaptiveGrid(
          minItemWidth: 150,
          spacing: 10,
          children: items.map((item) {
            return AstroSurfaceCard(
              radius: AstroMetrics.groupRadius,
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  AstroIconSquare(icon: item['icon'] as IconData, tint: item['tint'] as AstroTint, size: 40),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          item['label'] as String,
                          style: AppTypography.rowSubtitle.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item['val'] as String,
                          style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(item['sub'] as String, style: AppTypography.rowSubtitle.copyWith(fontSize: 14)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildKeyPlacementsSection(
    BuildContext context,
    BirthProfileModel profile,
    AstroChartModel chart,
  ) {
    final ascendantSign = chart.ascendant?.rashiName ?? 'N/A';
    final ascendantDegree = chart.ascendant != null
        ? _formatDegree(chart.ascendant!.degreeInRashi)
        : '0°00\'';

    final sunPlanet = chart.planets.where(
      (p) => p.planet.toUpperCase() == 'SUN' || p.planet.toUpperCase() == 'SURYA',
    ).firstOrNull;

    final moonPlanet = chart.planets.where(
      (p) => p.planet.toUpperCase() == 'MOON' || p.planet.toUpperCase() == 'CHANDRA',
    ).firstOrNull;

    final placements = [
      {
        'title': 'Ascendant',
        'sign': ascendantSign,
        'degree': ascendantDegree,
        'house': '1st House',
        'icon': Icons.flare_rounded,
      },
      {
        'title': 'Sun',
        'sign': sunPlanet?.rashiName ?? 'N/A',
        'degree': sunPlanet != null ? _formatDegree(sunPlanet.degreeInRashi) : '—',
        'house': sunPlanet?.house != null ? 'House ${sunPlanet!.house}' : '—',
        'icon': Icons.wb_sunny_rounded,
      },
      {
        'title': 'Moon',
        'sign': moonPlanet?.rashiName ?? 'N/A',
        'degree': moonPlanet != null ? _formatDegree(moonPlanet.degreeInRashi) : '—',
        'house': moonPlanet?.house != null ? 'House ${moonPlanet!.house}' : '—',
        'icon': Icons.nights_stay_rounded,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AstroSectionHeading(
          'Key Placements',
          trailing: TextButton(
            onPressed: () {
              setState(() => _selectedControlIndex = 1); // Switch to Planets tab
            },
            style: TextButton.styleFrom(
              foregroundColor: AppColors.accent,
              minimumSize: const Size(48, 44),
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'View All Planets',
                  style: AppTypography.button.copyWith(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.accent),
                ),
                Icon(AstroIcons.chevron(context), size: 20, color: AppColors.accent),
              ],
            ),
          ),
        ),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var k = 0; k < placements.length; k++) ...[
                if (k > 0) const SizedBox(width: 8),
                Expanded(
                  child: AstroSurfaceCard(
                    radius: AstroMetrics.groupRadius,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
                    child: Column(
                      children: [
                        AstroIconSquare(
                          icon: placements[k]['icon'] as IconData,
                          tint: AstroTint.amber,
                          size: 36,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          placements[k]['title'] as String,
                          textAlign: TextAlign.center,
                          style: AppTypography.rowSubtitle.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          placements[k]['sign'] as String,
                          textAlign: TextAlign.center,
                          style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          placements[k]['degree'] as String,
                          textAlign: TextAlign.center,
                          style: AppTypography.rowSubtitle.copyWith(fontSize: 14),
                        ),
                        const Spacer(),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AstroTint.indigo.background,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            placements[k]['house'] as String,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontFamily: AppTypography.bodyFamily,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.accent,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPlanetarySummarySection(BuildContext context, AstroChartModel chart) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AstroSectionHeading('Planetary Overview'),
        ...chart.planets.map((p) => _buildPlanetRow(context, p)),
      ],
    );
  }

  // ==========================================
  // TAB 1: PLANETS TAB
  // ==========================================
  Widget _buildPlanetsTabContent(BuildContext context, AstroChartModel chart) {
    final retroCount = chart.planets.where((p) => p.isRetrograde).length;

    return Column(
      key: const ValueKey('tab_planets'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainPlanetsTitle,
          whatIsText: context.l10n.explainPlanetsWhatIs,
          howToReadText: context.l10n.explainPlanetsHowToRead,
        ),
        const SizedBox(height: 14),

        const AstroSectionHeading(
          'Planetary Positions',
          subtitle: 'Complete astronomical breakdown of all 9 planets at your time of birth.',
        ),

        // Metrics Summary Row
        AstroSurfaceCard(
          radius: AstroMetrics.groupRadius,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _buildStatPill('Total Grahas', '${chart.planets.length}', AppColors.primary)),
              const SizedBox(width: 8),
              Expanded(child: _buildStatPill('Retrograde (वक्री)', '$retroCount', retroCount > 0 ? AppColors.tintRoseText : AppColors.textSecondary)),
              const SizedBox(width: 8),
              Expanded(child: _buildStatPill('Ascendant (लग्न)', chart.ascendant?.rashiName ?? 'N/A', AppColors.goldDark)),
            ],
          ),
        ),

        const SizedBox(height: 16),
        ...chart.planets.map((p) => _buildPlanetRow(context, p)),
      ],
    );
  }

  Widget _buildStatPill(String title, String value, Color valueColor) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  Widget _buildPlanetRow(BuildContext context, PlanetModel p) {
    // House comes from the backend engine (planet.house); never derived here.
    final houseNum = p.house;
    final degreeStr = _formatDegree(p.degreeInRashi);
    final cleanName = p.displayName;
    final assetPath = AppAssets.getPlanetAsset(cleanName);

    Widget badge(String text, Color fg, Color bg) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
          child: Text(
            text,
            style: TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: fg,
              height: 1.3,
            ),
          ),
        );

    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: AstroSurfaceCard(
        radius: AstroMetrics.groupRadius,
        padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
        onTap: houseNum == null
            ? null
            : () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => PlanetDetailScreen(
                      planetName: p.planet + (p.isRetrograde ? ' (R)' : ''),
                      signName: p.rashiName,
                      degree: degreeStr,
                      houseNumber: houseNum,
                      isRetrograde: p.isRetrograde,
                      nakshatraName: p.nakshatraName,
                    ),
                  ),
                );
              },
        child: Row(
          children: [
            // Planet emblem image or fallback vector
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AstroTint.amber.background,
                border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
              ),
              child: ClipOval(
                child: assetPath != null
                    ? AstroImage(
                        assetPath: assetPath,
                        fit: BoxFit.cover,
                        fallback: AstroImageFallback.icon,
                        semanticLabel: '$cleanName planet',
                      )
                    : const Icon(Icons.circle, size: 18, color: AppColors.gold),
              ),
            ),
            const SizedBox(width: 14),

            // Planet details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      Text(cleanName, style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700)),
                      if (p.isRetrograde) badge('Retro', AstroTint.rose.foreground, AstroTint.rose.background),
                      if (p.formattedDignity.isNotEmpty)
                        badge(p.formattedDignity, _getDignityTextColor(p.dignity), _getDignityBgColor(p.dignity)),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text('${p.rashiName} • $degreeStr', style: AppTypography.rowSubtitle.copyWith(fontSize: 15)),
                  if (p.nakshatraName.isNotEmpty)
                    Text(
                      '${p.nakshatraName} • Pada ${p.pada}',
                      style: AppTypography.rowSubtitle.copyWith(fontSize: 14, color: AppColors.textMuted),
                    ),
                ],
              ),
            ),

            if (houseNum != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AstroTint.indigo.background,
                  borderRadius: BorderRadius.circular(10),
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
              const SizedBox(width: 2),
              Icon(AstroIcons.chevron(context), size: 22, color: AppColors.textMuted),
            ],
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TAB 2: HOUSES TAB (BHAVAS)
  // ==========================================
  Widget _buildHousesTabContent(BuildContext context, AstroChartModel chart) {
    final ascRashiIndex = chart.ascendant?.rashiIndex ?? 1;

    // Group planets by the backend-provided house number (1..12).
    final housePlanetsMap = <int, List<PlanetModel>>{};
    for (int i = 1; i <= 12; i++) {
      housePlanetsMap[i] = [];
    }
    for (final p in chart.planets) {
      final h = p.house;
      if (h != null) housePlanetsMap[h]?.add(p);
    }

    return Column(
      key: const ValueKey('tab_houses'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainHousesTitle,
          whatIsText: context.l10n.explainHousesWhatIs,
          howToReadText: context.l10n.explainHousesHowToRead,
        ),
        const SizedBox(height: 14),

        const AstroSectionHeading(
          '12 Houses (Bhavas)',
          subtitle: 'Explore how the 12 astrological houses define key aspects of your life.',
        ),

        ...List.generate(12, (index) {
          final houseNum = index + 1;
          // Read calculated house output from engine if available
          final engineHouse = chart.houses.where((h) => h.houseNumber == houseNum).firstOrNull;
          final rashiIndex = engineHouse?.rashiIndex ?? ((ascRashiIndex + houseNum - 2) % 12) + 1;
          final rashiName = (engineHouse != null && engineHouse.rashiName.isNotEmpty)
              ? engineHouse.rashiName
              : _getRashiName(rashiIndex);
          final rashiLord = (engineHouse != null && engineHouse.lord != null && engineHouse.lord!.isNotEmpty)
              ? engineHouse.lord!
              : _getRashiLord(rashiIndex);

          final planetsInHouse = housePlanetsMap[houseNum] ?? [];
          final houseInfo = _getHouseSignifications(houseNum);
          final rashiAsset = AppAssets.getRashiAsset(rashiIndex);

          final isFirstHouse = houseNum == 1;
          final isKendra = houseNum == 1 || houseNum == 4 || houseNum == 7 || houseNum == 10;
          final isTrikona = houseNum == 1 || houseNum == 5 || houseNum == 9;

          return Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isFirstHouse
                      ? AppColors.gold.withValues(alpha: 0.6)
                      : (isKendra ? AppColors.secondary.withValues(alpha: 0.3) : AppColors.cardBorder),
                  width: isFirstHouse ? 1.4 : 1.0,
                ),
                boxShadow: AstroShadows.card,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // House badge
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: isFirstHouse
                              ? AppColors.gold.withValues(alpha: 0.2)
                              : AppColors.primary.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                          border: isFirstHouse ? Border.all(color: AppColors.gold, width: 1.2) : null,
                        ),
                        child: Center(
                          child: Text(
                            '$houseNum',
                            style: const TextStyle(
                              fontFamily: AppTypography.bodyFamily,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    houseInfo['title']!,
                                    style: const TextStyle(
                                      fontFamily: AppTypography.bodyFamily,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                                if (isFirstHouse)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.gold.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.gold, width: 0.8),
                                    ),
                                    child: const Text(
                                      'Lagna',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  )
                                else if (isTrikona)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.tintVioletBg,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.tintVioletBorder, width: 0.8),
                                    ),
                                    child: const Text(
                                      'Trikona',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.tintVioletText,
                                      ),
                                    ),
                                  )
                                else if (isKendra)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.tintSkyBg,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.tintSkyBorder, width: 0.8),
                                    ),
                                    child: const Text(
                                      'Kendra',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.tintSkyText,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$rashiName • Lord: $rashiLord',
                              style: const TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),

                      if (rashiAsset != null) ...[
                        const SizedBox(width: 8),
                        ClipOval(
                          child: AstroImage(
                            assetPath: rashiAsset,
                            width: 32,
                            height: 32,
                            fit: BoxFit.contain,
                            fallback: AstroImageFallback.minimal,
                            semanticLabel: '$rashiName sign',
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Calculated Facts vs Meaning Separation
                  Text(
                    houseInfo['desc']!,
                    style: const TextStyle(
                      fontFamily: AppTypography.bodyFamily,
                      fontSize: 14,
                      color: AppColors.textSecondary,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Occupying planets
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 3),
                        child: Text(
                          'Planets in House: ',
                          style: TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                      Expanded(
                        child: planetsInHouse.isNotEmpty
                            ? Wrap(
                                spacing: 6,
                                runSpacing: 4,
                                children: planetsInHouse.map((p) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: AppColors.cardBorder, width: 0.8),
                                    ),
                                    child: Text(
                                      p.displayNameWithRetro,
                                      style: const TextStyle(
                                        fontFamily: AppTypography.bodyFamily,
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  );
                                }).toList(),
                              )
                            : const Padding(
                                padding: EdgeInsets.only(top: 3),
                                child: Text(
                                  'None (Empty House)',
                                  style: TextStyle(
                                    fontFamily: AppTypography.bodyFamily,
                                    fontSize: 14,
                                    fontStyle: FontStyle.italic,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  // ==========================================
  // TAB 3: NAKSHATRA TAB (LUNAR MANSIOINS)
  // ==========================================
  Widget _buildNakshatraTabContent(BuildContext context, AstroChartModel chart) {
    // Strictly find the Moon planet for Janma Nakshatra (never substitute other planets)
    final moonPlanet = chart.planets.where(
      (p) => p.planet.toUpperCase() == 'MOON' || p.displayName.toUpperCase() == 'MOON' || p.planet.toUpperCase() == 'CHANDRA',
    ).firstOrNull;

    return Column(
      key: const ValueKey('tab_nakshatra'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainNakshatraTitle,
          whatIsText: context.l10n.explainNakshatraWhatIs,
          howToReadText: context.l10n.explainNakshatraHowToRead,
        ),
        const SizedBox(height: 14),

        const AstroSectionHeading(
          'Nakshatra Profile',
          subtitle: 'Lunar mansions that reveal deeper psychological and karmic attributes.',
        ),

        // PROMINENT BIRTH NAKSHATRA HERO CARD
        if (moonPlanet != null)
          AstroSurfaceCard(
            color: AppColors.cardSurfaceWarm,
            borderColor: AppColors.goldBorder,
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AstroTint.amber.background,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          'BIRTH NAKSHATRA (JANMA NAKSHATRA)',
                          style: TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AstroTint.amber.foreground,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  moonPlanet.nakshatraName.isNotEmpty ? moonPlanet.nakshatraName : 'N/A',
                  style: AppTypography.headlineLarge.copyWith(fontSize: 26, height: 1.15),
                ),
                const SizedBox(height: 4),
                Text(
                  'Pada ${moonPlanet.pada}  •  Nakshatra Lord: ${moonPlanet.nakshatraLord}',
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.goldDark,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Moon Sign: ${moonPlanet.rashiName} (${_formatDegree(moonPlanet.degreeInRashi)})',
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 15,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardSurface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: const Text(
              'Moon placement is unavailable in this calculation. Please verify birth details.',
              style: TextStyle(
                fontFamily: AppTypography.bodyFamily,
                fontSize: 15,
                color: AppColors.textSecondary,
              ),
            ),
          ),

        const SizedBox(height: 20),

        // ASCENDANT NAKSHATRA CARD
        if (chart.ascendant != null) ...[
          const AstroSectionHeading('Ascendant Nakshatra'),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardSurface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder, width: 1.0),
              boxShadow: AstroShadows.card,
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.flare_rounded, color: AppColors.secondary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        chart.ascendant!.nakshatraName,
                        style: const TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      Text(
                        'Pada ${chart.ascendant!.pada} • Lord: ${chart.ascendant!.nakshatraLord}',
                        style: const TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  chart.ascendant!.rashiName,
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // ALL PLANETARY NAKSHATRAS LIST
        const AstroSectionHeading('All Planetary Nakshatras'),
        ...chart.planets.map((p) {
          final cleanName = p.planet.replaceAll('(R)', '').trim();
          final assetPath = AppAssets.getPlanetAsset(cleanName);

          return Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: AppColors.cardSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.cardBorder, width: 1.0),
                boxShadow: AstroShadows.card,
              ),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary.withValues(alpha: 0.06),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: ClipOval(
                      child: assetPath != null
                          ? AstroImage(
                              assetPath: assetPath,
                              fit: BoxFit.cover,
                              fallback: AstroImageFallback.icon,
                              semanticLabel: '$cleanName planet',
                            )
                          : const Icon(Icons.circle, size: 16, color: AppColors.gold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: Text(
                      cleanName + (p.isRetrograde ? ' (R)' : ''),
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.nakshatraName.isNotEmpty ? p.nakshatraName : 'N/A',
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                        if (p.nakshatraLord.isNotEmpty)
                          Text(
                            'Lord: ${p.nakshatraLord}',
                            style: const TextStyle(
                              fontFamily: AppTypography.bodyFamily,
                              fontSize: 13,
                              color: AppColors.textMuted,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Text(
                      'Pada ${p.pada}',
                      textAlign: TextAlign.end,
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.secondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  // ==========================================
  // CLOSING INSIGHT BANNER (SCROLLABLE)
  // ==========================================
  Widget _buildClosingInsightCard(BuildContext context, BirthProfileModel profile) {
    return AstroSurfaceCard(
      color: AppColors.cardSurfaceWarm,
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      onTap: () {
        setState(() {
          _selectedControlIndex = (_selectedControlIndex + 1) % 4;
        });
      },
      child: Row(
        children: [
          const AstroIconSquare(icon: Icons.explore_rounded, tint: AstroTint.amber, size: 42),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Your chart is a map of your potential.',
                  style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  'Explore each placement to understand your unique journey.',
                  style: AppTypography.rowSubtitle.copyWith(fontSize: 14),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(AstroIcons.chevron(context), color: AppColors.textMuted),
        ],
      ),
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

  // ==========================================
  // HELPERS
  // ==========================================
  ExplanationContext _buildExplanationContext(BirthProfileModel profile, AstroChartModel? chart) {
    if (chart == null) {
      return ExplanationContext(
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        purpose: 'Explain the natal chart placements',
        astrologyData: const {},
        userProfileContext: {
          'name': profile.name,
          'dateOfBirth': profile.dateOfBirth,
        },
      );
    }

    final asc = chart.ascendant;
    final moon = chart.planets.where((p) => p.planet.toLowerCase() == 'moon').firstOrNull;
    final sun = chart.planets.where((p) => p.planet.toLowerCase() == 'sun').firstOrNull;

    return ExplanationContext(
      feature: 'birth_chart',
      screenTitle: 'Birth Chart',
      purpose: 'Explain natal chart placements, ascendant sign, houses, and planetary influences in everyday language',
      astrologyData: {
        'ascendant': asc != null ? {
          'sign': asc.rashiName,
          'degree': asc.degreeInRashi,
          'nakshatra': asc.nakshatraName,
        } : null,
        'planets': chart.planets.map((p) => {
          'name': p.displayName,
          'sign': p.rashiName,
          'house': p.house,
          'degree': p.degreeInRashi,
          'nakshatra': p.nakshatraName,
          'isRetrograde': p.isRetrograde,
        }).toList(),
        'houses': chart.houses.map((h) => {
          'houseNumber': h.houseNumber,
          'sign': h.rashiName,
        }).toList(),
      },
      importantValues: {
        'ascendantSign': asc?.rashiName,
        'moonSign': moon?.rashiName,
        'sunSign': sun?.rashiName,
      },
      userProfileContext: {
        'name': profile.name,
        'dateOfBirth': profile.dateOfBirth,
        'placeName': profile.placeName,
      },
    );
  }

  String _formatDegree(double degree) {
    final deg = degree.floor();
    final min = ((degree - deg) * 60).round();
    return '$deg°${min.toString().padLeft(2, '0')}\'';
  }

  String _getRashiName(int index) {
    const names = [
      'Mesha (Aries)',
      'Vrishabha (Taurus)',
      'Mithuna (Gemini)',
      'Karka (Cancer)',
      'Simha (Leo)',
      'Kanya (Virgo)',
      'Tula (Libra)',
      'Vrischika (Scorpio)',
      'Dhanu (Sagittarius)',
      'Makara (Capricorn)',
      'Kumbha (Aquarius)',
      'Meena (Pisces)',
    ];
    if (index >= 1 && index <= 12) return names[index - 1];
    return 'Unknown';
  }

  String _getRashiLord(int index) {
    switch (index) {
      case 1:
        return 'Mars (Mangal)';
      case 2:
        return 'Venus (Shukra)';
      case 3:
        return 'Mercury (Budh)';
      case 4:
        return 'Moon (Chandra)';
      case 5:
        return 'Sun (Surya)';
      case 6:
        return 'Mercury (Budh)';
      case 7:
        return 'Venus (Shukra)';
      case 8:
        return 'Mars (Mangal)';
      case 9:
        return 'Jupiter (Guru)';
      case 10:
        return 'Saturn (Shani)';
      case 11:
        return 'Saturn (Shani)';
      case 12:
        return 'Jupiter (Guru)';
      default:
        return 'Unknown';
    }
  }

  Map<String, String> _getHouseSignifications(int houseNum) {
    switch (houseNum) {
      case 1:
        return {'title': '1st House • Tanu Bhava', 'desc': 'Self, Physical Body, Personality, Vitality & Character.'};
      case 2:
        return {'title': '2nd House • Dhana Bhava', 'desc': 'Wealth, Family, Speech, Assets & Values.'};
      case 3:
        return {'title': '3rd House • Sahaja Bhava', 'desc': 'Courage, Siblings, Communication & Personal Efforts.'};
      case 4:
        return {'title': '4th House • Sukha Bhava', 'desc': 'Home, Mother, Vehicles, Land & Emotional Peace.'};
      case 5:
        return {'title': '5th House • Putra Bhava', 'desc': 'Children, Intelligence, Creativity, Past Karma & Speculation.'};
      case 6:
        return {'title': '6th House • Ari Bhava', 'desc': 'Health, Enemies, Debts, Daily Work & Service.'};
      case 7:
        return {'title': '7th House • Yuvati Bhava', 'desc': 'Marriage, Spouse, Business Partnerships & Foreign Travel.'};
      case 8:
        return {'title': '8th House • Randhra Bhava', 'desc': 'Longevity, Transformation, Mysticism & Shared Resources.'};
      case 9:
        return {'title': '9th House • Dharma Bhava', 'desc': 'Higher Wisdom, Fortune, Religion, Father & Pilgrimage.'};
      case 10:
        return {'title': '10th House • Karma Bhava', 'desc': 'Career, Reputation, Public Status & Leadership.'};
      case 11:
        return {'title': '11th House • Labha Bhava', 'desc': 'Gains, Income, Social Networks & Desires Fulfillment.'};
      case 12:
        return {'title': '12th House • Vyaya Bhava', 'desc': 'Spiritual Liberation, Expenses, Isolation & Subconscious.'};
      default:
        return {'title': '$houseNum House', 'desc': 'Astrological life sector.'};
    }
  }
}
