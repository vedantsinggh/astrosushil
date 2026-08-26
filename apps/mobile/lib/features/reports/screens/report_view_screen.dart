import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_error_state.dart';
import '../../../shared/widgets/astro_loader/astro_loader_full_screen.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../astrology/widgets/kundli_chart_widget.dart';
import '../models/report_model.dart';
import '../providers/reports_provider.dart';

class ReportViewScreen extends ConsumerStatefulWidget {
  final String birthProfileId;
  final String reportType; // 'KUNDLI' or 'PLANETARY_SUMMARY'

  const ReportViewScreen({
    super.key,
    required this.birthProfileId,
    this.reportType = 'KUNDLI',
  });

  @override
  ConsumerState<ReportViewScreen> createState() => _ReportViewScreenState();
}

class _ReportViewScreenState extends ConsumerState<ReportViewScreen> {
  final Set<String> _expandedSections = {};

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
          reportType: widget.reportType,
        );
  }

  Future<void> _downloadPdf() async {
    final state = ref.read(reportsNotifierProvider);
    final reportResponse = state.reportResponse;
    if (reportResponse == null) return;

    final filename =
        'astro_sushil_${widget.reportType.toLowerCase()}_${reportResponse.id.substring(0, 8)}.pdf';

    final success = await ref
        .read(reportsNotifierProvider.notifier)
        .downloadAndSharePdf(reportResponse.id, filename);

    if (!success && mounted) {
      final err = ref.read(reportsNotifierProvider).errorMessage ??
          'Failed to download PDF';
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
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(
            top: BorderSide(color: AppColors.premiumAccent, width: 1.5),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.premiumAccent.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '${house.houseNumber}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.premiumAccent,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'House ${house.houseNumber} • ${house.sign}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      _getHouseDomainName(house.houseNumber),
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.premiumAccent.withOpacity(0.9),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Occupant Planets:',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            if (house.planetsPresent.isEmpty)
              const Text(
                'No major planets placed in this house (unoccupied).',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: house.planetsPresent.map((p) {
                  return Chip(
                    backgroundColor: AppColors.surfaceElevated,
                    label: Text(
                      p,
                      style: const TextStyle(
                        color: AppColors.premiumAccent,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  );
                }).toList(),
              ),
            const SizedBox(height: 20),
            Text(
              _getHouseDescription(house.houseNumber),
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withOpacity(0.85),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
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
      'The 12th House governs spiritual retreats, foreign residence, subconscious mind, and subconscious release.',
    ];
    if (house >= 1 && house <= 12) return descriptions[house - 1];
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportsNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          widget.reportType == 'PLANETARY_SUMMARY'
              ? 'Planetary Summary'
              : 'Birth Chart & Kundli',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.lightSurface,
        foregroundColor: AppColors.lightTextPrimary,
        elevation: 0,
        actions: [
          if (state.reportResponse != null) ...[
            IconButton(
              icon: state.isDownloadingPdf
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    )
                  : const Icon(Icons.picture_as_pdf_outlined),
              tooltip: 'Download PDF',
              onPressed: state.isDownloadingPdf ? null : _downloadPdf,
            ),
            IconButton(
              icon: const Icon(Icons.share_outlined),
              tooltip: 'Share Report',
              onPressed: state.isDownloadingPdf ? null : _downloadPdf,
            ),
          ],
        ],
      ),
      bottomNavigationBar: state.reportResponse != null
          ? Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AppColors.lightSurface,
                border: const Border(
                  top: BorderSide(color: AppColors.lightBorder, width: 1),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: state.isDownloadingPdf ? null : _downloadPdf,
                        icon: state.isDownloadingPdf
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.download_rounded, size: 20),
                        label: Text(
                          state.isDownloadingPdf
                              ? 'Preparing your Kundli PDF...'
                              : 'Download PDF Report',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
      body: Builder(
        builder: (context) {
          // 1. Loading State using AstroLoaderFullScreen
          if (state.isLoading) {
            return const AstroLoaderFullScreen(
              message: 'Reading your cosmic map...',
              isDark: false,
            );
          }

          // 2. Error State using AstroErrorState
          if (state.errorMessage != null && state.reportResponse == null) {
            return AstroErrorState(
              title: 'Your report couldn\'t be loaded',
              message: state.errorMessage!,
              onRetry: _loadReport,
            );
          }

          // 3. Empty / Missing Data State
          final reportResponse = state.reportResponse;
          if (reportResponse == null || reportResponse.report.planets.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        size: 56, color: AppColors.warning),
                    const SizedBox(height: 16),
                    const Text(
                      'Report Data Unavailable',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Complete planetary chart data is required to render this report.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.lightTextSecondary),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: _loadReport,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Try Again'),
                    ),
                  ],
                ),
              ),
            );
          }

          // 4. Structured Report Display
          final report = reportResponse.report;

          return SubtleCelestialBackground(
            child: SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 4.1 REPORT COVER / PREMIUM HEADER CARD
                  _buildReportCoverHeader(report),

                  const SizedBox(height: 20),

                  // 4.2 EXECUTIVE SUMMARY ("YOUR COSMIC SNAPSHOT")
                  _buildExecutiveSummary(report),

                  const SizedBox(height: 24),

                  // 4.3 NORTH INDIAN KUNDLI CHART
                  Text(
                    'Your Birth Chart',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'North Indian style Vedic planetary layout',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  KundliChartWidget(
                    chart: report.toAstroChartModel(),
                    size: 320,
                    showTitle: true,
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppColors.primary.withOpacity(0.1)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline,
                            size: 16, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Understand your chart: The North Indian Kundli maps your 12 houses starting with your Ascendant sign at the top center diamond (House 1).',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.lightTextPrimary.withOpacity(0.85),
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // 4.4 KEY PLACEMENTS GRID
                  Text(
                    'Key Placements',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                  ),
                  const SizedBox(height: 12),
                  _buildKeyPlacementsGrid(report),

                  const SizedBox(height: 24),

                  // 4.5 PLANETARY INSIGHTS LIST
                  Row(
                    children: [
                      Text(
                        'Planetary Dynamics & Force',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.lightTextPrimary,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...report.planets.map((p) => _buildPlanetInsightCard(p)),

                  const SizedBox(height: 24),

                  // 4.6 YOUR 12 HOUSES GRID
                  Text(
                    'Your 12 Houses',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Tap any house card to view detailed domain analysis',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildHousesGrid(context, report),

                  const SizedBox(height: 24),

                  // 4.7 YOUR BIRTH NAKSHATRA DEDICATED SECTION
                  _buildNakshatraSection(report),

                  const SizedBox(height: 24),

                  // 4.8 ASTROLOGICAL INSIGHTS & INTERPRETATIONS
                  if (report.sections.isNotEmpty) ...[
                    Text(
                      'Astrological Insights',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.lightTextPrimary,
                          ),
                    ),
                    const SizedBox(height: 12),
                    ...report.sections.map((sec) => _buildSectionCard(sec)),
                    const SizedBox(height: 16),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // Cover Banner Widget
  Widget _buildReportCoverHeader(ReportDataModel report) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.premiumAccent.withOpacity(0.4),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.18),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'ASTRO SUSHIL OFFICIAL REPORT',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    color: AppColors.premiumAccent,
                  ),
                ),
              ),
              const Spacer(),
              const Icon(Icons.auto_awesome,
                  color: AppColors.premiumAccent, size: 18),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            report.title.toUpperCase(),
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '"Your cosmic blueprint"',
            style: TextStyle(
              fontSize: 14,
              fontStyle: FontStyle.italic,
              color: AppColors.premiumAccent,
            ),
          ),
          const Divider(height: 24, color: AppColors.border),
          Row(
            children: [
              const Icon(Icons.person_outline,
                  color: Colors.white70, size: 16),
              const SizedBox(width: 6),
              Text(
                report.profile.name,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.cake_outlined, color: Colors.white70, size: 16),
              const SizedBox(width: 6),
              Text(
                '${report.profile.dateOfBirth} • ${report.profile.timeOfBirth}',
                style: const TextStyle(fontSize: 13, color: Color(0xDDFFFFFF)),
              ),
            ],
          ),
          if (report.profile.placeName != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    color: Colors.white70, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    report.profile.placeName!,
                    style: const TextStyle(fontSize: 13, color: Color(0xDDFFFFFF)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // Executive Summary Cards Widget ("Your Cosmic Snapshot")
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your Cosmic Snapshot',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.lightTextPrimary,
              ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.6,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: [
            _SnapshotCard(
              title: 'ASCENDANT',
              value: report.ascendant.sign,
              subtitle: '${report.ascendant.degree.toStringAsFixed(1)}°',
              icon: Icons.brightness_7_rounded,
              color: AppColors.primary,
            ),
            _SnapshotCard(
              title: 'SUN SIGN',
              value: sun.sign,
              subtitle: '${sun.degree.toStringAsFixed(1)}°',
              icon: Icons.wb_sunny_rounded,
              color: Colors.amber.shade800,
            ),
            _SnapshotCard(
              title: 'MOON SIGN',
              value: moon.sign,
              subtitle: '${moon.degree.toStringAsFixed(1)}°',
              icon: Icons.nightlight_round,
              color: Colors.indigo,
            ),
            _SnapshotCard(
              title: 'NAKSHATRA',
              value: report.nakshatra.birthNakshatra,
              subtitle: 'Pada ${report.nakshatra.pada}',
              icon: Icons.star_border_rounded,
              color: AppColors.supportingAccent,
            ),
          ],
        ),
      ],
    );
  }

  // Key Placements Grid
  Widget _buildKeyPlacementsGrid(ReportDataModel report) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: report.planets.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final p = report.planets[index];
        return Card(
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.lightBorder),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: p.isRetrograde
                        ? AppColors.supportingAccent.withOpacity(0.15)
                        : AppColors.primary.withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _getPlanetIcon(p.planet),
                    size: 18,
                    color: p.isRetrograde
                        ? AppColors.supportingAccent
                        : AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            p.planet,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.lightTextPrimary,
                            ),
                          ),
                          if (p.isRetrograde) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color:
                                    AppColors.supportingAccent.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'RETROGRADE',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.supportingAccent,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${p.sign} ${p.degree.toStringAsFixed(2)}° • Nakshatra: ${p.nakshatra} P${p.pada}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'House ${p.house}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Planet Insight Item Card
  Widget _buildPlanetInsightCard(ReportPlanetModel p) {
    final isExpanded = _expandedSections.contains(p.planet);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      child: Column(
        children: [
          ListTile(
            onTap: () => _toggleSection(p.planet),
            leading: Icon(_getPlanetIcon(p.planet), color: AppColors.primary),
            title: Row(
              children: [
                Text(
                  p.planet,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'CALCULATED DATA',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
            subtitle: Text(
              '${p.sign} ${p.degree.toStringAsFixed(2)}° • House ${p.house}',
              style: const TextStyle(fontSize: 12),
            ),
            trailing: Icon(
              isExpanded
                  ? Icons.keyboard_arrow_up_rounded
                  : Icons.keyboard_arrow_down_rounded,
            ),
          ),
          if (isExpanded)
            Padding(
              padding:
                  const EdgeInsets.only(left: 16, right: 16, bottom: 16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.lightBackground,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome,
                            size: 14, color: AppColors.secondary),
                        const SizedBox(width: 6),
                        Text(
                          'ASTROLOGICAL INTERPRETATION',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.1,
                            color: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${p.planet} in ${p.sign} (${p.house}th House): Traditionally, this placement influences your key expression in ${p.sign} traits within the domain of the ${p.house}th house.',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.lightTextPrimary,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  // 12 Houses 3-Column Grid Widget
  Widget _buildHousesGrid(BuildContext context, ReportDataModel report) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 1.1,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: 12,
      itemBuilder: (context, index) {
        final houseNum = index + 1;
        final house = report.houses.firstWhere(
          (h) => h.houseNumber == houseNum,
          orElse: () => ReportHouseModel(
            houseNumber: houseNum,
            sign: 'N/A',
            planetsPresent: [],
          ),
        );

        return InkWell(
          onTap: () => _showHouseDetailsModal(context, house),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.lightSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.lightBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'H$houseNum',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  house.sign,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                if (house.planetsPresent.isNotEmpty)
                  Text(
                    house.planetsPresent.join(', '),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.supportingAccent,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  )
                else
                  const Text(
                    'Empty',
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.lightTextMuted,
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Nakshatra Dedicated Card
  Widget _buildNakshatraSection(ReportDataModel report) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.tertiary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.premiumAccent, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.star_rounded,
                  color: AppColors.premiumAccent, size: 22),
              const SizedBox(width: 8),
              const Text(
                'YOUR BIRTH NAKSHATRA',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: AppColors.premiumAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            report.nakshatra.birthNakshatra,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Pada ${report.nakshatra.pada} • Ruling Planet: ${report.nakshatra.rulingPlanet}',
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          const Divider(height: 24, color: AppColors.border),
          const Text(
            'Understanding your Nakshatra:',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            report.nakshatra.associatedInfo.isNotEmpty
                ? report.nakshatra.associatedInfo
                : 'Your Janma Nakshatra governs your subconscious emotional patterns, natural talents, and planetary dasha cycles.',
            style: TextStyle(
              fontSize: 13,
              color: Colors.white.withOpacity(0.85),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  // Interpretation Section Card
  Widget _buildSectionCard(ReportSectionModel sec) {
    final isExpanded = _expandedSections.contains(sec.id);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      child: Column(
        children: [
          ListTile(
            onTap: () => _toggleSection(sec.id),
            title: Text(
              sec.title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.lightTextPrimary,
              ),
            ),
            trailing: Icon(
              isExpanded
                  ? Icons.keyboard_arrow_up_rounded
                  : Icons.keyboard_arrow_down_rounded,
            ),
          ),
          if (isExpanded)
            Padding(
              padding:
                  const EdgeInsets.only(left: 16, right: 16, bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    sec.content,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.lightTextPrimary,
                      height: 1.45,
                    ),
                  ),
                  if (sec.keyValues != null &&
                      sec.keyValues!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: sec.keyValues!.entries.map((e) {
                        return Chip(
                          backgroundColor: AppColors.lightBackground,
                          label: Text(
                            '${e.key}: ${e.value}',
                            style: const TextStyle(fontSize: 12),
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
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
