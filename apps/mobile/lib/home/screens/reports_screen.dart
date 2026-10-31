import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/reports/models/user_report_item_model.dart';
import '../../features/reports/providers/career_report_provider.dart';
import '../../features/reports/providers/reports_provider.dart';
import '../../features/reports/screens/report_detail_screen.dart';
import '../../features/reports/screens/report_pdf_viewer_screen.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_gradients.dart';
import '../../shared/widgets/astro_card.dart';
import '../../shared/widgets/subtle_celestial_background.dart';

final selectedReportProfileIdProvider = StateProvider<String?>((ref) => null);

/// Master Reports Experience Screen for Astro Sushil (Phase 5 Redesign)
class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _historyFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _navigateToDetail({
    required BuildContext context,
    required String reportType,
    required String title,
    required String tagline,
    required String description,
    required String priceText,
    required int pricePaise,
    required IconData icon,
    required Color accentColor,
    required BirthProfileModel profile,
    required List<String> includedSections,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ReportDetailScreen(
          reportType: reportType,
          title: title,
          tagline: tagline,
          description: description,
          priceText: priceText,
          pricePaise: pricePaise,
          icon: icon,
          accentColor: accentColor,
          initialProfile: profile,
          includedSections: includedSections,
        ),
      ),
    );
  }

  void _onKundliReportAction({
    required BuildContext context,
    required WidgetRef ref,
    required BirthProfileModel profile,
  }) {
    _navigateToDetail(
      context: context,
      reportType: 'KUNDLI',
      title: 'Birth Chart & Kundli Report',
      tagline: 'YOUR COSMIC BLUEPRINT (D1 & CHANDRA)',
      description:
          'Comprehensive astrological document detailing your Janma & Chandra Kundli, 9 Grahas, Vimshottari Dasha, Doshas, and Gemstone recommendations.',
      priceText: '₹299',
      pricePaise: 29900,
      icon: Icons.auto_awesome_rounded,
      accentColor: AppColors.accentGold,
      profile: profile,
      includedSections: const [
        'North Indian D1 Lagna Kundli & Chandra Kundli',
        '9 Graha Placements, Degrees & Functional Dignities',
        '120-Year Parashari Vimshottari Dasha Periods',
        'Classical Dosha Detection (Manglik, Sade Sati, Kaal Sarp)',
        'Trikona Lord Gemstone Recommendations (1st, 5th, 9th Lords)',
      ],
    );
  }

  void _onPlanetaryReportAction({
    required BuildContext context,
    required WidgetRef ref,
    required BirthProfileModel profile,
  }) {
    _navigateToDetail(
      context: context,
      reportType: 'PLANETARY_SUMMARY',
      title: 'Mini Horoscope & Transit Forecast',
      tagline: '3-6 MONTH TRANSIT WINDOWS & SADE SATI',
      description:
          'Detailed transit forecast from Janma Rashi, Sade Sati phase analysis, planetary dignities, and key caution dates.',
      priceText: '₹199',
      pricePaise: 19900,
      icon: Icons.brightness_6_rounded,
      accentColor: AppColors.secondary,
      profile: profile,
      includedSections: const [
        '3–6 Month Transit Horizons from Janma Rashi (Natal Moon)',
        'Real-Time Sade Sati Phase Tracking & Astrological Influence',
        'Planetary Combustion, Retrogression & Dignity Status',
        'Critical Astrological Caution Dates & Favorable Windows',
      ],
    );
  }

  void _onProHoroscopeAction({
    required BuildContext context,
    required WidgetRef ref,
    required BirthProfileModel profile,
  }) {
    _navigateToDetail(
      context: context,
      reportType: 'CAREER_PROSITY',
      title: 'Pro Horoscope & Divisional Charts',
      tagline: 'SHODASHVARGAS (D1, D9, D10, D7, D12) & SHADBALA',
      description:
          'Multi-divisional analysis, 6-fold planetary Shadbala, 12 Bhava Bala rank analysis, and classical remedial measures.',
      priceText: '₹699',
      pricePaise: 69900,
      icon: Icons.military_tech_rounded,
      accentColor: Colors.purple,
      profile: profile,
      includedSections: const [
        'Harmonic Shodashvargas: D1, D9 (Navamsha), D10 (Dashamsha), D7, D12',
        '6-Fold Planetary Shadbala Strengths with Parashari Thresholds',
        '12 Bhava Bala House Potency & Relative Strength Ranks',
        'Comprehensive Classical Vedic Remedial Guidance',
      ],
    );
  }

  void _onMatchmakingReportAction({
    required BuildContext context,
    required WidgetRef ref,
    required BirthProfileModel profile,
    required List<BirthProfileModel> profiles,
  }) {
    _navigateToDetail(
      context: context,
      reportType: 'MARRIAGE_COMPATIBILITY',
      title: 'Marriage & Relationship Report',
      tagline: 'ASHTAKOOTA 36-GUNA MILAN & MANGLIK',
      description:
          'Comprehensive 36-point Guna Milan, comparative Manglik analysis, and synastry synthesis for prospective couples.',
      priceText: '₹999',
      pricePaise: 99900,
      icon: Icons.favorite_rounded,
      accentColor: AppColors.supportingAccent,
      profile: profile,
      includedSections: const [
        'Full 36-Point Ashtakoota Guna Milan (Varna, Vashya, Tara, Yoni, Maitri, Gana, Bhakoot, Nadi)',
        'Comparative Dual-Chart Manglik Dosha Analysis & Cancellation Rules',
        '7th House & Venus/Jupiter Synastry Analysis',
        'Astrological Compatibility Score & Relationship Synthesis',
      ],
    );
  }

  void _onCareerReportAction({
    required BuildContext context,
    required WidgetRef ref,
    required BirthProfileModel profile,
  }) {
    _navigateToDetail(
      context: context,
      reportType: 'CAREER',
      title: 'Career & Professional Life',
      tagline: '10TH HOUSE & VOCATIONAL DNA',
      description:
          'A deeper look at your professional strengths, career patterns and opportunities.',
      priceText: '₹499',
      pricePaise: 49900,
      icon: Icons.work_outline_rounded,
      accentColor: Colors.teal,
      profile: profile,
      includedSections: const [
        '10th House Karma Bhava & Planetary Significators',
        'Professional Aptitude & Vocational DNA Mapping',
        'Saturn Career Lessons & Jupiter Expansion Horizons',
        'Multi-Year Dasha Professional Career Roadmap',
        'Practical Astrological & Behavioral Remedies',
      ],
    );
  }

  void _showCompareTiersSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardSurfaceWarm,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.all(22.0),
          child: ListView(
            controller: scrollController,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                context.l10n.reportCompareTiersTitle,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimaryDark,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Understand what each verified report tier provides.',
                style: TextStyle(fontSize: 13, color: AppColors.textMutedDark),
              ),
              const Divider(height: 20),
              Row(
                children: const [
                  Expanded(
                    flex: 3,
                    child: Text(
                      'Feature / Deliverable',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMutedDark),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Center(
                      child: Text(
                        'Mini\n₹199',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondaryDark),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Center(
                      child: Text(
                        'Basic\n₹299',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondaryDark),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Center(
                      child: Text(
                        'Career\n₹499',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondaryDark),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Center(
                      child: Text(
                        'Pro\n₹699',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondaryDark),
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 16, color: AppColors.cardBorder),
              _buildTierComparisonRow('Janma Kundli (D1 & Chandra)', true, true, true, false),
              _buildTierComparisonRow('120-Year Vimshottari Dasha', true, false, true, true),
              _buildTierComparisonRow('Doshas & Gemstones (1st/5th/9th)', true, false, true, false),
              _buildTierComparisonRow('3–6 Month Transit Horizon', false, true, false, false),
              _buildTierComparisonRow('Sade Sati Phase & Caution Dates', true, true, false, false),
              _buildTierComparisonRow('10th House Vocational DNA', false, false, false, true),
              _buildTierComparisonRow('Divisional Charts (D9, D10, D7, D12)', false, false, true, false),
              _buildTierComparisonRow('6-Fold Planetary Shadbala', false, false, true, false),
              _buildTierComparisonRow('12 Bhava Bala Potency Ranks', false, false, true, false),
              _buildTierComparisonRow('36-Point Guna Milan (Dual Profile)', false, false, false, false, note: 'Matchmaking Report Only'),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTierComparisonRow(
    String feature,
    bool basic,
    bool mini,
    bool pro,
    bool career, {
    String? note,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  feature,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimaryDark),
                ),
              ),
              if (note == null) ...[
                _buildCheckOrCross(mini),
                _buildCheckOrCross(basic),
                _buildCheckOrCross(career),
                _buildCheckOrCross(pro),
              ] else ...[
                Expanded(
                  flex: 4,
                  child: Text(
                    note,
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.accentGold),
                  ),
                ),
              ],
            ],
          ),
          const Divider(height: 12, color: AppColors.cardBorder),
        ],
      ),
    );
  }

  Widget _buildCheckOrCross(bool available) {
    return Expanded(
      flex: 1,
      child: Center(
        child: Icon(
          available ? Icons.check_circle_rounded : Icons.remove_rounded,
          size: 16,
          color: available ? AppColors.success : AppColors.cardBorder,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final profiles = profilesState.profiles;
    final selectedProfileId = ref.watch(selectedReportProfileIdProvider) ??
        (profiles.isNotEmpty ? profiles.first.id : null);

    final activeProfile = profiles.firstWhere(
      (p) => p.id == selectedProfileId,
      orElse: () => profiles.isNotEmpty
          ? profiles.first
          : BirthProfileModel(
              id: '',
              userId: '',
              name: 'Guest Profile',
              dateOfBirth: '1990-01-01',
              timeOfBirth: '12:00:00',
              latitude: 28.6139,
              longitude: 77.2090,
              timezone: 'Asia/Kolkata',
              placeName: 'New Delhi',
              createdAt: DateTime(2026, 1, 1),
              updatedAt: DateTime(2026, 1, 1),
            ),
    );

    final careerState = ref.watch(careerReportNotifierProvider);
    final isMatchingCareer = careerState.detail?.birthProfileId == activeProfile.id;
    final isCareerCompleted = isMatchingCareer && (careerState.status?.isCompleted ?? false);
    final isCareerProcessing = isMatchingCareer && (careerState.status?.isProcessing ?? false);

    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      appBar: AppBar(
        title: Text(
          context.l10n.reportsTitle,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: AppColors.cardSurfaceWarm,
        foregroundColor: AppColors.textPrimaryDark,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceParchment,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: AppColors.midnightNavy,
                borderRadius: BorderRadius.circular(10),
              ),
              labelColor: AppColors.cardSurfaceWarm,
              unselectedLabelColor: AppColors.textMutedDark,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.grid_view_rounded, size: 16),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          context.l10n.reportsTabCatalogue,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.history_edu_rounded, size: 16),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          context.l10n.reportsTabHistory,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: TabBarView(
            controller: _tabController,
            children: [
              // TAB 0: REPORT CATALOGUE
              _buildCatalogueTab(
                context: context,
                ref: ref,
                profiles: profiles,
                activeProfile: activeProfile,
                isCareerCompleted: isCareerCompleted,
                isCareerProcessing: isCareerProcessing,
                careerProgress: careerState.status?.progress ?? 0,
                careerReportId: careerState.activeReportId,
              ),

              // TAB 1: MY REPORTS (HISTORY / LIBRARY)
              _buildHistoryTab(context, ref),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCatalogueTab({
    required BuildContext context,
    required WidgetRef ref,
    required List<BirthProfileModel> profiles,
    required BirthProfileModel activeProfile,
    required bool isCareerCompleted,
    required bool isCareerProcessing,
    required int careerProgress,
    required String? careerReportId,
  }) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Premium Header Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: AppGradients.heroCosmic,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.cardBorderGold, width: 1.2),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x22121440),
                  blurRadius: 16,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppColors.accentGold.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.star_rounded,
                            color: AppColors.accentGold,
                            size: 16,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Flexible(
                          child: Text(
                            'YOUR ASTRO REPORTS',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.3,
                              color: AppColors.accentGold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.accentGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.accentGold, width: 0.8),
                      ),
                      child: Text(
                        context.l10n.deterministicEngineBadge,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.accentGold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Your Astrology Reports',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.cardSurfaceWarm,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Deeper insights from your birth chart.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.parchmentMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // 2. Profile Selector Header / Gate
          if (profiles.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Flexible(
                  child: Text(
                    'Active Birth Profile',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimaryDark,
                    ),
                  ),
                ),
                InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const CreateBirthProfileScreen(),
                      ),
                    );
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.add_circle_outline, size: 16, color: AppColors.secondary),
                      SizedBox(width: 4),
                      Text(
                        'Add New',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: profiles.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final p = profiles[index];
                  final isSelected = p.id == activeProfile.id;

                  return ChoiceChip(
                    label: Text(p.name),
                    selected: isSelected,
                    selectedColor: AppColors.midnightNavy,
                    backgroundColor: AppColors.cardSurfaceWarm,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textPrimaryDark,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(
                        color: isSelected ? AppColors.midnightNavy : AppColors.cardBorder,
                      ),
                    ),
                    onSelected: (_) {
                      ref.read(selectedReportProfileIdProvider.notifier).state = p.id;
                    },
                  );
                },
              ),
            ),
          ] else ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  const Icon(Icons.account_box_outlined, size: 44, color: AppColors.secondary),
                  const SizedBox(height: 12),
                  const Text(
                    'Your report is waiting.',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimaryDark),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Create your Kundli profile to unlock your personalized report.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: AppColors.textMutedDark),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.midnightNavy,
                      foregroundColor: AppColors.cardSurfaceWarm,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Create Kundli Profile'),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 18),

          // Compare Tiers Action
          InkWell(
            onTap: () => _showCompareTiersSheet(context),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: const Row(
                children: [
                  Icon(Icons.compare_arrows_rounded, size: 18, color: AppColors.accentGold),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Compare Report Tiers (Mini vs Basic vs Pro)',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.textPrimaryDark),
                    ),
                  ),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.textMutedDark),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // 3. AVAILABLE REPORTS SECTION
          const Row(
            children: [
              Text(
                'AVAILABLE REPORTS',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                  color: AppColors.lightTextMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 4. CAREER & PROFESSIONAL LIFE REPORT CARD (PRIMARY FEATURED)
          _ReportCard(
            title: 'Career & Professional Life',
            tagline: '10TH HOUSE & VOCATIONAL DNA',
            description:
                'A deeper look at your professional strengths, career patterns and opportunities.',
            icon: Icons.work_outline_rounded,
            accentColor: Colors.teal,
            isAvailable: true,
            badgeText: 'PREMIUM PDF',
            primaryActionText: isCareerCompleted
                ? 'View Report'
                : isCareerProcessing
                    ? 'In Progress ($careerProgress%)'
                    : 'Generate Report',
            onViewTap: () => _onCareerReportAction(
              context: context,
              ref: ref,
              profile: activeProfile,
            ),
            onDownloadTap: isCareerCompleted && careerReportId != null
                ? () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ReportPdfViewerScreen(
                          reportId: careerReportId,
                          reportTitle: 'Career & Professional Life',
                          clientName: activeProfile.name,
                        ),
                      ),
                    );
                  }
                : null,
          ),

          const SizedBox(height: 24),

          // 5. MORE HOROSCOPE DOSSIERS
          const Text(
            'MORE HOROSCOPE DOSSIERS',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
              color: AppColors.lightTextMuted,
            ),
          ),
          const SizedBox(height: 12),

          // KUNDLI REPORT CARD (₹299)
          _ReportCard(
            title: 'Birth Chart & Kundli Report',
            tagline: 'YOUR COSMIC BLUEPRINT (D1 & CHANDRA)',
            description:
                'Comprehensive astrological document detailing your Janma & Chandra Kundli, 9 Grahas, Vimshottari Dasha, Doshas, and Gemstone recommendations.',
            icon: Icons.auto_awesome_rounded,
            accentColor: AppColors.premiumAccent,
            isAvailable: true,
            badgeText: '₹299',
            primaryActionText: 'Generate Kundli Report',
            onViewTap: () => _onKundliReportAction(
              context: context,
              ref: ref,
              profile: activeProfile,
            ),
          ),

          const SizedBox(height: 14),

          // PLANETARY SUMMARY REPORT CARD (₹199)
          _ReportCard(
            title: 'Mini Horoscope & Transit Forecast',
            tagline: '3-6 MONTH TRANSIT WINDOWS & SADE SATI',
            description:
                'Detailed transit forecast from Janma Rashi, Sade Sati phase analysis, planetary dignities, and key caution dates.',
            icon: Icons.brightness_6_rounded,
            accentColor: AppColors.secondary,
            isAvailable: true,
            badgeText: '₹199',
            primaryActionText: 'Generate Mini Horoscope',
            onViewTap: () => _onPlanetaryReportAction(
              context: context,
              ref: ref,
              profile: activeProfile,
            ),
          ),

          const SizedBox(height: 14),

          // PRO HOROSCOPE REPORT CARD (₹699)
          _ReportCard(
            title: 'Pro Horoscope & Divisional Charts',
            tagline: 'SHODASHVARGAS (D1, D9, D10, D7, D12) & SHADBALA',
            description:
                'Multi-divisional analysis, 6-fold planetary Shadbala, 12 Bhava Bala rank analysis, and classical remedial measures.',
            icon: Icons.military_tech_rounded,
            accentColor: Colors.purple,
            isAvailable: true,
            badgeText: '₹699',
            primaryActionText: 'Generate Pro Horoscope',
            onViewTap: () => _onProHoroscopeAction(
              context: context,
              ref: ref,
              profile: activeProfile,
            ),
          ),

          const SizedBox(height: 14),

          // MATCHMAKING REPORT CARD (₹999)
          _ReportCard(
            title: 'Marriage & Relationship Report',
            tagline: 'ASHTAKOOTA 36-GUNA MILAN & MANGLIK',
            description:
                'Comprehensive 36-point Guna Milan, comparative Manglik analysis, and synastry synthesis for prospective couples.',
            icon: Icons.favorite_rounded,
            accentColor: AppColors.supportingAccent,
            isAvailable: true,
            badgeText: '₹999',
            primaryActionText: 'Generate Matchmaking Report',
            onViewTap: () => _onMatchmakingReportAction(
              context: context,
              ref: ref,
              profile: activeProfile,
              profiles: profiles,
            ),
          ),

          const SizedBox(height: 24),

          // 6. UPCOMING RESEARCH EDITIONS
          const Text(
            'UPCOMING RESEARCH EDITIONS',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
              color: AppColors.lightTextMuted,
            ),
          ),
          const SizedBox(height: 12),

          _ReportCard(
            title: 'Childbirth & Family Lineage',
            tagline: '5TH HOUSE SAPTAMSHA D7 EVALUATION',
            description:
                '5th house Saptamsha D7 evaluation, Beeja/Kshetra Sphuta analysis, and lineage prosperity insights.',
            icon: Icons.child_care_rounded,
            accentColor: Colors.amber.shade800,
            isAvailable: false,
            badgeText: 'COMING SOON',
          ),

          const SizedBox(height: 14),

          _ReportCard(
            title: 'Gupta Nadi Life Dossier',
            tagline: 'EXHAUSTIVE BNN PLANETARY COMBINATION READING',
            description:
                'Exhaustive BNN planetary combination reading covering Karma, Jeeva, and transit milestones.',
            icon: Icons.menu_book_rounded,
            accentColor: Colors.deepOrange,
            isAvailable: false,
            badgeText: 'COMING SOON',
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildHistoryTab(BuildContext context, WidgetRef ref) {
    final userReportsAsync = ref.watch(userReportsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(userReportsProvider.future),
      child: userReportsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.textMutedDark),
                const SizedBox(height: 16),
                const Text(
                  'Unable to load your reports history.',
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondaryDark),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () => ref.refresh(userReportsProvider),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.midnightNavy,
                    foregroundColor: AppColors.cardSurfaceWarm,
                  ),
                  icon: const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (reports) {
          if (reports.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: const BoxDecoration(
                        color: AppColors.cardSurfaceWarm,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.description_outlined,
                        size: 48,
                        color: AppColors.accentGold,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      context.l10n.reportHistoryEmptyTitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimaryDark,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.l10n.reportHistoryEmptySubtitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, color: AppColors.textMutedDark, height: 1.4),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () => _tabController.animateTo(0),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.midnightNavy,
                        foregroundColor: AppColors.cardSurfaceWarm,
                        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.shopping_bag_outlined, size: 18),
                      label: Text(
                        context.l10n.reportHistoryBrowseButton,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          final filtered = reports.where((r) {
            if (_historyFilter == 'COMPLETED') return r.isCompleted;
            if (_historyFilter == 'PROCESSING') return r.isProcessing;
            if (_historyFilter == 'FAILED') return r.isFailed;
            return true;
          }).toList();

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            children: [
              // Filter Chips Row
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildHistoryFilterChip('ALL', 'All Reports (${reports.length})'),
                    const SizedBox(width: 8),
                    _buildHistoryFilterChip('COMPLETED', 'Ready (${reports.where((r) => r.isCompleted).length})'),
                    const SizedBox(width: 8),
                    _buildHistoryFilterChip('PROCESSING', 'In Progress (${reports.where((r) => r.isProcessing).length})'),
                    const SizedBox(width: 8),
                    _buildHistoryFilterChip('FAILED', 'Failed (${reports.where((r) => r.isFailed).length})'),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              if (filtered.isEmpty) ...[
                const Padding(
                  padding: EdgeInsets.all(40.0),
                  child: Center(
                    child: Text(
                      'No reports match this filter.',
                      style: TextStyle(color: AppColors.textMutedDark),
                    ),
                  ),
                ),
              ] else ...[
                ...filtered.map((report) => _buildHistoryItemCard(context, ref, report)),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildHistoryFilterChip(String filterKey, String label) {
    final isSelected = _historyFilter == filterKey;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.midnightNavy,
      backgroundColor: AppColors.cardSurfaceWarm,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        color: isSelected ? Colors.white : AppColors.textPrimaryDark,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: isSelected ? AppColors.midnightNavy : AppColors.cardBorder),
      ),
      onSelected: (_) => setState(() => _historyFilter = filterKey),
    );
  }

  Widget _buildHistoryItemCard(
    BuildContext context,
    WidgetRef ref,
    UserReportItemModel report,
  ) {
    final dateFormat = DateFormat('dd MMM yyyy, hh:mm a');
    final formattedDate = dateFormat.format(report.createdAt);

    Color statusColor;
    String statusLabel;
    if (report.isCompleted) {
      statusColor = AppColors.success;
      statusLabel = 'READY';
    } else if (report.isProcessing) {
      statusColor = AppColors.warning;
      statusLabel = report.stage.toUpperCase();
    } else {
      statusColor = AppColors.error;
      statusLabel = 'FAILED';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: AstroCard(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurfaceParchment,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Icon(report.icon, size: 22, color: AppColors.midnightNavy),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          report.displayTitle,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Profile: ${report.profileName}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textSecondaryDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          formattedDate,
                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedDark),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: statusColor, width: 0.8),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              if (report.isFailed && report.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  report.errorMessage!,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.error,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 10),
              Wrap(
                alignment: WrapAlignment.end,
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (report.isCompleted) ...[
                    OutlinedButton.icon(
                      onPressed: () {
                        Printing.sharePdf(
                          bytes: Uint8List(0), // Handled by downloader inside viewer
                          filename: 'astro-sushil-${report.id.substring(0, 8)}.pdf',
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.midnightNavy,
                        side: const BorderSide(color: AppColors.cardBorder),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.share_outlined, size: 16),
                      label: Text(
                        context.l10n.reportActionShare,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ReportPdfViewerScreen(
                              reportId: report.id,
                              reportTitle: report.displayTitle,
                              clientName: report.profileName,
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.midnightNavy,
                        foregroundColor: AppColors.cardSurfaceWarm,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.picture_as_pdf_rounded, size: 16),
                      label: Text(
                        context.l10n.reportActionViewPdf,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ] else if (report.isProcessing) ...[
                    ElevatedButton.icon(
                      onPressed: () {
                        ref.read(reportGenerationNotifierProvider.notifier).startPolling(report.id);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Polling status: ${report.stageTitle}')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGold,
                        foregroundColor: AppColors.midnightNavy,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.autorenew_rounded, size: 16),
                      label: const Text(
                        'Track Progress',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ] else ...[
                    ElevatedButton.icon(
                      onPressed: () {
                        ref.read(reportGenerationNotifierProvider.notifier).createReportJob(
                          birthProfileId: report.birthProfileId,
                          reportType: report.reportType,
                          forceRegenerate: true,
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.midnightNavy,
                        foregroundColor: AppColors.cardSurfaceWarm,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.refresh_rounded, size: 16),
                      label: Text(context.l10n.reportActionRetry),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final String title;
  final String tagline;
  final String description;
  final IconData icon;
  final Color accentColor;
  final bool isAvailable;
  final String? badgeText;
  final String? primaryActionText;
  final VoidCallback? onViewTap;
  final VoidCallback? onDownloadTap;

  const _ReportCard({
    required this.title,
    required this.tagline,
    required this.description,
    required this.icon,
    required this.accentColor,
    this.isAvailable = true,
    this.badgeText,
    this.primaryActionText,
    this.onViewTap,
    this.onDownloadTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: !isAvailable
          ? () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$title is coming soon!'),
                  duration: const Duration(seconds: 2),
                ),
              );
            }
          : onViewTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppColors.cardSurfaceWarm,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isAvailable
                ? AppColors.cardBorder
                : AppColors.cardBorder.withValues(alpha: 0.6),
            width: 1.2,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A121440),
              blurRadius: 10,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(18.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: accentColor, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tagline,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.1,
                            color: accentColor,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 16.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isAvailable || badgeText != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isAvailable
                            ? accentColor.withValues(alpha: 0.15)
                            : AppColors.cardSurfaceParchment,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isAvailable ? accentColor : AppColors.cardBorder,
                          width: 0.8,
                        ),
                      ),
                      child: Text(
                        badgeText ?? 'LOCKED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isAvailable ? accentColor : AppColors.textMutedDark,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondaryDark,
                  height: 1.4,
                ),
              ),
              if (isAvailable) ...[
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: onViewTap,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.midnightNavy,
                          foregroundColor: AppColors.cardSurfaceWarm,
                          minimumSize: const Size.fromHeight(48),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.remove_red_eye_outlined, size: 18),
                        label: Text(
                          primaryActionText ?? 'View Report',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    if (onDownloadTap != null) ...[
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        onPressed: onDownloadTap,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.midnightNavy,
                          minimumSize: const Size(80, 48),
                          side: const BorderSide(color: AppColors.midnightNavy, width: 1.2),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                        label: const Text(
                          'PDF',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
