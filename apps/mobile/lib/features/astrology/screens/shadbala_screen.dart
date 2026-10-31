import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_gradients.dart';
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
      backgroundColor: AppColors.canvas,
      appBar: AstroAppBar(
        title: 'Shadbala (षड्बल)',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.midnightNavy),
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
            style: TextStyle(fontSize: 12.5, height: 1.45, color: AppColors.textDark),
          ),
        ),
      ],
    );
  }

  Widget _buildPlanetSelector(List<PlanetShadbalaModel> planets) {
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

          return InkWell(
            onTap: () => setState(() => _selectedPlanet = p.planet.toUpperCase()),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.midnightNavy : AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? AppColors.gold : AppColors.cardBorder,
                  width: isSelected ? 1.5 : 1.0,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  PlanetChip(planetName: p.planet, isCompact: true),
                  const SizedBox(width: 8),
                  Text(
                    '#${p.rank}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.gold : AppColors.deepIndigo,
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
    final bool isStrong = p.isStrong;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      decoration: BoxDecoration(
        gradient: AppGradients.heroCosmic,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
        boxShadow: const [
          BoxShadow(
            color: AppColors.cardShadowWarm,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              PlanetChip(planetName: p.planet, isCompact: true),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${p.planet} Shadbala',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Rank #${p.rank} of 7 Grahas',
                      style: const TextStyle(fontSize: 11.5, color: AppColors.goldLight),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: isStrong
                      ? const Color(0xFF2E7D32).withValues(alpha: 0.25)
                      : const Color(0xFFC62828).withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isStrong ? const Color(0xFF66BB6A) : const Color(0xFFEF5350),
                    width: 1,
                  ),
                ),
                child: Text(
                  isStrong ? 'STRONG (≥1.0)' : 'DEFICIENT (<1.0)',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: isStrong ? const Color(0xFFA5D6A7) : const Color(0xFFFFCDD2),
                  ),
                ),
              ),
            ],
          ),

          const Divider(height: 20, color: Colors.white24),

          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Strength', style: TextStyle(fontSize: 10.5, color: AppColors.lavenderMuted)),
                    const SizedBox(height: 2),
                    Text(
                      '${p.totalShashtiamsas.toStringAsFixed(1)} Virupas',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${p.totalRupas.toStringAsFixed(2)} Rupas',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.goldLight),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Required Min', style: TextStyle(fontSize: 10.5, color: AppColors.lavenderMuted)),
                    const SizedBox(height: 2),
                    Text(
                      '${p.minimumRequirement.toStringAsFixed(1)} Virupas',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Ratio: ${(p.ratio * 100).toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: isStrong ? const Color(0xFFA5D6A7) : const Color(0xFFFFCDD2),
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
          _buildStrengthComponentRow('1. Sthana Bala (Positional)', p.sthanaBala.total, 180.0),
          _buildStrengthComponentRow('2. Dig Bala (Directional)', p.digBala, 60.0),
          _buildStrengthComponentRow('3. Kala Bala (Temporal)', p.kalaBala.total, 120.0),
          _buildStrengthComponentRow('4. Cheshta Bala (Motional)', p.cheshtaBala, 60.0),
          _buildStrengthComponentRow('5. Naisargika Bala (Natural)', p.naisargikaBala, 60.0),
          _buildStrengthComponentRow('6. Drik Bala (Aspectual)', p.drikBala, 60.0, showBorder: false),
        ],
      ),
    );
  }

  Widget _buildStrengthComponentRow(String label, double value, double benchmark, {bool showBorder = true}) {
    final double progress = (value / (benchmark > 0 ? benchmark : 1.0)).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        border: showBorder ? const Border(bottom: BorderSide(color: AppColors.cardBorder, width: 0.8)) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textDark),
                ),
              ),
              Text(
                '${value.toStringAsFixed(1)} V',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.midnightNavy),
              ),
            ],
          ),
          const SizedBox(height: 5),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.cardSurfaceParchment,
              valueColor: AlwaysStoppedAnimation<Color>(
                progress >= 0.7 ? AppColors.deepIndigo : AppColors.gold,
              ),
            ),
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
          final isStrong = p.isStrong;
          return [
            Text(
              '#${p.rank}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.deepIndigo),
              textAlign: TextAlign.center,
            ),
            PlanetChip(planetName: p.planet, isCompact: true),
            Text(
              p.totalRupas.toStringAsFixed(2),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDark),
              textAlign: TextAlign.center,
            ),
            Text(
              '${(p.ratio * 100).toStringAsFixed(0)}%',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: isStrong ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
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

