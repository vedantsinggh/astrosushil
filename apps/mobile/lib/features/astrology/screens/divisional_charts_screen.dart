import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/astro_chart_model.dart';
import '../models/divisional_chart_info.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/adv_widgets.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';
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
    showAstroSheet<void>(
      context: context,
      title: 'Select Divisional Chart (षोडशवर्ग)',
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
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

    return AstroPage(
      title: 'Divisional Charts',
      actions: [
        AstroNavAction(
          icon: Icons.grid_view_rounded,
          tooltip: 'All 16 Vargas',
          onPressed: () => _openAllVargasModal(context),
        ),
      ],
      onRefresh: activeProfile == null
          ? null
          : () async => ref.invalidate(divisionalChartProvider(
                DivisionalChartQuery(profile: activeProfile, vargaType: _selectedVargaCode),
              )),
      child: activeProfile == null
          ? Padding(
              padding: const EdgeInsets.only(top: 12),
              child: AstrologyEmptyState(
                title: 'No Active Birth Profile',
                message: context.l10n.noProfileExplanation,
                actionLabel: 'Add Birth Profile',
                onAction: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                  );
                },
              ),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. ACTIVE PROFILE BAR
                const ActiveBirthProfileSelector(isDark: false),
                const SizedBox(height: 20),

                // 2. VARGA SELECTOR (all options visible, wraps on small screens)
                _buildVargaSelectorBar(context),
                const SizedBox(height: 20),

                // 3. MAIN CONTENT
                _buildChartContent(context, activeProfile, vargaInfo),
              ],
            ),
    );
  }

  /// Compact horizontal selector highlighting prioritized charts (D1, D9, D10, D60) + All Vargas button
  Widget _buildVargaSelectorBar(BuildContext context) {
    final priorityList = DivisionalChartInfo.priorityVargas;
    final isCurrentInPriority = priorityList.any((v) => v.code == _selectedVargaCode);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4),
          child: Text('Choose a chart', style: AppTypography.sectionHeader),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ...priorityList.map((varga) {
              final isSelected = varga.code == _selectedVargaCode;
              return AstroPill(
                label: '${varga.code} ${varga.sanskritName.split(' ').first}',
                selected: isSelected,
                onTap: () => _onSelectVarga(varga.code),
              );
            }),

            // If non-priority varga is selected (e.g. D7, D12, D30), show its active pill
            if (!isCurrentInPriority)
              AstroPill(
                label: '$_selectedVargaCode ${DivisionalChartInfo.findByCode(_selectedVargaCode).sanskritName.split(' ').first}',
                selected: true,
                onTap: () {},
              ),

            // "All 16 Vargas" Pill
            AstroPill(
              label: 'All Vargas (16)',
              icon: Icons.tune_rounded,
              selected: false,
              onTap: () => _openAllVargasModal(context),
            ),
          ],
        ),
      ],
    );
  }

  ExplanationContext _buildExplanationContext(
    AstroChartModel chart,
    DivisionalChartInfo vargaInfo,
    BirthProfileModel profile,
  ) {
    return ExplanationContext(
      feature: 'divisional_charts',
      screenTitle: '${vargaInfo.code} ${vargaInfo.sanskritName}',
      purpose: 'Explain what the ${vargaInfo.code} (${vargaInfo.englishName}) divisional chart signifies for ${profile.name}.',
      astrologyData: {
        'vargaCode': vargaInfo.code,
        'vargaName': vargaInfo.sanskritName,
        'domain': vargaInfo.englishName,
        'description': vargaInfo.description,
        'ascendant': {
          'rashi': chart.ascendant?.rashiName,
          'degree': chart.ascendant?.degreeInRashi,
        },
        'planets': chart.planets.map((p) => {
          'name': p.displayName,
          'rashi': p.rashiName,
          'house': p.calculateHouseNumber(chart.ascendant?.rashiIndex ?? 1),
          'isRetrograde': p.isRetrograde,
        }).toList(),
      },
      importantValues: {
        'division': '1/${vargaInfo.division}',
        'vargaType': vargaInfo.code,
      },
      userProfileContext: {
        'name': profile.name,
      },
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
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: AstrologyErrorState(
            error: error,
            customMessage: 'Failed to calculate ${vargaInfo.code} chart. Tap to retry.',
            onRetry: () => ref.refresh(divisionalChartProvider(query)),
          ),
        ),
      ),
      data: (chart) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. SELECTED VARGA HEADER & LIFE DOMAIN SUMMARY (hero)
              _buildVargaInfoCard(vargaInfo),

              const SizedBox(height: 16),

              // Sushil Sir Explainer Button
              SushilExplainerButton(
                contextBuilder: () => _buildExplanationContext(chart, vargaInfo, profile),
                poseAsset: AppAssets.sushilExplainingChart,
              ),
              const SizedBox(height: 12),

              // 0. BEGINNER EDUCATIONAL GUIDANCE CARD
              AstrologyExplanationCard(
                title: context.l10n.explainDivisionalChartsTitle,
                whatIsText: context.l10n.explainDivisionalChartsWhatIs,
                howToReadText: context.l10n.explainDivisionalChartsHowToRead,
              ),

              const SizedBox(height: 16),

              // 2. NORTH INDIAN KUNDLI CHART VISUALIZATION
              AdvSection(
                title: '${vargaInfo.code} ${vargaInfo.sanskritName} Chart',
                subtitle: 'North Indian diamond format',
                icon: Icons.auto_awesome_rounded,
                tint: AstroTint.violet,
                child: Column(
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AdvBadge('Harmonic 1/${vargaInfo.division}', color: AppColors.tintVioletText),
                    ),
                    const SizedBox(height: 12),
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
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AstroTint.amber.background,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 2,
                          children: [
                            const Icon(Icons.wb_sunny_rounded, size: 18, color: AppColors.goldDark),
                            Text(
                              '${vargaInfo.code} Lagna: ',
                              style: const TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Text(
                              '${chart.ascendant!.rashiName} (${chart.ascendant!.degreeInRashi.toStringAsFixed(2)}°)',
                              style: const TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 15,
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w500,
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
              AdvSection(
                title: 'Planetary Placements in ${vargaInfo.code}',
                subtitle: 'Harmonic sign coordinates and house occupancy',
                icon: Icons.public_rounded,
                tint: AstroTint.sky,
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
                    fontSize: 15,
                    height: 1.45,
                    color: AppColors.primary,
                  ),
                ),
              ),

            ],
          ),
    );
  }

  Widget _buildVargaInfoCard(DivisionalChartInfo vargaInfo) {
    return AstroGradientCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            constraints: const BoxConstraints(minWidth: 56, minHeight: 56),
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.gold,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AstroShadows.goldButton,
            ),
            child: Text(
              vargaInfo.code,
              style: AppTypography.headlineLarge.copyWith(fontSize: 20, color: AppColors.primary, height: 1.1),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vargaInfo.sanskritName,
                  style: AppTypography.headlineLarge.copyWith(fontSize: 21, color: Colors.white, height: 1.2),
                ),
                const SizedBox(height: 4),
                Text(
                  vargaInfo.lifeDomain,
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 15,
                    color: AppColors.goldLight,
                    fontWeight: FontWeight.w500,
                    height: 1.35,
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
            fontFamily: AppTypography.bodyFamily,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.accent,
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

/// Sheet body for selecting among all 16 Vedic Shodashvargas.
/// Shown through [showAstroSheet] (grabber, title and Done on both platforms).
class _AllVargasPickerModal extends StatelessWidget {
  final String selectedCode;
  final ValueChanged<String> onSelected;

  const _AllVargasPickerModal({
    required this.selectedCode,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return AstroGroupedSection(
      dividerInset: 16 + 44 + 14,
      children: [
        for (final varga in DivisionalChartInfo.allVargas)
          _vargaRow(varga, varga.code == selectedCode),
      ],
    );
  }

  Widget _vargaRow(DivisionalChartInfo varga, bool isSelected) {
    return AstroListRow(
      leading: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AstroTint.indigo.background,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          varga.code,
          style: TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: isSelected ? AppColors.gold : AppColors.accent,
          ),
        ),
      ),
      title: varga.sanskritName,
      subtitle: varga.lifeDomain,
      onTap: () => onSelected(varga.code),
      trailing: isSelected
          ? const Icon(Icons.check_rounded, color: AppColors.accent, size: 24)
          : (varga.isPriority ? const AdvBadge('Core', color: AppColors.goldDark) : null),
      showChevron: !isSelected && !varga.isPriority,
    );
  }
}
