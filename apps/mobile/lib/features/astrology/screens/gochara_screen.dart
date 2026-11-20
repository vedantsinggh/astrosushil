import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../core/localization/locale_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/gochara_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/planet_chip.dart';
import '../widgets/astrology_explanation_card.dart';

/// Readable green / red for text on light surfaces.
const Color _kGood = Color(0xFF047857);
const Color _kBad = Color(0xFFB91C1C);

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

    return AstroPage(
      title: 'Gochara (गोचर / Transits)',
      actions: [
        AstroNavAction(
          icon: Icons.info_outline_rounded,
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ActiveBirthProfileSelector(
            isDark: false,
            onProfileChanged: (_) {},
          ),
          const SizedBox(height: kAdvGap),
          if (activeProfile == null)
            AstrologyEmptyState(
              title: 'No Active Birth Profile',
              message:
                  'Select or create a birth profile to calculate personalized Gochara transits relative to your natal Moon and Lagna.',
              actionLabel: 'Add Birth Profile',
              onAction: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
            )
          else
            ref.watch(gocharaForProfileProvider(activeProfile)).when(
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
        ],
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
        'planets': snapshot.planets.entries
            .map((e) => {
                  'planet': e.key,
                  'sign': e.value.rashiName,
                  'degree': e.value.degreeInRashi,
                  'isRetrograde': e.value.isRetrograde,
                  'houseFromMoon': snapshot.getMoonRelationship(e.key)?.houseFromMoon,
                  'houseFromLagna': snapshot.getLagnaRelationship(e.key)?.houseFromLagna,
                })
            .toList(),
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. PLANET SELECTOR
        _buildPlanetSelector(planets),
        const SizedBox(height: kAdvGap),

        // 2. AT-A-GLANCE: SELECTED PLANET TRANSIT
        if (selectedPos != null) ...[
          _buildPlanetTransitHero(snapshot, selectedPos, moonRel, lagnaRel),
          const SizedBox(height: kAdvGap),
        ],

        // Sushil Sir Explainer Button
        SushilExplainerButton(
          contextBuilder: () => _buildExplanationContext(snapshot, profile),
          poseAsset: AppAssets.sushilExplaining,
        ),
        const SizedBox(height: kAdvGap),

        // 3. TRANSIT INTELLIGENCE
        _buildTransitIntelligenceSection(selectedPos, moonRel, lagnaRel, avDetail, kakshaDetail),
        const SizedBox(height: kAdvGap),

        // 4. ALL 9 PLANETS (COLLAPSED)
        _buildAllTransitsTable(snapshot),
        const SizedBox(height: 12),

        // 5. CLASSICAL RULES (COLLAPSED)
        const AdvDetailsExpander(
          title: 'Classical Gochara Rules',
          subtitle: 'How transits are read from Moon & Lagna',
          icon: Icons.menu_book_rounded,
          child: Text(
            'Classical Vedic Gochara principles:\n\n'
            '• Moon Reference (Chandra Lagna): Gochara is traditionally evaluated from the natal Moon sign to gauge mental and physical experiences.\n'
            '• Ascendant Reference (Janma Lagna): Indicates actual material events, health vitality, and environmental circumstances.\n'
            '• Ashtakavarga Support: A transit through a sign with 4+ BAV bindus and 28+ SAV points manifests benefic results.\n'
            '• Kaksha Division: Each sign is partitioned into 8 Kakshas (3°45′ each). A transit delivers results when passing through a Kaksha ruled by a planet contributing a natal bindu.',
            style: kAdvBody,
          ),
        ),
        const SizedBox(height: kAdvGap),

        // 6. LEARN MORE
        AstrologyExplanationCard(
          title: context.l10n.explainGocharaTitle,
          whatIs: context.l10n.explainGocharaWhatIs,
          howToRead: context.l10n.explainGocharaHowToRead,
        ),
      ],
    );
  }

  String _calculatedAt(TransitSnapshotModel snapshot) {
    final raw = snapshot.localIso.isNotEmpty ? snapshot.localIso : snapshot.utcIso;
    final displayDate = raw.replaceFirst('T', ' ');
    final trimmed = displayDate.length > 16 ? displayDate.substring(0, 16) : displayDate;
    return 'Calculated at: $trimmed (${snapshot.timezone})';
  }

  Widget _buildPlanetSelector(List<TransitPlanetPositionModel> planets) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Choose a planet', style: kAdvTitle),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: planets.map((p) {
            final isSelected = p.planet.toUpperCase() == _selectedPlanet.toUpperCase();
            return Semantics(
              button: true,
              selected: isSelected,
              child: Material(
                color: isSelected ? AppColors.gold : AppColors.cardSurface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: isSelected ? AppColors.gold : AppColors.cardBorder),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => setState(() => _selectedPlanet = p.planet.toUpperCase()),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          PlanetChip(planetName: p.planet, isCompact: true),
                          const SizedBox(width: 6),
                          Text(
                            p.rashiName.substring(0, p.rashiName.length > 3 ? 3 : p.rashiName.length),
                            style: kAdvSecondary.copyWith(
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPlanetTransitHero(
    TransitSnapshotModel snapshot,
    TransitPlanetPositionModel p,
    TransitToMoonRelationshipModel? moonRel,
    TransitToLagnaRelationshipModel? lagnaRel,
  ) {
    return AdvSummaryCard(
      label: 'Real-Time Sidereal Transits',
      icon: Icons.public_rounded,
      title: 'Transit ${p.planet}',
      subtitle: '${p.nakshatraName} • Pada ${p.pada}\n${_calculatedAt(snapshot)}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (p.isRetrograde || p.isCombust) ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (p.isRetrograde) const AdvBadge('Retrograde', color: AppColors.primary, background: AppColors.saffronLight),
                if (p.isCombust) const AdvBadge('Combust', color: AppColors.primary, background: AppColors.errorBorder),
              ],
            ),
            const SizedBox(height: 12),
          ],
          AdvStatGrid(
            onDark: true,
            stats: [
              AdvStat(label: 'Current Sign', value: p.rashiName, caption: p.formattedDegree, accent: AppColors.gold),
              AdvStat(
                label: 'From Moon',
                value: moonRel != null ? 'H-${moonRel.houseFromMoon}' : 'H-${p.house}',
                caption: moonRel != null ? '${moonRel.signDistance} signs' : 'Direct',
              ),
              AdvStat(
                label: 'From Lagna',
                value: lagnaRel != null ? 'H-${lagnaRel.houseFromLagna}' : 'H-${p.house}',
                caption: lagnaRel != null ? '${lagnaRel.signDistance} signs' : 'Direct',
              ),
            ],
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
    return AdvSection(
      title: 'Transit Intelligence & Kaksha',
      subtitle: 'Ashtakavarga support & Kaksha partition metrics',
      icon: Icons.shield_outlined,
      tint: AstroTint.sage,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (avDetail == null && kakshaDetail == null) const AdvNote('No Ashtakavarga or Kaksha details for this planet.'),
          if (avDetail != null) ...[
            AdvInfoRow(
              label: 'BAV Bindus in Transit Sign',
              value: '${avDetail.bavPoints} Points',
              valueColor: avDetail.isBavFavorable ? _kGood : _kBad,
              note: avDetail.isBavFavorable ? 'Benefic (≥4)' : 'Challenging (<4)',
            ),
            AdvInfoRow(
              label: 'SAV Total in Transit Sign',
              value: '${avDetail.savPoints}',
              valueColor: avDetail.isSavFavorable ? _kGood : AppColors.secondary,
              note: avDetail.isSavFavorable ? 'Supportive (≥28)' : 'Low (<28)',
            ),
          ],
          if (kakshaDetail != null) ...[
            AdvInfoRow(
              label: 'Active Kaksha Partition',
              value: 'Kaksha ${kakshaDetail.kakshaIndex}',
              note: 'Lord: ${kakshaDetail.kakshaRuler}',
            ),
            AdvInfoRow(
              label: 'Kaksha Bindu Activation',
              value: kakshaDetail.hasNatalBindu ? 'Benefic Triggered' : 'No Natal Bindu',
              valueColor: kakshaDetail.hasNatalBindu ? _kGood : AppColors.textSecondary,
              note: kakshaDetail.hasNatalBindu ? 'Active (Natal Bindu Present)' : 'Inactive',
              showDivider: false,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAllTransitsTable(TransitSnapshotModel snapshot) {
    final planets = snapshot.orderedPlanets;

    return AdvDetailsExpander(
      title: 'Current Planetary Positions',
      subtitle: 'All 9 grahas in real-time sidereal zodiac',
      icon: Icons.grid_view_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: planets.map((p) {
          final moonRel = snapshot.getMoonRelationship(p.planet);
          return AdvRowCard(
            title: p.planet,
            badge: p.isRetrograde ? const AdvBadge('R') : null,
            highlight: p.planet.toUpperCase() == _selectedPlanet.toUpperCase(),
            facts: [
              MapEntry('Sign', p.rashiName),
              MapEntry('Degree', p.formattedDegree),
              MapEntry('From Moon', moonRel != null ? 'H-${moonRel.houseFromMoon}' : 'H-${p.house}'),
            ],
          );
        }).toList(),
      ),
    );
  }
}
