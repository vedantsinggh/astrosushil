import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/strength_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/expandable_astrology_card.dart';
import '../widgets/planet_chip.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen presenting Shadbala (Sixfold Planetary Strength)
/// Evaluated deterministically via Fastify backend /astrology/strength
class ShadbalaScreen extends ConsumerStatefulWidget {
  const ShadbalaScreen({super.key});

  @override
  ConsumerState<ShadbalaScreen> createState() => _ShadbalaScreenState();
}

class _ShadbalaScreenState extends ConsumerState<ShadbalaScreen> {
  String _selectedPlanet = 'SUN';

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Shadbala (षड्बल)',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.primary),
            tooltip: 'About Shadbala',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Shadbala measures the 6-fold astronomical strength of the 7 classical grahas in Virupas (Shashtiamsas) and Rupas.',
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
                            message: 'Select or create a birth profile to calculate 6-fold Shadbala planetary potencies.',
                            actionLabel: 'Add Birth Profile',
                            onAction: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                              );
                            },
                          ),
                        ),
                      )
                    : ref.watch(activeProfileShadbalaProvider).when(
                          loading: () => const AstrologyLoadingState(
                            message: 'Calculating Sthana, Dig, Kala, Cheshta, Naisargika & Drik Bala...',
                          ),
                          error: (err, stack) => AstrologyErrorState(
                            error: err,
                            customMessage: 'Failed to calculate Shadbala',
                            onRetry: () => ref.invalidate(activeProfileStrengthProvider),
                          ),
                          data: (report) => report == null
                              ? const Center(child: Text('No Shadbala data available'))
                              : _buildShadbalaContent(context, report),
                        ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildShadbalaContent(BuildContext context, ShadbalaReportModel report) {
    final rankedList = report.summary.isNotEmpty ? report.summary : report.planets.values.toList();
    final selectedShadbala = report.planets[_selectedPlanet] ?? rankedList.firstOrNull;

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainShadbalaTitle,
          whatIsText: context.l10n.explainShadbalaWhatIs,
          howToReadText: context.l10n.explainShadbalaHowToRead,
        ),
        const SizedBox(height: 14),

        // 1. HORIZONTAL PLANET SELECTOR
        _buildPlanetSelector(rankedList),
        const SizedBox(height: 14),

        // SUSHIL SIR CONTEXTUAL EXPLAINER ENTRYPOINT
        SushilExplainerButton(
          contextData: _buildShadbalaExplanationContext(report, selectedShadbala, rankedList),
          label: 'Let Sushil Sir explain this Strength',
          isCompact: false,
        ),
        const SizedBox(height: 14),

        // 2. SELECTED PLANET HERO CARD
        if (selectedShadbala != null)
          _buildSelectedPlanetHero(selectedShadbala),
        const SizedBox(height: 14),

        // 3. SIX-FOLD BREAKDOWN CARD
        if (selectedShadbala != null)
          _buildSixfoldBreakdownCard(selectedShadbala),
        const SizedBox(height: 14),

        // 4. ALL 7 PLANETS SHADBALA RANKING TABLE
        _buildRankingTable(rankedList),
        const SizedBox(height: 14),

        // 5. CLASSICAL SHADBALA GUIDE ACCORDION
        const ExpandableAstrologyCard(
          title: 'The Six Strengths Explained',
          subtitle: 'Classical Parashari components of Shadbala',
          icon: Icons.menu_book_rounded,
          initiallyExpanded: false,
          expandedChild: Text(
            '• Sthana Bala (Positional): Evaluates sign dignity, exaltation, and divisional harmonic placement.\n'
            '• Dig Bala (Directional): Measures cardinal angular potency (e.g. Jupiter/Mercury in 1st, Sun/Mars in 10th).\n'
            '• Kala Bala (Temporal): Strength derived from time of day, lunar fortnight, planetary hour, and weekday.\n'
            '• Cheshta Bala (Motional): Derived from planetary speed, retrograde status, and stationary points.\n'
            '• Naisargika Bala (Natural): Inherent astronomical luminosity (Sun is brightest, Saturn least).\n'
            '• Drik Bala (Aspectual): Net benefic vs. malefic aspects cast upon the planet.',
            style: TextStyle(fontSize: 12.5, height: 1.45, color: AppColors.primary),
          ),
        ),
      ],
    );
  }

  Widget _buildPlanetSelector(List<PlanetShadbalaModel> planets) {
    return SizedBox(
      height: 42,
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
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.lightSurface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.lightBorder,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  PlanetChip(planetName: p.planet, isCompact: true),
                  const SizedBox(width: 6),
                  Text(
                    '#${p.rank}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.premiumAccent : AppColors.secondary,
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

  Widget _buildSelectedPlanetHero(PlanetShadbalaModel p) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
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
              PlanetChip(planetName: p.planet, isCompact: false),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${p.planet} Shadbala',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    Text(
                      'Rank #${p.rank} of 7 Grahas',
                      style: const TextStyle(fontSize: 12, color: AppColors.lightTextMuted),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (p.isStrong ? AppColors.success : AppColors.error).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  p.isStrong ? 'STRONG (≥1.0)' : 'DEFICIENT (<1.0)',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: p.isStrong ? AppColors.success : AppColors.error,
                  ),
                ),
              ),
            ],
          ),

          const Divider(height: 20, color: AppColors.lightBorder),

          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Strength', style: TextStyle(fontSize: 11, color: AppColors.lightTextMuted)),
                    Text(
                      '${p.totalShashtiamsas.toStringAsFixed(1)} Virupas',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    Text(
                      '${p.totalRupas.toStringAsFixed(2)} Rupas',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.secondary),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Required Min', style: TextStyle(fontSize: 11, color: AppColors.lightTextMuted)),
                    Text(
                      '${p.minimumRequirement.toStringAsFixed(1)} Virupas',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    Text(
                      'Ratio: ${(p.ratio * 100).toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: p.isStrong ? AppColors.success : AppColors.error,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSixfoldBreakdownCard(PlanetShadbalaModel p) {
    return AstrologySectionCard(
      title: 'Six-Fold Strength Components',
      subtitle: 'Values in Virupas (Shashtiamsas)',
      icon: Icons.shield_rounded,
      child: Column(
        children: [
          AstrologyInfoRow(
            label: '1. Sthana Bala (Positional)',
            value: '${p.sthanaBala.total.toStringAsFixed(1)} V',
            isBold: true,
          ),
          AstrologyInfoRow(
            label: '2. Dig Bala (Directional)',
            value: '${p.digBala.toStringAsFixed(1)} V',
            isBold: true,
          ),
          AstrologyInfoRow(
            label: '3. Kala Bala (Temporal)',
            value: '${p.kalaBala.total.toStringAsFixed(1)} V',
            isBold: true,
          ),
          AstrologyInfoRow(
            label: '4. Cheshta Bala (Motional)',
            value: '${p.cheshtaBala.toStringAsFixed(1)} V',
            isBold: true,
          ),
          AstrologyInfoRow(
            label: '5. Naisargika Bala (Natural)',
            value: '${p.naisargikaBala.toStringAsFixed(1)} V',
            isBold: true,
          ),
          AstrologyInfoRow(
            label: '6. Drik Bala (Aspectual)',
            value: '${p.drikBala.toStringAsFixed(1)} V',
            isBold: true,
            showBorder: false,
          ),
        ],
      ),
    );
  }

  Widget _buildRankingTable(List<PlanetShadbalaModel> planets) {
    return AstrologySectionCard(
      title: 'Shadbala Planetary Ranking',
      subtitle: 'Comparative summary of all 7 classical grahas',
      icon: Icons.leaderboard_rounded,
      child: AstrologyDataTable(
        columns: const [
          AstrologyTableColumn(header: 'Rank', flex: 1, alignment: TextAlign.center),
          AstrologyTableColumn(header: 'Graha', flex: 3),
          AstrologyTableColumn(header: 'Rupas', flex: 2, alignment: TextAlign.center),
          AstrologyTableColumn(header: 'Ratio', flex: 2, alignment: TextAlign.right),
        ],
        rows: planets.map((p) {
          return [
            Text(
              '#${p.rank}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary),
              textAlign: TextAlign.center,
            ),
            PlanetChip(planetName: p.planet, isCompact: true),
            Text(
              p.totalRupas.toStringAsFixed(2),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
            Text(
              '${(p.ratio * 100).toStringAsFixed(0)}%',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: p.isStrong ? AppColors.success : AppColors.error,
              ),
              textAlign: TextAlign.right,
            ),
          ];
        }).toList(),
      ),
    );
  }

  ExplanationContext _buildShadbalaExplanationContext(
    ShadbalaReportModel report,
    PlanetShadbalaModel? selectedShadbala,
    List<PlanetShadbalaModel> rankedList,
  ) {
    final strongest = rankedList.firstOrNull;
    final weakest = rankedList.lastOrNull;

    return ExplanationContext(
      feature: 'shadbala',
      screenTitle: 'Planetary Strength (Shadbala)',
      purpose: 'Explain sixfold planetary potencies, strongest planets, and practical life strengths',
      astrologyData: {
        'selectedPlanet': selectedShadbala != null
            ? {
                'planet': selectedShadbala.planet,
                'totalRupas': selectedShadbala.totalRupas,
                'ratio': selectedShadbala.ratio,
                'rank': selectedShadbala.rank,
                'isStrong': selectedShadbala.isStrong,
                'sthanaBala': selectedShadbala.sthanaBala.total,
                'digBala': selectedShadbala.digBala,
                'kalaBala': selectedShadbala.kalaBala.total,
                'cheshtaBala': selectedShadbala.cheshtaBala,
                'naisargikaBala': selectedShadbala.naisargikaBala,
                'drikBala': selectedShadbala.drikBala,
              }
            : null,
        'allPlanets': rankedList
            .map((p) => {
                  'planet': p.planet,
                  'totalRupas': p.totalRupas,
                  'ratio': p.ratio,
                  'rank': p.rank,
                  'isStrong': p.isStrong,
                })
            .toList(),
      },
      importantValues: {
        'strongestPlanet': strongest?.planet,
        'weakestPlanet': weakest?.planet,
        'selectedPlanet': selectedShadbala?.planet,
      },
    );
  }
}

