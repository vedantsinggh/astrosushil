import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/jaimini_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/astrology_tab_bar.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen displaying deterministic Jaimini astrology calculations
/// including 7/8 Chara Karakas, 12 Arudha Padas (AL, UL, A10), Rashi Drishti, Argala, and Karakamsha.
class JaiminiScreen extends ConsumerStatefulWidget {
  const JaiminiScreen({super.key});

  @override
  ConsumerState<JaiminiScreen> createState() => _JaiminiScreenState();
}

class _JaiminiScreenState extends ConsumerState<JaiminiScreen> {
  int _selectedTabIndex = 0;

  static const _tabs = [
    AstrologyTabItem(label: 'Chara Karakas', icon: Icons.person_search_rounded),
    AstrologyTabItem(label: 'Arudha Padas', icon: Icons.layers_rounded),
    AstrologyTabItem(label: 'Rashi Drishti', icon: Icons.visibility_rounded),
    AstrologyTabItem(label: 'Argala & KL', icon: Icons.shield_rounded),
  ];

  ExplanationContext _buildExplanationContext(
    JaiminiReportModel jaimini,
    String activeScheme,
  ) {
    return ExplanationContext(
      feature: 'jaimini',
      screenTitle: 'Jaimini Astrology',
      purpose: 'Explain the user\'s Jaimini Chara Karakas (Atmakaraka, Amatyakaraka, Darakaraka) and Arudha Padas.',
      astrologyData: {
        'scheme': activeScheme,
        'charaKarakas': jaimini.charaKarakas.map((k) => {
          'karaka': k.roleName,
          'code': k.roleCode,
          'planet': k.planet,
          'rashi': k.rashiName,
          'significance': k.significance,
        }).toList(),
        'arudhaPadas': jaimini.arudhaPadas.map((a) => {
          'house': a.houseNumber,
          'padaCode': a.code,
          'name': a.name,
          'sign': a.signName,
        }).toList(),
        'karakamsha': jaimini.karakamsha != null ? {
          'sign': jaimini.karakamsha!.karakamshaRashiName,
          'atmakaraka': jaimini.karakamsha!.atmakarakaPlanet,
          'houseOffset': jaimini.karakamsha!.karakamshaHouseFromLagna,
        } : null,
      },
      importantValues: {
        'scheme': activeScheme,
        'karakaCount': jaimini.charaKarakas.length,
        'atmakaraka': jaimini.atmakaraka?.planet,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final jaiminiAsync = ref.watch(activeProfileJaiminiProvider);
    final activeScheme = ref.watch(selectedJaiminiSchemeProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const AstroAppBar(
        title: 'Jaimini Astrology',
      ),
      body: SubtleCelestialBackground(
        child: Column(
          children: [
            const ActiveBirthProfileSelector(isDark: false),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.cardSurfaceWarm,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Row(
                  children: [
                    const Text(
                      'Scheme:',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12.5,
                        color: AppColors.midnightNavy,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: SegmentedButton<String>(
                        style: ButtonStyle(
                          visualDensity: VisualDensity.standard,
                          tapTargetSize: MaterialTapTargetSize.padded,
                          backgroundColor: WidgetStateProperty.resolveWith((states) {
                            if (states.contains(WidgetState.selected)) {
                              return AppColors.midnightNavy;
                            }
                            return AppColors.cardSurfaceParchment;
                          }),
                          foregroundColor: WidgetStateProperty.resolveWith((states) {
                            if (states.contains(WidgetState.selected)) {
                              return AppColors.gold;
                            }
                            return AppColors.textDark;
                          }),
                        ),
                        segments: const [
                          ButtonSegment(
                            value: 'SEVEN_KARAKA',
                            label: Text(
                              '7 Karaka (Parasara)',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          ButtonSegment(
                            value: 'EIGHT_KARAKA',
                            label: Text(
                              '8 Karaka (+Rahu)',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                        selected: {activeScheme},
                        onSelectionChanged: (Set<String> selection) {
                          ref.read(selectedJaiminiSchemeProvider.notifier).state =
                              selection.first;
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
              child: AstrologyExplanationCard(
                title: context.l10n.explainJaiminiTitle,
                whatIsText: context.l10n.explainJaiminiWhatIs,
                howToReadText: context.l10n.explainJaiminiHowToRead,
              ),
            ),
            AstrologyTabBar(
              isScrollable: true,
              selectedIndex: _selectedTabIndex,
              onTabSelected: (idx) {
                setState(() => _selectedTabIndex = idx);
              },
              tabs: _tabs,
            ),
            if (jaiminiAsync.valueOrNull != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
                child: SushilExplainerButton(
                  contextBuilder: () => _buildExplanationContext(
                    jaiminiAsync.valueOrNull!,
                    activeScheme,
                  ),
                  poseAsset: AppAssets.sushilGuiding,
                ),
              ),
            const SizedBox(height: 4),
            Expanded(
              child: jaiminiAsync.when(
                loading: () => const AstrologyLoadingState(
                  message: 'Calculating Jaimini Karakas and Arudhas...',
                ),
                error: (err, stack) => AstrologyErrorState(
                  error: err,
                  onRetry: () => ref.invalidate(activeProfileJaiminiProvider),
                ),
                data: (jaimini) {
                  if (jaimini == null) {
                    return const AstrologyEmptyState(
                      title: 'No Profile Selected',
                      message: 'Select a birth profile to view Jaimini astrology details.',
                    );
                  }
                  switch (_selectedTabIndex) {
                    case 0:
                      return _buildCharaKarakasTab(jaimini);
                    case 1:
                      return _buildArudhaPadasTab(jaimini);
                    case 2:
                      return _buildRashiDrishtiTab(jaimini);
                    case 3:
                    default:
                      return _buildArgalaAndKLTab(jaimini);
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCharaKarakasTab(JaiminiReportModel jaimini) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Prime Karakas Summary',
          subtitle: 'Dominant spiritual, career, and marital indicators',
          icon: Icons.star_rounded,
          child: Column(
            children: [
              if (jaimini.atmakaraka != null)
                _buildKarakaHighlightBadge(
                  title: 'Atmakaraka (AK - Soul Significator)',
                  planet: jaimini.atmakaraka!.planet,
                  details:
                      '${jaimini.atmakaraka!.rashiName} (${jaimini.atmakaraka!.formattedDegree}) • ${jaimini.atmakaraka!.nakshatraName} P${jaimini.atmakaraka!.pada}',
                  accentColor: AppColors.midnightNavy,
                ),
              const SizedBox(height: 8),
              if (jaimini.amatyakaraka != null)
                _buildKarakaHighlightBadge(
                  title: 'Amatyakaraka (AmK - Intellect & Career)',
                  planet: jaimini.amatyakaraka!.planet,
                  details:
                      '${jaimini.amatyakaraka!.rashiName} (${jaimini.amatyakaraka!.formattedDegree}) • ${jaimini.amatyakaraka!.nakshatraName} P${jaimini.amatyakaraka!.pada}',
                  accentColor: AppColors.deepIndigo,
                ),
              const SizedBox(height: 8),
              if (jaimini.darakaraka != null)
                _buildKarakaHighlightBadge(
                  title: 'Darakaraka (DK - Spouse & Partnerships)',
                  planet: jaimini.darakaraka!.planet,
                  details:
                      '${jaimini.darakaraka!.rashiName} (${jaimini.darakaraka!.formattedDegree}) • ${jaimini.darakaraka!.nakshatraName} P${jaimini.darakaraka!.pada}',
                  accentColor: const Color(0xFFC2185B),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Full Chara Karaka Hierarchy',
          subtitle: 'Ranked by descending sidereal degree (excluding Rahu/Ketu in 7-Karaka)',
          icon: Icons.format_list_numbered_rounded,
          child: Column(
            children: jaimini.charaKarakas.map((karaka) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurfaceWarm,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 50,
                        padding: const EdgeInsets.symmetric(vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.cardSurfaceParchment,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: _getRoleColor(karaka.roleCode).withValues(alpha: 0.5),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            karaka.roleCode,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: _getRoleColor(karaka.roleCode),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              karaka.roleName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                                color: AppColors.textDark,
                              ),
                            ),
                            Text(
                              '${karaka.rashiName} • ${karaka.nakshatraName} (P${karaka.pada})',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            karaka.planet,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.midnightNavy,
                            ),
                          ),
                          Text(
                            karaka.formattedDegree,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.deepIndigo,
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
    );
  }

  Widget _buildArudhaPadasTab(JaiminiReportModel jaimini) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Key Special Padas',
          subtitle: 'Perception, manifestation & relationship axes',
          icon: Icons.stars_rounded,
          child: Column(
            children: [
              if (jaimini.arudhaLagna != null)
                _buildPadaCard(
                  code: 'AL',
                  name: 'Arudha Lagna (A1)',
                  meaning: 'Status, external image & worldly projection',
                  placement: jaimini.arudhaLagna!,
                ),
              const SizedBox(height: 8),
              if (jaimini.upapadaLagna != null)
                _buildPadaCard(
                  code: 'UL',
                  name: 'Upapada Lagna (A12)',
                  meaning: 'Marriage, sustained commitment & spouse lineage',
                  placement: jaimini.upapadaLagna!,
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: '12 House Arudha Padas (Bhava Padas)',
          subtitle: 'Reflected manifest points across all houses',
          icon: Icons.grid_view_rounded,
          child: AstrologyDataTable(
            columns: const [
              AstrologyTableColumn(header: 'Pada', flex: 1),
              AstrologyTableColumn(header: 'House', flex: 2),
              AstrologyTableColumn(header: 'Sign', flex: 2),
              AstrologyTableColumn(header: 'Sign Lord', flex: 2),
            ],
            rows: jaimini.arudhaPadas.map((pada) {
              return [
                pada.padaCode,
                'House ${pada.house}',
                '${pada.rashiName} (H${pada.signOffset})',
                pada.lord,
              ];
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildRashiDrishtiTab(JaiminiReportModel jaimini) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        AstrologySectionCard(
          title: 'Jaimini Sign Aspects (Rashi Drishti)',
          subtitle: 'Permanent mutual aspects between signs and their occupants',
          icon: Icons.remove_red_eye_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '• Movable signs aspect all Fixed signs (except adjacent)\n'
                '• Fixed signs aspect all Movable signs (except adjacent)\n'
                '• Dual signs aspect all other Dual signs',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              ...jaimini.rashiDrishtis.map((drishti) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurfaceWarm,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              drishti.rashiName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: AppColors.textDark,
                              ),
                            ),
                            const Spacer(),
                            if (drishti.planetsInSign.isNotEmpty)
                              Text(
                                'Planets: ${drishti.planetsInSign.join(", ")}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.deepIndigo,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Aspects: ${drishti.aspectedSigns.join(", ")}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                        if (drishti.aspectedPlanets.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Aspected Planets: ${drishti.aspectedPlanets.join(", ")}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.goldDark,
                            ),
                          ),
                        ],
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

  Widget _buildArgalaAndKLTab(JaiminiReportModel jaimini) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        if (jaimini.karakamsha != null) ...[
          AstrologySectionCard(
            title: 'Karakamsha Lagna (KL)',
            subtitle: 'Navamsha (D9) position of the Atmakaraka',
            icon: Icons.compass_calibration_rounded,
            child: Column(
              children: [
                AstrologyInfoRow(
                  label: 'Karakamsha Sign',
                  value: jaimini.karakamsha!.rashiName,
                ),
                AstrologyInfoRow(
                  label: 'Karakamsha Lord',
                  value: jaimini.karakamsha!.lord,
                ),
                AstrologyInfoRow(
                  label: 'House from Natal Lagna',
                  value: 'House ${jaimini.karakamsha!.houseOffset}',
                ),
                if (jaimini.karakamsha!.planetsInKL.isNotEmpty)
                  AstrologyInfoRow(
                    label: 'Planets in KL',
                    value: jaimini.karakamsha!.planetsInKL.join(', '),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        AstrologySectionCard(
          title: 'Argala (Interventions & Obstructions)',
          subtitle: 'Planetary interventions from 2nd, 4th, 11th, and 5th houses',
          icon: Icons.shield_outlined,
          child: jaimini.argalas.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text('No active Argala records returned.'),
                )
              : Column(
                  children: jaimini.argalas.map((argala) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.cardSurfaceWarm,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Focus: ${argala.targetSign}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: AppColors.textDark,
                                  ),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: argala.isObstructed
                                        ? const Color(0xFFC62828).withValues(alpha: 0.12)
                                        : const Color(0xFF2E7D32).withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(
                                      color: argala.isObstructed
                                          ? const Color(0xFFC62828).withValues(alpha: 0.3)
                                          : const Color(0xFF2E7D32).withValues(alpha: 0.3),
                                    ),
                                  ),
                                  child: Text(
                                    argala.isObstructed ? 'Obstructed' : 'Unobstructed',
                                    style: TextStyle(
                                      color: argala.isObstructed
                                          ? const Color(0xFFC62828)
                                          : const Color(0xFF2E7D32),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Argala: ${argala.argalaPlanets.join(", ")} (${argala.argalaType} H${argala.argalaHouse})',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.deepIndigo,
                              ),
                            ),
                            if (argala.obstructionPlanets.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                'Virodha (Obstruction): ${argala.obstructionPlanets.join(", ")} (H${argala.obstructionHouse})',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFFC62828),
                                ),
                              ),
                            ],
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

  Widget _buildKarakaHighlightBadge({
    required String title,
    required String planet,
    required String details,
    required Color accentColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: accentColor.withValues(alpha: 0.35)),
        boxShadow: const [
          BoxShadow(
            color: AppColors.cardShadowWarm,
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12.5,
                    color: accentColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  details,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Text(
            planet,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: accentColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPadaCard({
    required String code,
    required String name,
    required String meaning,
    required ArudhaPadaPlacementModel placement,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.midnightNavy,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
            ),
            child: Center(
              child: Text(
                code,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: AppColors.gold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    color: AppColors.textDark,
                  ),
                ),
                Text(
                  meaning,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                placement.rashiName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: AppColors.midnightNavy,
                ),
              ),
              Text(
                'Lord: ${placement.lord}',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.deepIndigo,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getRoleColor(String code) {
    switch (code) {
      case 'AK':
        return Colors.purple;
      case 'AmK':
        return Colors.blue;
      case 'BK':
        return Colors.teal;
      case 'MK':
        return Colors.green;
      case 'PK':
        return Colors.amber[800]!;
      case 'GK':
        return Colors.orange;
      case 'DK':
        return Colors.pink;
      default:
        return AppColors.primary;
    }
  }
}
