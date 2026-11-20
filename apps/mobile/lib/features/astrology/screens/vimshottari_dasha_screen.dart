import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/dasha_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/adv_widgets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Vimshottari Dasha Screen (120-Year Parashari Cycle)
/// Displays active periods (Mahadasha -> Antardasha -> Pratyantardasha)
/// and full collapsible planetary timeline computed deterministically.
class VimshottariDashaScreen extends ConsumerStatefulWidget {
  const VimshottariDashaScreen({super.key});

  @override
  ConsumerState<VimshottariDashaScreen> createState() => _VimshottariDashaScreenState();
}

class _VimshottariDashaScreenState extends ConsumerState<VimshottariDashaScreen> {
  // Set of expanded Mahadasha orders to manage accordion states
  final Set<int> _expandedMahadashas = {};
  // Set of expanded Antardasha keys: "${mahadashaOrder}_${antardashaOrder}"
  final Set<String> _expandedAntardashas = {};

  void _toggleMahadasha(int order) {
    setState(() {
      if (_expandedMahadashas.contains(order)) {
        _expandedMahadashas.remove(order);
      } else {
        _expandedMahadashas.add(order);
      }
    });
  }

  void _toggleAntardasha(String key) {
    setState(() {
      if (_expandedAntardashas.contains(key)) {
        _expandedAntardashas.remove(key);
      } else {
        _expandedAntardashas.add(key);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return AstroPage(
      title: 'Vimshottari Dasha (दशा)',
      onRefresh: activeProfile == null
          ? null
          : () async => ref.refresh(vimshottariDashaForProfileProvider(activeProfile)),
      child: activeProfile == null
          ? Padding(
              padding: const EdgeInsets.only(top: 12),
              child: AstrologyEmptyState(
                title: 'No Active Birth Profile',
                message: 'Select or add a birth profile to calculate your 120-year Vimshottari planetary timeline.',
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
                const ActiveBirthProfileSelector(isDark: false),
                const SizedBox(height: kAdvGap),
                _buildDashaContent(context, activeProfile),
              ],
            ),
    );
  }

  Widget _buildDashaContent(BuildContext context, BirthProfileModel profile) {
    final dashaAsync = ref.watch(vimshottariDashaForProfileProvider(profile));

    return dashaAsync.when(
      loading: () => const AstrologyLoadingState(
        message: 'Calculating Vimshottari Dasha timeline...',
      ),
      error: (error, stack) => AstrologyErrorState(
        error: error,
        customMessage: 'Failed to calculate Dasha timeline. Tap to retry.',
        onRetry: () => ref.refresh(vimshottariDashaForProfileProvider(profile)),
      ),
      data: (dashaTree) {
        if (dashaTree.mahadashas.isEmpty) {
          return AstrologyEmptyState(
            title: 'No Dasha Data Available',
            message: 'Could not compute Vimshottari dasha periods for this profile.',
            actionLabel: 'Refresh',
            onAction: () => ref.refresh(vimshottariDashaForProfileProvider(profile)),
          );
        }

        final now = DateTime.now();
        final currentMd = dashaTree.getCurrentMahadasha(now);
        final currentAd = dashaTree.getCurrentAntardasha(now);
        final currentPd = dashaTree.getCurrentPratyantardasha(now);

        return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. AT-A-GLANCE: ACTIVE RUNNING PERIOD
                _buildCurrentPeriodCard(currentMd, currentAd, currentPd, now),
                const SizedBox(height: kAdvGap),

                // SUSHIL SIR CONTEXTUAL EXPLAINER ENTRYPOINT
                SushilExplainerButton(
                  contextData: _buildDashaExplanationContext(
                    profile,
                    dashaTree,
                    currentMd,
                    currentAd,
                    currentPd,
                    now,
                  ),
                  label: 'Let Sushil Sir explain this Dasha',
                  isCompact: false,
                ),
                const SizedBox(height: kAdvGap),

                // 2. MAHADASHA 120-YEAR TIMELINE SECTION
                AdvSection(
                  title: '120-Year Mahadasha Timeline',
                  subtitle: 'Tap a period to see its smaller periods.',
                  icon: Icons.timeline_rounded,
                  tint: AstroTint.sky,
                  inCard: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ...dashaTree.mahadashas.map((md) {
                        final isMdActive = md.isActive || md.isCurrent(now);
                        final isExpanded = _expandedMahadashas.contains(md.order);

                        return _buildMahadashaTile(md, isMdActive, isExpanded, now);
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: kAdvGap),

                // 3. LEARN MORE (EDUCATIONAL EXPLANATION)
                AstrologyExplanationCard(
                  title: context.l10n.explainDashaTitle,
                  whatIsText: context.l10n.explainDashaWhatIs,
                  howToReadText: context.l10n.explainDashaHowToRead,
                ),
              ],
            );
      },
    );
  }

  /// At-a-glance card displaying the currently operating Mahadasha, Antardasha & Pratyantardasha
  Widget _buildCurrentPeriodCard(
    DashaPeriodModel? currentMd,
    DashaPeriodModel? currentAd,
    DashaPeriodModel? currentPd,
    DateTime now,
  ) {
    return AdvSummaryCard(
      label: 'Current Dasha Influence',
      icon: Icons.auto_awesome_rounded,
      title: currentMd != null ? 'Active period: ${currentMd.displayName}' : 'Active period',
      subtitle: currentMd != null
          ? '${currentMd.remainingDuration(now)} · ${currentMd.formattedDateRange}'
          : 'No active Dasha period identified for the current date.',
      child: currentMd == null
          ? null
          : AdvStatGrid(
              onDark: true,
              stats: [
                AdvStat(label: 'Main period', value: currentMd.displayName, caption: 'Mahadasha', accent: AppColors.gold),
                if (currentAd != null)
                  AdvStat(label: 'Sub-period', value: currentAd.displayName, caption: 'Antardasha'),
                if (currentPd != null)
                  AdvStat(label: 'Short period', value: currentPd.displayName, caption: 'Pratyantar'),
              ],
            ),
    );
  }

  /// Individual Mahadasha accordion tile
  Widget _buildMahadashaTile(
    DashaPeriodModel md,
    bool isMdActive,
    bool isExpanded,
    DateTime now,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isMdActive ? AppColors.tintAmberBg : AppColors.cardSurface,
        borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
        boxShadow: isMdActive ? null : AstroShadows.card,
        border: Border.all(
          color: isMdActive ? AppColors.gold : const Color(0x0F121440),
          width: isMdActive ? 1.5 : 0.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: isExpanded,
            child: InkWell(
              onTap: () => _toggleMahadasha(md.order),
              borderRadius: BorderRadius.circular(16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 64),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                Text(
                                  '${md.displayName} Mahadasha',
                                  style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
                                ),
                                if (isMdActive) const AdvBadge.now('Now'),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${md.formattedDateRange} · ${md.formattedDuration}',
                              style: kAdvSecondary,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        color: AppColors.secondary,
                        size: 26,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // EXPANDED ANTARDASHAS (LEVEL 2)
          if (isExpanded) ...[
            const Divider(height: 1, color: AppColors.cardBorderSubtle),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(left: 4, bottom: 6),
                    child: Text('Sub-periods (Antardasha)', style: kAdvSecondary),
                  ),
                  ...md.subPeriods.map((ad) {
                    final isAdActive = ad.isActive || ad.isCurrent(now);
                    final adKey = '${md.order}_${ad.order}';
                    final isAdExpanded = _expandedAntardashas.contains(adKey);

                    return _buildAntardashaTile(md, ad, isAdActive, isAdExpanded, adKey, now);
                  }),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Antardasha row with sub-expandable Pratyantardashas
  Widget _buildAntardashaTile(
    DashaPeriodModel md,
    DashaPeriodModel ad,
    bool isAdActive,
    bool isAdExpanded,
    String adKey,
    DateTime now,
  ) {
    final hasPratyantar = ad.subPeriods.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isAdActive ? AppColors.tintAmberBg : AppColors.canvas,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isAdActive ? AppColors.gold : AppColors.cardBorderSubtle,
          width: isAdActive ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: hasPratyantar,
            expanded: hasPratyantar ? isAdExpanded : null,
            child: InkWell(
              onTap: hasPratyantar ? () => _toggleAntardasha(adKey) : null,
              borderRadius: BorderRadius.circular(12),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 56),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                Text(
                                  '${md.displayName} – ${ad.displayName}',
                                  style: kAdvBody.copyWith(fontWeight: FontWeight.w600),
                                ),
                                if (isAdActive) const AdvBadge.now('Now'),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${ad.formattedDateRange} · ${ad.formattedDuration}',
                              style: kAdvSecondary,
                            ),
                          ],
                        ),
                      ),
                      if (hasPratyantar) ...[
                        const SizedBox(width: 8),
                        Icon(
                          isAdExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                          size: 24,
                          color: AppColors.secondary,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),

          // LEVEL 3: PRATYANTARDASHAS
          if (isAdExpanded && hasPratyantar) ...[
            const Divider(height: 1, color: AppColors.cardBorderSubtle),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: ad.subPeriods.map((pd) {
                  final isPdActive = pd.isActive || pd.isCurrent(now);
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Icon(
                            Icons.subdirectory_arrow_right_rounded,
                            size: 18,
                            color: isPdActive ? AppColors.goldDark : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 8,
                                runSpacing: 4,
                                children: [
                                  Text(
                                    '${ad.displayName} – ${pd.displayName}',
                                    style: kAdvBody.copyWith(
                                      fontSize: 15,
                                      fontWeight: isPdActive ? FontWeight.w700 : FontWeight.w500,
                                    ),
                                  ),
                                  if (isPdActive) const AdvBadge.now('Now'),
                                ],
                              ),
                              Text(pd.formattedDateRange, style: kAdvSecondary),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  ExplanationContext _buildDashaExplanationContext(
    BirthProfileModel profile,
    DashaTreeModel dashaTree,
    DashaPeriodModel? currentMd,
    DashaPeriodModel? currentAd,
    DashaPeriodModel? currentPd,
    DateTime now,
  ) {
    return ExplanationContext(
      feature: 'vimshottari_dasha',
      screenTitle: 'Vimshottari Dasha',
      purpose: 'Explain current active planetary dasha period, its ruler energies, and general life themes',
      astrologyData: {
        'currentMahadasha': currentMd != null
            ? {
                'planet': currentMd.planet,
                'startDate': currentMd.startDate.toIso8601String(),
                'endDate': currentMd.endDate.toIso8601String(),
                'durationYears': currentMd.durationYears,
              }
            : null,
        'currentAntardasha': currentAd != null
            ? {
                'planet': currentAd.planet,
                'startDate': currentAd.startDate.toIso8601String(),
                'endDate': currentAd.endDate.toIso8601String(),
              }
            : null,
        'currentPratyantardasha': currentPd != null
            ? {
                'planet': currentPd.planet,
                'startDate': currentPd.startDate.toIso8601String(),
                'endDate': currentPd.endDate.toIso8601String(),
              }
            : null,
        'allMahadashas': dashaTree.mahadashas
            .map((m) => {
                  'planet': m.planet,
                  'durationYears': m.durationYears,
                  'startDate': m.startDate.toIso8601String(),
                  'endDate': m.endDate.toIso8601String(),
                  'isCurrent': m.isCurrent(now),
                })
            .toList(),
      },
      importantValues: {
        'activeMahadasha': currentMd?.planet,
        'activeAntardasha': currentAd?.planet,
        'activePratyantardasha': currentPd?.planet,
      },
      userProfileContext: {
        'name': profile.name,
        'dateOfBirth': profile.dateOfBirth,
      },
    );
  }
}

