import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/reports/models/report_catalog_model.dart';
import '../../features/reports/models/user_report_item_model.dart';
import '../../features/reports/providers/report_catalog_provider.dart';
import '../../features/reports/providers/reports_provider.dart';
import '../../features/reports/screens/report_detail_screen.dart';
import '../../features/reports/screens/report_generation_screen.dart';
import '../../features/reports/screens/report_pdf_viewer_screen.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/utils/app_date_time.dart';
import '../../shared/widgets/astro_design_system.dart';

/// Optional override for the birth profile new reports are bought for.
/// When null, the app-wide active profile is used.
final selectedReportProfileIdProvider = StateProvider<String?>((ref) => null);

/// The two parts of the Reports tab.
enum ReportsTab { mine, get }

/// Last tab the user picked on the Reports screen, remembered for the
/// session. Null until they pick one; then the default rule no longer applies.
final reportsTabProvider = StateProvider<ReportsTab?>((ref) => null);

/// Client-side presentation for a report type the server catalogue may offer.
/// Title, description and price always come from the server catalogue; this
/// only adds an icon, a one-line plain-language summary and the list of
/// sections shown on the detail screen.
class _ReportOffer {
  final String type;
  final IconData icon;
  final Color color;
  final String line;
  final String lineHi;
  final List<String> sections;

  const _ReportOffer({
    required this.type,
    required this.icon,
    required this.color,
    required this.line,
    required this.lineHi,
    required this.sections,
  });
}

/// Display order of the reports on sale. Only types the server catalogue
/// lists as active are shown.
const List<_ReportOffer> _kOffers = [
  _ReportOffer(
    type: 'CAREER',
    icon: Icons.work_outline_rounded,
    color: AppColors.tintSkyText,
    line: 'Work, career path and good times for change',
    lineHi: 'काम, करियर और बदलाव का सही समय',
    sections: [
      '10th House Karma Bhava & Planetary Significators',
      'Professional Aptitude & Vocational DNA Mapping',
      'Saturn Career Lessons & Jupiter Expansion Horizons',
      'Multi-Year Dasha Professional Career Roadmap',
      'Practical Astrological & Behavioral Remedies',
    ],
  ),
  _ReportOffer(
    type: 'KUNDLI',
    icon: Icons.auto_awesome_rounded,
    color: AppColors.goldDark,
    line: 'Your full birth chart and dasha periods',
    lineHi: 'आपकी पूरी जन्म कुंडली और दशा',
    sections: [
      'North Indian D1 Lagna Kundli & Chandra Kundli',
      '9 Graha Placements, Degrees & Functional Dignities',
      '120-Year Parashari Vimshottari Dasha Periods',
      'Planetary Placements & Manglik Analysis',
      'Trikona Lord Gemstone Recommendations (1st, 5th, 9th Lords)',
    ],
  ),
  _ReportOffer(
    type: 'PLANETARY_SUMMARY',
    icon: Icons.brightness_6_rounded,
    color: AppColors.tintVioletText,
    line: 'Planet movements for the next 3 to 6 months',
    lineHi: 'अगले 3 से 6 महीनों की ग्रह चाल',
    sections: [
      '3–6 Month Transit Horizons from Janma Rashi (Natal Moon)',
      'Saturn Transit Gochara Tracking & Planetary Cycles',
      'Planetary Combustion, Retrogression & Dignity Status',
      'Critical Astrological Caution Dates & Favorable Windows',
    ],
  ),
  _ReportOffer(
    type: 'MARRIAGE_COMPATIBILITY',
    icon: Icons.favorite_rounded,
    color: AppColors.tintRoseText,
    line: 'Match two birth charts for marriage',
    lineHi: 'विवाह के लिए दो कुंडली का मिलान',
    sections: [
      'Full 36-Point Ashtakoota Guna Milan (Varna, Vashya, Tara, Yoni, Maitri, Gana, Bhakoot, Nadi)',
      'Comparative Dual-Chart Manglik Placement & Compatibility Analysis',
      '7th House & Venus/Jupiter Synastry Analysis',
      'Astrological Compatibility Score & Relationship Synthesis',
    ],
  ),
  _ReportOffer(
    type: 'HOROSCOPE',
    icon: Icons.stars_rounded,
    color: AppColors.tintVioletText,
    line: 'Your year ahead, quarter by quarter',
    lineHi: 'आने वाला साल, हर तिमाही',
    sections: [
      'Annual Chandra Lagna Planetary Transits & Quarter-by-Quarter Trajectories',
      '12-Month Detailed Timeline Matrix & Favorable Career/Financial Windows',
      'Saturn, Jupiter, Rahu-Ketu Gochara Effects and Mitigation',
      'Comprehensive Vedic Remedies, Gemstone & Mantra Guidance',
    ],
  ),
  _ReportOffer(
    type: 'FINANCE',
    icon: Icons.account_balance_wallet_outlined,
    color: AppColors.tintSageText,
    line: 'Money, savings and wealth timing',
    lineHi: 'धन, बचत और समृद्धि का समय',
    sections: [
      '2nd (Accumulated Wealth) and 11th (Gains) House Deep Dive',
      'Indu Lagna, Dhana Yogas, and Planetary Wealth Combinations',
      'Sarvashtakavarga (SAV) House Inflow Potency Breakdown',
      '3-Year Chronological Financial Milestone & Cashflow Matrix',
      'Practical Vedic & Tantric Wealth Preservation Remedies',
    ],
  ),
  _ReportOffer(
    type: 'LOVE',
    icon: Icons.favorite_outline_rounded,
    color: AppColors.tintRoseText,
    line: 'Love, relationships and marriage timing',
    lineHi: 'प्रेम, रिश्ते और विवाह का समय',
    sections: [
      '5th & 7th House Romance, Passion and Karmic Relationship Patterns',
      'Venus Placements, Navamsha D9 Matrimonial Blueprint',
      'Jaimini Darakaraka Comprehensive Future Spouse Archetype',
      '10 Favorable Chronological Marriage & Fruition Timing Windows',
      'Relationship Harmonization & Remedial Measures',
    ],
  ),
  _ReportOffer(
    type: 'FORTUNE',
    icon: Icons.diamond_outlined,
    color: AppColors.goldDark,
    line: 'Numerology, lucky numbers and remedies',
    lineHi: 'अंक ज्योतिष, शुभ अंक और उपाय',
    sections: [
      'Mulank (Psychic) and Bhagyank (Destiny) Exhaustive Profile',
      '3x3 Lo-Shu Magic Square Grid & Cardinal Kua Feng-Shui Alignment',
      'Chaldean Legal Name Number, Soul Urge & Personality Vibration',
      '12-Month Personal Forecasting Rhythm & Life Challenge Cycles',
      'Vedic Quadrant Charts (D1, Moon, D9, Lal Kitab) & Consecrated Remedies',
    ],
  ),
  _ReportOffer(
    type: 'SATURN',
    icon: Icons.hourglass_empty_rounded,
    color: AppColors.primary,
    line: 'Saturn in your chart and Sade Sati dates',
    lineHi: 'आपकी कुंडली में शनि और साढ़े साती',
    sections: [
      'Natal Saturn House Placement, Zodiac Dignity & Aspect Geography',
      'Lord Shani Karmic Taskmaster Lessons & Life Restructuring Zones',
      'Complete Shani Sade Sati Rising, Peak, and Setting Chronology',
      'Dhaiya (Small Panoti) 4th and 8th House Transit Timings',
      'Classical Saturday Astrological, Fasting, and Charitable Remedies',
    ],
  ),
  _ReportOffer(
    type: 'JUPITER_TRANSIT',
    icon: Icons.auto_awesome_rounded,
    color: AppColors.goldDark,
    line: "How Jupiter's movement affects you",
    lineHi: 'गुरु (बृहस्पति) की चाल का आप पर असर',
    // "Nakshatra Mula Deep Dive" was one sample customer's birth star, not
    // true for every buyer; it now names the buyer's own birth nakshatra.
    sections: [
      'Jupiter’s Divine Placement (Birth Chart & Coordinates)',
      'Vedic Charts Overview (Lagna, Chandra & Jupiter Gochara)',
      'Natal Jupiter Placement Deep Dive (House, Sign & Dignity)',
      'Aspects of Jupiter (5th, 7th & 9th Golden Drishti Rays)',
      'Benefic vs Malefic Dynamic & Moon Sign Psyche Evolution',
      'Birth Nakshatra Deep Dive',
      'Jupiter’s Bhinnashtakavarga (56-Point Zodiacal Scorecard)',
      'Jupiter Transits 2026: Gemini & Exalted Cancer Horizons',
      'Consecrated Remedies (Yellow Sapphire, 5 Mukhi Rudraksha, Vastu & Mantras)',
    ],
  ),
  _ReportOffer(
    type: 'RAHU_KETU_TRANSIT',
    icon: Icons.all_inclusive_rounded,
    color: AppColors.tintVioletText,
    line: "How Rahu and Ketu's movement affects you",
    lineHi: 'राहु और केतु की चाल का आप पर असर',
    // "Rahu (7th House) & Ketu (1st House)" and "Venus-Ketu" were one sample
    // customer's placements, not true for every buyer; made generic.
    sections: [
      'The Nodes’ Placement (Astronomical Coordinates & 180° Axis)',
      'Vedic Charts Overview (Lagna, Chandra & Nodal Gochara)',
      'Natal Rahu & Ketu Deep Dive',
      'Aspects of Rahu & Ketu (Triple 5th, 7th & 9th Drishti)',
      'Planetary Conjunctions & Moon Sign Dynamics',
      'The Karmic Journey: Past Life Karma & Soul Evolution',
      'Cosmic Karma Transit 2025–2026 (Aquarius Rahu / Leo Ketu)',
      'Cosmic Karma Transit 2026–2028 (Capricorn Rahu / Cancer Ketu)',
      'Consecrated Remedies (Gemstone Cautions, 8 & 9 Mukhi Rudraksha, Mantras)',
      'The 18.6-Year Nodal Return Cycles & Divine Benediction',
    ],
  ),
  _ReportOffer(
    type: 'VARSHPHAL',
    icon: Icons.calendar_month_rounded,
    color: AppColors.primary,
    line: 'Your year from one birthday to the next',
    lineHi: 'एक जन्मदिन से अगले जन्मदिन तक का साल',
    sections: [
      'Astronomical Solar Return Precision (Exact Sidereal Longitude)',
      'Dual Cosmic Blueprints (Natal Lagna & Varshphal Kundli)',
      'Muntha Progression Analysis & Annual Karmic Axis',
      'Varshesh (Year Lord) & Panchadhikari Selection',
      'Tajika Yogas & Planetary Aspect Dynamics',
      'Annual Planetary Dignities & Harsha Bala Scorecard',
      'Summary of Annual Planetary Effects & House Transits',
      'Annual Mudda Dasha Timing Periods & Milestones',
      '12-Month Performance Matrix & Quarterly Trajectories',
      'Month-by-Month Predictive Roadmap (Months 1 to 12)',
      'Consecrated Panchang Remedies & Three-Remedy Caution Rule',
    ],
  ),
  _ReportOffer(
    type: 'FORTUNE_PLUS',
    icon: Icons.diamond_rounded,
    color: AppColors.goldDark,
    line: 'Full numerology and astrology book',
    lineHi: 'पूरी अंक ज्योतिष और ज्योतिष पुस्तिका',
    sections: [
      'Complete 25-Chapter Vedic Numerology and Astrological Blueprint',
      'Your Mulank, Bhagyank, Chaldean Name, Kua, Success, Connection & Maturity Numbers',
      'Four Life Pinnacles / Challenge Cycles (0-29, 29-38, 38-47, 47+)',
      'Four Vedic Charts Quadrant (D1, Chandra, Navamsha D9, Lal Kitab Aries-fixed)',
      'Three-Remedy Caution Rule & Consecrated Astrological Remedies',
    ],
  ),
];

enum _ReportFilter { all, ready, preparing, failed }

/// Reports tab.
///
/// 1. Heading
/// 2. "My reports": every report the user owns (ready, being prepared,
///    failed), each with one clear action
/// 3. "Get a new report": the reports on sale, straight from the server
///    catalogue (name, one plain line, price), opening the report detail
///    and purchase flow
class ReportsScreen extends ConsumerStatefulWidget {
  /// Tab to open on (e.g. [ReportsTab.get] when opened to buy a report).
  /// When null: the tab picked earlier this session, else "My reports" if
  /// the user has at least one report, otherwise "Get a report".
  final ReportsTab? initialTab;

  const ReportsScreen({super.key, this.initialTab});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  _ReportFilter _filter = _ReportFilter.all;

  /// Tab chosen on this screen instance (from [ReportsScreen.initialTab] or
  /// a tap). Takes precedence over the session memory.
  late ReportsTab? _tab = widget.initialTab;

  void _selectTab(ReportsTab tab) {
    setState(() => _tab = tab);
    ref.read(reportsTabProvider.notifier).state = tab;
  }

  /// Default rule: "My reports" when there is at least one report (or while
  /// they are still loading), otherwise "Get a report".
  ReportsTab _defaultTab(AsyncValue<List<UserReportItemModel>> reportsAsync) {
    if (reportsAsync.hasValue) {
      return reportsAsync.value!.isNotEmpty ? ReportsTab.mine : ReportsTab.get;
    }
    return reportsAsync.isLoading ? ReportsTab.mine : ReportsTab.get;
  }
  String? _retryingReportId;

  bool get _isHindi => Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
  String _t(String en, String hi) => _isHindi ? hi : en;

  /// Reloads "My reports" after the user returns from any report flow, so
  /// newly bought or finished reports show up without a restart.
  void _refreshReports() {
    if (!mounted) return;
    ref.invalidate(userReportsProvider);
  }

  Future<void> _push(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    _refreshReports();
  }

  void _addBirthProfile() {
    _push(const CreateBirthProfileScreen());
  }

  void _openOffer(_ReportOffer offer, ReportCatalogItem item, BirthProfileModel? profile) {
    if (profile == null) {
      _addBirthProfile();
      return;
    }
    _push(
      ReportDetailScreen(
        reportType: offer.type,
        title: item.title,
        tagline: offer.line,
        description: item.description,
        priceText: item.priceText,
        pricePaise: item.pricePaise,
        icon: offer.icon,
        accentColor: offer.color,
        initialProfile: profile,
        includedSections: offer.sections,
      ),
    );
  }

  void _openReport(UserReportItemModel report) {
    _push(
      ReportPdfViewerScreen(
        reportId: report.id,
        reportTitle: report.displayTitle,
        clientName: _forNames(report),
      ),
    );
  }

  BirthProfileModel? _profileById(List<BirthProfileModel> profiles, String? id) {
    if (id == null) return null;
    for (final p in profiles) {
      if (p.id == id) return p;
    }
    return null;
  }

  void _showProgress(UserReportItemModel report, List<BirthProfileModel> profiles) {
    final profile = _profileById(profiles, report.birthProfileId);
    if (profile == null) {
      // The progress screen needs the birth profile; without it, just
      // reload the list so the latest status is shown.
      _refreshReports();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_t('Status updated.', 'स्थिति अपडेट की गई।'))),
      );
      return;
    }
    _push(
      ReportGenerationScreen(
        reportId: report.id,
        reportType: report.reportType,
        reportTitle: report.displayTitle,
        profile: profile,
        partnerProfile: _profileById(profiles, report.partnerProfileId),
      ),
    );
  }

  Future<void> _retry(UserReportItemModel report, List<BirthProfileModel> profiles) async {
    setState(() => _retryingReportId = report.id);
    final notifier = ref.read(reportGenerationNotifierProvider.notifier);
    final newId = await notifier.createReportJob(
      birthProfileId: report.birthProfileId,
      reportType: report.reportType,
      partnerProfileId: report.partnerProfileId,
      forceRegenerate: true,
    );
    if (!mounted) return;
    setState(() => _retryingReportId = null);

    if (newId == null) {
      final message = ref.read(reportGenerationNotifierProvider).errorMessage ??
          'Unable to start report generation. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      return;
    }

    _refreshReports();
    final profile = _profileById(profiles, report.birthProfileId);
    if (profile == null) return;
    _push(
      ReportGenerationScreen(
        reportId: newId,
        reportType: report.reportType,
        reportTitle: report.displayTitle,
        profile: profile,
        partnerProfile: _profileById(profiles, report.partnerProfileId),
      ),
    );
  }

  Future<void> _onPullToRefresh() async {
    ref.invalidate(reportCatalogProvider);
    ref.invalidate(userReportsProvider);
    try {
      await ref.read(userReportsProvider.future);
    } catch (_) {
      // The error state is shown in the list itself.
    }
  }

  String _forNames(UserReportItemModel r) {
    final partner = r.partnerName;
    if (partner != null && partner.isNotEmpty) return '${r.profileName} & $partner';
    return r.profileName;
  }

  @override
  Widget build(BuildContext context) {
    final profiles = ref.watch(birthProfilesListNotifierProvider).profiles;
    final overrideId = ref.watch(selectedReportProfileIdProvider);
    final activeId = overrideId ?? ref.watch(selectedBirthProfileProvider)?.id;
    final BirthProfileModel? activeProfile = profiles.isEmpty
        ? null
        : (_profileById(profiles, activeId) ?? profiles.first);

    final reportsAsync = ref.watch(userReportsProvider);
    final catalogAsync = ref.watch(reportCatalogProvider);
    final hasReports = reportsAsync.valueOrNull?.isNotEmpty ?? false;
    final canPop = ModalRoute.of(context)?.canPop ?? false;

    final l10n = context.l10n;
    // With no birth profile and no reports there is nothing under "My
    // reports": show the add-details card and the catalogue, without tabs.
    final showTabs = activeProfile != null || hasReports;
    final tab = showTabs ? (_tab ?? ref.watch(reportsTabProvider) ?? _defaultTab(reportsAsync)) : ReportsTab.get;

    final intro = _t(
      'Detailed PDF reports made from your birth chart.',
      'आपकी जन्म कुंडली से बनी विस्तृत PDF रिपोर्ट।',
    );

    return AstroPage(
      title: _t('Reports', 'रिपोर्ट'),
      // With tabs, same bar as the other tab roots: the intro line sits at
      // the top of "Get a report" instead.
      subtitle: showTabs ? null : intro,
      showBack: canPop,
      onRefresh: _onPullToRefresh,
      // Pinned under the large title, so switching stays one tap away.
      navBottom: showTabs
          ? AstroSegmentedNavBottom<ReportsTab>(
              controlKey: const ValueKey('reports-tabs'),
              semanticsLabel: l10n.core2ReportsTabsLabel,
              selected: tab,
              onChanged: _selectTab,
              segments: [
                AstroSegment(value: ReportsTab.mine, label: l10n.core2ReportsTabMine),
                AstroSegment(value: ReportsTab.get, label: l10n.core2ReportsTabGet),
              ],
            )
          : null,
      // Clear the floating tab bar (iOS) when shown as a tab.
      padding: EdgeInsets.fromLTRB(
        AstroMetrics.gutter,
        showTabs ? 16 : 8,
        AstroMetrics.gutter,
        32 + MediaQuery.paddingOf(context).bottom,
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        child: KeyedSubtree(
          key: ValueKey(tab),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (activeProfile == null) ...[
                _buildNoProfileCard(),
                const SizedBox(height: 24),
              ],
              if (tab == ReportsTab.mine)
                _buildMyReports(reportsAsync, profiles)
              else ...[
                if (showTabs) ...[
                  Text(intro, style: AppTypography.rowSubtitle),
                  const SizedBox(height: 14),
                ],
                _buildCatalog(catalogAsync, activeProfile),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // No birth profile
  // ---------------------------------------------------------------------

  Widget _buildNoProfileCard() {
    return AstroGradientCard(
      key: const ValueKey('reports-no-profile'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.gold.withValues(alpha: 0.14),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
            ),
            child: const Icon(Icons.person_add_alt_1_rounded, color: AppColors.gold, size: 26),
          ),
          const SizedBox(height: 16),
          Text(
            _t('Add your birth details first', 'पहले अपना जन्म विवरण जोड़ें'),
            style: AppTypography.headlineLarge.copyWith(fontSize: 22, color: Colors.white, height: 1.25),
          ),
          const SizedBox(height: 6),
          Text(
            _t(
              'Reports are made from your date, time and place of birth.',
              'रिपोर्ट आपकी जन्म तिथि, समय और स्थान से बनती है।',
            ),
            style: const TextStyle(fontSize: 16, height: 1.45, color: AppColors.textInverseSecondary),
          ),
          const SizedBox(height: 20),
          AstroPrimaryButton(
            label: _t('Add birth details', 'जन्म विवरण जोड़ें'),
            icon: Icons.add_rounded,
            onPressed: _addBirthProfile,
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // My reports
  // ---------------------------------------------------------------------

  Widget _buildMyReports(AsyncValue<List<UserReportItemModel>> reportsAsync, List<BirthProfileModel> profiles) {
    return reportsAsync.when(
      loading: () => _LoadingCard(label: _t('Loading your reports…', 'आपकी रिपोर्ट लोड हो रही हैं…')),
      error: (_, __) => _ErrorCard(
        key: const ValueKey('my-reports-error'),
        message: _t("We couldn't load your reports.", 'आपकी रिपोर्ट लोड नहीं हो सकीं।'),
        retryLabel: context.l10n.commonTryAgain,
        onRetry: () => ref.invalidate(userReportsProvider),
      ),
      data: (reports) {
        if (reports.isEmpty) return _buildEmptyReports();

        final ready = reports.where((r) => r.isCompleted).length;
        final preparing = reports.where((r) => r.isProcessing).length;
        final failed = reports.where((r) => r.isFailed).length;
        final filtered = reports.where((r) {
          switch (_filter) {
            case _ReportFilter.ready:
              return r.isCompleted;
            case _ReportFilter.preparing:
              return r.isProcessing;
            case _ReportFilter.failed:
              return r.isFailed;
            case _ReportFilter.all:
              return true;
          }
        }).toList();

        Widget pill(_ReportFilter f, String label) => AstroPill(
              key: ValueKey('reports-filter-${f.name}'),
              label: label,
              selected: _filter == f,
              onTap: () => setState(() => _filter = f),
            );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (reports.length >= 3) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  pill(_ReportFilter.all, '${_t('All', 'सभी')} (${reports.length})'),
                  if (ready > 0) pill(_ReportFilter.ready, '${_t('Ready', 'तैयार')} ($ready)'),
                  if (preparing > 0)
                    pill(_ReportFilter.preparing, '${_t('Being prepared', 'बन रही हैं')} ($preparing)'),
                  if (failed > 0) pill(_ReportFilter.failed, '${_t('Failed', 'असफल')} ($failed)'),
                ],
              ),
              const SizedBox(height: 14),
            ],
            if (filtered.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Text(
                  _t('No reports in this group.', 'इस समूह में कोई रिपोर्ट नहीं।'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, color: AppColors.textSecondary),
                ),
              )
            else
              for (final r in filtered) ...[
                _buildReportItem(r, profiles),
                const SizedBox(height: 12),
              ],
          ],
        );
      },
    );
  }

  Widget _buildEmptyReports() {
    return AstroSurfaceCard(
      key: const ValueKey('my-reports-empty'),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AstroIconSquare(icon: Icons.description_outlined, tint: AstroTint.amber, size: 46),
          const SizedBox(height: 14),
          Text(
            _t('No reports yet', 'अभी कोई रिपोर्ट नहीं'),
            style: AppTypography.headlineLarge.copyWith(fontSize: 20, height: 1.25),
          ),
          const SizedBox(height: 6),
          Text(
            _t('Reports you buy are saved here.', 'आपकी खरीदी गई रिपोर्ट यहाँ रहेंगी।'),
            style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 18),
          AstroPrimaryButton(
            label: _t('Choose a report', 'रिपोर्ट चुनें'),
            icon: Icons.arrow_forward_rounded,
            onPressed: () => _selectTab(ReportsTab.get),
          ),
        ],
      ),
    );
  }

  Widget _buildReportItem(UserReportItemModel report, List<BirthProfileModel> profiles) {
    final date = AppDateTime.formatLocal(report.createdAt, 'd MMM yyyy');
    final names = _forNames(report);
    final isRetrying = _retryingReportId == report.id;

    final _StatusStyle status;
    final Widget action;
    if (report.isCompleted) {
      status = _StatusStyle(
        label: _t('Ready', 'तैयार'),
        icon: Icons.check_circle_rounded,
        color: AppColors.tintSageText,
        background: AppColors.successBg,
      );
      action = AstroSecondaryButton(
        key: ValueKey('my-report-open-${report.id}'),
        label: _t('Open report', 'रिपोर्ट खोलें'),
        icon: Icons.picture_as_pdf_rounded,
        onPressed: () => _openReport(report),
      );
    } else if (report.isProcessing) {
      final pct = report.progress.clamp(0, 100);
      status = _StatusStyle(
        label: '${_t('Being prepared', 'बन रही है')} · $pct%',
        icon: Icons.hourglass_top_rounded,
        color: AppColors.goldDark,
        background: AppColors.warningBg,
      );
      action = AstroSecondaryButton(
        key: ValueKey('my-report-progress-${report.id}'),
        label: _t('See progress', 'प्रगति देखें'),
        icon: Icons.autorenew_rounded,
        onPressed: () => _showProgress(report, profiles),
      );
    } else {
      status = _StatusStyle(
        label: _t('Failed', 'असफल'),
        icon: Icons.error_outline_rounded,
        color: AppColors.tintRoseText,
        background: AppColors.errorBg,
      );
      action = AstroSecondaryButton(
        key: ValueKey('my-report-retry-${report.id}'),
        label: isRetrying ? _t('Starting…', 'शुरू हो रही है…') : context.l10n.commonTryAgain,
        icon: Icons.refresh_rounded,
        onPressed: isRetrying ? null : () => _retry(report, profiles),
      );
    }

    return AstroSurfaceCard(
      key: ValueKey('my-report-${report.id}'),
      radius: 18,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MergeSemantics(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AstroIconSquare(icon: report.icon, tint: AstroTint.indigo, size: 44),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.displayTitle,
                        style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        names.isEmpty ? date : '${_t('For', 'के लिए:')} $names · $date',
                        style: const TextStyle(fontSize: 14, height: 1.35, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 10),
                      _StatusChip(style: status),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (report.isFailed && (report.errorMessage?.isNotEmpty ?? false)) ...[
            const SizedBox(height: 6),
            AstroExpander(
              label: _t('Details', 'विवरण'),
              child: Text(
                report.errorMessage!,
                style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.textSecondary),
              ),
            ),
          ],
          const SizedBox(height: 14),
          action,
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Get a new report (server catalogue)
  // ---------------------------------------------------------------------

  Widget _buildCatalog(AsyncValue<Map<String, ReportCatalogItem>> catalogAsync, BirthProfileModel? profile) {
    return catalogAsync.when(
      loading: () => _LoadingCard(label: _t('Loading reports…', 'रिपोर्ट लोड हो रही हैं…')),
      error: (_, __) => _ErrorCard(
        key: const ValueKey('report-catalog-error'),
        message: _t("We couldn't load the reports on offer.", 'उपलब्ध रिपोर्ट लोड नहीं हो सकीं।'),
        retryLabel: context.l10n.commonTryAgain,
        onRetry: () => ref.invalidate(reportCatalogProvider),
      ),
      data: (catalog) {
        final offers = _kOffers.where((o) => catalog.containsKey(o.type)).toList();
        if (offers.isEmpty) {
          return AstroNote(
            _t(
              'No reports are on sale right now. Please check back later.',
              'अभी कोई रिपोर्ट उपलब्ध नहीं है। कृपया बाद में देखें।',
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final o in offers) ...[
              _OfferCard(
                key: ValueKey('report-offer-${o.type}'),
                icon: o.icon,
                color: o.color,
                title: catalog[o.type]!.title,
                line: _isHindi ? o.lineHi : o.line,
                price: catalog[o.type]!.priceText,
                onTap: () => _openOffer(o, catalog[o.type]!, profile),
              ),
              const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}

class _StatusStyle {
  final String label;
  final IconData icon;
  final Color color;
  final Color background;

  const _StatusStyle({
    required this.label,
    required this.icon,
    required this.color,
    required this.background,
  });
}

class _StatusChip extends StatelessWidget {
  final _StatusStyle style;

  const _StatusChip({required this.style});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 18, color: style.color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              style.label,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: style.color),
            ),
          ),
        ],
      ),
    );
  }
}

/// One report on sale: icon, name, one plain line and the server price.
/// The whole card is the tap target.
class _OfferCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String line;
  final String price;
  final VoidCallback onTap;

  const _OfferCard({
    super.key,
    required this.icon,
    required this.color,
    required this.title,
    required this.line,
    required this.price,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: AstroSurfaceCard(
        onTap: onTap,
        radius: 18,
        padding: const EdgeInsets.fromLTRB(16, 16, 10, 16),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              AstroIconSquare(icon: icon, tint: AstroTint(color, color.withValues(alpha: 0.10)), size: 46),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 3),
                    Text(line, style: AppTypography.rowSubtitle),
                    const SizedBox(height: 8),
                    Text(
                      price,
                      style: AppTypography.headlineMedium.copyWith(
                        fontSize: 19,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 26),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  final String label;

  const _LoadingCard({required this.label});

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 22),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(width: 24, height: 24, child: CircularProgressIndicator.adaptive(strokeWidth: 2.5)),
          const SizedBox(width: 14),
          Flexible(child: Text(label, style: const TextStyle(fontSize: 16, color: AppColors.textSecondary))),
        ],
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final String retryLabel;
  final VoidCallback onRetry;

  const _ErrorCard({
    super.key,
    required this.message,
    required this.retryLabel,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AstroIconSquare(icon: Icons.cloud_off_rounded, tint: AstroTint.rose),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(message, style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          AstroSecondaryButton(label: retryLabel, icon: Icons.refresh_rounded, onPressed: onRetry),
        ],
      ),
    );
  }
}
