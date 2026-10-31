import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../providers/home_provider.dart';
import 'previews/ashtakavarga_preview.dart';
import 'previews/bhava_bala_preview.dart';
import 'previews/dasha_timeline_preview.dart';
import 'previews/jaimini_preview.dart';
import 'previews/kp_preview.dart';
import 'previews/matchmaking_preview.dart';
import 'previews/mini_kundli_preview.dart';
import 'previews/panchanga_preview.dart';
import 'previews/planets_preview.dart';
import 'previews/prashna_preview.dart';
import 'previews/rashi_preview.dart';
import 'previews/shadbala_preview.dart';
import 'previews/special_points_preview.dart';
import 'previews/transits_preview.dart';
import 'previews/vargas_preview.dart';
import 'previews/varshaphala_preview.dart';
import 'previews/vastu_preview.dart';
import 'previews/yogas_preview.dart';

/// Quick Access and Vedic Systems explorer on the Home Screen.
/// Provides categorized, data-driven feature cards for all 18 Parashari, Jaimini, Tajika & KP systems.
class QuickAccessSection extends ConsumerStatefulWidget {
  final VoidCallback onKundliTap;
  final VoidCallback onPlanetsTap;
  final VoidCallback onPredictionTap;
  final VoidCallback onVastuTap;
  final VoidCallback? onDivisionalChartsTap;
  final VoidCallback? onDashaTap;
  final VoidCallback? onMatchmakingTap;
  final VoidCallback? onPanchangaTap;
  final VoidCallback? onGocharaTap;
  final VoidCallback? onYogasTap;
  final VoidCallback? onJaiminiTap;
  final VoidCallback? onKPTap;
  final VoidCallback? onVarshaphalaTap;
  final VoidCallback? onPrashnaTap;
  final VoidCallback? onShadbalaTap;
  final VoidCallback? onBhavaBalaTap;
  final VoidCallback? onAshtakavargaTap;
  final VoidCallback? onSpecialPointsTap;
  final VoidCallback? onSeeAllTap;

  const QuickAccessSection({
    super.key,
    required this.onKundliTap,
    required this.onPlanetsTap,
    required this.onPredictionTap,
    required this.onVastuTap,
    this.onDivisionalChartsTap,
    this.onDashaTap,
    this.onMatchmakingTap,
    this.onPanchangaTap,
    this.onGocharaTap,
    this.onYogasTap,
    this.onJaiminiTap,
    this.onKPTap,
    this.onVarshaphalaTap,
    this.onPrashnaTap,
    this.onShadbalaTap,
    this.onBhavaBalaTap,
    this.onAshtakavargaTap,
    this.onSpecialPointsTap,
    this.onSeeAllTap,
  });

  @override
  ConsumerState<QuickAccessSection> createState() => _QuickAccessSectionState();
}

class _QuickAccessSectionState extends ConsumerState<QuickAccessSection> {
  int _selectedCategoryIndex = 0; // 0 = All, 1 = Charts, 2 = Timing, 3 = Matchmaking, 4 = Advanced

  @override
  Widget build(BuildContext context) {
    // Watch relevant Riverpod providers for data-driven visualizations
    final activeProfile = ref.watch(selectedBirthProfileProvider);
    final hasProfile = activeProfile != null;

    final chartAsync = ref.watch(activeProfileAstroChartProvider);
    final chart = chartAsync.valueOrNull;
    final isChartLoading = chartAsync.isLoading;

    final dashaAsync = ref.watch(activeProfileVimshottariDashaProvider);
    final dashaTree = dashaAsync.valueOrNull;
    final isDashaLoading = dashaAsync.isLoading;

    final panchangAsync = ref.watch(activeProfilePanchangProvider);
    final panchang = panchangAsync.valueOrNull;
    final isPanchangLoading = panchangAsync.isLoading;

    final gocharaAsync = ref.watch(activeProfileGocharaProvider);
    final gochara = gocharaAsync.valueOrNull;
    final isGocharaLoading = gocharaAsync.isLoading;

    final yogasAsync = ref.watch(activeProfileYogasProvider);
    final yogas = yogasAsync.valueOrNull;
    final isYogasLoading = yogasAsync.isLoading;

    final strengthAsync = ref.watch(activeProfileStrengthProvider);
    final shadbala = strengthAsync.valueOrNull?.shadbala;
    final bhavaBala = strengthAsync.valueOrNull?.bhavaBala;
    final isStrengthLoading = strengthAsync.isLoading;

    final ashtakavargaAsync = ref.watch(activeProfileAshtakavargaProvider);
    final ashtakavarga = ashtakavargaAsync.valueOrNull;
    final isAshtakavargaLoading = ashtakavargaAsync.isLoading;

    final jaiminiAsync = ref.watch(activeProfileJaiminiProvider);
    final jaimini = jaiminiAsync.valueOrNull;
    final isJaiminiLoading = jaiminiAsync.isLoading;

    final kpAsync = ref.watch(activeProfileKPProvider);
    final kp = kpAsync.valueOrNull;
    final isKpLoading = kpAsync.isLoading;

    final varshaphalaAsync = ref.watch(activeProfileVarshaphalaProvider);
    final varshaphala = varshaphalaAsync.valueOrNull;
    final isVarshaphalaLoading = varshaphalaAsync.isLoading;

    final specialPointsAsync = ref.watch(activeProfileSpecialPointsProvider);
    final specialPoints = specialPointsAsync.valueOrNull;
    final isSpecialPointsLoading = specialPointsAsync.isLoading;

    final matchmakingState = ref.watch(matchmakingProvider);
    final prashnaState = ref.watch(prashnaProvider);
    final dailyPrediction = ref.watch(dailyRashiBhavishyaProvider);

    final allItems = _buildAllItems(
      hasProfile: hasProfile,
      chart: chart,
      isChartLoading: isChartLoading,
      dashaTree: dashaTree,
      isDashaLoading: isDashaLoading,
      panchang: panchang,
      isPanchangLoading: isPanchangLoading,
      gochara: gochara,
      isGocharaLoading: isGocharaLoading,
      yogas: yogas,
      isYogasLoading: isYogasLoading,
      shadbala: shadbala,
      bhavaBala: bhavaBala,
      isStrengthLoading: isStrengthLoading,
      ashtakavarga: ashtakavarga,
      isAshtakavargaLoading: isAshtakavargaLoading,
      jaimini: jaimini,
      isJaiminiLoading: isJaiminiLoading,
      kp: kp,
      isKpLoading: isKpLoading,
      varshaphala: varshaphala,
      isVarshaphalaLoading: isVarshaphalaLoading,
      specialPoints: specialPoints,
      isSpecialPointsLoading: isSpecialPointsLoading,
      matchmakingState: matchmakingState,
      prashnaState: prashnaState,
      activeRashi: dailyPrediction.rashiName,
    );

    final displayedItems = _filterItems(allItems);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. SECTION HEADER
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Access',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Explore classical Vedic astrology tools',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: AppColors.lightTextSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: widget.onSeeAllTap ?? () {},
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 5.0),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.07),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.18),
                      width: 0.8,
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'See All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.primary),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. CATEGORY PILL FILTER BAR
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              _buildFilterPill('All Tools', 0),
              _buildFilterPill('Charts & Kundli', 1),
              _buildFilterPill('Timing & Dashas', 2),
              _buildFilterPill('Matchmaking', 3),
              _buildFilterPill('Advanced', 4),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 3. RESPONSIVE VEDIC SYSTEMS GRID
        LayoutBuilder(
          builder: (context, constraints) {
            final screenWidth = constraints.maxWidth;
            final isSmall = screenWidth < 360;

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayedItems.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: isSmall ? 0.88 : 0.98,
              ),
              itemBuilder: (context, index) {
                final item = displayedItems[index];
                return _QuickAccessCard(item: item);
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildFilterPill(String label, int index) {
    final isSelected = _selectedCategoryIndex == index;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: InkWell(
        onTap: () => setState(() => _selectedCategoryIndex = index),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.lightBorder,
              width: 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.2),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : AppColors.primary,
            ),
          ),
        ),
      ),
    );
  }

  List<_QuickAccessItem> _filterItems(List<_QuickAccessItem> all) {
    switch (_selectedCategoryIndex) {
      case 1:
        return all.where((i) => i.category == 'charts').toList();
      case 2:
        return all.where((i) => i.category == 'timing').toList();
      case 3:
        return all.where((i) => i.category == 'matchmaking').toList();
      case 4:
        return all.where((i) => i.category == 'advanced').toList();
      case 0:
      default:
        return all;
    }
  }

  List<_QuickAccessItem> _buildAllItems({
    required bool hasProfile,
    required dynamic chart,
    required bool isChartLoading,
    required dynamic dashaTree,
    required bool isDashaLoading,
    required dynamic panchang,
    required bool isPanchangLoading,
    required dynamic gochara,
    required bool isGocharaLoading,
    required dynamic yogas,
    required bool isYogasLoading,
    required dynamic shadbala,
    required dynamic bhavaBala,
    required bool isStrengthLoading,
    required dynamic ashtakavarga,
    required bool isAshtakavargaLoading,
    required dynamic jaimini,
    required bool isJaiminiLoading,
    required dynamic kp,
    required bool isKpLoading,
    required dynamic varshaphala,
    required bool isVarshaphalaLoading,
    required dynamic specialPoints,
    required bool isSpecialPointsLoading,
    required dynamic matchmakingState,
    required dynamic prashnaState,
    required String activeRashi,
  }) {
    return [
      // 1. Birth Chart (Kundli)
      _QuickAccessItem(
        title: 'Birth Chart',
        subtitle: 'D-1 Natal Lagna Kundli',
        badge: 'CORE',
        icon: Icons.auto_awesome_rounded,
        iconBgColor: const Color(0xFFEAE8F4),
        iconColor: AppColors.secondary,
        category: 'charts',
        previewWidget: MiniKundliPreview(
          chart: chart,
          isLoading: isChartLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Birth Chart Kundli preview',
        onTap: widget.onKundliTap,
      ),

      // 2. Divisional Charts (Vargas D1-D60)
      _QuickAccessItem(
        title: 'Divisional Charts',
        subtitle: 'D1–D60 Harmonic Vargas',
        badge: 'D1–D60',
        icon: Icons.pie_chart_outline_rounded,
        iconBgColor: const Color(0xFFE0F2FE),
        iconColor: const Color(0xFF0284C7),
        category: 'charts',
        previewWidget: VargasPreview(
          isLoading: isChartLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Divisional Charts D1 through D60 preview',
        onTap: widget.onDivisionalChartsTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 3. Vimshottari Dasha
      _QuickAccessItem(
        title: 'Vimshottari Dasha',
        subtitle: '120-Yr planetary timeline',
        badge: '120 YRS',
        icon: Icons.timeline_rounded,
        iconBgColor: const Color(0xFFFEF3C7),
        iconColor: const Color(0xFFD97706),
        category: 'timing',
        previewWidget: DashaTimelinePreview(
          dashaTree: dashaTree,
          isLoading: isDashaLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Vimshottari Dasha timeline preview',
        onTap: widget.onDashaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 4. Kundli Matchmaking (Guna Milan)
      _QuickAccessItem(
        title: 'Matchmaking',
        subtitle: '36-Pt Guna Milan & Manglik',
        badge: '36 PTS',
        icon: Icons.favorite_rounded,
        iconBgColor: const Color(0xFFFCE7F3),
        iconColor: const Color(0xFFDB2777),
        category: 'matchmaking',
        previewWidget: MatchmakingPreview(
          report: matchmakingState.result,
          isLoading: matchmakingState.isLoading,
        ),
        semanticLabel: 'Kundli Matchmaking 36 point Guna Milan preview',
        onTap: widget.onMatchmakingTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 5. Daily Panchanga
      _QuickAccessItem(
        title: 'Daily Panchanga',
        subtitle: 'Tithi, Nakshatra & Yoga',
        badge: 'LIVE',
        icon: Icons.calendar_month_rounded,
        iconBgColor: const Color(0xFFDCFCE7),
        iconColor: const Color(0xFF16A34A),
        category: 'timing',
        previewWidget: PanchangaPreview(
          panchang: panchang,
          isLoading: isPanchangLoading,
        ),
        semanticLabel: 'Daily Panchanga 5 elements preview',
        onTap: widget.onPanchangaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 6. Planets
      _QuickAccessItem(
        title: 'Planets',
        subtitle: 'Planetary positions & degrees',
        badge: 'DEGREES',
        icon: Icons.public_rounded,
        iconBgColor: const Color(0xFFEAE8F4),
        iconColor: AppColors.secondary,
        category: 'charts',
        previewWidget: PlanetsPreview(
          chart: chart,
          isLoading: isChartLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Planetary positions and degrees preview',
        onTap: widget.onPlanetsTap,
      ),

      // 7. Transits (Gochara)
      _QuickAccessItem(
        title: 'Transits (Gochara)',
        subtitle: 'Natal house ingress vectors',
        badge: 'GOCHARA',
        icon: Icons.sync_alt_rounded,
        iconBgColor: const Color(0xFFEDE9FE),
        iconColor: const Color(0xFF7C3AED),
        category: 'timing',
        previewWidget: TransitsPreview(
          snapshot: gochara,
          isLoading: isGocharaLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Planetary transits Gochara preview',
        onTap: widget.onGocharaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 8. Vedic Yogas
      _QuickAccessItem(
        title: 'Vedic Yogas',
        subtitle: 'Raja, Dhana & Auspicious Yogas',
        badge: 'YOGAS',
        icon: Icons.stars_rounded,
        iconBgColor: const Color(0xFFFFF1F2),
        iconColor: const Color(0xFFE11D48),
        category: 'timing',
        previewWidget: YogasPreview(
          report: yogas,
          isLoading: isYogasLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Vedic Yogas auspicious combinations preview',
        onTap: widget.onYogasTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 9. Shadbala Strengths
      _QuickAccessItem(
        title: 'Shadbala Strengths',
        subtitle: '6-fold planetary potency metrics',
        badge: '6 BALAS',
        icon: Icons.shield_rounded,
        iconBgColor: const Color(0xFFE0F2FE),
        iconColor: const Color(0xFF0284C7),
        category: 'advanced',
        previewWidget: ShadbalaPreview(
          report: shadbala,
          isLoading: isStrengthLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Shadbala 6 fold planetary strength preview',
        onTap: widget.onShadbalaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 10. Bhava Bala (House Potency)
      _QuickAccessItem(
        title: 'Bhava Bala',
        subtitle: '12-house strength spectrum',
        badge: '12 BHAVAS',
        icon: Icons.home_work_outlined,
        iconBgColor: const Color(0xFFF3E8FF),
        iconColor: const Color(0xFF9333EA),
        category: 'advanced',
        previewWidget: BhavaBalaPreview(
          report: bhavaBala,
          isLoading: isStrengthLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Bhava Bala 12 house potency preview',
        onTap: widget.onBhavaBalaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 11. Ashtakavarga Matrix
      _QuickAccessItem(
        title: 'Ashtakavarga',
        subtitle: 'SAV/BAV 337-bindu matrix',
        badge: 'SAV/BAV',
        icon: Icons.grid_3x3_rounded,
        iconBgColor: const Color(0xFFEAE8F4),
        iconColor: AppColors.secondary,
        category: 'advanced',
        previewWidget: AshtakavargaPreview(
          result: ashtakavarga,
          isLoading: isAshtakavargaLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Ashtakavarga 337 bindu heatmap matrix preview',
        onTap: widget.onAshtakavargaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 12. Jaimini Astrology
      _QuickAccessItem(
        title: 'Jaimini Sutras',
        subtitle: '7/8 Chara Karakas (AK, AmK)',
        badge: 'KARAKAS',
        icon: Icons.hub_rounded,
        iconBgColor: const Color(0xFFFEF3C7),
        iconColor: const Color(0xFFD97706),
        category: 'advanced',
        previewWidget: JaiminiPreview(
          report: jaimini,
          isLoading: isJaiminiLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Jaimini Chara Karakas hierarchy preview',
        onTap: widget.onJaiminiTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 13. KP System (Krishnamurti)
      _QuickAccessItem(
        title: 'KP Astrology',
        subtitle: 'Placidus cusps & Sub-Lords',
        badge: 'SUB-LORDS',
        icon: Icons.layers_rounded,
        iconBgColor: const Color(0xFFF1F5F9),
        iconColor: const Color(0xFF475569),
        category: 'advanced',
        previewWidget: KPPreview(
          report: kp,
          isLoading: isKpLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'KP Astrology 4 tier sub lord hierarchy preview',
        onTap: widget.onKPTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 14. Varshaphala (Solar Return)
      _QuickAccessItem(
        title: 'Varshaphala',
        subtitle: 'Annual Tajika solar return',
        badge: 'ANNUAL',
        icon: Icons.wb_sunny_rounded,
        iconBgColor: const Color(0xFFFFFBEB),
        iconColor: const Color(0xFFCA8A04),
        category: 'timing',
        previewWidget: VarshaphalaPreview(
          chart: varshaphala,
          isLoading: isVarshaphalaLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Varshaphala annual solar return preview',
        onTap: widget.onVarshaphalaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 15. Prashna (Horary)
      _QuickAccessItem(
        title: 'Prashna Shastra',
        subtitle: 'Instant query casting',
        badge: 'HORARY',
        icon: Icons.help_outline_rounded,
        iconBgColor: const Color(0xFFEDE9FE),
        iconColor: const Color(0xFF7C3AED),
        category: 'advanced',
        previewWidget: PrashnaPreview(
          chart: prashnaState.result,
          isLoading: prashnaState.isLoading,
        ),
        semanticLabel: 'Prashna horary query casting preview',
        onTap: widget.onPrashnaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 16. Special Points & Upagrahas
      _QuickAccessItem(
        title: 'Special Points',
        subtitle: 'Hora, Ghatika, Gulika & Mandi',
        badge: 'UPAGRAHAS',
        icon: Icons.flare_rounded,
        iconBgColor: const Color(0xFFFCE7F3),
        iconColor: const Color(0xFFDB2777),
        category: 'charts',
        previewWidget: SpecialPointsPreview(
          report: specialPoints,
          isLoading: isSpecialPointsLoading,
          hasProfile: hasProfile,
        ),
        semanticLabel: 'Special Points and Upagrahas coordinates preview',
        onTap: widget.onSpecialPointsTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 17. Rashi Bhavishya
      _QuickAccessItem(
        title: 'Rashi Bhavishya',
        subtitle: 'Daily zodiac prediction',
        badge: 'DAILY',
        icon: Icons.wb_sunny_outlined,
        iconBgColor: const Color(0xFFFFF6E5),
        iconColor: const Color(0xFFD98A2B),
        category: 'charts',
        previewWidget: RashiPreview(activeRashi: activeRashi),
        semanticLabel: 'Rashi Bhavishya daily zodiac strip preview',
        onTap: widget.onPredictionTap,
      ),

      // 18. Vastu Alignment
      _QuickAccessItem(
        title: 'Vastu',
        subtitle: 'Directional 9-grid alignment',
        badge: 'ENERGY',
        icon: Icons.home_outlined,
        iconBgColor: const Color(0xFFFDE8EF),
        iconColor: AppColors.supportingAccent,
        category: 'charts',
        previewWidget: const VastuPreview(),
        semanticLabel: 'Vastu 9 pad directional alignment preview',
        onTap: widget.onVastuTap,
      ),
    ];
  }
}

class _QuickAccessItem {
  final String title;
  final String subtitle;
  final String badge;
  final IconData icon;
  final Color iconBgColor;
  final Color iconColor;
  final String category;
  final Widget previewWidget;
  final String semanticLabel;
  final VoidCallback onTap;

  const _QuickAccessItem({
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.icon,
    required this.iconBgColor,
    required this.iconColor,
    required this.category,
    required this.previewWidget,
    required this.semanticLabel,
    required this.onTap,
  });
}

class _QuickAccessCard extends StatelessWidget {
  final _QuickAccessItem item;

  const _QuickAccessCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: item.semanticLabel,
      button: true,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.lightBorder, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: item.onTap,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // 1. Top Row: Icon + Badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: item.iconBgColor,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(
                          item.icon,
                          size: 15,
                          color: item.iconColor,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: item.iconColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.badge,
                            style: TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.bold,
                              color: item.iconColor,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // 2. Middle Area (55–70% of Card): Data-Driven Visualization
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: item.previewWidget,
                    ),
                  ),

                  // 3. Bottom Column: Title + Subtitle
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        item.title,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 1),
                      Text(
                        item.subtitle,
                        style: const TextStyle(
                          fontSize: 9.5,
                          color: AppColors.lightTextSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
