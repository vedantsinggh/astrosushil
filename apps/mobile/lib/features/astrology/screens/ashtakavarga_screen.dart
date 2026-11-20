import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/ashtakavarga_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_tab_bar.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen presenting Vedic Ashtakavarga charts (SAV, BAV, Shodhana & Shodhya Pindas)
/// Evaluated deterministically via Fastify backend /astrology/ashtakavarga
class AshtakavargaScreen extends ConsumerStatefulWidget {
  const AshtakavargaScreen({super.key});

  @override
  ConsumerState<AshtakavargaScreen> createState() => _AshtakavargaScreenState();
}

class _AshtakavargaScreenState extends ConsumerState<AshtakavargaScreen> {
  int _selectedTabIndex = 0;
  String _selectedPlanet = 'SUN';

  static const _tabs = [
    AstrologyTabItem(label: 'Sarvashtakavarga (SAV)', icon: Icons.grid_view_rounded),
    AstrologyTabItem(label: 'Bhinnashtakavarga (BAV)', icon: Icons.auto_awesome_rounded),
    AstrologyTabItem(label: 'Shodhana & Pindas', icon: Icons.tune_rounded),
  ];

  static const _rashiNames = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces'
  ];

  static const _rashiSanskrit = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return AstroPage(
      title: 'Ashtakavarga (अष्टकवर्ग)',
      actions: [
        AstroNavAction(
          icon: Icons.info_outline_rounded,
          tooltip: 'About Ashtakavarga',
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Ashtakavarga evaluates 8-contributor benefic bindu distributions across 12 Rashis for all 7 classical grahas.',
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
          const SizedBox(height: 12),
          AstrologyTabBar(
            tabs: _tabs,
            selectedIndex: _selectedTabIndex,
            onTabSelected: (index) => setState(() => _selectedTabIndex = index),
          ),
          const SizedBox(height: kAdvGap),
          if (activeProfile == null)
            AstrologyEmptyState(
              title: 'No Active Birth Profile',
              message: 'Select or create a birth profile to calculate Sarvashtakavarga and Bhinnashtakavarga charts.',
              actionLabel: 'Add Birth Profile',
              onAction: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
            )
          else
            ref.watch(ashtakavargaForProfileProvider(activeProfile)).when(
                  loading: () => const AstrologyLoadingState(
                    message: 'Computing Ashtakavarga matrices, Shodhana & Pindas...',
                  ),
                  error: (err, stack) => AstrologyErrorState(
                    error: err,
                    customMessage: 'Failed to calculate Ashtakavarga',
                    onRetry: () => ref.invalidate(ashtakavargaForProfileProvider(activeProfile)),
                  ),
                  data: (ashtakavarga) => _buildTabContent(context, ashtakavarga),
                ),
        ],
      ),
    );
  }

  Widget _buildTabContent(BuildContext context, AshtakavargaResultModel report) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildSarvashtakavargaView(context, report.sav);
      case 1:
        return _buildBhinnashtakavargaView(report.bav);
      case 2:
        return _buildShodhanaAndPindasView(report);
      default:
        return _buildSarvashtakavargaView(context, report.sav);
    }
  }

  // ==========================================
  // TAB 1: SARVASHTAKAVARGA (SAV)
  // ==========================================
  Widget _buildSarvashtakavargaView(BuildContext context, SarvashtakavargaModel sav) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // At-a-glance total
        AdvSummaryCard(
          label: 'Sarvashtakavarga (SAV) Total',
          icon: Icons.stars_rounded,
          title: '${sav.grandTotal} Bindus',
          subtitle: 'Aggregated across all 7 classical planetary charts (benchmark: 337)',
          child: AdvStatGrid(
            onDark: true,
            stats: [
              AdvStat(label: 'Average per sign', value: (sav.grandTotal / 12).toStringAsFixed(1), accent: AppColors.gold),
            ],
          ),
        ),
        const SizedBox(height: kAdvGap),

        // SUSHIL SIR CONTEXTUAL EXPLAINER ENTRYPOINT
        SushilExplainerButton(
          contextData: _buildSavExplanationContext(sav),
          label: 'Let Sushil Sir explain this Ashtakavarga',
          isCompact: false,
        ),
        const SizedBox(height: kAdvGap),

        // 12-Sign SAV Grid
        AdvSection(
          title: 'Sign-Wise SAV Distribution',
          subtitle: 'Scores ≥28 denote supportive, high-vitality signs',
          icon: Icons.grid_3x3_rounded,
          tint: AstroTint.amber,
          child: _SignScoreGrid(
            cells: List.generate(12, (idx) {
              final score = sav.getScoreForRashi(idx + 1);
              final isHigh = score >= 28;
              final isAverage = score >= 25 && score < 28;
              return _SignScoreCell(
                name: _rashiNames[idx],
                sanskrit: _rashiSanskrit[idx],
                value: '$score',
                tier: isHigh
                    ? 'Strong'
                    : isAverage
                        ? 'Balanced'
                        : 'Low',
                color: isHigh
                    ? _kGood
                    : isAverage
                        ? AppColors.secondary
                        : _kBad,
              );
            }),
          ),
        ),
        const SizedBox(height: 12),

        // SAV Interpretation Summary
        const AdvDetailsExpander(
          title: 'SAV Scoring Guidelines',
          subtitle: 'Classical Parashari thresholds for houses and signs',
          icon: Icons.menu_book_rounded,
          child: Text(
            '• 30+ Points: Highly auspicious; supports expansive planetary transits and houses.\n'
            '• 28–29 Points: Balanced, steady energetic foundation.\n'
            '• 25–27 Points: Average strength; demands conscious karmic effort.\n'
            '• Under 25 Points: Sensitive sign; challenges manifest during major transits.',
            style: kAdvBody,
          ),
        ),
        const SizedBox(height: kAdvGap),

        // Learn more
        AstrologyExplanationCard(
          title: context.l10n.explainAshtakavargaTitle,
          whatIsText: context.l10n.explainAshtakavargaWhatIs,
          howToReadText: context.l10n.explainAshtakavargaHowToRead,
        ),
      ],
    );
  }

  // ==========================================
  // TAB 2: BHINNASHTAKAVARGA (BAV)
  // ==========================================
  Widget _buildBhinnashtakavargaView(Map<String, BhinnashtakavargaModel> bavMap) {
    const planets = AshtakavargaResultModel.classicalPlanets;
    final activeBav = bavMap[_selectedPlanet] ?? bavMap.values.firstOrNull;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Choose a planet', style: kAdvTitle),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: planets.map((p) {
            final isSelected = p == _selectedPlanet;
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
                  onTap: () => setState(() => _selectedPlanet = p),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48, minWidth: 64),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Text(
                        p,
                        textAlign: TextAlign.center,
                        style: kAdvBody.copyWith(
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: kAdvGap),
        if (activeBav != null) ...[
          // Planet BAV total
          AdvCard(
            child: Row(
              children: [
                const Icon(Icons.auto_awesome_rounded, color: AppColors.goldDark, size: 28),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${activeBav.planet} BAV Total', style: kAdvSecondary),
                      const SizedBox(height: 2),
                      Text(
                        '${activeBav.totalPoints} Benefic Bindus',
                        style: kAdvTitle.copyWith(fontSize: 22),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: kAdvGap),

          // 12-Sign BAV Grid
          AdvSection(
            title: '${activeBav.planet} Sign Distribution',
            subtitle: 'Scores ≥4 denote benefic transit support',
            icon: Icons.grid_view_rounded,
            tint: AstroTint.amber,
            child: _SignScoreGrid(
              cells: List.generate(12, (idx) {
                final score = activeBav.getScoreForRashi(idx + 1);
                final isFavorable = score >= 4;
                return _SignScoreCell(
                  name: _rashiNames[idx],
                  value: '$score / 8',
                  color: isFavorable ? _kGood : AppColors.textSecondary,
                  tier: isFavorable ? 'Benefic' : null,
                );
              }),
            ),
          ),
        ],
      ],
    );
  }

  // ==========================================
  // TAB 3: SHODHANA & SHODHYA PINDAS
  // ==========================================
  Widget _buildShodhanaAndPindasView(AshtakavargaResultModel report) {
    const planets = AshtakavargaResultModel.classicalPlanets;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Shodhya Pindas
        AdvSection(
          title: 'Shodhya Pinda Summary',
          subtitle: 'Pinda Sadhana (Rashi Pinda, Graha Pinda & Shodhya Pinda)',
          icon: Icons.account_balance_rounded,
          tint: AstroTint.sage,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < planets.length; i++)
                _buildPindaRow(planets[i], report.pinda[planets[i]], isLast: i == planets.length - 1),
            ],
          ),
        ),
        const SizedBox(height: kAdvGap),

        // Shodhana Reductions
        AdvSection(
          title: 'Shodhana (Reductions)',
          subtitle: 'Trikona & Ekadhipatya Shodhana reduced bindus',
          icon: Icons.tune_rounded,
          tint: AstroTint.violet,
          inCard: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: planets.map((p) {
              final shodhana = report.shodhana[p];
              return AdvRowCard(
                title: p,
                facts: [
                  MapEntry('Trikona total', shodhana?.totalTrikonaPoints != null ? '${shodhana!.totalTrikonaPoints}' : '—'),
                  MapEntry('Ekadhipatya total', shodhana?.totalEkadhipatyaPoints != null ? '${shodhana!.totalEkadhipatyaPoints}' : '—'),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildPindaRow(String planet, ShodhyaPindaModel? pinda, {required bool isLast}) {
    final rashi = pinda?.rashiPinda != null ? '${pinda!.rashiPinda}' : '—';
    final graha = pinda?.grahaPinda != null ? '${pinda!.grahaPinda}' : '—';
    final shodhya = pinda?.shodhyaPinda != null ? '${pinda!.shodhyaPinda}' : '—';
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: isLast ? null : const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.cardBorderSubtle))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(planet, style: kAdvBody.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text('Rashi Pinda $rashi · Graha Pinda $graha', style: kAdvSecondary),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text('Shodhya', style: kAdvSecondary),
              Text(shodhya, style: kAdvTitle.copyWith(fontSize: 20, color: AppColors.secondary)),
            ],
          ),
        ],
      ),
    );
  }

  ExplanationContext _buildSavExplanationContext(SarvashtakavargaModel sav) {
    return ExplanationContext(
      feature: 'ashtakavarga',
      screenTitle: 'Sarvashtakavarga (SAV)',
      purpose: 'Explain 8-contributor benefic bindu distributions, favorable signs, and transit vitality',
      astrologyData: {
        'grandTotal': sav.grandTotal,
        'signScores': sav.signs,
        'averagePerSign': (sav.grandTotal / 12).toStringAsFixed(1),
      },
      importantValues: {
        'grandTotal': sav.grandTotal,
        'benchmarkAverage': 28,
      },
    );
  }
}

/// Readable green / red for text on light surfaces.
const Color _kGood = Color(0xFF047857);
const Color _kBad = Color(0xFFB91C1C);

class _SignScoreCell {
  final String name;
  final String? sanskrit;
  final String value;
  final String? tier;
  final Color color;

  const _SignScoreCell({required this.name, this.sanskrit, required this.value, this.tier, required this.color});
}

/// Responsive 12-sign score grid: 3 columns on phones, 2 at very large text,
/// 4 or 6 on wider screens. Text wraps rather than shrinking.
class _SignScoreGrid extends StatelessWidget {
  final List<_SignScoreCell> cells;

  const _SignScoreGrid({required this.cells});

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(16) / 16;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        int columns = width >= 640 ? 6 : (width >= 420 ? 4 : 3);
        if (scale >= 1.6) columns = width >= 640 ? 3 : 2;
        const spacing = 8.0;
        final cellWidth = (width - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: cells.map((c) {
            return Container(
              width: cellWidth,
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
              decoration: BoxDecoration(
                color: c.color.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: c.color.withValues(alpha: 0.25)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    c.name,
                    textAlign: TextAlign.center,
                    style: kAdvSecondary.copyWith(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                  ),
                  if (c.sanskrit != null) Text(c.sanskrit!, textAlign: TextAlign.center, style: kAdvSecondary),
                  const SizedBox(height: 4),
                  Text(
                    c.value,
                    textAlign: TextAlign.center,
                    style: kAdvTitle.copyWith(fontSize: 22, color: c.color),
                  ),
                  if (c.tier != null)
                    Text(
                      c.tier!,
                      textAlign: TextAlign.center,
                      style: kAdvSecondary.copyWith(color: c.color, fontWeight: FontWeight.w600),
                    ),
                ],
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
