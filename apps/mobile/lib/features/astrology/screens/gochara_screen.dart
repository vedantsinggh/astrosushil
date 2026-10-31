import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_gradients.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../core/localization/locale_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/gochara_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/degree_value_display.dart';
import '../widgets/expandable_astrology_card.dart';
import '../widgets/planet_chip.dart';
import '../widgets/sign_chip.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen presenting Gochara (Planetary Transits) relative to natal chart
/// Calculated deterministically via Fastify backend /astrology/gochara
class GocharaScreen extends ConsumerStatefulWidget {
  const GocharaScreen({super.key});

  @override
  ConsumerState<GocharaScreen> createState() => _GocharaScreenState();
}

class _GocharaScreenState extends ConsumerState<GocharaScreen> {
  String _selectedPlanet = 'SUN';

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AstroAppBar(
        title: 'Gochara (गोचर / Transits)',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.primary),
            tooltip: 'About Gochara',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Gochara evaluates real-time sidereal planetary transits relative to your natal Moon, Ascendant, and Ashtakavarga Kakshas.',
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
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
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
                            message: 'Select or create a birth profile to calculate personalized Gochara transits relative to your natal Moon and Lagna.',
                            actionLabel: 'Add Birth Profile',
                            onAction: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                              );
                            },
                          ),
                        ),
                      )
                    : ref.watch(gocharaForProfileProvider(activeProfile)).when(
                          loading: () => const AstrologyLoadingState(
                            message: 'Calculating Gochara planetary transits & Kakshas...',
                          ),
                          error: (err, stack) => AstrologyErrorState(
                            error: err,
                            customMessage: 'Failed to calculate transit snapshot',
                            onRetry: () => ref.invalidate(gocharaForProfileProvider(activeProfile)),
                          ),
                          data: (snapshot) => _buildGocharaContent(context, activeProfile, snapshot),
                        ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  ExplanationContext _buildExplanationContext(
    TransitSnapshotModel snapshot,
    BirthProfileModel profile,
  ) {
    return ExplanationContext(
      feature: 'gochara',
      screenTitle: 'Gochara (Transits)',
      purpose: 'Explain the current real-time planetary transits relative to natal Moon and Ascendant for ${profile.name}.',
      astrologyData: {
        'transitDate': snapshot.localIso.isNotEmpty ? snapshot.localIso : snapshot.utcIso,
        'planets': snapshot.planets.entries.map((e) => {
          'planet': e.key,
          'sign': e.value.rashiName,
          'degree': e.value.degreeInRashi,
          'isRetrograde': e.value.isRetrograde,
          'houseFromMoon': snapshot.getMoonRelationship(e.key)?.houseFromMoon,
          'houseFromLagna': snapshot.getLagnaRelationship(e.key)?.houseFromLagna,
        }).toList(),
        'selectedPlanet': _selectedPlanet,
      },
      importantValues: {
        'selectedPlanet': _selectedPlanet,
        'selectedHouseFromMoon': snapshot.getMoonRelationship(_selectedPlanet)?.houseFromMoon,
      },
      userProfileContext: {
        'name': profile.name,
      },
    );
  }

  Widget _buildGocharaContent(
    BuildContext context,
    BirthProfileModel profile,
    TransitSnapshotModel snapshot,
  ) {
    final planets = snapshot.orderedPlanets;
    final selectedPos = snapshot.planets[_selectedPlanet] ?? planets.firstOrNull;
    final moonRel = snapshot.getMoonRelationship(_selectedPlanet);
    final lagnaRel = snapshot.getLagnaRelationship(_selectedPlanet);
    final avDetail = snapshot.getAshtakavargaDetail(_selectedPlanet);
    final kakshaDetail = snapshot.getKakshaDetail(_selectedPlanet);

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainGocharaTitle,
          whatIs: context.l10n.explainGocharaWhatIs,
          howToRead: context.l10n.explainGocharaHowToRead,
        ),
        const SizedBox(height: 12),

        // 1. CONTEXT BANNER
        _buildContextBanner(snapshot, profile),

        const SizedBox(height: 12),

        // Sushil Sir Explainer Button
        SushilExplainerButton(
          contextBuilder: () => _buildExplanationContext(snapshot, profile),
          poseAsset: AppAssets.sushilExplaining,
        ),

        const SizedBox(height: 14),

        // 2. HORIZONTAL PLANET SELECTOR
        _buildPlanetSelector(planets),
        const SizedBox(height: 14),

        // 3. SELECTED PLANET TRANSIT HERO CARD
        if (selectedPos != null)
          _buildPlanetTransitHero(selectedPos, moonRel, lagnaRel),
        const SizedBox(height: 14),

        // 4. TRANSIT INTELLIGENCE MATRIX
        _buildTransitIntelligenceSection(selectedPos, moonRel, lagnaRel, avDetail, kakshaDetail),
        const SizedBox(height: 14),

        // 5. ALL 9 PLANETS TRANSIT OVERVIEW TABLE
        _buildAllTransitsTable(snapshot),
        const SizedBox(height: 14),

        // 6. CLASSICAL SIGNIFICANCE ACCORDION
        const ExpandableAstrologyCard(
          title: 'Classical Gochara Rules',
          subtitle: 'Principles of transit interpretation from Moon & Lagna',
          icon: Icons.menu_book_rounded,
          initiallyExpanded: false,
          expandedChild: Text(
            'Classical Vedic Gochara principles:\n\n'
            '• Moon Reference (Chandra Lagna): Gochara is traditionally evaluated from the natal Moon sign to gauge mental and physical experiences.\n'
            '• Ascendant Reference (Janma Lagna): Indicates actual material events, health vitality, and environmental circumstances.\n'
            '• Ashtakavarga Support: A transit through a sign with 4+ BAV bindus and 28+ SAV points manifests benefic results.\n'
            '• Kaksha Division: Each sign is partitioned into 8 Kakshas (3°45′ each). A transit delivers results when passing through a Kaksha ruled by a planet contributing a natal bindu.',
            style: TextStyle(fontSize: 12.5, height: 1.45, color: AppColors.primary),
          ),
        ),
      ],
    );
  }

  Widget _buildContextBanner(TransitSnapshotModel snapshot, BirthProfileModel profile) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.public_rounded, size: 14, color: AppColors.secondary),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'Real-Time Sidereal Transits',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.primary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'ACTIVE',
                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.success),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.schedule_rounded, size: 12, color: AppColors.lightTextMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Calculated at: ${() {
                    final raw = snapshot.localIso.isNotEmpty ? snapshot.localIso : snapshot.utcIso;
                    final displayDate = raw.replaceFirst('T', ' ');
                    return displayDate.length > 16 ? displayDate.substring(0, 16) : displayDate;
                  }()} (${snapshot.timezone})',
                  style: const TextStyle(fontSize: 11, color: AppColors.lightTextMuted),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPlanetSelector(List<TransitPlanetPositionModel> planets) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: planets.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, index) {
          final p = planets[index];
          final isSelected = p.planet.toUpperCase() == _selectedPlanet.toUpperCase();

          return GestureDetector(
            onTap: () => setState(() => _selectedPlanet = p.planet.toUpperCase()),
            child: Container(
              constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.accentGold : AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? AppColors.accentGold : AppColors.cardBorder,
                  width: 1,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppColors.accentGold.withValues(alpha: 0.3),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  PlanetChip(planetName: p.planet, isCompact: true),
                  const SizedBox(width: 6),
                  Text(
                    p.rashiName.substring(0, p.rashiName.length > 3 ? 3 : p.rashiName.length),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected ? AppColors.textPrimaryDark : AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPlanetTransitHero(
    TransitPlanetPositionModel p,
    TransitToMoonRelationshipModel? moonRel,
    TransitToLagnaRelationshipModel? lagnaRel,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppGradients.heroCosmic,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.accentGold.withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Planet Name & Status Badges
          Row(
            children: [
              PlanetChip(planetName: p.planet, isCompact: false),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Transit ${p.planet}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${p.nakshatraName} • Pada ${p.pada}',
                      style: const TextStyle(fontSize: 12, color: AppColors.cardSurfaceParchment),
                    ),
                  ],
                ),
              ),
              if (p.isRetrograde)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    color: Colors.deepOrange.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.deepOrange.shade300, width: 0.5),
                  ),
                  child: const Text(
                    'RETROGRADE',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Colors.orangeAccent),
                  ),
                ),
              if (p.isCombust)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.redAccent, width: 0.5),
                  ),
                  child: const Text(
                    'COMBUST',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Colors.redAccent),
                  ),
                ),
            ],
          ),

          const Divider(height: 20, color: Colors.white24),

          // 3-Column Metrics: Position, From Moon, From Lagna
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'Current Sign',
                  value: p.rashiName,
                  subvalue: p.formattedDegree,
                  icon: Icons.explore_rounded,
                  color: AppColors.accentGold,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'From Moon',
                  value: moonRel != null ? 'H-${moonRel.houseFromMoon}' : 'H-${p.house}',
                  subvalue: moonRel != null ? '${moonRel.signDistance} signs' : 'Direct',
                  icon: Icons.nightlight_round,
                  color: const Color(0xFF90CAF9),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'From Lagna',
                  value: lagnaRel != null ? 'H-${lagnaRel.houseFromLagna}' : 'H-${p.house}',
                  subvalue: lagnaRel != null ? '${lagnaRel.signDistance} signs' : 'Direct',
                  icon: Icons.wb_twilight_rounded,
                  color: const Color(0xFFFFCC80),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required String subvalue,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 12, color: AppColors.primary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            subvalue,
            style: const TextStyle(fontSize: 10.5, color: AppColors.lightTextMuted),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildTransitIntelligenceSection(
    TransitPlanetPositionModel? pos,
    TransitToMoonRelationshipModel? moonRel,
    TransitToLagnaRelationshipModel? lagnaRel,
    TransitAshtakavargaDetailModel? avDetail,
    GocharaKakshaDetailModel? kakshaDetail,
  ) {
    return AstrologySectionCard(
      title: 'Transit Intelligence & Kaksha',
      subtitle: 'Ashtakavarga support & Kaksha partition metrics',
      icon: Icons.shield_outlined,
      child: Column(
        children: [
          if (avDetail != null) ...[
            AstrologyInfoRow(
              label: 'BAV Bindus in Transit Sign',
              value: '${avDetail.bavPoints} / 8',
              valueWidget: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${avDetail.bavPoints} Points',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: avDetail.isBavFavorable ? AppColors.success : AppColors.error,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: (avDetail.isBavFavorable ? AppColors.success : AppColors.error).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      avDetail.isBavFavorable ? 'BENEFIC (≥4)' : 'CHALLENGING (<4)',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: avDetail.isBavFavorable ? AppColors.success : AppColors.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            AstrologyInfoRow(
              label: 'SAV Total in Transit Sign',
              value: '${avDetail.savPoints} / 56',
              valueWidget: Text(
                '${avDetail.savPoints} ${avDetail.isSavFavorable ? "(Supportive ≥28)" : "(Low <28)"}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: avDetail.isSavFavorable ? AppColors.success : AppColors.secondary,
                ),
              ),
            ),
          ],
          if (kakshaDetail != null) ...[
            AstrologyInfoRow(
              label: 'Active Kaksha Partition',
              value: 'Kaksha ${kakshaDetail.kakshaIndex} (Lord: ${kakshaDetail.kakshaRuler})',
            ),
            AstrologyInfoRow(
              label: 'Kaksha Bindu Activation',
              value: kakshaDetail.hasNatalBindu ? 'Active (Natal Bindu Present)' : 'Inactive',
              valueWidget: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    kakshaDetail.hasNatalBindu ? Icons.check_circle_rounded : Icons.cancel_rounded,
                    size: 14,
                    color: kakshaDetail.hasNatalBindu ? AppColors.success : AppColors.lightTextMuted,
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      kakshaDetail.hasNatalBindu ? 'Benefic Triggered' : 'No Natal Bindu',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: kakshaDetail.hasNatalBindu ? AppColors.success : AppColors.lightTextMuted,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              showBorder: false,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAllTransitsTable(TransitSnapshotModel snapshot) {
    final planets = snapshot.orderedPlanets;

    return AstrologySectionCard(
      title: 'Current Planetary Positions',
      subtitle: 'All 9 grahas in real-time sidereal zodiac',
      icon: Icons.grid_view_rounded,
      child: AstrologyDataTable(
        columns: const [
          AstrologyTableColumn(header: 'Graha', flex: 3),
          AstrologyTableColumn(header: 'Sign', flex: 3),
          AstrologyTableColumn(header: 'Degree', flex: 3),
          AstrologyTableColumn(header: 'Moon-H', flex: 2, alignment: TextAlign.center),
        ],
        rows: planets.map((p) {
          final moonRel = snapshot.getMoonRelationship(p.planet);

          return [
            PlanetChip(planetName: p.planet, isCompact: true),
            SignChip(signName: p.rashiName, isCompact: true),
            DegreeValueDisplay(degree: p.degreeInRashi),
            Text(
              moonRel != null ? 'H-${moonRel.houseFromMoon}' : 'H-${p.house}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary),
              textAlign: TextAlign.center,
            ),
          ];
        }).toList(),
      ),
    );
  }
}
