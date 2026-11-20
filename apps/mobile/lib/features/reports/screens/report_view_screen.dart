import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_full_screen.dart';
import '../../astrology/widgets/kundli_chart_widget.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/report_model.dart';
import '../providers/reports_provider.dart';
import '../widgets/report_ui.dart';

class ReportViewScreen extends ConsumerStatefulWidget {
  final String birthProfileId;
  final String? partnerProfileId;
  final String reportType; // 'KUNDLI', 'PLANETARY_SUMMARY', 'CAREER_PROSITY', 'MARRIAGE_COMPATIBILITY'

  const ReportViewScreen({
    super.key,
    required this.birthProfileId,
    this.partnerProfileId,
    this.reportType = 'KUNDLI',
  });

  @override
  ConsumerState<ReportViewScreen> createState() => _ReportViewScreenState();
}

class _ReportViewScreenState extends ConsumerState<ReportViewScreen> {
  final Set<String> _expandedSections = {};
  final _summaryKey = GlobalKey();
  final _chartKey = GlobalKey();
  final _planetsKey = GlobalKey();
  final _housesKey = GlobalKey();
  final _nakshatraKey = GlobalKey();
  final _insightsKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadReport();
    });
  }

  void _loadReport() {
    ref.read(reportsNotifierProvider.notifier).generateReport(
          birthProfileId: widget.birthProfileId,
          partnerProfileId: widget.partnerProfileId,
          reportType: widget.reportType,
        );
  }

  Future<void> _downloadPdf() async {
    final state = ref.read(reportsNotifierProvider);
    final reportResponse = state.reportResponse;
    if (reportResponse == null) return;

    final filename = 'astro_sushil_${widget.reportType.toLowerCase()}_${reportResponse.id.substring(0, 8)}.pdf';

    final success = await ref.read(reportsNotifierProvider.notifier).downloadAndSharePdf(reportResponse.id, filename);

    if (!success && mounted) {
      final err = ref.read(reportsNotifierProvider).errorMessage ?? 'Failed to download PDF';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _toggleSection(String id) {
    setState(() {
      if (_expandedSections.contains(id)) {
        _expandedSections.remove(id);
      } else {
        _expandedSections.add(id);
      }
    });
  }

  void _showHouseDetailsModal(BuildContext context, ReportHouseModel house) {
    showAstroSheet<void>(
      context: context,
      title: 'House ${house.houseNumber} • ${house.sign}',
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AstroIconSquare(icon: Icons.home_outlined, tint: AstroTint.indigo, size: 44),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  _getHouseDomainName(house.houseNumber),
                  style: AppTypography.headlineMedium.copyWith(fontSize: 19),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Occupant Planets:', style: AppTypography.sectionHeader),
          const SizedBox(height: 8),
          if (house.planetsPresent.isEmpty)
            const Text(
              'No major planets placed in this house (unoccupied).',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 16, height: 1.4),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: house.planetsPresent.map((p) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AstroTint.violet.background,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    p,
                    style: TextStyle(color: AstroTint.violet.foreground, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                );
              }).toList(),
            ),
          const SizedBox(height: 20),
          AstroSurfaceCard(
            child: Text(
              _getHouseDescription(house.houseNumber),
              style: const TextStyle(fontSize: 16, color: AppColors.textPrimary, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }

  String _getHouseDomainName(int house) {
    const domainNames = [
      'Self, Physical Body & Vitality',
      'Wealth, Speech & Family',
      'Siblings, Courage & Effort',
      'Home, Mother & Emotional Stability',
      'Children, Intellect & Karma',
      'Health, Daily Work & Obstacles',
      'Marriage, Business & Spouse',
      'Longevity, Mysticism & Transformation',
      'Fortune, Higher Wisdom & Dharma',
      'Career, Profession & Public Status',
      'Gains, Aspirations & Social Circle',
      'Moksha, Losses & Spiritual Liberation',
    ];
    if (house >= 1 && house <= 12) return domainNames[house - 1];
    return 'Astrological House';
  }

  String _getHouseDescription(int house) {
    const descriptions = [
      'The 1st House represents your Ascendant, physical constitution, character, temperament, and life direction.',
      'The 2nd House governs accumulated assets, financial stability, family lineage, speech, and values.',
      'The 3rd House rules over personal initiative, communication, younger siblings, and short journeys.',
      'The 4th House rules over fixed property, vehicles, domestic environment, mother, and inner happiness.',
      'The 5th House signifies creative intelligence, education, romantic affairs, children, and past life merits.',
      'The 6th House signifies daily routines, health maintenance, competitive strength, and overcoming challenges.',
      'The 7th House governs long-term partnerships, marriage, legal agreements, and public relations.',
      'The 8th House governs secrets, research, sudden changes, shared assets, and deep spiritual transformations.',
      'The 9th House signifies higher learning, philosophy, father, gurus, luck, and virtuous deeds.',
      'The 10th House signifies professional achievement, career reputation, authority, and public actions.',
      'The 11th House signifies income streams, fulfillment of desires, elder siblings, and professional networks.',
      'The 12th House signifies sub-conscious spiritual journey, seclusion, foreign residences, and expenditure.',
    ];
    if (house >= 1 && house <= 12) return descriptions[house - 1];
    return '';
  }

  ExplanationContext _buildExplanationContext(ReportDataModel report) {
    return ExplanationContext(
      feature: 'reports',
      screenTitle: '${report.profile.name}\'s ${report.title}',
      purpose:
          'Explain the key astrological highlights and findings from this comprehensive dossier for ${report.profile.name}.',
      astrologyData: {
        'userName': report.profile.name,
        'title': report.title,
        'type': report.type,
        'ascendant': {
          'sign': report.ascendant.sign,
          'degree': report.ascendant.degree,
          'nakshatra': report.ascendant.nakshatra,
        },
        'nakshatra': report.nakshatra.birthNakshatra,
        'planets': report.planets
            .map((p) => {
                  'name': p.planet,
                  'sign': p.sign,
                  'house': p.house,
                  'isRetrograde': p.isRetrograde,
                })
            .toList(),
      },
      importantValues: {
        'ascendant': report.ascendant.sign,
        'nakshatra': report.nakshatra.birthNakshatra,
        'reportType': report.type,
      },
      userProfileContext: {
        'name': report.profile.name,
      },
    );
  }

  void _jumpTo(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx == null) return;
    Scrollable.ensureVisible(
      ctx,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeInOut,
      alignment: 0.02,
    );
  }

  Widget _sectionHeading(GlobalKey key, String title, {String? helper}) {
    return Padding(
      key: key,
      padding: const EdgeInsets.only(top: 32, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ReportHeading(title),
          if (helper != null) ...[
            const SizedBox(height: 4),
            Text(
              helper,
              style: const TextStyle(fontSize: 15, height: 1.35, color: AppColors.lightTextSecondary),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportsNotifierProvider);

    Widget fill(Widget child) => SliverFillRemaining(hasScrollBody: false, child: child);

    return AstroPage(
      title: widget.reportType == 'PLANETARY_SUMMARY' ? 'Planetary Summary' : 'Birth Chart & Kundli',
      bottomBar: state.reportResponse != null
          ? Container(
              decoration: const BoxDecoration(
                color: AppColors.cardSurface,
                border: Border(
                  top: BorderSide(color: AppColors.separator, width: 0.5),
                ),
              ),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  child: Center(
                    heightFactor: 1,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 640),
                      child: ReportPrimaryButton(
                        label: state.isDownloadingPdf ? 'Preparing your Kundli PDF...' : 'Download or share PDF',
                        icon: Icons.download_rounded,
                        isLoading: state.isDownloadingPdf,
                        onPressed: state.isDownloadingPdf ? null : _downloadPdf,
                      ),
                    ),
                  ),
                ),
              ),
            )
          : null,
      slivers: [
        Builder(
          builder: (context) {
            // 1. Loading State using AstroLoaderFullScreen
            if (state.isLoading) {
              return fill(const AstroLoaderFullScreen(
                message: 'Reading your cosmic map...',
                isDark: false,
              ));
            }

            // 2. Error State using AstroErrorState
            if (state.errorMessage != null && state.reportResponse == null) {
              return fill(ReportStatusMessage(
                icon: Icons.cloud_off_rounded,
                iconColor: kReportErrorText,
                title: 'Your report couldn\'t be loaded',
                message: state.errorMessage!,
                actionLabel: 'Try Again',
                actionIcon: Icons.refresh_rounded,
                onAction: _loadReport,
              ));
            }

            // 3. Empty / Missing Data State
            final reportResponse = state.reportResponse;
            if (reportResponse == null || reportResponse.report.planets.isEmpty) {
              return fill(ReportStatusMessage(
                icon: Icons.error_outline_rounded,
                iconColor: AppColors.goldDark,
                title: 'Report Data Unavailable',
                message: 'Complete planetary chart data is required to render this report.',
                actionLabel: 'Try Again',
                actionIcon: Icons.refresh_rounded,
                onAction: _loadReport,
              ));
            }

            // 4. Structured Report Display
            final report = reportResponse.report;

            return AstroSliverContent(
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 4.1 REPORT COVER
                    _buildReportCoverHeader(report),

                    const SizedBox(height: 14),

                    // Sushil Sir Explainer Button
                    SushilExplainerButton(
                      contextBuilder: () => _buildExplanationContext(report),
                      poseAsset: AppAssets.sushilGuiding,
                    ),

                    const SizedBox(height: 16),

                    // Table of contents / jump list
                    _buildJumpList(report),

                    // 4.2 EXECUTIVE SUMMARY
                    _sectionHeading(_summaryKey, 'At a glance'),
                    _buildExecutiveSummary(report),

                    // 4.3 NORTH INDIAN KUNDLI CHART
                    _sectionHeading(
                      _chartKey,
                      'Your Birth Chart',
                      helper: 'North Indian style Vedic planetary layout',
                    ),
                    // The chart sizes itself to the available width; its built-in
                    // title row is hidden because it cannot wrap at large text sizes.
                    KundliChartWidget(
                      chart: report.toAstroChartModel(),
                      size: 360,
                      showTitle: false,
                    ),
                    ReportLearnMore(
                      label: 'How to read this chart',
                      child: Text(
                        'Understand your chart: The North Indian Kundli maps your 12 houses starting with your Ascendant sign at the top center diamond (House 1).',
                        style: TextStyle(
                          fontSize: 16,
                          color: AppColors.lightTextPrimary.withValues(alpha: 0.9),
                          height: 1.5,
                        ),
                      ),
                    ),

                    // 4.4 PLANETS (placements + insights)
                    _sectionHeading(
                      _planetsKey,
                      'Planets',
                      helper: 'Tap a planet to see what it means.',
                    ),
                    ...report.planets.map((p) => _buildPlanetInsightCard(p)),

                    // 4.5 YOUR 12 HOUSES GRID
                    _sectionHeading(
                      _housesKey,
                      'Your 12 Houses',
                      helper: 'Tap a house to learn more.',
                    ),
                    _buildHousesGrid(context, report),

                    // 4.6 YOUR BIRTH NAKSHATRA
                    _sectionHeading(_nakshatraKey, 'Your Birth Nakshatra'),
                    _buildNakshatraSection(report),

                    // 4.7 ASTROLOGICAL INSIGHTS & INTERPRETATIONS
                    if (report.sections.isNotEmpty) ...[
                      _sectionHeading(_insightsKey, 'Astrological Insights'),
                      ...report.sections.map((sec) => _buildSectionCard(sec)),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  // Simple table of contents
  Widget _buildJumpList(ReportDataModel report) {
    final entries = <(String, IconData, GlobalKey)>[
      ('At a glance', Icons.dashboard_outlined, _summaryKey),
      ('Birth chart', Icons.grid_view_rounded, _chartKey),
      ('Planets', Icons.public_rounded, _planetsKey),
      ('Houses', Icons.home_outlined, _housesKey),
      ('Nakshatra', Icons.star_outline_rounded, _nakshatraKey),
      if (report.sections.isNotEmpty) ('Insights', Icons.menu_book_outlined, _insightsKey),
    ];
    return ReportCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'In this report',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.lightTextPrimary),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final e in entries)
                AstroPill(
                  label: e.$1,
                  icon: e.$2,
                  selected: false,
                  onTap: () => _jumpTo(e.$3),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // Cover card
  Widget _buildReportCoverHeader(ReportDataModel report) {
    Widget infoRow(IconData icon, String text) {
      return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Icon(icon, color: AppColors.gold, size: 20),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(fontSize: 16, height: 1.35, color: AppColors.textInverseSecondary),
              ),
            ),
          ],
        ),
      );
    }

    return AstroGradientCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(report.title, style: AppTypography.displayMedium.copyWith(color: Colors.white)),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Icon(Icons.person_outline, color: AppColors.gold, size: 20),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  report.profile.name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          infoRow(Icons.cake_outlined, '${report.profile.dateOfBirth} • ${report.profile.timeOfBirth}'),
          if (report.profile.placeName != null) infoRow(Icons.location_on_outlined, report.profile.placeName!),
        ],
      ),
    );
  }

  // Executive Summary tiles
  Widget _buildExecutiveSummary(ReportDataModel report) {
    // Find Sun and Moon placements
    final sun = report.planets.firstWhere(
      (p) => p.planet.toUpperCase().contains('SUN') || p.planet.toUpperCase().contains('SURYA'),
      orElse: () => report.planets.isNotEmpty
          ? report.planets.first
          : const ReportPlanetModel(
              planet: 'Sun',
              sign: 'N/A',
              degree: 0,
              house: 1,
              nakshatra: 'N/A',
              pada: 1,
              isRetrograde: false,
            ),
    );

    final moon = report.planets.firstWhere(
      (p) => p.planet.toUpperCase().contains('MOON') || p.planet.toUpperCase().contains('CHANDRA'),
      orElse: () => report.planets.length > 1
          ? report.planets[1]
          : const ReportPlanetModel(
              planet: 'Moon',
              sign: 'N/A',
              degree: 0,
              house: 1,
              nakshatra: 'N/A',
              pada: 1,
              isRetrograde: false,
            ),
    );

    final tiles = [
      _SnapshotCard(
        title: 'Ascendant',
        value: report.ascendant.sign,
        subtitle: '${report.ascendant.degree.toStringAsFixed(1)}°',
        icon: Icons.brightness_7_rounded,
        color: AppColors.primary,
      ),
      _SnapshotCard(
        title: 'Sun sign',
        value: sun.sign,
        subtitle: '${sun.degree.toStringAsFixed(1)}°',
        icon: Icons.wb_sunny_rounded,
        color: AppColors.goldDark,
      ),
      _SnapshotCard(
        title: 'Moon sign',
        value: moon.sign,
        subtitle: '${moon.degree.toStringAsFixed(1)}°',
        icon: Icons.nightlight_round,
        color: AppColors.secondary,
      ),
      _SnapshotCard(
        title: 'Nakshatra',
        value: report.nakshatra.birthNakshatra,
        subtitle: 'Pada ${report.nakshatra.pada}',
        icon: Icons.star_border_rounded,
        color: AppColors.supportingAccent,
      ),
    ];

    return _EqualHeightGrid(
      minTileWidth: 150,
      maxColumns: 4,
      children: tiles,
    );
  }

  // Planet card: placement summary, tap to expand interpretation
  Widget _buildPlanetInsightCard(ReportPlanetModel p) {
    final isExpanded = _expandedSections.contains(p.planet);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AstroSurfaceCard(
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            InkWell(
              onTap: () => _toggleSection(p.planet),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AstroIconSquare(
                      icon: _getPlanetIcon(p.planet),
                      tint: p.isRetrograde ? AstroTint.violet : AstroTint.indigo,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                p.planet,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.lightTextPrimary,
                                ),
                              ),
                              if (p.isRetrograde)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.supportingAccent.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'Retrograde',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.supportingAccent,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${p.sign} ${p.degree.toStringAsFixed(2)}° • House ${p.house}',
                            style: const TextStyle(fontSize: 16, color: AppColors.lightTextPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Nakshatra: ${p.nakshatra} P${p.pada}',
                            style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      size: 28,
                      color: AppColors.lightTextSecondary,
                      semanticLabel: isExpanded ? 'Hide details' : 'Show details',
                    ),
                  ],
                ),
              ),
            ),
            if (isExpanded)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Astrological interpretation',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.secondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${p.planet} in ${p.sign} (${p.house}th House): Traditionally, this placement influences your key expression in ${p.sign} traits within the domain of the ${p.house}th house.',
                      style: const TextStyle(
                        fontSize: 16,
                        color: AppColors.lightTextPrimary,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  // 12 Houses responsive grid
  Widget _buildHousesGrid(BuildContext context, ReportDataModel report) {
    final tiles = List<Widget>.generate(12, (index) {
      final houseNum = index + 1;
      final house = report.houses.firstWhere(
        (h) => h.houseNumber == houseNum,
        orElse: () => ReportHouseModel(
          houseNumber: houseNum,
          sign: 'N/A',
          planetsPresent: [],
        ),
      );

      return AstroSurfaceCard(
        radius: 16,
        padding: const EdgeInsets.all(12),
        onTap: () => _showHouseDetailsModal(context, house),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'House $houseNum',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                house.sign,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                house.planetsPresent.isNotEmpty ? house.planetsPresent.join(', ') : 'Empty',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: house.planetsPresent.isNotEmpty ? FontWeight.w600 : FontWeight.w400,
                  color: house.planetsPresent.isNotEmpty ? AppColors.supportingAccent : AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    });

    return _EqualHeightGrid(minTileWidth: 104, maxColumns: 4, children: tiles);
  }

  // Nakshatra card
  Widget _buildNakshatraSection(ReportDataModel report) {
    return AstroSurfaceCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AstroIconSquare(icon: Icons.star_rounded, tint: AstroTint.violet, size: 44),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(report.nakshatra.birthNakshatra, style: AppTypography.displayMedium.copyWith(fontSize: 24)),
                    const SizedBox(height: 2),
                    Text(
                      'Pada ${report.nakshatra.pada} • Ruling Planet: ${report.nakshatra.rulingPlanet}',
                      style: TextStyle(fontSize: 16, color: AstroTint.violet.foreground, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 28, color: AppColors.separator),
          const Text(
            'Understanding your Nakshatra:',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 6),
          Text(
            report.nakshatra.associatedInfo.isNotEmpty
                ? report.nakshatra.associatedInfo
                : 'Your Janma Nakshatra governs your subconscious emotional patterns, natural talents, and planetary dasha cycles.',
            style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, height: 1.5),
          ),
        ],
      ),
    );
  }

  // Interpretation Section Card
  Widget _buildSectionCard(ReportSectionModel sec) {
    final isExpanded = _expandedSections.contains(sec.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AstroSurfaceCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: () => _toggleSection(sec.id),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 56),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 10, 14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          sec.title,
                          style: AppTypography.headlineMedium.copyWith(fontSize: 18),
                        ),
                      ),
                      Icon(
                        isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        size: 28,
                        color: AppColors.lightTextSecondary,
                        semanticLabel: isExpanded ? 'Hide section' : 'Read section',
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (isExpanded)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sec.content,
                      style: const TextStyle(
                        fontSize: 16,
                        color: AppColors.lightTextPrimary,
                        height: 1.6,
                      ),
                    ),
                    if (sec.keyValues != null && sec.keyValues!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: sec.keyValues!.entries.map((e) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.lightBackground,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.cardBorderSubtle),
                            ),
                            child: Text(
                              '${e.key}: ${e.value}',
                              style: const TextStyle(fontSize: 14, color: AppColors.lightTextPrimary),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  IconData _getPlanetIcon(String planet) {
    final clean = planet.toUpperCase();
    if (clean.contains('SUN')) return Icons.wb_sunny_rounded;
    if (clean.contains('MOON')) return Icons.nightlight_round;
    if (clean.contains('MARS')) return Icons.local_fire_department_rounded;
    if (clean.contains('MERCURY')) return Icons.bolt_rounded;
    if (clean.contains('JUPITER')) return Icons.auto_awesome_rounded;
    if (clean.contains('VENUS')) return Icons.favorite_rounded;
    if (clean.contains('SATURN')) return Icons.hourglass_bottom_rounded;
    return Icons.brightness_3_rounded;
  }
}

class _SnapshotCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _SnapshotCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      radius: 16,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AstroIconSquare(icon: icon, tint: AstroTint(color, color.withValues(alpha: 0.1)), size: 30),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTypography.headlineMedium.copyWith(fontSize: 19),
          ),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// Responsive grid whose rows size to their tallest tile, so content wraps
/// instead of clipping at large text sizes. The LayoutBuilder sits outside
/// the IntrinsicHeight rows (never inside).
class _EqualHeightGrid extends StatelessWidget {
  final double minTileWidth;
  final int maxColumns;
  final List<Widget> children;
  static const double spacing = 10;

  const _EqualHeightGrid({
    required this.minTileWidth,
    required this.maxColumns,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final textScale = MediaQuery.textScalerOf(context).scale(1);
        final minWidth = minTileWidth * textScale.clamp(1.0, 1.6);
        var cols = ((constraints.maxWidth + spacing) / (minWidth + spacing)).floor();
        cols = cols.clamp(1, maxColumns);
        final rows = <Widget>[];
        for (var i = 0; i < children.length; i += cols) {
          final rowChildren = <Widget>[];
          for (var c = 0; c < cols; c++) {
            if (c > 0) rowChildren.add(const SizedBox(width: spacing));
            final idx = i + c;
            rowChildren.add(Expanded(child: idx < children.length ? children[idx] : const SizedBox.shrink()));
          }
          if (rows.isNotEmpty) rows.add(const SizedBox(height: spacing));
          rows.add(IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: rowChildren),
          ));
        }
        return Column(children: rows);
      },
    );
  }
}
