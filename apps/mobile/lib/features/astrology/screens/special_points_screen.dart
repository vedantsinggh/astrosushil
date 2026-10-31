import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/special_points_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/astrology_tab_bar.dart';
import '../widgets/degree_value_display.dart';
import '../widgets/expandable_astrology_card.dart';
import '../widgets/planet_chip.dart';
import '../widgets/sign_chip.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen presenting Upagrahas, Special Lagnas, Yogi Points, Arishta, and Mrityu Bhaga
/// Served deterministically via Fastify /astrology/special-points
class SpecialPointsScreen extends ConsumerStatefulWidget {
  const SpecialPointsScreen({super.key});

  @override
  ConsumerState<SpecialPointsScreen> createState() => _SpecialPointsScreenState();
}

class _SpecialPointsScreenState extends ConsumerState<SpecialPointsScreen> {
  int _selectedTabIndex = 0;

  static const _tabs = [
    AstrologyTabItem(label: 'Upagrahas', icon: Icons.flare_rounded),
    AstrologyTabItem(label: 'Special Lagnas', icon: Icons.wb_twilight_rounded),
    AstrologyTabItem(label: 'Yogi Points', icon: Icons.stars_rounded),
    AstrologyTabItem(label: 'Arishta & Fatal', icon: Icons.warning_amber_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AstroAppBar(
        title: 'Special Points & Upagrahas',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.midnightNavy),
            tooltip: 'About Special Points',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Computes 5 non-luminous Upagrahas, Mandi, Gulika, Special Lagnas, Yogi/Avyogi points, and Mrityu Bhaga degrees.',
                  ),
                  duration: Duration(seconds: 4),
                ),
              );
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Top Profile Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                child: ActiveBirthProfileSelector(
                  isDark: false,
                  onProfileChanged: (_) {},
                ),
              ),

              // Main Content
              Expanded(
                child: activeProfile == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: AstrologyEmptyState(
                            title: 'No Active Birth Profile',
                            message: 'Select or create a birth profile to calculate Upagrahas and Special Points.',
                            actionLabel: 'Add Birth Profile',
                            onAction: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const CreateBirthProfileScreen(),
                                ),
                              );
                            },
                          ),
                        ),
                      )
                    : _buildSpecialPointsBody(context, activeProfile),
              ),
            ],
          ),
        ),
      ),
    );
  }

  ExplanationContext _buildExplanationContext(
    SpecialPointsReportModel report,
    BirthProfileModel profile,
  ) {
    return ExplanationContext(
      feature: 'special_points',
      screenTitle: 'Special Points & Upagrahas',
      purpose: 'Explain the mathematical Upagrahas (Mandi, Gulika), Special Lagnas (Hora, Ghatika), and Yogi points for ${profile.name}.',
      astrologyData: {
        'upagrahas': report.upagrahas.allPoints.map((u) => {
          'name': u.name,
          'sign': u.rashiName,
          'degree': u.degreeInRashi,
          'house': u.house,
        }).toList(),
        'specialLagnas': report.specialLagnas.allLagnas.map((l) => {
          'name': l.name,
          'sign': l.rashiName,
          'degree': l.degreeInRashi,
        }).toList(),
        'yogiPoints': {
          'yogiPointDegree': report.yogiPoints.yogiPoint.degreeInRashi,
          'yogiSign': report.yogiPoints.yogiPoint.rashiName,
          'yogiPlanet': report.yogiPoints.yogiPlanet,
          'avyogiPlanet': report.yogiPoints.avyogiPlanet,
          'duplicateYogiPlanet': report.yogiPoints.duplicateYogiPlanet,
        },
      },
      importantValues: {
        'totalUpagrahas': report.upagrahas.allPoints.length,
        'yogiPlanet': report.yogiPoints.yogiPlanet,
      },
      userProfileContext: {
        'name': profile.name,
      },
    );
  }

  Widget _buildSpecialPointsBody(BuildContext context, BirthProfileModel profile) {
    final reportAsync = ref.watch(specialPointsForProfileProvider(profile));

    return reportAsync.when(
      loading: () => const AstrologyLoadingState(
        message: 'Calculating Upagrahas, Special Lagnas, and Arishta points...',
      ),
      error: (error, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: AstrologyErrorState(
            error: error,
            customMessage: 'Failed to calculate Special Points. Tap to retry.',
            onRetry: () => ref.refresh(specialPointsForProfileProvider(profile)),
          ),
        ),
      ),
      data: (report) => RefreshIndicator(
        onRefresh: () async => ref.refresh(specialPointsForProfileProvider(profile)),
        child: Column(
          children: [
            // Educational Guidance Card
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
              child: AstrologyExplanationCard(
                title: context.l10n.explainSpecialPointsTitle,
                whatIsText: context.l10n.explainSpecialPointsWhatIs,
                howToReadText: context.l10n.explainSpecialPointsHowToRead,
              ),
            ),

            // Segmented Category Tabs
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: AppColors.canvas,
              child: AstrologyTabBar(
                isScrollable: true,
                selectedIndex: _selectedTabIndex,
                onTabSelected: (idx) => setState(() => _selectedTabIndex = idx),
                tabs: _tabs,
              ),
            ),

            // Sushil Sir Explainer Button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
              child: SushilExplainerButton(
                contextBuilder: () => _buildExplanationContext(report, profile),
                poseAsset: AppAssets.sushilGuiding,
              ),
            ),

            // Tab View Body
            Expanded(
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_selectedTabIndex == 0) _buildUpagrahasTab(report.upagrahas),
                    if (_selectedTabIndex == 1) _buildSpecialLagnasTab(report.specialLagnas),
                    if (_selectedTabIndex == 2) _buildYogiPointsTab(report.yogiPoints),
                    if (_selectedTabIndex == 3) _buildArishtaAndFatalTab(report.arishtaPoints, report.mrityuBhaga),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TAB 1: 5 UPAGRAHAS & GULIKA / MANDI
  // ==========================================
  Widget _buildUpagrahasTab(UpagrahasReportModel upagrahas) {
    const columns = [
      AstrologyTableColumn(header: 'Point', flex: 3),
      AstrologyTableColumn(header: 'Sign', flex: 3),
      AstrologyTableColumn(header: 'House', flex: 2),
      AstrologyTableColumn(header: 'Degree', flex: 3),
    ];

    final rows = upagrahas.allPoints.map((p) {
      return [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              p.name,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
            ),
            if (p.sanskritName.isNotEmpty)
              Text(
                p.sanskritName,
                style: const TextStyle(fontSize: 10, color: AppColors.lightTextMuted),
              ),
          ],
        ),
        SignChip(signName: p.rashiName, isCompact: true),
        Text(
          'H-${p.house}',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary),
        ),
        DegreeValueDisplay(degree: p.degreeInRashi),
      ];
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AstrologySectionCard(
          title: 'Vedic Upagrahas (उपग्रह)',
          subtitle: '5 Non-luminous mathematical points & Mandi/Gulika',
          icon: Icons.flare_rounded,
          badgeText: '7 POINTS',
          badgeColor: AppColors.secondary,
          child: AstrologyDataTable(
            columns: columns,
            rows: rows,
          ),
        ),

        const SizedBox(height: 14),

        // Mathematical Formula Evidence Accordion
        ExpandableAstrologyCard(
          title: 'Parashari Calculation Formulas',
          subtitle: 'Classical astronomical derivation rules',
          icon: Icons.functions_rounded,
          initiallyExpanded: false,
          expandedChild: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: upagrahas.allPoints.map((p) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '• ${p.name}: ',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    Expanded(
                      child: Text(
                        p.formula.isNotEmpty ? p.formula : 'Astronomical segment calculation',
                        style: const TextStyle(fontSize: 12, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // TAB 2: SPECIAL LAGNAS (INDU, HORA, GHATIKA)
  // ==========================================
  Widget _buildSpecialLagnasTab(SpecialLagnasReportModel lagnas) {
    const columns = [
      AstrologyTableColumn(header: 'Lagna', flex: 3),
      AstrologyTableColumn(header: 'Sign', flex: 3),
      AstrologyTableColumn(header: 'House', flex: 2),
      AstrologyTableColumn(header: 'Degree', flex: 3),
    ];

    final rows = lagnas.allLagnas.map((p) {
      return [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              p.name,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
            ),
            if (p.sanskritName.isNotEmpty)
              Text(
                p.sanskritName,
                style: const TextStyle(fontSize: 10, color: AppColors.lightTextMuted),
              ),
          ],
        ),
        SignChip(signName: p.rashiName, isCompact: true),
        Text(
          'H-${p.house}',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary),
        ),
        DegreeValueDisplay(degree: p.degreeInRashi),
      ];
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AstrologySectionCard(
          title: 'Special Reference Lagnas (विशेष लग्न)',
          subtitle: 'Harmonic points for Wealth, Power, and Vitality',
          icon: Icons.wb_twilight_rounded,
          badgeText: '6 LAGNAS',
          badgeColor: AppColors.secondary,
          child: AstrologyDataTable(
            columns: columns,
            rows: rows,
          ),
        ),

        const SizedBox(height: 14),

        // Domain Significance Highlights
        _buildLagnaSignificanceCard(lagnas),
      ],
    );
  }

  Widget _buildLagnaSignificanceCard(SpecialLagnasReportModel lagnas) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.lightbulb_outline_rounded, color: AppColors.deepIndigo, size: 18),
              SizedBox(width: 8),
              Text(
                'Classical Vedic Applications',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, color: AppColors.textDark),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildLagnaItem('Indu Lagna (इन्दु लग्न)', 'Financial Potency & Wealth accumulation capacity (evaluated via 9th lords from Lagna & Moon).', lagnas.induLagna.rashiName),
          const Divider(height: 16, color: AppColors.cardBorder),
          _buildLagnaItem('Hora Lagna (होरा लग्न)', 'Financial prosperity, liquidity, and material resources progression.', lagnas.horaLagna.rashiName),
          const Divider(height: 16, color: AppColors.cardBorder),
          _buildLagnaItem('Ghatika Lagna (घटिका लग्न)', 'Power, leadership authority, executive prestige, and public recognition.', lagnas.ghatikaLagna.rashiName),
          const Divider(height: 16, color: AppColors.cardBorder),
          _buildLagnaItem('Bhava Lagna (भाव लग्न)', 'Physical vitality, foundational bodily strength, and vitality cycle.', lagnas.bhavaLagna.rashiName),
        ],
      ),
    );
  }

  Widget _buildLagnaItem(String title, String desc, String rashi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.textDark),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
              decoration: BoxDecoration(
                color: AppColors.deepIndigo.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(5),
                border: Border.all(color: AppColors.deepIndigo.withValues(alpha: 0.25)),
              ),
              child: Text(
                rashi,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.deepIndigo),
              ),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          desc,
          style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted, height: 1.35),
        ),
      ],
    );
  }

  // ==========================================
  // TAB 3: YOGI & AVYOGI POINTS
  // ==========================================
  Widget _buildYogiPointsTab(YogiPointDetailsModel yogi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. YOGI POINT (PROSPERITY CATALYST)
        _buildYogiPointCard(
          title: 'YOGI POINT (योगाधिपति)',
          subtitle: 'Primary Benefic & Prosperity Catalyst',
          point: yogi.yogiPoint,
          rulingPlanet: yogi.yogiPlanet,
          nakshatra: yogi.yogiNakshatra,
          isAuspicious: true,
        ),

        const SizedBox(height: 12),

        // 2. AVYOGI POINT (OBSTRUCTION FACTOR)
        _buildYogiPointCard(
          title: 'AVYOGI POINT (अव्योगी)',
          subtitle: 'Point of Obstruction & Inauspicious Trials',
          point: yogi.avyogiPoint,
          rulingPlanet: yogi.avyogiPlanet,
          nakshatra: yogi.avyogiNakshatra,
          isAuspicious: false,
        ),

        const SizedBox(height: 12),

        // 3. SAHAYOGI (CO-WORKER PLANET)
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.cardSurfaceWarm,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
                ),
                child: const Icon(Icons.handshake_outlined, color: AppColors.goldDark, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SAHAYOGI (सहयोगी / Duplicate Yogi)',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Ruling Planet: ${yogi.duplicateYogiPlanet}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.midnightNavy),
                    ),
                    const SizedBox(height: 1),
                    const Text(
                      'Assists the Yogi planet in bestowing fortune and success.',
                      style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              PlanetChip(planetName: yogi.duplicateYogiPlanet, isCompact: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildYogiPointCard({
    required String title,
    required String subtitle,
    required CalculatedSpecialPointModel point,
    required String rulingPlanet,
    required String nakshatra,
    required bool isAuspicious,
  }) {
    final themeColor = isAuspicious ? const Color(0xFF2E7D32) : const Color(0xFFC62828);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: themeColor.withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(
            color: themeColor.withValues(alpha: 0.05),
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: themeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: themeColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: themeColor,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
              const Spacer(),
              PlanetChip(planetName: rulingPlanet, isCompact: true),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _buildMetricMini(
                  'SIGN & HOUSE',
                  '${point.rashiName} (H-${point.house})',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricMini(
                  'LONGITUDE',
                  '${point.degreeInRashi.toStringAsFixed(2)}° in sign',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricMini(
                  'NAKSHATRA',
                  nakshatra,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricMini(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceParchment,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.textMuted),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.textDark),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 4: ARISHTA POINTS & MRITYU BHAGA
  // ==========================================
  Widget _buildArishtaAndFatalTab(
    ArishtaPointsReportModel arishta,
    MrityuBhagaReportModel mrityu,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. ARISHTA POINTS TABLE
        AstrologySectionCard(
          title: 'Classical Arishta Points (अनिष्ट बिन्दु)',
          subtitle: '64th Navamsha & 22nd Drekkana (Kharesha)',
          icon: Icons.warning_amber_rounded,
          badgeText: 'SENSITIVE',
          badgeColor: const Color(0xFFC62828),
          child: Column(
            children: arishta.allPoints.map((p) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.cardSurfaceWarm,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p.name,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textDark),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Lord: ${p.nakshatraLord} • Pada ${p.pada}',
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    SignChip(signName: p.rashiName, isCompact: true),
                    const SizedBox(width: 8),
                    Text(
                      'H-${p.house}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.deepIndigo),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 14),

        // 2. MRITYU BHAGA (FATAL DEGREE AUDIT)
        AstrologySectionCard(
          title: 'Mrityu Bhaga Analysis (मृत्युभाग)',
          subtitle: 'Classical fatal degree proximity audit',
          icon: Icons.shield_outlined,
          badgeText: mrityu.hasAnyAfflicted ? 'AFFLICTED' : 'CLEAR',
          badgeColor: mrityu.hasAnyAfflicted ? const Color(0xFFC62828) : const Color(0xFF2E7D32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (mrityu.hasAnyAfflicted)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFC62828).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFC62828).withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: Color(0xFFC62828), size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Afflicted grahas within fatal orb: ${mrityu.afflictedPlanets.join(", ")}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFC62828)),
                        ),
                      ),
                    ],
                  ),
                ),
              AstrologyDataTable(
                columns: const [
                  AstrologyTableColumn(header: 'Entity', flex: 3),
                  AstrologyTableColumn(header: 'Current°', flex: 2),
                  AstrologyTableColumn(header: 'Fatal°', flex: 2),
                  AstrologyTableColumn(header: 'Status', flex: 3),
                ],
                rows: mrityu.points.map((pt) {
                  return [
                    Text(
                      pt.planet,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textDark),
                    ),
                    Text(
                      '${pt.currentDegreeInRashi.toStringAsFixed(1)}°',
                      style: const TextStyle(fontSize: 11.5, color: AppColors.textDark),
                    ),
                    Text(
                      '${pt.exactFatalDegree.toStringAsFixed(1)}°',
                      style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: pt.isWithinOrb
                            ? const Color(0xFFC62828).withValues(alpha: 0.12)
                            : const Color(0xFF2E7D32).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: pt.isWithinOrb
                              ? const Color(0xFFC62828).withValues(alpha: 0.3)
                              : const Color(0xFF2E7D32).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        pt.severity,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: pt.isWithinOrb ? const Color(0xFFC62828) : const Color(0xFF2E7D32),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ];
                }).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
