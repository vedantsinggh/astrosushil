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
import '../widgets/astrology_explanation_card.dart';
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

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        top: false,
        child: activeProfile == null
            ? _buildNoProfileState(context)
            : SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  children: [
                    // A. COSMIC TOP HEADER & PROFILE DROPDOWN SELECTOR
                    _buildCosmicTopSection(
                      context,
                      activeProfile,
                      profilesState.profiles,
                      chartAsync?.valueOrNull,
                    ),

                    // B. MAIN CONTENT CONTAINER
                    _buildLightContentArea(
                      context,
                      activeProfile,
                      chartAsync,
                    ),

                    // C. INTEGRATED CLOSING INSIGHT BANNER
                    _buildClosingInsightCard(context, activeProfile),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildNoProfileState(BuildContext context) {
    return Container(
      color: AppColors.canvas,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.person_search_rounded, size: 44, color: AppColors.primary),
              ),
              const SizedBox(height: 20),
              const Text(
                'No Birth Profile Selected',
                style: TextStyle(
                  fontFamily: AppTypography.headingFamily,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Add your birth details to generate your Kundli.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppTypography.bodyFamily,
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.gold,
                  minimumSize: const Size(200, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: AppColors.gold.withValues(alpha: 0.4)),
                  ),
                  elevation: 2,
                ),
                child: const Text(
                  'Add Birth Details',
                  style: TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCosmicTopSection(
    BuildContext context,
    BirthProfileModel activeProfile,
    List<BirthProfileModel> allProfiles,
    AstroChartModel? chart,
  ) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: AppGradients.heroCosmic,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, topPadding + 8, 16, 20),
        child: Column(
          children: [
            // TOP NAVIGATION BAR
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
                const Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          'Your Birth Chart',
                          style: TextStyle(
                            fontFamily: AppTypography.headingFamily,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      SizedBox(height: 3),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            DecoratedBox(
                              decoration: BoxDecoration(color: AppColors.gold, shape: BoxShape.circle),
                              child: SizedBox(width: 5, height: 5),
                            ),
                            SizedBox(width: 6),
                            Text(
                              'North Indian Style',
                              style: TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 12,
                                color: AppColors.gold,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(width: 6),
                            DecoratedBox(
                              decoration: BoxDecoration(color: AppColors.gold, shape: BoxShape.circle),
                              child: SizedBox(width: 5, height: 5),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                  icon: _isDownloadingPdf
                      ? const AstroLoaderInline(size: 18, isDark: true)
                      : const Icon(Icons.download_rounded, color: Colors.white, size: 22),
                  tooltip: 'Download Kundli PDF',
                  onPressed: (_isDownloadingPdf || chart == null)
                      ? null
                      : () => _downloadKundliPdf(activeProfile, chart),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // COMPACT PREMIUM BIRTH PROFILE CARD WITH PROFILE SELECTOR
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceDark.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.gold.withValues(alpha: 0.28), width: 1.0),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.gold.withValues(alpha: 0.4), width: 1.5),
                    ),
                    child: const Icon(Icons.person_rounded, color: AppColors.gold, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activeProfile.name,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${activeProfile.dateOfBirth}  •  ${activeProfile.timeOfBirth}',
                          style: TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          activeProfile.placeName,
                          style: TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.65),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),

                  // DROPDOWN SELECTOR FOR PROFILE SWITCHING
                  PopupMenuButton<dynamic>(
                    color: AppColors.cardSurfaceDark,
                    elevation: 10,
                    tooltip: 'Change Profile',
                    offset: const Offset(0, 44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: AppColors.gold.withValues(alpha: 0.4), width: 1.5),
                    ),
                    onSelected: (value) {
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
                    },
                    itemBuilder: (BuildContext context) {
                      final List<PopupMenuEntry<dynamic>> items = [];

                      for (final p in allProfiles) {
                        final isSelected = p.id == activeProfile.id;
                        items.add(
                          PopupMenuItem<BirthProfileModel>(
                            value: p,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.gold.withValues(alpha: 0.15)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                                border: isSelected
                                    ? Border.all(color: AppColors.gold.withValues(alpha: 0.4))
                                    : null,
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    isSelected
                                        ? Icons.check_circle_rounded
                                        : Icons.person_outline_rounded,
                                    size: 20,
                                    color: isSelected ? AppColors.gold : const Color(0xFFA0A0C0),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          p.name,
                                          style: TextStyle(
                                            fontFamily: AppTypography.bodyFamily,
                                            fontSize: 14,
                                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                            color: isSelected ? Colors.white : const Color(0xFFE2E8F0),
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${p.dateOfBirth} • ${p.placeName}',
                                          style: TextStyle(
                                            fontFamily: AppTypography.bodyFamily,
                                            fontSize: 11,
                                            color: isSelected
                                                ? AppColors.gold
                                                : const Color(0xFF94A3B8),
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }

                      items.add(const PopupMenuDivider());

                      items.add(
                        const PopupMenuItem<String>(
                          value: 'add_new',
                          child: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            child: Row(
                              children: [
                                Icon(Icons.add_circle_outline_rounded, size: 20, color: AppColors.gold),
                                SizedBox(width: 10),
                                Text(
                                  'Add New Profile',
                                  style: TextStyle(
                                    fontFamily: AppTypography.bodyFamily,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.gold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );

                      return items;
                    },
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 40),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.gold, width: 1),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Change',
                            style: TextStyle(
                              fontFamily: AppTypography.bodyFamily,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.gold,
                            ),
                          ),
                          SizedBox(width: 2),
                          Icon(
                            Icons.arrow_drop_down_rounded,
                            size: 18,
                            color: AppColors.gold,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // SUSHIL SIR CONTEXTUAL EXPLAINER ENTRYPOINT
            SushilExplainerButton(
              contextData: _buildExplanationContext(activeProfile, chart),
              isCompact: false,
            ),
          ],
        ),
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
      color: AppColors.canvas,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        children: [
          // 1. SEGMENTED NAVIGATION CONTROLS (CHART | PLANETS | HOUSES | NAKSHATRA)
          _buildSegmentedControls(context),

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
    final controls = [
      {'label': 'Chart', 'icon': Icons.grid_view_rounded},
      {'label': 'Planets', 'icon': Icons.public_rounded},
      {'label': 'Houses', 'icon': Icons.home_work_rounded},
      {'label': 'Nakshatra', 'icon': Icons.auto_awesome_rounded},
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(30),
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
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(controls.length, (index) {
          final isSelected = _selectedControlIndex == index;
          final item = controls[index];
          return Expanded(
            child: InkWell(
              onTap: () {
                setState(() => _selectedControlIndex = index);
              },
              borderRadius: BorderRadius.circular(24),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                constraints: const BoxConstraints(minHeight: 48),
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.22),
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
                      size: 15,
                      color: isSelected ? AppColors.gold : AppColors.textSecondary,
                    ),
                    const SizedBox(width: 5),
                    Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          item['label'] as String,
                          style: TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            color: isSelected ? Colors.white : AppColors.textSecondary,
                          ),
                          maxLines: 1,
                        ),
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

        // 1. SINGLE CLEAR CHART HEADING
        const Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 6,
          runSpacing: 4,
          children: [
            Icon(Icons.star_rate_rounded, size: 12, color: AppColors.gold),
            Text(
              'Kundli',
              style: TextStyle(
                fontFamily: AppTypography.headingFamily,
                fontSize: 15,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.0,
                color: AppColors.primary,
              ),
            ),
            Text(
              '•  North Indian Style',
              style: TextStyle(
                fontFamily: AppTypography.bodyFamily,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
            Icon(Icons.star_rate_rounded, size: 12, color: AppColors.gold),
          ],
        ),

        const SizedBox(height: 14),

        // 2. KUNDLI CHART VISUALIZATION
        KundliChartWidget(
          key: const ValueKey('kundli_canvas'),
          chart: chart,
          size: 320,
          showTitle: false,
          showLegend: true,
        ),

        const SizedBox(height: 14),

        // 2.5 DIVISIONAL CHARTS (VARGAS) 1-TAP ACTION BUTTON
        InkWell(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const DivisionalChartsScreen()),
            );
          },
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceWarm,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.cardBorder,
                width: 1.0,
              ),
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
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.pie_chart_outline_rounded, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Divisional Charts (वर्ग D1–D60)',
                        style: TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      SizedBox(height: 1),
                      Text(
                        'Explore Navamsha (D9), Dashamsha (D10) & 16 Vargas',
                        style: TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.primary),
              ],
            ),
          ),
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
      },
      {
        'label': 'Moon Sign',
        'val': moonPlanet?.rashiName ?? 'N/A',
        'sub': moonPlanet != null ? _formatDegree(moonPlanet.degreeInRashi) : '—',
        'icon': Icons.nights_stay_rounded,
      },
      {
        'label': 'Sun Sign',
        'val': sunPlanet?.rashiName ?? 'N/A',
        'sub': sunPlanet != null ? _formatDegree(sunPlanet.degreeInRashi) : '—',
        'icon': Icons.wb_sunny_rounded,
      },
      {
        'label': 'Birth Nakshatra',
        'val': moonPlanet != null && moonPlanet.nakshatraName.isNotEmpty ? moonPlanet.nakshatraName : 'N/A',
        'sub': moonPlanet != null ? 'Pada ${moonPlanet.pada} • ${moonPlanet.nakshatraLord}' : '—',
        'icon': Icons.auto_awesome_rounded,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'At a Glance',
          style: TextStyle(
            fontFamily: AppTypography.headingFamily,
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 1.35,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            final item = items[index];
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
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
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.06),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(item['icon'] as IconData, size: 17, color: AppColors.gold),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          item['label'] as String,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          item['val'] as String,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          item['sub'] as String,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
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

    final ascRashiIndex = chart.ascendant?.rashiIndex ?? 1;

    final placements = [
      {
        'title': 'ASCENDANT',
        'sign': ascendantSign,
        'degree': ascendantDegree,
        'house': '1st House',
        'icon': Icons.flare_rounded,
      },
      {
        'title': 'SUN',
        'sign': sunPlanet?.rashiName ?? 'N/A',
        'degree': sunPlanet != null ? _formatDegree(sunPlanet.degreeInRashi) : '—',
        'house': sunPlanet != null ? 'House ${sunPlanet.calculateHouseNumber(ascRashiIndex)}' : '—',
        'icon': Icons.wb_sunny_rounded,
      },
      {
        'title': 'MOON',
        'sign': moonPlanet?.rashiName ?? 'N/A',
        'degree': moonPlanet != null ? _formatDegree(moonPlanet.degreeInRashi) : '—',
        'house': moonPlanet != null ? 'House ${moonPlanet.calculateHouseNumber(ascRashiIndex)}' : '—',
        'icon': Icons.nights_stay_rounded,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Expanded(
              child: Text(
                'Key Placements',
                style: TextStyle(
                  fontFamily: AppTypography.headingFamily,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            GestureDetector(
              onTap: () {
                setState(() => _selectedControlIndex = 1); // Switch to Planets tab
              },
              child: const Padding(
                padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                child: Row(
                  children: [
                    Text(
                      'View All Planets',
                      style: TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.secondary,
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.secondary),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: placements.map((item) {
            return Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
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
                child: Column(
                  children: [
                    Icon(item['icon'] as IconData, size: 20, color: AppColors.gold),
                    const SizedBox(height: 6),
                    Text(
                      item['title'] as String,
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item['sign'] as String,
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      item['degree'] as String,
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 11,
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        item['house'] as String,
                        style: const TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.secondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPlanetarySummarySection(BuildContext context, AstroChartModel chart) {
    final ascRashiIndex = chart.ascendant?.rashiIndex ?? 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Planetary Overview',
          style: TextStyle(
            fontFamily: AppTypography.headingFamily,
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 12),
        ...chart.planets.map((p) => _buildPlanetRow(context, p, ascRashiIndex)),
      ],
    );
  }

  // ==========================================
  // TAB 1: PLANETS TAB
  // ==========================================
  Widget _buildPlanetsTabContent(BuildContext context, AstroChartModel chart) {
    final ascRashiIndex = chart.ascendant?.rashiIndex ?? 1;
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

        const Text(
          'Planetary Positions',
          style: TextStyle(
            fontFamily: AppTypography.headingFamily,
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Complete astronomical breakdown of all 9 planets at your time of birth.',
          style: TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 12),

        // Metrics Summary Row
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.canvasSecondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder, width: 0.8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatPill('Total Grahas', '${chart.planets.length}', AppColors.primary),
              _buildStatPill('Retrograde (वक्री)', '$retroCount', retroCount > 0 ? AppColors.tintRoseText : AppColors.textSecondary),
              _buildStatPill('Ascendant (लग्न)', chart.ascendant?.rashiName ?? 'N/A', AppColors.gold),
            ],
          ),
        ),

        const SizedBox(height: 16),
        ...chart.planets.map((p) => _buildPlanetRow(context, p, ascRashiIndex)),
      ],
    );
  }

  Widget _buildStatPill(String title, String value, Color valueColor) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  Widget _buildPlanetRow(BuildContext context, PlanetModel p, int ascRashiIndex) {
    final houseNum = p.calculateHouseNumber(ascRashiIndex);
    final degreeStr = _formatDegree(p.degreeInRashi);
    final cleanName = p.displayName;
    final assetPath = AppAssets.getPlanetAsset(cleanName);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: InkWell(
        onTap: () {
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
              // Planet emblem image or fallback vector
              Container(
                width: 40,
                height: 40,
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
                      : const Icon(Icons.circle, size: 18, color: AppColors.gold),
                ),
              ),
              const SizedBox(width: 12),

              // Planet details
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
                          cleanName,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        if (p.isRetrograde)
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
                        if (p.formattedDignity.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getDignityBgColor(p.dignity),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: _getDignityBorderColor(p.dignity), width: 0.8),
                            ),
                            child: Text(
                              p.formattedDignity,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: _getDignityTextColor(p.dignity),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${p.rashiName} • $degreeStr',
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    if (p.nakshatraName.isNotEmpty)
                      Text(
                        '${p.nakshatraName} • Pada ${p.pada}',
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
              const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // TAB 2: HOUSES TAB (BHAVAS)
  // ==========================================
  Widget _buildHousesTabContent(BuildContext context, AstroChartModel chart) {
    final ascRashiIndex = chart.ascendant?.rashiIndex ?? 1;

    // Group planets by house number (1..12)
    final housePlanetsMap = <int, List<PlanetModel>>{};
    for (int i = 1; i <= 12; i++) {
      housePlanetsMap[i] = [];
    }
    for (final p in chart.planets) {
      final h = p.calculateHouseNumber(ascRashiIndex);
      housePlanetsMap[h]?.add(p);
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

        const Text(
          '12 Houses (Bhavas)',
          style: TextStyle(
            fontFamily: AppTypography.headingFamily,
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Explore how the 12 astrological houses define key aspects of your life.',
          style: TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 16),

        ...List.generate(12, (index) {
          final houseNum = index + 1;
          final rashiIndex = ((ascRashiIndex + houseNum - 2) % 12) + 1;

          // Read calculated house output from engine if available
          final engineHouse = chart.houses.where((h) => h.houseNumber == houseNum).firstOrNull;
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
                color: AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isFirstHouse
                      ? AppColors.gold.withValues(alpha: 0.6)
                      : (isKendra ? AppColors.secondary.withValues(alpha: 0.3) : AppColors.cardBorder),
                  width: isFirstHouse ? 1.4 : 1.0,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
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
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
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
                                      'LAGNA',
                                      style: TextStyle(
                                        fontSize: 9,
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
                                      'TRIKONA',
                                      style: TextStyle(
                                        fontSize: 9,
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
                                      'KENDRA',
                                      style: TextStyle(
                                        fontSize: 9,
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
                                fontSize: 12,
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
                      fontSize: 12,
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
                            fontSize: 11,
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
                                        fontSize: 11,
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
                                    fontSize: 11,
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

        const Text(
          'Nakshatra Profile',
          style: TextStyle(
            fontFamily: AppTypography.headingFamily,
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Lunar mansions that reveal deeper psychological and karmic attributes.',
          style: TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 16),

        // PROMINENT BIRTH NAKSHATRA HERO CARD
        if (moonPlanet != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: AppGradients.heroCosmic,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.4), width: 1.2),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.25),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.gold.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.gold.withValues(alpha: 0.5), width: 1.0),
                      ),
                      child: const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          'BIRTH NAKSHATRA (JANMA NAKSHATRA)',
                          style: TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors.gold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  moonPlanet.nakshatraName.isNotEmpty ? moonPlanet.nakshatraName : 'N/A',
                  style: const TextStyle(
                    fontFamily: AppTypography.headingFamily,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Pada ${moonPlanet.pada}  •  Nakshatra Lord: ${moonPlanet.nakshatraLord}',
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.gold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Moon Sign: ${moonPlanet.rashiName} (${_formatDegree(moonPlanet.degreeInRashi)})',
                  style: TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.85),
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
              color: AppColors.cardSurfaceWarm,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: const Text(
              'Moon placement is unavailable in this calculation. Please verify birth details.',
              style: TextStyle(
                fontFamily: AppTypography.bodyFamily,
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),

        const SizedBox(height: 20),

        // ASCENDANT NAKSHATRA CARD
        if (chart.ascendant != null) ...[
          const Text(
            'Ascendant Nakshatra',
            style: TextStyle(
              fontFamily: AppTypography.headingFamily,
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
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
                          fontSize: 12,
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
                    fontSize: 12,
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
        const Text(
          'All Planetary Nakshatras',
          style: TextStyle(
            fontFamily: AppTypography.headingFamily,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 10),
        ...chart.planets.map((p) {
          final cleanName = p.planet.replaceAll('(R)', '').trim();
          final assetPath = AppAssets.getPlanetAsset(cleanName);

          return Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
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
                        fontSize: 14,
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
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                        if (p.nakshatraLord.isNotEmpty)
                          Text(
                            'Lord: ${p.nakshatraLord}',
                            style: const TextStyle(
                              fontFamily: AppTypography.bodyFamily,
                              fontSize: 10,
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
                        fontSize: 12,
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedControlIndex = (_selectedControlIndex + 1) % 4;
          });
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: AppGradients.heroCosmic,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.20),
                blurRadius: 14,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.cardSurfaceDark,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
                ),
                child: const Icon(
                  Icons.explore_rounded,
                  color: AppColors.gold,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Your chart is a map of your potential.',
                      style: TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Explore each placement to understand your unique journey.',
                      style: TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 11,
                        color: Colors.white70,
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
                  color: AppColors.gold.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
                ),
                child: const Icon(
                  Icons.arrow_forward_rounded,
                  color: AppColors.gold,
                  size: 16,
                ),
              ),
            ],
          ),
        ),
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

  Color _getDignityBorderColor(String? dignity) {
    final d = dignity?.toUpperCase() ?? '';
    if (d.contains('EXALT') || d.contains('UCHA')) return AppColors.tintSageBorder;
    if (d.contains('DEBIL') || d.contains('NICHA')) return AppColors.tintRoseBorder;
    if (d.contains('OWN') || d.contains('SWA')) return AppColors.tintAmberBorder;
    if (d.contains('MOOLA')) return AppColors.tintVioletBorder;
    return AppColors.cardBorder;
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
    final ascRashiIndex = asc?.rashiIndex ?? 1;
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
          'house': p.calculateHouseNumber(ascRashiIndex),
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
