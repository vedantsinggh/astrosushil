import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/varshaphala_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/astrology_tab_bar.dart';

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

  @override
  Widget build(BuildContext context) {
    final varshaAsync = ref.watch(activeProfileVarshaphalaProvider);
    final selectedYear = ref.watch(selectedVarshaphalaYearProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Varshaphala (Solar Return)'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SubtleCelestialBackground(
        child: Column(
          children: [
            const ActiveBirthProfileSelector(isDark: false),
            _buildYearSelector(selectedYear),
            AstrologyTabBar(
              isScrollable: true,
              selectedIndex: _selectedTabIndex,
              onTabSelected: (idx) {
                setState(() => _selectedTabIndex = idx);
              },
              tabs: _tabs,
            ),
            const SizedBox(height: 8),
            Expanded(
              child: varshaAsync.when(
                loading: () => const AstrologyLoadingState(
                  message: 'Calculating exact Solar Return and Tajika Chart...',
                ),
                error: (err, stack) => AstrologyErrorState(
                  error: err,
                  onRetry: () => ref.invalidate(activeProfileVarshaphalaProvider),
                ),
                data: (chart) {
                  if (chart == null) {
                    return const AstrologyEmptyState(
                      title: 'No Profile Selected',
                      message: 'Select a birth profile to calculate Varshaphala.',
                    );
                  }
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
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildYearSelector(int selectedYear) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, color: AppColors.primary),
            onPressed: () {
              ref.read(selectedVarshaphalaYearProvider.notifier).state =
                  selectedYear - 1;
            },
            tooltip: 'Previous Year',
          ),
          Expanded(
            child: Column(
              children: [
                Text(
                  'Solar Return: Year $selectedYear',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: AppColors.primary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const Text(
                  'Annual Kundli Assessment',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.secondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right, color: AppColors.primary),
            onPressed: () {
              ref.read(selectedVarshaphalaYearProvider.notifier).state =
                  selectedYear + 1;
            },
            tooltip: 'Next Year',
          ),
        ],
      ),
    );
  }

  Widget _buildReturnOverviewTab(VarshaphalaChartModel chart) {
    final ret = chart.solarReturnDetails;
    final lagna = chart.varshaLagna;

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.primary.withValues(alpha: 0.1),
                AppColors.secondary.withValues(alpha: 0.06),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              const Icon(Icons.wb_sunny_rounded, color: Colors.orange, size: 32),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Target Year ${chart.targetYear} (Age ${chart.completedAge})',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: AppColors.primary,
                      ),
                    ),
                    Text(
                      'Exact Return: ${ret.returnTimestamp}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Solar Return Astronomical Snapshot',
          subtitle: 'Precise moment Sun reaches identical natal sidereal longitude',
          icon: Icons.timer_rounded,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: 'Natal Sun Longitude',
                value: ret.natalSunDegreeFormatted,
              ),
              AstrologyInfoRow(
                label: 'Return Sun Longitude',
                value: ret.returnSunDegreeFormatted,
              ),
              AstrologyInfoRow(
                label: 'Return Weekday (Vara)',
                value: ret.returnWeekday,
              ),
              AstrologyInfoRow(
                label: 'Day / Night Return',
                value: ret.isDayReturn ? 'Day Return (Diurnal)' : 'Night Return (Nocturnal)',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Varsha Lagna (Annual Ascendant)',
          subtitle: 'Rising sign at the precise solar return moment',
          icon: Icons.explore_rounded,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: 'Varsha Ascendant Sign',
                value: lagna.rashiName,
              ),
              AstrologyInfoRow(
                label: 'Ascendant Degree',
                value: lagna.formattedDegree,
              ),
              AstrologyInfoRow(
                label: 'Ascendant Lord (Lagnesha)',
                value: lagna.lord,
              ),
              AstrologyInfoRow(
                label: 'Nakshatra & Pada',
                value: '${lagna.nakshatraName} (P${lagna.pada})',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMunthaAndVarsheshaTab(VarshaphalaChartModel chart) {
    final muntha = chart.muntha;
    final varshesha = chart.varshesha;
    final pancha = chart.panchadhikari;

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Muntha Progression',
          subtitle: 'Annual progressed point (1 sign per year of life)',
          icon: Icons.track_changes_rounded,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: 'Muntha Sign',
                value: muntha.rashiName,
              ),
              AstrologyInfoRow(
                label: 'Muntha Lord (Munthesha)',
                value: muntha.lord,
              ),
              AstrologyInfoRow(
                label: 'House in Varsha Kundli',
                value: 'House ${muntha.houseInVarshaLagna}',
              ),
              AstrologyInfoRow(
                label: 'Auspiciousness Tier',
                value: muntha.isAuspicious ? 'Auspicious (Shubha)' : 'Challenging (Ashubha)',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Varshesha (Lord of the Year)',
          subtitle: 'Ruling planet chosen through Tajika evaluation criteria',
          icon: Icons.military_tech_rounded,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    Text(
                      varshesha.planet,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        varshesha.selectionRationale,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Panchadhikari (5 Office Bearers)',
          subtitle: 'Five classical candidates evaluated for Varshesha status',
          icon: Icons.groups_rounded,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: '1. Munthesha (Muntha Lord)',
                value: pancha.munthesha,
              ),
              AstrologyInfoRow(
                label: '2. Janma Lagnesha (Natal Asc Lord)',
                value: pancha.janmaLagnesha,
              ),
              AstrologyInfoRow(
                label: '3. Varsha Lagnesha (Annual Asc Lord)',
                value: pancha.varshaLagnesha,
              ),
              AstrologyInfoRow(
                label: '4. Tri-Rashi Pati (Triplicity Lord)',
                value: pancha.triRashiPati,
              ),
              AstrologyInfoRow(
                label: '5. Din-Ratri Pati (Day/Night Lord)',
                value: pancha.dinRatriPati,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHarshaBalaTab(VarshaphalaChartModel chart) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Tajika Harsha Bala (Annual Planetary Strengths)',
          subtitle: 'Calculated across 4 sources: Sthana, Uccha, Hadda, and Strilinga/Day-Night',
          icon: Icons.fitness_center_rounded,
          child: Column(
            children: [
              AstrologyDataTable(
                columns: const [
                  AstrologyTableColumn(header: 'Planet', flex: 2),
                  AstrologyTableColumn(header: 'Sthana', flex: 1),
                  AstrologyTableColumn(header: 'Uccha', flex: 1),
                  AstrologyTableColumn(header: 'Hadda', flex: 1),
                  AstrologyTableColumn(header: 'Total', flex: 1),
                  AstrologyTableColumn(header: 'Tier', flex: 2),
                ],
                rows: chart.harshaBala.values.map((b) {
                  return [
                    b.planet,
                    b.sthanaBala.toString(),
                    b.uchchaBala.toString(),
                    b.haddaBala.toString(),
                    b.totalBala.toString(),
                    b.tier,
                  ];
                }).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTajikaYogasTab(VarshaphalaChartModel chart) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Tajika Planetary Aspects & Yogas',
          subtitle: 'Ithasala (Mutual Applying), Isarpha (Separating), Nakta, Yamaya',
          icon: Icons.auto_awesome_rounded,
          child: chart.tajikaYogas.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text('No major Tajika yogas formed in this solar return.'),
                )
              : Column(
                  children: chart.tajikaYogas.map((yoga) {
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
                                Text(
                                  yoga.yogaName,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: _getYogaColor(yoga.yogaType),
                                  ),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _getYogaColor(yoga.yogaType).withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    yoga.yogaType,
                                    style: TextStyle(
                                      color: _getYogaColor(yoga.yogaType),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Involved: ${yoga.participatingPlanets.join(" & ")}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              yoga.description,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.secondary,
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

  Widget _buildSahamsTab(VarshaphalaChartModel chart) {
    final filteredSahams = chart.sahams.where((s) {
      if (_sahamSearchQuery.isEmpty) return true;
      return s.sahamName.toLowerCase().contains(_sahamSearchQuery.toLowerCase()) ||
          s.rashiName.toLowerCase().contains(_sahamSearchQuery.toLowerCase()) ||
          s.lord.toLowerCase().contains(_sahamSearchQuery.toLowerCase());
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: TextField(
            controller: _sahamSearchController,
            decoration: InputDecoration(
              hintText: 'Search 36 Tajika Sahams (e.g. Punya, Vidya)...',
              hintStyle: const TextStyle(fontSize: 12),
              prefixIcon: const Icon(Icons.search, size: 20),
              isDense: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.2)),
              ),
              suffixIcon: _sahamSearchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
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
        ),
        Expanded(
          child: ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              AstrologySectionCard(
                title: 'Tajika Sahams (${filteredSahams.length} of ${chart.sahams.length})',
                subtitle: 'Mathematical sensitive points for specific areas of life',
                icon: Icons.list_rounded,
                child: filteredSahams.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: Text('No Sahams match your search.')),
                      )
                    : Column(
                        children: filteredSahams.map((s) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.border.withValues(alpha: 0.12)),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          s.sahamName,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                        Text(
                                          'House ${s.houseInVarshaChart} • Lord: ${s.lord}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.secondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        s.rashiName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 12,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      Text(
                                        s.formattedDegree,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.secondary,
                                        ),
                                      ),
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
          ),
        ),
      ],
    );
  }

  Color _getYogaColor(String type) {
    switch (type.toUpperCase()) {
      case 'ITHASALA':
        return Colors.green[700]!;
      case 'ISARPHA':
        return Colors.orange[800]!;
      case 'NAKTA':
        return Colors.purple[700]!;
      case 'YAMAYA':
        return Colors.blue[700]!;
      default:
        return AppColors.primary;
    }
  }
}
