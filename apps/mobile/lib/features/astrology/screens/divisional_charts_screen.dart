import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/astro_chart_model.dart';
import '../models/divisional_chart_info.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/degree_value_display.dart';
import '../widgets/expandable_astrology_card.dart';
import '../widgets/kundli_chart_widget.dart';
import '../widgets/planet_chip.dart';
import '../widgets/sign_chip.dart';

/// Screen for exploring the 16 Vedic Divisional Charts (Shodashvargas)
/// Computes harmonic placements deterministically via the Fastify backend API.
class DivisionalChartsScreen extends ConsumerStatefulWidget {
  final String initialVarga;

  const DivisionalChartsScreen({
    super.key,
    this.initialVarga = 'D1',
  });

  @override
  ConsumerState<DivisionalChartsScreen> createState() => _DivisionalChartsScreenState();
}

class _DivisionalChartsScreenState extends ConsumerState<DivisionalChartsScreen> {
  late String _selectedVargaCode;

  @override
  void initState() {
    super.initState();
    _selectedVargaCode = widget.initialVarga.toUpperCase();
  }

  void _onSelectVarga(String code) {
    setState(() {
      _selectedVargaCode = code.toUpperCase();
    });
    ref.read(selectedVargaCodeProvider.notifier).state = code.toUpperCase();
  }

  void _openAllVargasModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _AllVargasPickerModal(
        selectedCode: _selectedVargaCode,
        onSelected: (code) {
          Navigator.of(ctx).pop();
          _onSelectVarga(code);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);
    final vargaInfo = DivisionalChartInfo.findByCode(_selectedVargaCode);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        title: const Text('Divisional Charts (वर्ग)'),
        backgroundColor: AppColors.primary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.grid_view_rounded, color: AppColors.premiumAccent),
            tooltip: 'All 16 Vargas',
            onPressed: () => _openAllVargasModal(context),
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: activeProfile == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: AstrologyEmptyState(
                      title: 'No Active Birth Profile',
                      message: 'Select or add a birth profile to calculate and inspect all 16 Vedic divisional charts.',
                      actionLabel: 'Add Birth Profile',
                      onAction: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                        );
                      },
                    ),
                  ),
                )
              : Column(
                  children: [
                    // 1. TOP STICKY ACTIVE PROFILE BAR
                    const ActiveBirthProfileSelector(isDark: false),

                    // 2. QUICK VARGA SELECTOR PILLS
                    _buildVargaSelectorBar(context),

                    // 3. MAIN CONTENT
                    Expanded(
                      child: _buildChartContent(context, activeProfile, vargaInfo),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  /// Compact horizontal selector highlighting prioritized charts (D1, D9, D10, D60) + All Vargas button
  Widget _buildVargaSelectorBar(BuildContext context) {
    final priorityList = DivisionalChartInfo.priorityVargas;
    final isCurrentInPriority = priorityList.any((v) => v.code == _selectedVargaCode);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.lightSurface,
        border: Border(bottom: BorderSide(color: AppColors.lightBorder, width: 1)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: [
            ...priorityList.map((varga) {
              final isSelected = varga.code == _selectedVargaCode;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: ChoiceChip(
                  label: Text('${varga.code} ${varga.sanskritName.split(' ').first}'),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.lightBackground,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : AppColors.primary,
                  ),
                  side: BorderSide(
                    color: isSelected ? AppColors.primary : AppColors.lightBorder,
                  ),
                  onSelected: (selected) {
                    if (selected) _onSelectVarga(varga.code);
                  },
                ),
              );
            }),

            // If non-priority varga is selected (e.g. D7, D12, D30), show its active pill
            if (!isCurrentInPriority)
              Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: ChoiceChip(
                  label: Text('$_selectedVargaCode ${DivisionalChartInfo.findByCode(_selectedVargaCode).sanskritName.split(' ').first}'),
                  selected: true,
                  selectedColor: AppColors.secondary,
                  labelStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  onSelected: (_) {},
                ),
              ),

            // "All 16 Vargas" Pill
            ActionChip(
              avatar: const Icon(Icons.tune_rounded, size: 14, color: AppColors.primary),
              label: const Text('All Vargas (16)'),
              labelStyle: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
              backgroundColor: AppColors.primary.withValues(alpha: 0.08),
              side: const BorderSide(color: AppColors.primary, width: 1),
              onPressed: () => _openAllVargasModal(context),
            ),
          ],
        ),
      ),
    );
  }

  /// Body content displaying chart visualization, Lagna info, and planetary table
  Widget _buildChartContent(
    BuildContext context,
    BirthProfileModel profile,
    DivisionalChartInfo vargaInfo,
  ) {
    final query = DivisionalChartQuery(profile: profile, vargaType: _selectedVargaCode);
    final chartAsync = ref.watch(divisionalChartProvider(query));

    return chartAsync.when(
      loading: () => const AstrologyLoadingState(
        message: 'Calculating harmonic placements...',
      ),
      error: (error, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: AstrologyErrorState(
            error: error,
            customMessage: 'Failed to calculate ${vargaInfo.code} chart. Tap to retry.',
            onRetry: () => ref.refresh(divisionalChartProvider(query)),
          ),
        ),
      ),
      data: (chart) => RefreshIndicator(
        onRefresh: () async => ref.refresh(divisionalChartProvider(query)),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. SELECTED VARGA HEADER & LIFE DOMAIN SUMMARY
              _buildVargaInfoCard(vargaInfo),

              const SizedBox(height: 16),

              // 2. NORTH INDIAN KUNDLI CHART VISUALIZATION
              AstrologySectionCard(
                title: '${vargaInfo.code} ${vargaInfo.sanskritName} Chart',
                subtitle: 'North Indian diamond format',
                icon: Icons.auto_awesome_rounded,
                badgeText: 'HARMONIC 1/${vargaInfo.division}',
                badgeColor: AppColors.secondary,
                child: Column(
                  children: [
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 360, maxHeight: 360),
                        child: KundliChartWidget(
                          chart: chart,
                          showTitle: false,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (chart.ascendant != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.lightBackground,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.lightBorder),
                        ),
                        child: Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 2,
                          children: [
                            const Icon(Icons.wb_sunny_rounded, size: 16, color: AppColors.secondary),
                            Text(
                              '${vargaInfo.code} Lagna: ',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${chart.ascendant!.rashiName} (${chart.ascendant!.degreeInRashi.toStringAsFixed(2)}°)',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 3. PLANETARY PLACEMENT DATA TABLE
              AstrologySectionCard(
                title: 'Planetary Placements in ${vargaInfo.code}',
                subtitle: 'Harmonic sign coordinates and house occupancy',
                icon: Icons.public_rounded,
                child: _buildPlanetsTable(chart),
              ),

              const SizedBox(height: 16),

              // 4. PROGRESSIVE DISCLOSURE: CLASSICAL VARGA PURPOSE
              ExpandableAstrologyCard(
                title: 'Significance of ${vargaInfo.sanskritName}',
                subtitle: 'Vedic Parashari interpretation guidelines',
                icon: Icons.menu_book_rounded,
                initiallyExpanded: false,
                expandedChild: Text(
                  vargaInfo.description,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: AppColors.primary,
                  ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVargaInfoCard(DivisionalChartInfo vargaInfo) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.9),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.premiumAccent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              vargaInfo.code,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vargaInfo.sanskritName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  vargaInfo.lifeDomain,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.premiumAccent,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanetsTable(AstroChartModel chart) {
    final ascendantRashi = chart.ascendant?.rashiIndex ?? 1;

    const columns = [
      AstrologyTableColumn(header: 'Planet', flex: 3),
      AstrologyTableColumn(header: 'Sign / Rashi', flex: 3),
      AstrologyTableColumn(header: 'House', flex: 2),
      AstrologyTableColumn(header: 'Degrees', flex: 3),
    ];

    final rows = chart.planets.map((p) {
      final houseNum = p.calculateHouseNumber(ascendantRashi);
      return [
        PlanetChip(
          planetName: p.displayName,
          isRetrograde: p.isRetrograde,
          isCompact: true,
        ),
        SignChip(
          signName: p.rashiName,
          isCompact: true,
        ),
        Text(
          'H-$houseNum',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: AppColors.secondary,
          ),
        ),
        DegreeValueDisplay(
          degree: p.degreeInRashi,
        ),
      ];
    }).toList();

    return AstrologyDataTable(
      columns: columns,
      rows: rows,
    );
  }
}

/// Modal sheet for selecting among all 16 Vedic Shodashvargas
class _AllVargasPickerModal extends StatelessWidget {
  final String selectedCode;
  final ValueChanged<String> onSelected;

  const _AllVargasPickerModal({
    required this.selectedCode,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.lightSurface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: Column(
          children: [
            // Drag handle
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.lightBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.grid_view_rounded, color: AppColors.primary, size: 20),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Select Divisional Chart (षोडशवर्ग)',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            const Divider(height: 1, color: AppColors.lightBorder),

          Expanded(
            child: ListView.separated(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: DivisionalChartInfo.allVargas.length,
              separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.lightBorder),
              itemBuilder: (ctx, index) {
                final varga = DivisionalChartInfo.allVargas[index];
                final isSelected = varga.code == selectedCode;

                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                  selected: isSelected,
                  selectedTileColor: AppColors.primary.withValues(alpha: 0.06),
                  leading: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : AppColors.lightBackground,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.lightBorder,
                      ),
                    ),
                    child: Text(
                      varga.code,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : AppColors.primary,
                      ),
                    ),
                  ),
                  title: Row(
                    children: [
                      Text(
                        varga.sanskritName,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                      if (varga.isPriority) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.premiumAccent.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'CORE',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: AppColors.secondary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  subtitle: Text(
                    varga.lifeDomain,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.primary.withValues(alpha: 0.7),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
                      : const Icon(Icons.chevron_right_rounded, color: AppColors.lightBorder, size: 20),
                  onTap: () => onSelected(varga.code),
                );
              },
            ),
          ),
        ],
      ),
      ),
    );
  }
}

