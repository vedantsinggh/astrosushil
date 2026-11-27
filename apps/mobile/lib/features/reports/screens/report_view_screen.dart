import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_full_screen.dart';
import '../../astrology/widgets/kundli_chart_widget.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/report_brand_assets.dart';
import '../models/report_model.dart';
import '../providers/reports_provider.dart';
import '../widgets/report_ui.dart';

enum ReportViewTab { overview, chartsAndHouses, timelines, fullDetails }

enum _TimelineFilter { all, dasha, transits, periods }

class ReportViewScreen extends ConsumerStatefulWidget {
  final String birthProfileId;
  final String? partnerProfileId;
  final String reportType;

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
  ReportViewTab _activeTab = ReportViewTab.overview;
  _TimelineFilter _timelineFilter = _TimelineFilter.all;

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

    final idPrefix = reportResponse.id.length >= 8 ? reportResponse.id.substring(0, 8) : reportResponse.id;
    final filename = 'astro_sushil_${widget.reportType.toLowerCase()}_$idPrefix.pdf';

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

  void _showPlanetDetailsModal(
    BuildContext context,
    ReportPlanetModel planet,
    ReportDataModel report,
    ReportBrandInfo? brand,
  ) {
    final matchingSections = report.sections.where((sec) {
      final needle = planet.planet.toLowerCase();
      return sec.title.toLowerCase().contains(needle) || sec.content.toLowerCase().contains(needle);
    }).toList();

    showAstroSheet<void>(
      context: context,
      title: '${planet.planet} • ${planet.sign}',
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AstroIconSquare(
                icon: _getPlanetIcon(planet.planet),
                tint: AstroTint(
                  brand?.textAccentColor ?? AppColors.accent,
                  brand?.tintColor ?? AppColors.accentFill,
                ),
                size: 44,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'House ${planet.house} • ${_getHouseDomainName(planet.house)}',
                      style: AppTypography.headlineMedium.copyWith(fontSize: 18),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${planet.degree.toStringAsFixed(2)}° in ${planet.sign}${planet.isRetrograde ? ' (Retrograde)' : ''}',
                      style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          AstroSurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Nakshatra: ${planet.nakshatra} (Pada ${planet.pada})',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                Text(
                  _getHouseDescription(planet.house),
                  style: const TextStyle(fontSize: 15, color: AppColors.textSecondary, height: 1.45),
                ),
              ],
            ),
          ),
          if (matchingSections.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text('Related Report Insights', style: AppTypography.sectionHeader),
            const SizedBox(height: 8),
            for (final sec in matchingSections.take(2)) ...[
              AstroSurfaceCard(
                color: brand?.tintColor ?? AppColors.cardSurfaceWarm,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sec.title,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    if (sec.content.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        sec.content,
                        style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.45),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ],
        ],
      ),
    );
  }

  void _showHouseDetailsModal(
    BuildContext context,
    ReportHouseModel house,
    ReportDataModel report,
    ReportBrandInfo? brand,
  ) {
    showAstroSheet<void>(
      context: context,
      title: 'House ${house.houseNumber} • ${house.sign}',
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AstroIconSquare(
                icon: Icons.home_outlined,
                tint: AstroTint(
                  brand?.textAccentColor ?? AppColors.accent,
                  brand?.tintColor ?? AppColors.accentFill,
                ),
                size: 44,
              ),
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
              children: house.planetsPresent.map((planetName) {
                ReportPlanetModel? matchedPlanet;
                for (final p in report.planets) {
                  if (p.planet.toLowerCase() == planetName.toLowerCase()) {
                    matchedPlanet = p;
                    break;
                  }
                }
                return ActionChip(
                  backgroundColor: brand?.tintColor ?? AstroTint.violet.background,
                  label: Text(
                    planetName,
                    style: TextStyle(
                      color: brand?.textAccentColor ?? AstroTint.violet.foreground,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  onPressed: matchedPlanet == null
                      ? null
                      : () {
                          Navigator.of(ctx).pop();
                          _showPlanetDetailsModal(context, matchedPlanet!, report, brand);
                        },
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

  Widget _sectionHeading(String title, {String? helper}) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
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

  bool _isTimelineSection(ReportSectionModel sec) {
    final type = sec.type.toUpperCase();
    final combined = '${sec.title} ${sec.content}'.toLowerCase();
    return type.contains('TIMELINE') ||
        type.contains('DASHA') ||
        type.contains('TRANSIT') ||
        type.contains('PERIOD') ||
        combined.contains('dasha') ||
        combined.contains('transit') ||
        combined.contains('gochara') ||
        combined.contains('sade sati') ||
        combined.contains('varshphal') ||
        combined.contains('timeline') ||
        combined.contains('month') ||
        combined.contains('quarter') ||
        combined.contains('year') ||
        combined.contains('window') ||
        combined.contains('period');
  }

  bool _matchesTimelineFilter(ReportSectionModel sec, _TimelineFilter filter) {
    if (filter == _TimelineFilter.all) return true;
    final combined = '${sec.type} ${sec.title} ${sec.content}'.toLowerCase();
    switch (filter) {
      case _TimelineFilter.dasha:
        return combined.contains('dasha') || combined.contains('antardasha') || combined.contains('mahadasha');
      case _TimelineFilter.transits:
        return combined.contains('transit') || combined.contains('gochara') || combined.contains('sade sati');
      case _TimelineFilter.periods:
        return combined.contains('month') ||
            combined.contains('quarter') ||
            combined.contains('year') ||
            combined.contains('window') ||
            combined.contains('period') ||
            combined.contains('milestone');
      case _TimelineFilter.all:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportsNotifierProvider);
    final routeBrand = ReportBrandRegistry.resolve(widget.reportType);
    final loadedBrand = state.reportResponse != null
        ? (ReportBrandRegistry.resolve(state.reportResponse!.report.type) ?? routeBrand)
        : routeBrand;
    final pageTitle = loadedBrand?.title ??
        (state.reportResponse?.report.title.isNotEmpty == true
            ? state.reportResponse!.report.title
            : 'Astrology Report');

    Widget fill(Widget child) => SliverFillRemaining(hasScrollBody: false, child: child);

    return AstroPage(
      title: pageTitle,
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
                        label: state.isDownloadingPdf ? 'Preparing your PDF...' : 'Download or share PDF',
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
            if (state.isLoading) {
              return fill(const AstroLoaderFullScreen(
                message: 'Reading your cosmic map...',
                isDark: false,
              ));
            }

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

            final report = reportResponse.report;
            final brand = loadedBrand;

            return AstroSliverContent(
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildReportCoverHeader(report, brand),
                    const SizedBox(height: 14),
                    SushilExplainerButton(
                      contextBuilder: () => _buildExplanationContext(report),
                      poseAsset: AppAssets.sushilGuiding,
                    ),
                    const SizedBox(height: 16),
                    _buildViewerTabs(brand),
                    const SizedBox(height: 8),
                    _buildActiveTabContent(context, report, brand),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildViewerTabs(ReportBrandInfo? brand) {
    Widget tabPill(ReportViewTab tab, String label, IconData icon, String keyName) {
      final selected = _activeTab == tab;
      return AstroPill(
        key: ValueKey(keyName),
        label: label,
        icon: icon,
        selected: selected,
        onTap: () => setState(() => _activeTab = tab),
      );
    }

    return Semantics(
      container: true,
      label: 'Report viewer sections',
      child: ReportCard(
        padding: const EdgeInsets.all(14),
        borderColor: brand != null ? brand.accentColor.withValues(alpha: 0.3) : AppColors.cardBorder,
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            tabPill(ReportViewTab.overview, 'Overview', Icons.dashboard_outlined, 'report-view-tab-overview'),
            tabPill(
              ReportViewTab.chartsAndHouses,
              'Charts & Houses',
              Icons.grid_view_rounded,
              'report-view-tab-charts',
            ),
            tabPill(ReportViewTab.timelines, 'Timelines', Icons.timeline_rounded, 'report-view-tab-timelines'),
            tabPill(ReportViewTab.fullDetails, 'Full Details', Icons.article_outlined, 'report-view-tab-details'),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveTabContent(BuildContext context, ReportDataModel report, ReportBrandInfo? brand) {
    switch (_activeTab) {
      case ReportViewTab.overview:
        return _buildOverviewTab(report, brand);
      case ReportViewTab.chartsAndHouses:
        return _buildChartsAndHousesTab(context, report, brand);
      case ReportViewTab.timelines:
        return _buildTimelinesTab(report, brand);
      case ReportViewTab.fullDetails:
        return _buildFullDetailsTab(context, report, brand);
    }
  }

  Widget _buildOverviewTab(ReportDataModel report, ReportBrandInfo? brand) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (brand != null) ...[
          const SizedBox(height: 16),
          _buildIllustrationStrip(brand),
        ],
        _sectionHeading('At a glance'),
        _buildExecutiveSummary(report),
        _sectionHeading('Your Birth Nakshatra'),
        _buildNakshatraSection(report, brand),
        _sectionHeading(
          'Astrological Insights',
          helper: report.sections.isNotEmpty ? 'Tap any insight card to read full details.' : null,
        ),
        if (report.sections.isEmpty)
          const AstroNote(
            'Detailed narrative insights are not included in this compact chart payload.',
          )
        else
          for (final sec in report.sections) _buildSectionCard(sec, brand),
      ],
    );
  }

  Widget _buildChartsAndHousesTab(BuildContext context, ReportDataModel report, ReportBrandInfo? brand) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeading(
          'Your Birth Chart',
          helper: 'North Indian style Vedic planetary layout',
        ),
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
        _sectionHeading(
          'Planets',
          helper: 'Tap a planet to expand placement details or open its explanation.',
        ),
        for (final p in report.planets) _buildPlanetInsightCard(p, report, brand),
        _sectionHeading(
          'Your 12 Houses',
          helper: 'Tap a house to learn more about its domain and occupant planets.',
        ),
        _buildHousesGrid(context, report, brand),
      ],
    );
  }

  Widget _buildTimelinesTab(ReportDataModel report, ReportBrandInfo? brand) {
    final allTimelines = report.sections.where(_isTimelineSection).toList();
    final filtered = allTimelines.where((s) => _matchesTimelineFilter(s, _timelineFilter)).toList();

    Widget filterPill(_TimelineFilter filter, String label, String keyName) {
      return AstroPill(
        key: ValueKey(keyName),
        label: label,
        selected: _timelineFilter == filter,
        onTap: () => setState(() => _timelineFilter = filter),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 24, bottom: 12),
          child: Row(
            children: [
              Image.asset(
                ReportBrandRegistry.timelineMarkerAsset,
                width: 24,
                height: 24,
                cacheWidth: 72,
                excludeFromSemantics: true,
                errorBuilder: (_, __, ___) => Icon(
                  Icons.timeline_rounded,
                  size: 22,
                  color: brand?.textAccentColor ?? AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              const Expanded(child: ReportHeading('Timelines & Cycles')),
            ],
          ),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            filterPill(_TimelineFilter.all, 'All (${allTimelines.length})', 'report-timeline-filter-all'),
            filterPill(_TimelineFilter.dasha, 'Dasha', 'report-timeline-filter-dasha'),
            filterPill(_TimelineFilter.transits, 'Transits', 'report-timeline-filter-transits'),
            filterPill(_TimelineFilter.periods, 'Periods', 'report-timeline-filter-periods'),
          ],
        ),
        const SizedBox(height: 16),
        if (allTimelines.isEmpty)
          const AstroNote(
            'No Dasha or transit timeline entries were included in this report payload. Download the PDF edition for full chronological tables when available.',
          )
        else if (filtered.isEmpty)
          const AstroNote(
            'No timeline entries in this report match the selected filter. Choose "All" to view all available timelines.',
          )
        else
          for (final sec in filtered) _buildSectionCard(sec, brand, useTimelineMarker: true),
      ],
    );
  }

  Widget _buildFullDetailsTab(BuildContext context, ReportDataModel report, ReportBrandInfo? brand) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeading('Birth Particulars & Configuration'),
        ReportCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _detailRow('Name', report.profile.name),
              _detailRow('Date of Birth', report.profile.dateOfBirth),
              _detailRow('Time of Birth', report.profile.timeOfBirth),
              if (report.profile.placeName != null && report.profile.placeName!.isNotEmpty)
                _detailRow('Birth Place', report.profile.placeName!),
              if (report.profile.timezone.isNotEmpty) _detailRow('Timezone', report.profile.timezone),
              const Divider(height: 20, color: AppColors.cardBorderSubtle),
              _detailRow('Zodiac', report.configuration.zodiacType),
              _detailRow('Ayanamsa', report.configuration.ayanamsa),
              _detailRow('House System', report.configuration.houseSystem),
              _detailRow('Node Calculation', report.configuration.nodeCalculation),
            ],
          ),
        ),
        _sectionHeading('All Planetary Placements'),
        for (final p in report.planets) _buildPlanetInsightCard(p, report, brand),
        if (report.houses.isNotEmpty) ...[
          _sectionHeading('12 Houses Summary'),
          _buildHousesGrid(context, report, brand),
        ],
        if (report.sections.isNotEmpty) ...[
          _sectionHeading('All Report Sections'),
          for (final sec in report.sections) _buildSectionCard(sec, brand),
        ],
      ],
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIllustrationStrip(ReportBrandInfo brand) {
    return ReportCard(
      color: brand.tintColor,
      borderColor: brand.accentColor.withValues(alpha: 0.35),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 72,
            height: 52,
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: brand.primaryColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Image.asset(
              brand.illustrationAsset,
              fit: BoxFit.contain,
              cacheWidth: 220,
              excludeFromSemantics: true,
              errorBuilder: (_, __, ___) => Icon(brand.icon, color: brand.accentColor, size: 28),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  brand.motifDescription,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: brand.textAccentColor,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 6),
                Image.asset(
                  ReportBrandRegistry.sectionDividerAsset,
                  height: 10,
                  cacheWidth: 320,
                  fit: BoxFit.contain,
                  excludeFromSemantics: true,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportCoverHeader(ReportDataModel report, ReportBrandInfo? brand) {
    final primary = brand?.primaryColor ?? AppColors.primary;
    final accent = brand?.accentColor ?? AppColors.gold;
    final headerGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        primary,
        Color.lerp(primary, AppColors.midnight, 0.4) ?? AppColors.midnight,
      ],
    );

    Widget infoRow(IconData icon, String text) {
      return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Icon(icon, color: accent, size: 19),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(fontSize: 15, height: 1.35, color: AppColors.textInverseSecondary),
              ),
            ),
          ],
        ),
      );
    }

    return AstroGradientCard(
      gradient: headerGradient,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (brand != null) ...[
            SizedBox(
              width: 68,
              child: AspectRatio(
                aspectRatio: 210 / 297,
                child: Container(
                  decoration: BoxDecoration(
                    color: primary,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: accent.withValues(alpha: 0.6)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Image.asset(
                    brand.coverAsset,
                    fit: BoxFit.cover,
                    cacheWidth: 220,
                    semanticLabel: '${report.title} cover',
                    errorBuilder: (_, __, ___) => Icon(brand.icon, color: accent, size: 28),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(report.title, style: AppTypography.displayMedium.copyWith(fontSize: 21, color: Colors.white)),
                ),
                const SizedBox(height: 8),
                infoRow(Icons.person_outline, report.profile.name),
                infoRow(Icons.cake_outlined, '${report.profile.dateOfBirth} • ${report.profile.timeOfBirth}'),
                if (report.profile.placeName != null && report.profile.placeName!.isNotEmpty)
                  infoRow(Icons.location_on_outlined, report.profile.placeName!),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExecutiveSummary(ReportDataModel report) {
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

  Widget _buildPlanetInsightCard(ReportPlanetModel p, ReportDataModel report, ReportBrandInfo? brand) {
    final expandKey = 'planet:${p.planet}';
    final isExpanded = _expandedSections.contains(expandKey);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AstroSurfaceCard(
        padding: EdgeInsets.zero,
        borderColor: isExpanded ? brand?.accentColor.withValues(alpha: 0.5) : null,
        child: Column(
          children: [
            InkWell(
              onTap: () => _toggleSection(expandKey),
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
                    Text(
                      '${p.planet} in ${p.sign} · House ${p.house} (${_getHouseDomainName(p.house)})',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: brand?.textAccentColor ?? AppColors.secondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _getHouseDescription(p.house),
                      style: const TextStyle(
                        fontSize: 15,
                        color: AppColors.lightTextPrimary,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: () => _showPlanetDetailsModal(context, p, report, brand),
                        icon: const Icon(Icons.open_in_new_rounded, size: 18),
                        label: const Text('View full placement sheet'),
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

  Widget _buildHousesGrid(BuildContext context, ReportDataModel report, ReportBrandInfo? brand) {
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
        onTap: () => _showHouseDetailsModal(context, house, report, brand),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'House $houseNum',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: brand?.textAccentColor ?? AppColors.primary,
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

  Widget _buildNakshatraSection(ReportDataModel report, ReportBrandInfo? brand) {
    final info = report.nakshatra.associatedInfo;
    return AstroSurfaceCard(
      padding: const EdgeInsets.all(20),
      borderColor: brand?.accentColor.withValues(alpha: 0.3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AstroIconSquare(
                icon: Icons.star_rounded,
                tint: AstroTint(
                  brand?.textAccentColor ?? AstroTint.violet.foreground,
                  brand?.tintColor ?? AstroTint.violet.background,
                ),
                size: 44,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(report.nakshatra.birthNakshatra, style: AppTypography.displayMedium.copyWith(fontSize: 24)),
                    const SizedBox(height: 2),
                    Text(
                      'Pada ${report.nakshatra.pada} • Ruling Planet: ${report.nakshatra.rulingPlanet}',
                      style: TextStyle(
                        fontSize: 16,
                        color: brand?.textAccentColor ?? AstroTint.violet.foreground,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (info.isNotEmpty) ...[
            const Divider(height: 28, color: AppColors.separator),
            const Text(
              'Nakshatra Notes:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              info,
              style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, height: 1.5),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionCard(
    ReportSectionModel sec,
    ReportBrandInfo? brand, {
    bool useTimelineMarker = false,
  }) {
    final expandKey = 'sec:${sec.id.isNotEmpty ? sec.id : sec.title}';
    final isExpanded = _expandedSections.contains(expandKey);
    final markerAsset =
        useTimelineMarker ? ReportBrandRegistry.timelineMarkerAsset : ReportBrandRegistry.insightStarAsset;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AstroSurfaceCard(
        padding: EdgeInsets.zero,
        borderColor: isExpanded ? brand?.accentColor.withValues(alpha: 0.45) : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: () => _toggleSection(expandKey),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 56),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 10, 14),
                  child: Row(
                    children: [
                      Image.asset(
                        markerAsset,
                        width: 20,
                        height: 20,
                        cacheWidth: 60,
                        excludeFromSemantics: true,
                        errorBuilder: (_, __, ___) => Icon(
                          useTimelineMarker ? Icons.timeline_rounded : Icons.auto_awesome_rounded,
                          size: 18,
                          color: brand?.textAccentColor ?? AppColors.goldDark,
                        ),
                      ),
                      const SizedBox(width: 10),
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
                    if (sec.content.isNotEmpty)
                      Text(
                        sec.content,
                        style: const TextStyle(
                          fontSize: 16,
                          color: AppColors.lightTextPrimary,
                          height: 1.6,
                        ),
                      ),
                    if (sec.listItems != null && sec.listItems!.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      for (final item in sec.listItems!) ReportBullet(item),
                    ],
                    if (sec.keyValues != null && sec.keyValues!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: sec.keyValues!.entries.map((e) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: brand?.tintColor ?? AppColors.lightBackground,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: brand?.accentColor.withValues(alpha: 0.35) ?? AppColors.cardBorderSubtle,
                              ),
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
/// instead of clipping at large text sizes.
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
