import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
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
    // The birth chart is the featured (hero) tool; the rest form the grid.
    final chartItems = activeProfile == null ? const <AstrologyToolItem>[] : _chartItems(context, activeProfile);

    return AstroPage(
      title: 'Astrology',
      subtitle: activeProfile == null ? null : 'Choose a tool to explore your chart.',
      style: AstroNavBarStyle.hero,
      actions: [
        AstroNavAction(
          icon: Icons.info_outline_rounded,
          tooltip: 'About Vedic Astrology Engine',
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                    'All calculations are 100% deterministic using Astronomy Engine (VSOP87/ELP2000-82) & Lahiri Ayanamsa.'),
                duration: Duration(seconds: 3),
              ),
            );
          },
        ),
      ],
      slivers: [
        AstroSliverContent(
          top: 20,
          maxWidth: 960,
          sliver: SliverToBoxAdapter(
            child: activeProfile == null
                ? Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: AstrologyEmptyState(
                        title: 'No Birth Profile Available',
                        message: 'Add your birth details to see your chart and all astrology tools.',
                        actionLabel: 'Add Birth Profile',
                        onAction: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                          );
                        },
                      ),
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const ActiveBirthProfileSelector(isDark: false),
                      const SizedBox(height: 16),
                      _FeaturedToolCard(item: chartItems.first),
                      _HubSection(
                        title: 'Charts & Kundli',
                        subtitle: 'Your birth chart, planets and houses',
                        items: chartItems.skip(1).toList(),
                      ),
                      _HubSection(
                        title: 'Timing & Periods',
                        subtitle: 'When things are likely to unfold',
                        items: _timingItems(context, activeProfile),
                      ),
                      _HubSection(
                        title: 'Strength',
                        subtitle: 'How strong each planet and house is',
                        items: _strengthItems(context, activeProfile),
                      ),
                      _HubSection(
                        title: 'Advanced Tools',
                        subtitle: 'Classical systems for deeper study',
                        items: _advancedItems(context, activeProfile),
                      ),
                      _HubSection(
                        title: 'Matchmaking',
                        items: _matchmakingItems(context),
                      ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // SECTION 1: CHARTS & KUNDLI
  // ==========================================
  List<AstrologyToolItem> _chartItems(BuildContext context, BirthProfileModel profile) {
    return [
      AstrologyToolItem(
        title: 'Birth Chart (Kundli)',
        subtitle: 'Your main birth chart',
        icon: Icons.auto_awesome_rounded,
        color: AppColors.tintVioletText,
        tint: AstroTint.violet,
        onTap: () => _navigateToKundli(context, profile),
      ),
      AstrologyToolItem(
        title: 'Planetary Placements',
        subtitle: 'Where each planet was at birth',
        icon: Icons.public_rounded,
        color: AppColors.tintVioletText,
        tint: AstroTint.violet,
        onTap: () => _navigateToPlanets(context, profile),
      ),
      AstrologyToolItem(
        title: '12 Houses (Bhavas)',
        subtitle: 'The 12 areas of life',
        icon: Icons.home_work_rounded,
        color: AppColors.tintVioletText,
        tint: AstroTint.violet,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => BirthChartScreen(profile: profile, initialTabIndex: 2)),
        ),
      ),
      AstrologyToolItem(
        title: 'Nakshatra Profile',
        subtitle: 'Your birth star',
        icon: Icons.auto_awesome_mosaic_rounded,
        color: AppColors.tintVioletText,
        tint: AstroTint.violet,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => BirthChartScreen(profile: profile, initialTabIndex: 3)),
        ),
      ),
      AstrologyToolItem(
        title: 'Divisional Charts (Vargas)',
        subtitle: 'Detailed charts, D1 to D60',
        icon: Icons.pie_chart_outline_rounded,
        color: AppColors.tintVioletText,
        tint: AstroTint.violet,
        onTap: () => _navigateToDivisionalCharts(context, profile),
      ),
    ];
  }

  // ==========================================
  // SECTION 2: TIMING & DASHAS
  // ==========================================
  List<AstrologyToolItem> _timingItems(BuildContext context, BirthProfileModel profile) {
    return [
      AstrologyToolItem(
        title: 'Vimshottari Dasha',
        subtitle: 'Your planet periods over time',
        icon: Icons.timeline_rounded,
        color: AppColors.tintSkyText,
        tint: AstroTint.sky,
        onTap: () => _navigateToVimshottariDasha(context, profile),
      ),
      AstrologyToolItem(
        title: 'Transits (Gochara)',
        subtitle: 'Where the planets are now',
        icon: Icons.swap_horiz_rounded,
        color: AppColors.tintSkyText,
        tint: AstroTint.sky,
        onTap: () => _navigateToGochara(context, profile),
      ),
      AstrologyToolItem(
        title: 'Panchanga',
        subtitle: 'Daily Hindu calendar',
        icon: Icons.wb_twilight_rounded,
        color: AppColors.tintSkyText,
        tint: AstroTint.sky,
        onTap: () => _navigateToPanchanga(context, profile),
      ),
      AstrologyToolItem(
        title: 'Vedic Yogas',
        subtitle: 'Special planet combinations',
        icon: Icons.stars_rounded,
        color: AppColors.tintSkyText,
        tint: AstroTint.sky,
        onTap: () => _navigateToYogas(context, profile),
      ),
    ];
  }

  // ==========================================
  // SECTION 3: STRENGTH & BALA
  // ==========================================
  List<AstrologyToolItem> _strengthItems(BuildContext context, BirthProfileModel profile) {
    return [
      AstrologyToolItem(
        title: 'Shadbala (षड्बल)',
        subtitle: 'How strong each planet is',
        icon: Icons.shield_rounded,
        color: AppColors.tintSageText,
        tint: AstroTint.sage,
        onTap: () => _navigateToShadbala(context, profile),
      ),
      AstrologyToolItem(
        title: 'Bhava Bala (भावबल)',
        subtitle: 'How strong each house is',
        icon: Icons.home_work_outlined,
        color: AppColors.tintSageText,
        tint: AstroTint.sage,
        onTap: () => _navigateToBhavaBala(context, profile),
      ),
      AstrologyToolItem(
        title: 'Ashtakavarga Matrix',
        subtitle: 'Point scores for each sign',
        icon: Icons.grid_3x3_rounded,
        color: AppColors.tintSageText,
        tint: AstroTint.sage,
        onTap: () => _navigateToAshtakavarga(context, profile),
      ),
    ];
  }

  // ==========================================
  // SECTION 4: ADVANCED SYSTEMS
  // ==========================================
  List<AstrologyToolItem> _advancedItems(BuildContext context, BirthProfileModel profile) {
    return [
      AstrologyToolItem(
        title: 'Jaimini Astrology',
        subtitle: 'Karakas and Arudha Padas',
        icon: Icons.hub_rounded,
        color: AppColors.secondary,
        tint: AstroTint.indigo,
        onTap: () => _navigateToJaimini(context, profile),
      ),
      AstrologyToolItem(
        title: 'KP System (Krishnamurti Padhdhati)',
        subtitle: 'House cusps and sub-lords',
        icon: Icons.layers_rounded,
        color: AppColors.secondary,
        tint: AstroTint.indigo,
        onTap: () => _navigateToKP(context, profile),
      ),
      AstrologyToolItem(
        title: 'Varshaphala (Solar Return)',
        subtitle: 'Your chart for the year',
        icon: Icons.wb_sunny_rounded,
        color: AppColors.secondary,
        tint: AstroTint.indigo,
        onTap: () => _navigateToVarshaphala(context, profile),
      ),
      AstrologyToolItem(
        title: 'Prashna (Horary Astrology)',
        subtitle: 'Ask a question, get a chart',
        icon: Icons.help_outline_rounded,
        color: AppColors.secondary,
        tint: AstroTint.indigo,
        onTap: () => _navigateToPrashna(context),
      ),
      AstrologyToolItem(
        title: 'Special Lagnas & Upagrahas',
        subtitle: 'Extra sensitive points',
        icon: Icons.flare_rounded,
        color: AppColors.secondary,
        tint: AstroTint.indigo,
        onTap: () => _navigateToSpecialPoints(context, profile),
      ),
    ];
  }

  // ==========================================
  // SECTION 5: MATCHMAKING & COMPATIBILITY
  // ==========================================
  List<AstrologyToolItem> _matchmakingItems(BuildContext context) {
    return [
      AstrologyToolItem(
        title: 'Kundli Matchmaking (Guna Milan)',
        subtitle: 'Check how well two charts match',
        icon: Icons.favorite_rounded,
        color: AppColors.tintRoseText,
        tint: AstroTint.rose,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const MatchmakingScreen()),
          );
        },
      ),
    ];
  }
}

/// A titled group of hub tiles: serif heading, quiet subtitle, tinted tiles.
class _HubSection extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<AstrologyToolItem> items;

  const _HubSection({required this.title, this.subtitle, required this.items});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AstroSectionHeading(title, subtitle: subtitle, padding: const EdgeInsets.only(left: 2, bottom: 12)),
          AstrologyToolGrid(items: items),
        ],
      ),
    );
  }
}

/// The one hero on the hub: a gradient invitation to open the birth chart.
class _FeaturedToolCard extends StatelessWidget {
  final AstrologyToolItem item;

  const _FeaturedToolCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: AstroGradientCard(
        onTap: item.onTap,
        padding: const EdgeInsets.fromLTRB(20, 20, 16, 20),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: AppTypography.headlineLarge.copyWith(fontSize: 22, color: Colors.white, height: 1.2),
                  ),
                  const SizedBox(height: 6),
                  if (item.subtitle != null)
                    Text(
                      item.subtitle!,
                      style: AppTypography.rowSubtitle.copyWith(color: AppColors.textInverseSecondary),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.08),
                border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
              ),
              child: Icon(item.icon, color: AppColors.gold, size: 28),
            ),
            const SizedBox(width: 4),
            Icon(AstroIcons.chevron(context), color: Colors.white.withValues(alpha: 0.7)),
          ],
        ),
      ),
    );
  }
}
