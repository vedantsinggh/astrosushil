import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/jaimini_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
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

    return AstroPage(
      title: 'Jaimini Astrology',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const ActiveBirthProfileSelector(isDark: false),
          const SizedBox(height: kAdvGap),
          jaiminiAsync.when(
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
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildSummary(jaimini),
                  const SizedBox(height: kAdvGap),
                  SushilExplainerButton(
                    contextBuilder: () => _buildExplanationContext(jaimini, activeScheme),
                    poseAsset: AppAssets.sushilGuiding,
                  ),
                  const SizedBox(height: kAdvGap),
                  _buildSchemeSelector(activeScheme),
                  const SizedBox(height: kAdvGap),
                  AstrologyTabBar(
                    isScrollable: true,
                    selectedIndex: _selectedTabIndex,
                    onTabSelected: (idx) {
                      setState(() => _selectedTabIndex = idx);
                    },
                    tabs: _tabs,
                  ),
                  const SizedBox(height: kAdvGap),
                  ..._buildTab(jaimini),
                  const SizedBox(height: kAdvGap),
                  AstrologyExplanationCard(
                    title: context.l10n.explainJaiminiTitle,
                    whatIsText: context.l10n.explainJaiminiWhatIs,
                    howToReadText: context.l10n.explainJaiminiHowToRead,
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  List<Widget> _buildTab(JaiminiReportModel jaimini) {
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
  }

  Widget _buildSummary(JaiminiReportModel jaimini) {
    return AdvSummaryCard(
      label: 'At a glance',
      icon: Icons.auto_awesome_rounded,
      title: 'Your key significator planets',
      subtitle: 'Planets ranked by degree, each guiding one area of life.',
      child: AdvStatGrid(
        onDark: true,
        stats: [
          if (jaimini.atmakaraka != null)
            AdvStat(
              label: 'Soul (Atmakaraka)',
              value: jaimini.atmakaraka!.planet,
              accent: AppColors.gold,
            ),
          if (jaimini.amatyakaraka != null)
            AdvStat(label: 'Career (Amatyakaraka)', value: jaimini.amatyakaraka!.planet),
          if (jaimini.darakaraka != null)
            AdvStat(label: 'Spouse (Darakaraka)', value: jaimini.darakaraka!.planet),
          if (jaimini.arudhaLagna != null)
            AdvStat(label: 'Arudha Lagna (AL)', value: jaimini.arudhaLagna!.rashiName),
        ],
      ),
    );
  }

  Widget _buildSchemeSelector(String activeScheme) {
    return AdvCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Scheme:', style: kAdvTitle),
          const SizedBox(height: 4),
          const Text('Choose 7 or 8 karakas.', style: kAdvSecondary),
          const SizedBox(height: 12),
          AstroSegmentedControl<String>(
            segments: const [
              AstroSegment(value: 'SEVEN_KARAKA', label: '7 Karaka (Parasara)'),
              AstroSegment(value: 'EIGHT_KARAKA', label: '8 Karaka (+Rahu)'),
            ],
            selected: activeScheme,
            onChanged: (value) {
              ref.read(selectedJaiminiSchemeProvider.notifier).state = value;
            },
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCharaKarakasTab(JaiminiReportModel jaimini) {
    return [
      AdvSection(
        title: 'Prime Karakas Summary',
        subtitle: 'Soul, career and partner indicators.',
        icon: Icons.star_rounded,
        tint: AstroTint.violet,
        inCard: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (jaimini.atmakaraka != null)
              _buildKarakaHighlightBadge(
                title: 'Atmakaraka (AK - Soul Significator)',
                planet: jaimini.atmakaraka!.planet,
                details:
                    '${jaimini.atmakaraka!.rashiName} (${jaimini.atmakaraka!.formattedDegree}) • ${jaimini.atmakaraka!.nakshatraName} P${jaimini.atmakaraka!.pada}',
              ),
            if (jaimini.amatyakaraka != null)
              _buildKarakaHighlightBadge(
                title: 'Amatyakaraka (AmK - Intellect & Career)',
                planet: jaimini.amatyakaraka!.planet,
                details:
                    '${jaimini.amatyakaraka!.rashiName} (${jaimini.amatyakaraka!.formattedDegree}) • ${jaimini.amatyakaraka!.nakshatraName} P${jaimini.amatyakaraka!.pada}',
              ),
            if (jaimini.darakaraka != null)
              _buildKarakaHighlightBadge(
                title: 'Darakaraka (DK - Spouse & Partnerships)',
                planet: jaimini.darakaraka!.planet,
                details:
                    '${jaimini.darakaraka!.rashiName} (${jaimini.darakaraka!.formattedDegree}) • ${jaimini.darakaraka!.nakshatraName} P${jaimini.darakaraka!.pada}',
              ),
          ],
        ),
      ),
      const SizedBox(height: 6),
      AdvDetailsExpander(
        title: 'Full Chara Karaka Hierarchy',
        subtitle: 'Ranked by descending sidereal degree (excluding Rahu/Ketu in 7-Karaka)',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: jaimini.charaKarakas.map((karaka) {
            return AdvRowCard(
              leading: _buildCodeChip(karaka.roleCode),
              title: karaka.roleName,
              subtitle: '${karaka.rashiName} • ${karaka.nakshatraName} (P${karaka.pada})',
              badge: _buildPlanetValue(karaka.planet, karaka.formattedDegree),
            );
          }).toList(),
        ),
      ),
    ];
  }

  List<Widget> _buildArudhaPadasTab(JaiminiReportModel jaimini) {
    return [
      AdvSection(
        title: 'Key Special Padas',
        subtitle: 'How you are seen, and your commitments.',
        icon: Icons.stars_rounded,
        tint: AstroTint.amber,
        inCard: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (jaimini.arudhaLagna != null)
              _buildPadaCard(
                code: 'AL',
                name: 'Arudha Lagna (A1)',
                meaning: 'Status, external image & worldly projection',
                placement: jaimini.arudhaLagna!,
              ),
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
      const SizedBox(height: 6),
      AdvDetailsExpander(
        title: '12 House Arudha Padas (Bhava Padas)',
        subtitle: 'Reflected manifest points across all houses',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: jaimini.arudhaPadas.map((pada) {
            return AdvRowCard(
              leading: _buildCodeChip(pada.padaCode),
              title: 'House ${pada.house}',
              facts: [
                MapEntry('Sign', '${pada.rashiName} (H${pada.signOffset})'),
                MapEntry('Sign lord', pada.lord),
              ],
            );
          }).toList(),
        ),
      ),
    ];
  }

  List<Widget> _buildRashiDrishtiTab(JaiminiReportModel jaimini) {
    return [
      AdvSection(
        title: 'Jaimini Sign Aspects (Rashi Drishti)',
        subtitle: 'Which signs look at each other.',
        icon: Icons.visibility_rounded,
        tint: AstroTint.sky,
        inCard: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AdvDetailsExpander(
              title: 'How sign aspects work',
              icon: Icons.help_outline_rounded,
              child: Text(
                '• Movable signs aspect all Fixed signs (except adjacent)\n'
                '• Fixed signs aspect all Movable signs (except adjacent)\n'
                '• Dual signs aspect all other Dual signs',
                style: kAdvSecondary,
              ),
            ),
            const SizedBox(height: 12),
            ...jaimini.rashiDrishtis.map((drishti) {
              return AdvRowCard(
                title: drishti.rashiName,
                facts: [
                  if (drishti.planetsInSign.isNotEmpty)
                    MapEntry('Planets:', drishti.planetsInSign.join(', ')),
                  MapEntry('Aspects:', drishti.aspectedSigns.join(', ')),
                  if (drishti.aspectedPlanets.isNotEmpty)
                    MapEntry('Aspected Planets:', drishti.aspectedPlanets.join(', ')),
                ],
              );
            }),
          ],
        ),
      ),
    ];
  }

  List<Widget> _buildArgalaAndKLTab(JaiminiReportModel jaimini) {
    return [
      if (jaimini.karakamsha != null) ...[
        AdvSection(
          title: 'Karakamsha Lagna (KL)',
          subtitle: 'Navamsha (D9) position of the Atmakaraka',
          icon: Icons.explore_rounded,
          tint: AstroTint.violet,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AdvInfoRow(label: 'Karakamsha Sign', value: jaimini.karakamsha!.rashiName),
              AdvInfoRow(label: 'Karakamsha Lord', value: jaimini.karakamsha!.lord),
              AdvInfoRow(
                label: 'House from Natal Lagna',
                value: 'House ${jaimini.karakamsha!.houseOffset}',
                showDivider: jaimini.karakamsha!.planetsInKL.isNotEmpty,
              ),
              if (jaimini.karakamsha!.planetsInKL.isNotEmpty)
                AdvInfoRow(
                  label: 'Planets in KL',
                  value: jaimini.karakamsha!.planetsInKL.join(', '),
                  showDivider: false,
                ),
            ],
          ),
        ),
        const SizedBox(height: kAdvGap),
      ],
      AdvSection(
        title: 'Argala (Interventions & Obstructions)',
        subtitle: 'Planetary interventions from 2nd, 4th, 11th, and 5th houses',
        icon: Icons.shield_outlined,
        tint: AstroTint.coral,
        inCard: jaimini.argalas.isEmpty,
        child: jaimini.argalas.isEmpty
            ? const Text('No active Argala records returned.', style: kAdvBody)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: jaimini.argalas.map((argala) {
                  return AdvRowCard(
                    title: 'Focus: ${argala.targetSign}',
                    badge: argala.isObstructed
                        ? const AdvBadge('Obstructed', color: Color(0xFFC62828))
                        : const AdvBadge('Unobstructed', color: Color(0xFF2E7D32)),
                    facts: [
                      MapEntry(
                        'Argala:',
                        '${argala.argalaPlanets.join(", ")} (${argala.argalaType} H${argala.argalaHouse})',
                      ),
                      if (argala.obstructionPlanets.isNotEmpty)
                        MapEntry(
                          'Virodha (Obstruction):',
                          '${argala.obstructionPlanets.join(", ")} (H${argala.obstructionHouse})',
                        ),
                    ],
                  );
                }).toList(),
              ),
      ),
    ];
  }

  Widget _buildKarakaHighlightBadge({
    required String title,
    required String planet,
    required String details,
  }) {
    return AdvRowCard(
      title: title,
      subtitle: details,
      badge: Text(
        planet,
        style: kAdvBody.copyWith(fontSize: 18, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _buildPadaCard({
    required String code,
    required String name,
    required String meaning,
    required ArudhaPadaPlacementModel placement,
  }) {
    return AdvRowCard(
      leading: _buildCodeChip(code),
      title: name,
      subtitle: meaning,
      badge: _buildPlanetValue(placement.rashiName, 'Lord: ${placement.lord}'),
    );
  }

  Widget _buildCodeChip(String code) {
    return Container(
      constraints: const BoxConstraints(minWidth: 48, minHeight: 40),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.tintVioletBg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        code,
        style: const TextStyle(
          fontFamily: AppTypography.bodyFamily,
          fontWeight: FontWeight.w700,
          fontSize: 15,
          color: AppColors.tintVioletText,
        ),
      ),
    );
  }

  Widget _buildPlanetValue(String value, String caption) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value, style: kAdvBody.copyWith(fontWeight: FontWeight.w700)),
        Text(caption, style: kAdvSecondary),
      ],
    );
  }
}
