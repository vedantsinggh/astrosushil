import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../widgets/astrology_widgets.dart';
import 'ashtakavarga_screen.dart';
import 'bhava_bala_screen.dart';
import 'birth_chart_screen.dart';
import 'divisional_charts_screen.dart';
import 'gochara_screen.dart';
import 'jaimini_screen.dart';
import 'kp_astrology_screen.dart';
import 'matchmaking_screen.dart';
import 'panchanga_screen.dart';
import 'planets_screen.dart';
import 'prashna_screen.dart';
import 'shadbala_screen.dart';
import 'special_points_screen.dart';
import 'varshaphala_screen.dart';
import 'vimshottari_dasha_screen.dart';
import 'yogas_screen.dart';

/// Central Astrology Hub Screen providing a structured navigation foundation for all
/// deterministic Vedic astrology systems and calculation engines.
class AstrologyHubScreen extends ConsumerStatefulWidget {
  const AstrologyHubScreen({super.key});

  @override
  ConsumerState<AstrologyHubScreen> createState() => _AstrologyHubScreenState();
}

class _AstrologyHubScreenState extends ConsumerState<AstrologyHubScreen> {
  int _selectedFilterIndex = 0; // 0 = All, 1 = Charts, 2 = Timing, 3 = Strength, 4 = Advanced

  void _navigateToKundli(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BirthChartScreen(profile: profile),
      ),
    );
  }

  void _navigateToPlanets(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlanetsScreen(profile: profile),
      ),
    );
  }

  void _navigateToDivisionalCharts(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const DivisionalChartsScreen(),
      ),
    );
  }

  void _navigateToVimshottariDasha(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const VimshottariDashaScreen(),
      ),
    );
  }

  void _navigateToPanchanga(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const PanchangaScreen(),
      ),
    );
  }

  void _navigateToYogas(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const YogasScreen(),
      ),
    );
  }

  void _navigateToSpecialPoints(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const SpecialPointsScreen(),
      ),
    );
  }

  void _navigateToGochara(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const GocharaScreen(),
      ),
    );
  }

  void _navigateToAshtakavarga(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const AshtakavargaScreen(),
      ),
    );
  }

  void _navigateToShadbala(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ShadbalaScreen(),
      ),
    );
  }

  void _navigateToBhavaBala(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const BhavaBalaScreen(),
      ),
    );
  }

  void _navigateToJaimini(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const JaiminiScreen(),
      ),
    );
  }

  void _navigateToKP(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const KPAstrologyScreen(),
      ),
    );
  }

  void _navigateToVarshaphala(BuildContext context, BirthProfileModel profile) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const VarshaphalaScreen(),
      ),
    );
  }

  void _navigateToPrashna(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const PrashnaScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Astrology',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.primary),
            tooltip: 'About Vedic Astrology Engine',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('All calculations are 100% deterministic using Swiss Ephemeris & Lahiri Ayanamsa.'),
                  duration: Duration(seconds: 3),
                ),
              );
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: activeProfile == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: AstrologyEmptyState(
                      title: 'No Birth Profile Available',
                      message: 'Add your birth details to unlock complete Kundli, Dasha, Strength, and Planetary calculations.',
                      actionLabel: 'Add Birth Profile',
                      onAction: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                        );
                      },
                    ),
                  ),
                )
              : SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. ACTIVE BIRTH PROFILE SELECTOR
                      const ActiveBirthProfileSelector(isDark: false),

                      const SizedBox(height: 16),

                      // 2. CATEGORY FILTER SEGMENTED CONTROLS
                      AstrologyTabBar(
                        isScrollable: true,
                        selectedIndex: _selectedFilterIndex,
                        onTabSelected: (idx) {
                          setState(() => _selectedFilterIndex = idx);
                        },
                        tabs: const [
                          AstrologyTabItem(label: 'All Systems', icon: Icons.all_inclusive_rounded),
                          AstrologyTabItem(label: 'Charts & Kundli', icon: Icons.grid_view_rounded),
                          AstrologyTabItem(label: 'Timing & Dashas', icon: Icons.schedule_rounded),
                          AstrologyTabItem(label: 'Strengths', icon: Icons.bar_chart_rounded),
                          AstrologyTabItem(label: 'Advanced', icon: Icons.psychology_rounded),
                          AstrologyTabItem(label: 'Matchmaking', icon: Icons.favorite_rounded),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // 3. PROGRESSIVE HIERARCHICAL SECTIONS
                      if (_selectedFilterIndex == 0 || _selectedFilterIndex == 1)
                        _buildChartsSection(context, activeProfile),

                      if (_selectedFilterIndex == 0 || _selectedFilterIndex == 2)
                        _buildTimingSection(context, activeProfile),

                      if (_selectedFilterIndex == 0 || _selectedFilterIndex == 3)
                        _buildStrengthSection(context, activeProfile),

                      if (_selectedFilterIndex == 0 || _selectedFilterIndex == 4)
                        _buildAdvancedSection(context, activeProfile),

                      if (_selectedFilterIndex == 0 || _selectedFilterIndex == 5)
                        _buildMatchmakingSection(context, activeProfile),

                      const SizedBox(height: 32),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  // ==========================================
  // SECTION 1: CHARTS & KUNDLI
  // ==========================================
  Widget _buildChartsSection(BuildContext context, BirthProfileModel profile) {
    return AstrologySectionCard(
      title: 'Charts & Kundli',
      subtitle: 'Natal Lagna chart, planetary degrees, and divisional vargas',
      icon: Icons.grid_view_rounded,
      badgeText: 'CORE',
      badgeColor: AppColors.secondary,
      child: Column(
        children: [
          AstrologyFeatureTile(
            title: 'Birth Chart (Kundli)',
            subtitle: 'D-1 Rashi natal chart with houses, Lagna & planets',
            icon: Icons.auto_awesome_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToKundli(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Planetary Placements',
            subtitle: 'Exact degrees, Nakshatras, Padas & retrograde state',
            icon: Icons.public_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToPlanets(context, profile),
          ),
          AstrologyFeatureTile(
            title: '12 Houses (Bhavas)',
            subtitle: 'Comprehensive 12 life sector breakdown from Lagna to Vyaya',
            icon: Icons.home_work_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => BirthChartScreen(profile: profile, initialTabIndex: 2)),
            ),
          ),
          AstrologyFeatureTile(
            title: 'Nakshatra Profile',
            subtitle: 'Janma Nakshatra, Pada, ruling lord & lunar mansions',
            icon: Icons.auto_awesome_mosaic_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => BirthChartScreen(profile: profile, initialTabIndex: 3)),
            ),
          ),
          AstrologyFeatureTile(
            title: 'Divisional Charts (Vargas)',
            subtitle: 'D-1 to D-60 Shodashvarga harmonic charts (Navamsha, Dashamsha, etc.)',
            icon: Icons.pie_chart_outline_rounded,
            tag: 'D1–D60',
            tagColor: AppColors.success,
            onTap: () => _navigateToDivisionalCharts(context, profile),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION 2: TIMING & DASHAS
  // ==========================================
  Widget _buildTimingSection(BuildContext context, BirthProfileModel profile) {
    return AstrologySectionCard(
      title: 'Timing & Periods',
      subtitle: 'Planetary time cycles, transits, and daily astronomical panchang',
      icon: Icons.schedule_rounded,
      child: Column(
        children: [
          AstrologyFeatureTile(
            title: 'Vimshottari Dasha',
            subtitle: '120-year Parashari multi-tier planetary timeline',
            icon: Icons.timeline_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToVimshottariDasha(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Transits (Gochara)',
            subtitle: 'Live planetary transits, house ingress, and timeline events',
            icon: Icons.swap_horiz_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToGochara(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Panchanga',
            subtitle: 'Daily Tithi, Vara, Nakshatra, Yoga, and Karana elements',
            icon: Icons.wb_twilight_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToPanchanga(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Vedic Yogas',
            subtitle: 'Pancha Mahapurusha, Raja, Dhana, and planetary combinations',
            icon: Icons.stars_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            onTap: () => _navigateToYogas(context, profile),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION 3: STRENGTH & BALA
  // ==========================================
  Widget _buildStrengthSection(BuildContext context, BirthProfileModel profile) {
    return ExpandableAstrologyCard(
      title: 'Planetary & House Strength',
      subtitle: 'Shadbala sixfold metrics, Bhava Bala, and Ashtakavarga matrices',
      icon: Icons.bar_chart_rounded,
      badgeText: 'BALA',
      badgeColor: AppColors.supportingAccent,
      initiallyExpanded: _selectedFilterIndex == 3,
      summaryWidget: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield_outlined, size: 14, color: AppColors.secondary),
                  SizedBox(width: 6),
                  Text('Shadbala • 6 Strengths', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.grid_3x3_rounded, size: 14, color: AppColors.secondary),
                  SizedBox(width: 6),
                  Text('Ashtakavarga • SAV/BAV', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        ],
      ),
      expandedChild: Column(
        children: [
          AstrologyFeatureTile(
            title: 'Shadbala (षड्बल)',
            subtitle: 'Positional, directional, temporal, motional, natural and aspectual strengths',
            icon: Icons.shield_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToShadbala(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Bhava Bala (भावबल)',
            subtitle: '12-house potency, lord strengths, cusp directions, and occupants',
            icon: Icons.home_work_outlined,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToBhavaBala(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Ashtakavarga Matrix',
            subtitle: 'Sarvashtakavarga (SAV), Bhinnashtakavarga (BAV) & Shodhya Pindas',
            icon: Icons.grid_3x3_rounded,
            tag: 'SAV/BAV',
            tagColor: AppColors.success,
            onTap: () => _navigateToAshtakavarga(context, profile),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION 4: ADVANCED SYSTEMS
  // ==========================================
  Widget _buildAdvancedSection(BuildContext context, BirthProfileModel profile) {
    return ExpandableAstrologyCard(
      title: 'Advanced Astrological Systems',
      subtitle: 'Jaimini Sutras, KP Krishnamurti Padhdhati, and Special Points',
      icon: Icons.psychology_rounded,
      badgeText: 'ADVANCED',
      badgeColor: AppColors.primary,
      initiallyExpanded: _selectedFilterIndex == 4,
      summaryWidget: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.hub_outlined, size: 14, color: AppColors.secondary),
                  SizedBox(width: 6),
                  Text('Jaimini Karakas', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.layers_outlined, size: 14, color: AppColors.secondary),
                  SizedBox(width: 6),
                  Text('KP Sub-Lords', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        ],
      ),
      expandedChild: Column(
        children: [
          AstrologyFeatureTile(
            title: 'Jaimini Astrology',
            subtitle: '7/8 Chara Karakas (Atmakaraka, Amatyakaraka), Arudha Padas, & Argala',
            icon: Icons.hub_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToJaimini(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'KP System (Krishnamurti Padhdhati)',
            subtitle: 'Placidus cusps, 4-tier sub-lords (Sign/Star/Sub/Sub-Sub), & Ruling Planets',
            icon: Icons.layers_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToKP(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Varshaphala (Solar Return)',
            subtitle: 'Annual solar return horoscope, Muntha, Varshesha, Harsha Bala, & 36 Sahams',
            icon: Icons.wb_sunny_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToVarshaphala(context, profile),
          ),
          AstrologyFeatureTile(
            title: 'Prashna (Horary Astrology)',
            subtitle: 'Instantaneous query casting, Prashna Lagna, Chandra mind, Sphutas, & Panchanga',
            icon: Icons.help_outline_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            showDivider: true,
            onTap: () => _navigateToPrashna(context),
          ),
          AstrologyFeatureTile(
            title: 'Special Lagnas & Upagrahas',
            subtitle: 'Hora, Ghatika, Indu Lagna, Gulika, Mandi, & 5 mathematical Upagrahas',
            icon: Icons.flare_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            onTap: () => _navigateToSpecialPoints(context, profile),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION 5: MATCHMAKING & COMPATIBILITY
  // ==========================================
  Widget _buildMatchmakingSection(BuildContext context, BirthProfileModel profile) {
    return AstrologySectionCard(
      title: 'Matchmaking & Compatibility',
      subtitle: '36-point Ashtakoota Guna Milan and Manglik Dosha comparison',
      icon: Icons.favorite_rounded,
      child: Column(
        children: [
          AstrologyFeatureTile(
            title: 'Kundli Matchmaking (Guna Milan)',
            subtitle: '8 Kootas: Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi',
            icon: Icons.favorite_rounded,
            tag: 'Live',
            tagColor: AppColors.success,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const MatchmakingScreen()),
              );
            },
          ),
        ],
      ),
    );
  }
}
