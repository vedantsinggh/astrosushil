import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/kp_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_tab_bar.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen displaying Krishnamurti Padhdhati (KP) astrological calculations
/// including 4-tier planetary lords, Placidus cusps, house significators, and ruling planets.
class KPAstrologyScreen extends ConsumerStatefulWidget {
  const KPAstrologyScreen({super.key});

  @override
  ConsumerState<KPAstrologyScreen> createState() => _KPAstrologyScreenState();
}

class _KPAstrologyScreenState extends ConsumerState<KPAstrologyScreen> {
  int _selectedTabIndex = 0;

  static const _tabs = [
    AstrologyTabItem(label: 'Planetary Lords', icon: Icons.public_rounded),
    AstrologyTabItem(label: 'Placidus Cusps', icon: Icons.grid_view_rounded),
    AstrologyTabItem(label: 'Significators', icon: Icons.category_rounded),
    AstrologyTabItem(label: 'Ruling Planets', icon: Icons.schedule_rounded),
  ];

  ExplanationContext _buildExplanationContext(KPReportModel kp) {
    return ExplanationContext(
      feature: 'kp_astrology',
      screenTitle: 'KP Astrology (Krishnamurti)',
      purpose: 'Explain the user\'s Krishnamurti Padhdhati (KP) 4-tier planetary lords (Sign/Star/Sub/Sub-Sub) and Placidus house cusps.',
      astrologyData: {
        'planets': kp.planets.map((p) => {
          'name': p.name,
          'sign': p.rashiName,
          'signLord': p.signLord,
          'starLord': p.starLord,
          'subLord': p.subLord,
          'isRetrograde': p.isRetrograde,
        }).toList(),
        'cusps': kp.cusps.map((c) => {
          'cuspNumber': c.cuspNumber,
          'sign': c.rashiName,
          'signLord': c.signLord,
          'starLord': c.starLord,
          'subLord': c.subLord,
        }).toList(),
        'rulingPlanets': {
          'dayLord': kp.rulingPlanets.dayLord,
          'lagnaSignLord': kp.rulingPlanets.lagnaSignLord,
          'lagnaStarLord': kp.rulingPlanets.lagnaStarLord,
          'lagnaSubLord': kp.rulingPlanets.lagnaSubLord,
          'moonSignLord': kp.rulingPlanets.moonSignLord,
          'moonStarLord': kp.rulingPlanets.moonStarLord,
        },
      },
      importantValues: {
        'totalPlanets': kp.planets.length,
        'totalCusps': kp.cusps.length,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final kpAsync = ref.watch(activeProfileKPProvider);

    return AstroPage(
      title: 'KP Astrology (Krishnamurti)',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const ActiveBirthProfileSelector(isDark: false),
          const SizedBox(height: kAdvGap),
          kpAsync.when(
            loading: () => const AstrologyLoadingState(
              message: 'Calculating KP Placidus Cusps & Sub-Lords...',
            ),
            error: (err, stack) => AstrologyErrorState(
              error: err,
              onRetry: () => ref.invalidate(activeProfileKPProvider),
            ),
            data: (kp) {
              if (kp == null) {
                return const AstrologyEmptyState(
                  title: 'No Profile Selected',
                  message: 'Select a birth profile to view KP astrology details.',
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildSummary(kp),
                  const SizedBox(height: kAdvGap),
                  SushilExplainerButton(
                    contextBuilder: () => _buildExplanationContext(kp),
                    poseAsset: AppAssets.sushilExplaining,
                  ),
                  const SizedBox(height: kAdvGap + 4),
                  AstrologyTabBar(
                    isScrollable: true,
                    selectedIndex: _selectedTabIndex,
                    onTabSelected: (idx) {
                      setState(() => _selectedTabIndex = idx);
                    },
                    tabs: _tabs,
                  ),
                  const SizedBox(height: kAdvGap + 4),
                  ..._buildTab(kp),
                  const SizedBox(height: kAdvGap + 4),
                  AstrologyExplanationCard(
                    title: context.l10n.explainKpTitle,
                    whatIsText: context.l10n.explainKpWhatIs,
                    howToReadText: context.l10n.explainKpHowToRead,
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  List<Widget> _buildTab(KPReportModel kp) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildPlanetaryLordsTab(kp);
      case 1:
        return _buildCuspsTab(kp);
      case 2:
        return _buildSignificatorsTab(kp);
      case 3:
      default:
        return _buildRulingPlanetsTab(kp);
    }
  }

  Widget _buildSummary(KPReportModel kp) {
    final rp = kp.rulingPlanets;
    return AdvSummaryCard(
      label: 'At a glance',
      icon: Icons.auto_awesome_rounded,
      title: 'Your KP chart',
      subtitle: '${kp.planets.length} planets and ${kp.cusps.length} house cusps, each with its ruling lords.',
      child: AdvStatGrid(
        onDark: true,
        stats: [
          AdvStat(label: 'Day lord', value: _orDash(rp.dayLord), accent: AppColors.gold),
          AdvStat(label: 'Ascendant lord', value: _orDash(rp.lagnaSignLord)),
          AdvStat(label: 'Moon sign lord', value: _orDash(rp.moonSignLord)),
          AdvStat(label: 'Moon star lord', value: _orDash(rp.moonStarLord)),
        ],
      ),
    );
  }

  String _orDash(String v) => v.isEmpty ? '—' : v;

  List<Widget> _buildPlanetaryLordsTab(KPReportModel kp) {
    return [
      AdvSection(
        title: 'Planetary 4-Tier Lordships',
        subtitle: 'Sign lord, star lord and sub lord of each planet.',
        icon: Icons.public_rounded,
        tint: AstroTint.violet,
        inCard: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: kp.planets.map((p) {
            return AdvRowCard(
              title: p.name,
              subtitle: '${p.signName} ${p.formattedDegree}',
              badge: p.isRetrograde ? const AdvBadge('Retrograde (R)', color: AppColors.error) : null,
              facts: [
                MapEntry('Sign lord', p.signLord),
                MapEntry('Star lord', p.starLord),
                MapEntry('Sub lord', p.subLord),
              ],
            );
          }).toList(),
        ),
      ),
      const SizedBox(height: 6),
      AdvDetailsExpander(
        title: 'See full details',
        subtitle: 'Nakshatra, pada, sub-sub lord and house (249 sub system)',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final p in kp.planets) ...[
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '${p.name}${p.isRetrograde ? " (R)" : ""} · ${p.signName} ${p.formattedDegree}',
                  style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              AdvInfoRow(label: 'Nakshatra & Pada', value: '${p.nakshatraName} (P${p.pada})'),
              AdvInfoRow(label: 'Sign Lord / Star Lord', value: '${p.signLord} / ${p.starLord}'),
              AdvInfoRow(label: 'Sub Lord', value: p.subLord),
              AdvInfoRow(label: 'Sub-Sub Lord', value: p.subSubLord),
              if (p.houseOccupiency != null)
                AdvInfoRow(label: 'KP House Occupancy', value: 'House ${p.houseOccupiency}'),
            ],
          ],
        ),
      ),
    ];
  }

  List<Widget> _buildCuspsTab(KPReportModel kp) {
    return [
      AdvSection(
        title: 'Placidus KP Cusp Lordships',
        subtitle: 'The starting point of each of the 12 houses.',
        icon: Icons.grid_view_rounded,
        tint: AstroTint.indigo,
        inCard: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: kp.cusps.map((c) {
            return AdvRowCard(
              title: 'Cusp ${c.cuspNumber}',
              subtitle: '${c.signName} ${c.formattedDegree} · ${c.nakshatraName} (P${c.pada})',
              facts: [
                MapEntry('Sign lord', c.signLord),
                MapEntry('Star lord', c.starLord),
                MapEntry('Sub lord', c.subLord),
                MapEntry('Sub-sub lord', c.subSubLord),
              ],
            );
          }).toList(),
        ),
      ),
    ];
  }

  List<Widget> _buildSignificatorsTab(KPReportModel kp) {
    return [
      AdvSection(
        title: 'KP 4-Fold House Significators',
        subtitle: 'Planets linked to each house, strongest (A) to weakest (D).',
        icon: Icons.category_rounded,
        tint: AstroTint.sage,
        inCard: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AdvDetailsExpander(
              title: 'What do levels A to D mean?',
              icon: Icons.help_outline_rounded,
              child: Text(
                '• Level A (Strongest): Planets in star of occupants\n'
                '• Level B: Occupant planets of the house\n'
                '• Level C: Planets in star of house lord\n'
                '• Level D: Lord of the house',
                style: kAdvSecondary,
              ),
            ),
            const SizedBox(height: 12),
            ...kp.significators.map((sig) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: AdvCard(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('House ${sig.house}', style: kAdvBody.copyWith(fontWeight: FontWeight.w700)),
                      Text('Cusp Sub-Lord: ${sig.cuspSubLord}', style: kAdvSecondary),
                      const SizedBox(height: 4),
                      _buildSigLevelRow('Level A (Star of Occupant)', sig.levelA),
                      _buildSigLevelRow('Level B (Occupants)', sig.levelB),
                      _buildSigLevelRow('Level C (Star of Lord)', sig.levelC),
                      _buildSigLevelRow('Level D (House Lord)', sig.levelD, last: true),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    ];
  }

  List<Widget> _buildRulingPlanetsTab(KPReportModel kp) {
    final rp = kp.rulingPlanets;
    return [
      AdvSection(
        title: 'Ruling Planets (RP) at Birth Moment',
        subtitle: 'Used to time and check events.',
        icon: Icons.schedule_rounded,
        tint: AstroTint.sky,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AdvInfoRow(label: 'Day Lord (Vara Lord)', value: rp.dayLord),
            AdvInfoRow(label: 'Moon Sign Lord (Rashi Lord)', value: rp.moonSignLord),
            AdvInfoRow(label: 'Moon Star Lord (Nakshatra Lord)', value: rp.moonStarLord),
            AdvInfoRow(label: 'Lagna Sign Lord (Asc Sign Lord)', value: rp.lagnaSignLord),
            AdvInfoRow(
              label: 'Lagna Star Lord (Asc Nakshatra Lord)',
              value: rp.lagnaStarLord,
              showDivider: rp.lagnaSubLord.isNotEmpty || rp.moonSubLord.isNotEmpty,
            ),
            if (rp.lagnaSubLord.isNotEmpty)
              AdvInfoRow(label: 'Lagna Sub Lord', value: rp.lagnaSubLord, showDivider: rp.moonSubLord.isNotEmpty),
            if (rp.moonSubLord.isNotEmpty)
              AdvInfoRow(label: 'Moon Sub Lord', value: rp.moonSubLord, showDivider: false),
          ],
        ),
      ),
      if (kp.parsFortuna != null) ...[
        const SizedBox(height: kAdvGap),
        AdvSection(
          title: 'Pars Fortuna (Point of Fortune)',
          subtitle: 'Ascendant + Moon - Sun (Diurnal / Nocturnal adjusted)',
          icon: Icons.stars_rounded,
          tint: AstroTint.amber,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AdvInfoRow(
                label: 'Sign & Degree',
                value: '${kp.parsFortuna!.signName} ${kp.parsFortuna!.formattedDegree}',
              ),
              AdvInfoRow(
                label: 'Nakshatra & Pada',
                value: '${kp.parsFortuna!.nakshatraName} (P${kp.parsFortuna!.pada})',
              ),
              AdvInfoRow(
                label: 'Sign Lord / Star Lord',
                value: '${kp.parsFortuna!.signLord} / ${kp.parsFortuna!.starLord}',
              ),
              AdvInfoRow(
                label: 'Sub Lord / Sub-Sub Lord',
                value: '${kp.parsFortuna!.subLord} / ${kp.parsFortuna!.subSubLord}',
                showDivider: false,
              ),
            ],
          ),
        ),
      ],
    ];
  }

  Widget _buildSigLevelRow(String label, List<String> planets, {bool last = false}) {
    return AdvInfoRow(
      label: label,
      value: planets.isEmpty ? '—' : planets.join(', '),
      valueColor: planets.isEmpty ? AppColors.textSecondary : null,
      showDivider: !last,
    );
  }
}
