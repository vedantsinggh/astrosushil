import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/kp_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/astrology_tab_bar.dart';

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

    return Scaffold(
      appBar: const AstroAppBar(
        title: 'KP Astrology (Krishnamurti)',
      ),
      body: SubtleCelestialBackground(
        child: Column(
          children: [
            const ActiveBirthProfileSelector(isDark: false),
            AstrologyTabBar(
              isScrollable: true,
              selectedIndex: _selectedTabIndex,
              onTabSelected: (idx) {
                setState(() => _selectedTabIndex = idx);
              },
              tabs: _tabs,
            ),
            if (kpAsync.valueOrNull != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: SushilExplainerButton(
                  contextBuilder: () => _buildExplanationContext(kpAsync.valueOrNull!),
                  poseAsset: AppAssets.sushilExplaining,
                ),
              ),
            const SizedBox(height: 6),
            Expanded(
              child: kpAsync.when(
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
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanetaryLordsTab(KPReportModel kp) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Planetary 4-Tier Lordships',
          subtitle: 'Sign Lord (NL), Star Lord (SL), Sub Lord (SubL), Sub-Sub (SS)',
          icon: Icons.table_chart_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Sub-division based on the classical 249 KP Sub-Lord division table.',
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
              const SizedBox(height: 12),
              AstrologyDataTable(
                columns: const [
                  AstrologyTableColumn(header: 'Planet', flex: 2),
                  AstrologyTableColumn(header: 'SignL', flex: 2),
                  AstrologyTableColumn(header: 'StarL', flex: 2),
                  AstrologyTableColumn(header: 'SubL', flex: 2),
                  AstrologyTableColumn(header: 'SubSubL', flex: 2),
                ],
                rows: kp.planets.map((p) {
                  return [
                    '${p.name}${p.isRetrograde ? " (R)" : ""}',
                    p.signLord,
                    p.starLord,
                    p.subLord,
                    p.subSubLord,
                  ];
                }).toList(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Planetary Longitudes & Subdivisions',
          subtitle: 'Detailed positional breakdown in 249 Sub System',
          icon: Icons.list_alt_rounded,
          child: Column(
            children: kp.planets.map((p) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border.withValues(alpha: 0.15)),
                  ),
                  child: ExpansionTile(
                    tilePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                    shape: const Border(),
                    collapsedShape: const Border(),
                    title: Row(
                      children: [
                        Text(
                          p.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: AppColors.primary,
                          ),
                        ),
                        if (p.isRetrograde)
                          const Padding(
                            padding: EdgeInsets.only(left: 6),
                            child: Text(
                              '(R)',
                              style: TextStyle(
                                color: Colors.redAccent,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        const Spacer(),
                        Text(
                          '${p.signName} ${p.formattedDegree}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Column(
                          children: [
                            AstrologyInfoRow(
                              label: 'Nakshatra & Pada',
                              value: '${p.nakshatraName} (P${p.pada})',
                            ),
                            AstrologyInfoRow(
                              label: 'Sign Lord / Star Lord',
                              value: '${p.signLord} / ${p.starLord}',
                            ),
                            AstrologyInfoRow(
                              label: 'Sub Lord',
                              value: p.subLord,
                            ),
                            AstrologyInfoRow(
                              label: 'Sub-Sub Lord',
                              value: p.subSubLord,
                            ),
                            if (p.houseOccupiency != null)
                              AstrologyInfoRow(
                                label: 'KP House Occupancy',
                                value: 'House ${p.houseOccupiency}',
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildCuspsTab(KPReportModel kp) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Placidus KP Cusp Lordships',
          subtitle: '12 unequal house cusps calculated via Placidus system',
          icon: Icons.pie_chart_rounded,
          child: AstrologyDataTable(
            columns: const [
              AstrologyTableColumn(header: 'Cusp', flex: 1),
              AstrologyTableColumn(header: 'Degree', flex: 2),
              AstrologyTableColumn(header: 'SignL', flex: 2),
              AstrologyTableColumn(header: 'StarL', flex: 2),
              AstrologyTableColumn(header: 'SubL', flex: 2),
            ],
            rows: kp.cusps.map((c) {
              return [
                'C${c.cuspNumber}',
                '${c.signName.length > 3 ? c.signName.substring(0, 3) : c.signName} ${c.formattedDegree}',
                c.signLord,
                c.starLord,
                c.subLord,
              ];
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Detailed Cusp Breakdown',
          subtitle: 'Includes Sub-Sub lords and full nakshatra span',
          icon: Icons.format_indent_increase_rounded,
          child: Column(
            children: kp.cusps.map((c) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border.withValues(alpha: 0.15)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Cusp ${c.cuspNumber}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${c.signName} ${c.formattedDegree}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${c.nakshatraName} (P${c.pada})',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildLordTag('SignL', c.signLord),
                          _buildLordTag('StarL', c.starLord),
                          _buildLordTag('SubL', c.subLord),
                          _buildLordTag('SubSubL', c.subSubLord),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildSignificatorsTab(KPReportModel kp) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'KP 4-Fold House Significators',
          subtitle: 'Graded by predictive strength (Level A to Level D)',
          icon: Icons.filter_list_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '• Level A (Strongest): Planets in star of occupants\n'
                '• Level B: Occupant planets of the house\n'
                '• Level C: Planets in star of house lord\n'
                '• Level D: Lord of the house',
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              ...kp.significators.map((sig) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border.withValues(alpha: 0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.secondary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'House ${sig.house}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: AppColors.secondary,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              'Cusp Sub-Lord: ${sig.cuspSubLord}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _buildSigLevelRow(
                            'Level A (Star of Occupant)', sig.levelA),
                        _buildSigLevelRow('Level B (Occupants)', sig.levelB),
                        _buildSigLevelRow(
                            'Level C (Star of Lord)', sig.levelC),
                        _buildSigLevelRow('Level D (House Lord)', sig.levelD),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRulingPlanetsTab(KPReportModel kp) {
    final rp = kp.rulingPlanets;
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Ruling Planets (RP) at Birth Moment',
          subtitle: 'Key deterministic anchors for event timing and verification',
          icon: Icons.timer_rounded,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: 'Day Lord (Vara Lord)',
                value: rp.dayLord,
              ),
              AstrologyInfoRow(
                label: 'Moon Sign Lord (Rashi Lord)',
                value: rp.moonSignLord,
              ),
              AstrologyInfoRow(
                label: 'Moon Star Lord (Nakshatra Lord)',
                value: rp.moonStarLord,
              ),
              AstrologyInfoRow(
                label: 'Lagna Sign Lord (Asc Sign Lord)',
                value: rp.lagnaSignLord,
              ),
              AstrologyInfoRow(
                label: 'Lagna Star Lord (Asc Nakshatra Lord)',
                value: rp.lagnaStarLord,
              ),
              if (rp.lagnaSubLord.isNotEmpty)
                AstrologyInfoRow(
                  label: 'Lagna Sub Lord',
                  value: rp.lagnaSubLord,
                ),
              if (rp.moonSubLord.isNotEmpty)
                AstrologyInfoRow(
                  label: 'Moon Sub Lord',
                  value: rp.moonSubLord,
                ),
            ],
          ),
        ),
        if (kp.parsFortuna != null) ...[
          const SizedBox(height: 16),
          AstrologySectionCard(
            title: 'Pars Fortuna (Point of Fortune)',
            subtitle: 'Ascendant + Moon - Sun (Diurnal / Nocturnal adjusted)',
            icon: Icons.monetization_on_rounded,
            child: Column(
              children: [
                AstrologyInfoRow(
                  label: 'Sign & Degree',
                  value:
                      '${kp.parsFortuna!.signName} ${kp.parsFortuna!.formattedDegree}',
                ),
                AstrologyInfoRow(
                  label: 'Nakshatra & Pada',
                  value:
                      '${kp.parsFortuna!.nakshatraName} (P${kp.parsFortuna!.pada})',
                ),
                AstrologyInfoRow(
                  label: 'Sign Lord / Star Lord',
                  value:
                      '${kp.parsFortuna!.signLord} / ${kp.parsFortuna!.starLord}',
                ),
                AstrologyInfoRow(
                  label: 'Sub Lord / Sub-Sub Lord',
                  value:
                      '${kp.parsFortuna!.subLord} / ${kp.parsFortuna!.subSubLord}',
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLordTag(String title, String lord) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.secondary,
              fontSize: 10,
            ),
          ),
          Text(
            lord,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 11,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSigLevelRow(String label, List<String> planets) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 170,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.secondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              planets.isEmpty ? '—' : planets.join(', '),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: planets.isEmpty ? AppColors.secondary : AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
