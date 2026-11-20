import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../core/localization/locale_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/varshaphala_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_tab_bar.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen displaying Varshaphala (Tajika Solar Return) calculations
/// including astronomical return snapshot, Varsha Lagna, Muntha, Panchadhikari,
/// Varshesha, Harsha Bala, Tajika Yogas, and searchable 36 Sahams.
class VarshaphalaScreen extends ConsumerStatefulWidget {
  const VarshaphalaScreen({super.key});

  @override
  ConsumerState<VarshaphalaScreen> createState() => _VarshaphalaScreenState();
}

class _VarshaphalaScreenState extends ConsumerState<VarshaphalaScreen> {
  int _selectedTabIndex = 0;
  final TextEditingController _sahamSearchController = TextEditingController();
  String _sahamSearchQuery = '';

  static const _tabs = [
    AstrologyTabItem(label: 'Return Info', icon: Icons.wb_sunny_rounded),
    AstrologyTabItem(label: 'Muntha & Lord', icon: Icons.military_tech_rounded),
    AstrologyTabItem(label: 'Harsha Bala', icon: Icons.fitness_center_rounded),
    AstrologyTabItem(label: 'Tajika Yogas', icon: Icons.stars_rounded),
    AstrologyTabItem(label: 'Sahams (36)', icon: Icons.format_list_bulleted_rounded),
  ];

  @override
  void dispose() {
    _sahamSearchController.dispose();
    super.dispose();
  }

  ExplanationContext _buildExplanationContext(
    VarshaphalaChartModel chart,
    int selectedYear,
  ) {
    return ExplanationContext(
      feature: 'varshaphala',
      screenTitle: 'Varshaphala $selectedYear',
      purpose: 'Explain the annual Solar Return (Tajika) horoscope themes, Year Lord (${chart.varshesha.planet}), and Muntha focus.',
      astrologyData: {
        'year': selectedYear,
        'varshaLagna': {
          'sign': chart.varshaLagna.rashiName,
          'degree': chart.varshaLagna.degreeInRashi,
        },
        'muntha': {
          'sign': chart.muntha.rashiName,
          'house': chart.muntha.houseInVarshaChart,
          'lord': chart.muntha.lord,
        },
        'varshesha': {
          'planet': chart.varshesha.planet,
          'selectionReason': chart.varshesha.selectionReason,
          'harshaBala': chart.varshesha.harshaBalaScore,
        },
        'tajikaYogas': chart.tajikaYogas.map((y) => {
          'name': y.name,
          'planets': y.participatingPlanets,
          'type': y.type,
        }).toList(),
      },
      importantValues: {
        'yearLord': chart.varshesha.planet,
        'munthaHouse': chart.muntha.houseInVarshaChart,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final varshaAsync = ref.watch(activeProfileVarshaphalaProvider);
    final selectedYear = ref.watch(selectedVarshaphalaYearProvider);

    return AstroPage(
      title: 'Varshaphala (Solar Return)',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const ActiveBirthProfileSelector(isDark: false),
          const SizedBox(height: kAdvGap),
          _buildYearSelector(selectedYear),
          const SizedBox(height: kAdvGap),
          ...varshaAsync.when(
            loading: () => const [
              AstrologyLoadingState(
                message: 'Calculating exact Solar Return and Tajika Chart...',
              ),
            ],
            error: (err, stack) => [
              AstrologyErrorState(
                error: err,
                onRetry: () => ref.invalidate(activeProfileVarshaphalaProvider),
              ),
            ],
            data: (chart) {
              if (chart == null) {
                return const [
                  AstrologyEmptyState(
                    title: 'No Profile Selected',
                    message: 'Select a birth profile to calculate Varshaphala.',
                  ),
                ];
              }
              return [
                _buildSummary(chart),
                const SizedBox(height: kAdvGap),
                SushilExplainerButton(
                  contextBuilder: () => _buildExplanationContext(chart, selectedYear),
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
                ..._buildTab(chart),
                const SizedBox(height: kAdvGap + 4),
                AstrologyExplanationCard(
                  title: context.l10n.explainVarshaphalaTitle,
                  whatIs: context.l10n.explainVarshaphalaWhatIs,
                  howToRead: context.l10n.explainVarshaphalaHowToRead,
                ),
              ];
            },
          ),
        ],
      ),
    );
  }

  List<Widget> _buildTab(VarshaphalaChartModel chart) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildReturnOverviewTab(chart);
      case 1:
        return _buildMunthaAndVarsheshaTab(chart);
      case 2:
        return _buildHarshaBalaTab(chart);
      case 3:
        return _buildTajikaYogasTab(chart);
      case 4:
      default:
        return _buildSahamsTab(chart);
    }
  }

  Widget _buildYearSelector(int selectedYear) {
    final buttonStyle = OutlinedButton.styleFrom(
      foregroundColor: AppColors.accent,
      backgroundColor: AppColors.accentFill,
      minimumSize: const Size.fromHeight(48),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius)),
      textStyle: AppTypography.button.copyWith(fontSize: 16, fontWeight: FontWeight.w600),
    );
    return AdvCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Solar Return: Year $selectedYear',
            style: kAdvTitle,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          const Text(
            'Annual Kundli Assessment',
            style: kAdvSecondary,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Tooltip(
                  message: 'Previous Year',
                  child: OutlinedButton.icon(
                    style: buttonStyle,
                    icon: const Icon(Icons.chevron_left, size: 24),
                    label: Text('${selectedYear - 1}'),
                    onPressed: () {
                      ref.read(selectedVarshaphalaYearProvider.notifier).state = selectedYear - 1;
                    },
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Tooltip(
                  message: 'Next Year',
                  child: OutlinedButton.icon(
                    style: buttonStyle,
                    iconAlignment: IconAlignment.end,
                    icon: const Icon(Icons.chevron_right, size: 24),
                    label: Text('${selectedYear + 1}'),
                    onPressed: () {
                      ref.read(selectedVarshaphalaYearProvider.notifier).state = selectedYear + 1;
                    },
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummary(VarshaphalaChartModel chart) {
    final ret = chart.solarReturnDetails;
    return AdvSummaryCard(
      label: 'At a glance',
      icon: Icons.wb_sunny_rounded,
      title: 'Target Year ${chart.targetYear} (Age ${chart.completedAge})',
      subtitle: 'Exact Return: ${ret.returnTimestamp}',
      child: AdvStatGrid(
        onDark: true,
        stats: [
          AdvStat(label: 'Lord of the year', value: chart.varshesha.planet, accent: AppColors.gold),
          AdvStat(label: 'Annual ascendant', value: chart.varshaLagna.rashiName),
          AdvStat(
            label: 'Muntha',
            value: chart.muntha.rashiName,
            caption: 'House ${chart.muntha.houseInVarshaLagna}',
          ),
          AdvStat(label: 'Return', value: ret.isDayReturn ? 'Day' : 'Night'),
        ],
      ),
    );
  }

  List<Widget> _buildReturnOverviewTab(VarshaphalaChartModel chart) {
    final ret = chart.solarReturnDetails;
    final lagna = chart.varshaLagna;

    return [
      AdvSection(
        title: 'Varsha Lagna (Annual Ascendant)',
        subtitle: 'Rising sign at the precise solar return moment',
        icon: Icons.explore_rounded,
        tint: AstroTint.indigo,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AdvInfoRow(label: 'Varsha Ascendant Sign', value: lagna.rashiName),
            AdvInfoRow(label: 'Ascendant Degree', value: lagna.formattedDegree),
            AdvInfoRow(label: 'Ascendant Lord (Lagnesha)', value: lagna.lord),
            AdvInfoRow(
              label: 'Nakshatra & Pada',
              value: '${lagna.nakshatraName} (P${lagna.pada})',
              showDivider: false,
            ),
          ],
        ),
      ),
      const SizedBox(height: kAdvGap),
      AdvSection(
        title: 'Solar Return Astronomical Snapshot',
        subtitle: 'The moment the Sun returns to its birth position.',
        icon: Icons.timer_rounded,
        tint: AstroTint.amber,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AdvInfoRow(label: 'Natal Sun Longitude', value: ret.natalSunDegreeFormatted),
            AdvInfoRow(label: 'Return Sun Longitude', value: ret.returnSunDegreeFormatted),
            AdvInfoRow(label: 'Return Weekday (Vara)', value: ret.returnWeekday),
            AdvInfoRow(
              label: 'Day / Night Return',
              value: ret.isDayReturn ? 'Day Return (Diurnal)' : 'Night Return (Nocturnal)',
              showDivider: false,
            ),
          ],
        ),
      ),
    ];
  }

  List<Widget> _buildMunthaAndVarsheshaTab(VarshaphalaChartModel chart) {
    final muntha = chart.muntha;
    final varshesha = chart.varshesha;
    final pancha = chart.panchadhikari;

    return [
      AdvSection(
        title: 'Varshesha (Lord of the Year)',
        subtitle: 'Ruling planet chosen through Tajika evaluation criteria',
        icon: Icons.military_tech_rounded,
        tint: AstroTint.violet,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              varshesha.planet,
              style: kAdvBody.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(varshesha.selectionRationale, style: kAdvBody),
          ],
        ),
      ),
      const SizedBox(height: kAdvGap),
      AdvSection(
        title: 'Muntha Progression',
        subtitle: 'Annual progressed point (1 sign per year of life)',
        icon: Icons.track_changes_rounded,
        tint: AstroTint.sky,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AdvInfoRow(label: 'Muntha Sign', value: muntha.rashiName),
            AdvInfoRow(label: 'Muntha Lord (Munthesha)', value: muntha.lord),
            AdvInfoRow(label: 'House in Varsha Kundli', value: 'House ${muntha.houseInVarshaLagna}'),
            AdvInfoRow(
              label: 'Auspiciousness Tier',
              value: muntha.isAuspicious ? 'Auspicious (Shubha)' : 'Challenging (Ashubha)',
              valueColor: muntha.isAuspicious ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
              showDivider: false,
            ),
          ],
        ),
      ),
      const SizedBox(height: kAdvGap),
      AdvDetailsExpander(
        title: 'Panchadhikari (5 Office Bearers)',
        subtitle: 'Five classical candidates evaluated for Varshesha status',
        icon: Icons.groups_rounded,
        initiallyExpanded: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AdvInfoRow(label: '1. Munthesha (Muntha Lord)', value: pancha.munthesha),
            AdvInfoRow(label: '2. Janma Lagnesha (Natal Asc Lord)', value: pancha.janmaLagnesha),
            AdvInfoRow(label: '3. Varsha Lagnesha (Annual Asc Lord)', value: pancha.varshaLagnesha),
            AdvInfoRow(label: '4. Tri-Rashi Pati (Triplicity Lord)', value: pancha.triRashiPati),
            AdvInfoRow(
              label: '5. Din-Ratri Pati (Day/Night Lord)',
              value: pancha.dinRatriPati,
              showDivider: false,
            ),
          ],
        ),
      ),
    ];
  }

  List<Widget> _buildHarshaBalaTab(VarshaphalaChartModel chart) {
    return [
      AdvSection(
        title: 'Tajika Harsha Bala (Annual Planetary Strengths)',
        subtitle: 'Strength of each planet this year, from 4 sources.',
        icon: Icons.fitness_center_rounded,
        tint: AstroTint.sage,
        inCard: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: chart.harshaBala.values.map((b) {
            return AdvRowCard(
              title: b.planet,
              subtitle: 'Total ${b.totalBala}',
              badge: AdvBadge(b.tier),
              facts: [
                MapEntry('Sthana', b.sthanaBala.toString()),
                MapEntry('Uccha', b.uchchaBala.toString()),
                MapEntry('Hadda', b.haddaBala.toString()),
              ],
            );
          }).toList(),
        ),
      ),
    ];
  }

  List<Widget> _buildTajikaYogasTab(VarshaphalaChartModel chart) {
    return [
      AdvSection(
        title: 'Tajika Planetary Aspects & Yogas',
        subtitle: 'Ithasala (Mutual Applying), Isarpha (Separating), Nakta, Yamaya',
        icon: Icons.auto_awesome_rounded,
        tint: AstroTint.violet,
        inCard: chart.tajikaYogas.isEmpty,
        child: chart.tajikaYogas.isEmpty
            ? const Text('No major Tajika yogas formed in this solar return.', style: kAdvBody)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: chart.tajikaYogas.map((yoga) {
                  final color = _getYogaColor(yoga.yogaType);
                  return AdvCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(
                              yoga.yogaName,
                              style: kAdvBody.copyWith(fontWeight: FontWeight.w700, color: color),
                            ),
                            AdvBadge(yoga.yogaType, color: color),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Involved: ${yoga.participatingPlanets.join(" & ")}',
                          style: kAdvSecondary.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(yoga.description, style: kAdvSecondary),
                      ],
                    ),
                  );
                }).expand((w) => [w, const SizedBox(height: 10)]).toList(),
              ),
      ),
    ];
  }

  List<Widget> _buildSahamsTab(VarshaphalaChartModel chart) {
    final filteredSahams = chart.sahams.where((s) {
      if (_sahamSearchQuery.isEmpty) return true;
      return s.sahamName.toLowerCase().contains(_sahamSearchQuery.toLowerCase()) ||
          s.rashiName.toLowerCase().contains(_sahamSearchQuery.toLowerCase()) ||
          s.lord.toLowerCase().contains(_sahamSearchQuery.toLowerCase());
    }).toList();

    return [
      TextField(
        controller: _sahamSearchController,
        style: kAdvBody,
        decoration: InputDecoration(
          labelText: 'Search Sahams',
          hintText: 'e.g. Punya, Vidya',
          hintStyle: kAdvSecondary,
          prefixIcon: const Icon(Icons.search, size: 22),
          filled: true,
          fillColor: AppColors.cardSurface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.cardBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.cardBorder),
          ),
          suffixIcon: _sahamSearchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 22),
                  tooltip: 'Clear search',
                  onPressed: () {
                    setState(() {
                      _sahamSearchController.clear();
                      _sahamSearchQuery = '';
                    });
                  },
                )
              : null,
        ),
        onChanged: (val) {
          setState(() {
            _sahamSearchQuery = val;
          });
        },
      ),
      const SizedBox(height: kAdvGap),
      AdvSection(
        title: 'Tajika Sahams (${filteredSahams.length} of ${chart.sahams.length})',
        subtitle: 'Sensitive points for specific areas of life.',
        icon: Icons.list_rounded,
        tint: AstroTint.amber,
        inCard: filteredSahams.isEmpty,
        child: filteredSahams.isEmpty
            ? const Text('No Sahams match your search.', style: kAdvBody)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: filteredSahams.map((s) {
                  return AdvRowCard(
                    title: s.sahamName,
                    subtitle: 'House ${s.houseInVarshaChart} • Lord: ${s.lord}',
                    badge: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(s.rashiName, style: kAdvBody.copyWith(fontWeight: FontWeight.w700)),
                        Text(s.formattedDegree, style: kAdvSecondary),
                      ],
                    ),
                  );
                }).toList(),
              ),
      ),
    ];
  }

  Color _getYogaColor(String type) {
    switch (type.toUpperCase()) {
      case 'ITHASALA':
        return Colors.green[800]!;
      case 'ISARPHA':
        return Colors.orange[900]!;
      case 'NAKTA':
        return Colors.purple[700]!;
      case 'YAMAYA':
        return Colors.blue[800]!;
      default:
        return AppColors.primary;
    }
  }
}
