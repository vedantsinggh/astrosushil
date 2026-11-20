import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/strength_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/planet_chip.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Readable green / red for text on light surfaces.
const Color _kGood = Color(0xFF047857);
const Color _kBad = Color(0xFFB91C1C);

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

    return AstroPage(
      title: 'Shadbala (षड्बल)',
      actions: [
        AstroNavAction(
          icon: Icons.info_outline_rounded,
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
              message: 'Select or create a birth profile to calculate 6-fold Shadbala planetary potencies.',
              actionLabel: 'Add Birth Profile',
              onAction: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
            )
          else
            ref.watch(activeProfileShadbalaProvider).when(
                  loading: () => const AstrologyLoadingState(
                    message: 'Calculating Sthana, Dig, Kala, Cheshta, Naisargika & Drik Bala...',
                  ),
                  error: (err, stack) => AstrologyErrorState(
                    error: err,
                    customMessage: 'Failed to calculate Shadbala',
                    onRetry: () => ref.invalidate(activeProfileStrengthProvider),
                  ),
                  data: (report) => report == null
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Text('No Shadbala data available', style: kAdvBody, textAlign: TextAlign.center),
                        )
                      : _buildShadbalaContent(context, report),
                ),
        ],
      ),
    );
  }

  Widget _buildShadbalaContent(BuildContext context, ShadbalaReportModel report) {
    final rankedList = report.summary.isNotEmpty ? report.summary : report.planets.values.toList();
    final selectedShadbala = report.planets[_selectedPlanet] ?? rankedList.firstOrNull;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. PLANET SELECTOR
        _buildPlanetSelector(rankedList),
        const SizedBox(height: kAdvGap),

        // 2. AT-A-GLANCE: SELECTED PLANET
        if (selectedShadbala != null) ...[
          _buildSelectedPlanetHero(selectedShadbala),
          const SizedBox(height: kAdvGap),
        ],

        // SUSHIL SIR CONTEXTUAL EXPLAINER ENTRYPOINT
        SushilExplainerButton(
          contextData: _buildShadbalaExplanationContext(report, selectedShadbala, rankedList),
          label: 'Let Sushil Sir explain this Strength',
          isCompact: false,
        ),
        const SizedBox(height: kAdvGap),

        // 3. SIX-FOLD BREAKDOWN CARD
        if (selectedShadbala != null) ...[
          _buildSixfoldBreakdownCard(selectedShadbala),
          const SizedBox(height: kAdvGap),
        ],

        // 4. ALL 7 PLANETS RANKING (COLLAPSED)
        _buildRankingTable(rankedList),
        const SizedBox(height: 12),

        // 5. CLASSICAL SHADBALA GUIDE (COLLAPSED)
        const AdvDetailsExpander(
          title: 'The Six Strengths Explained',
          subtitle: 'Classical Parashari components of Shadbala',
          icon: Icons.menu_book_rounded,
          child: Text(
            '• Sthana Bala (Positional): Evaluates sign dignity, exaltation, and divisional harmonic placement.\n'
            '• Dig Bala (Directional): Measures cardinal angular potency (e.g. Jupiter/Mercury in 1st, Sun/Mars in 10th).\n'
            '• Kala Bala (Temporal): Strength derived from time of day, lunar fortnight, planetary hour, and weekday.\n'
            '• Cheshta Bala (Motional): Derived from planetary speed, retrograde status, and stationary points.\n'
            '• Naisargika Bala (Natural): Inherent astronomical luminosity (Sun is brightest, Saturn least).\n'
            '• Drik Bala (Aspectual): Net benefic vs. malefic aspects cast upon the planet.',
            style: kAdvBody,
          ),
        ),
        const SizedBox(height: kAdvGap),

        // 6. LEARN MORE
        AstrologyExplanationCard(
          title: context.l10n.explainShadbalaTitle,
          whatIsText: context.l10n.explainShadbalaWhatIs,
          howToReadText: context.l10n.explainShadbalaHowToRead,
        ),
      ],
    );
  }

  Widget _buildPlanetSelector(List<PlanetShadbalaModel> planets) {
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
                            '#${p.rank}',
                            style: kAdvSecondary.copyWith(fontWeight: FontWeight.w700, color: AppColors.primary),
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

  Widget _buildSelectedPlanetHero(PlanetShadbalaModel p) {
    final bool isStrong = p.isStrong;

    return AdvSummaryCard(
      label: 'Rank #${p.rank} of 7 Grahas',
      icon: Icons.leaderboard_rounded,
      title: '${p.planet} Shadbala',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AdvBadge(
            isStrong ? 'Strong (≥1.0)' : 'Deficient (<1.0)',
            color: AppColors.primary,
            background: isStrong ? AppColors.successBorder : AppColors.errorBorder,
          ),
          const SizedBox(height: 12),
          AdvStatGrid(
            onDark: true,
            stats: [
              AdvStat(
                label: 'Total Strength',
                value: '${p.totalShashtiamsas.toStringAsFixed(1)} Virupas',
                caption: '${p.totalRupas.toStringAsFixed(2)} Rupas',
                accent: AppColors.gold,
              ),
              AdvStat(
                label: 'Required Min',
                value: '${p.minimumRequirement.toStringAsFixed(1)} Virupas',
                caption: 'Ratio: ${(p.ratio * 100).toStringAsFixed(0)}%',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSixfoldBreakdownCard(PlanetShadbalaModel p) {
    return AdvSection(
      title: 'Six-Fold Strength Components',
      subtitle: 'Values in Virupas (Shashtiamsas)',
      icon: Icons.shield_rounded,
      tint: AstroTint.sage,
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
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        border: showBorder ? const Border(bottom: BorderSide(color: AppColors.cardBorderSubtle)) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(label, style: kAdvBody.copyWith(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(width: 8),
              Text(
                '${value.toStringAsFixed(1)} V',
                style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: AppColors.cardSurfaceParchment,
              valueColor: AlwaysStoppedAnimation<Color>(
                progress >= 0.7 ? AppColors.secondary : AppColors.gold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankingTable(List<PlanetShadbalaModel> planets) {
    return AdvDetailsExpander(
      title: 'Shadbala Planetary Ranking',
      subtitle: 'Comparative summary of all 7 classical grahas',
      icon: Icons.leaderboard_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: planets.map((p) {
          final isStrong = p.isStrong;
          return AdvRowCard(
            title: '#${p.rank}  ${p.planet}',
            highlight: p.planet.toUpperCase() == _selectedPlanet.toUpperCase(),
            badge: AdvBadge(
              '${(p.ratio * 100).toStringAsFixed(0)}%',
              color: isStrong ? _kGood : _kBad,
            ),
            facts: [
              MapEntry('Rupas', p.totalRupas.toStringAsFixed(2)),
              MapEntry('Ratio', '${(p.ratio * 100).toStringAsFixed(0)}%'),
            ],
          );
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
