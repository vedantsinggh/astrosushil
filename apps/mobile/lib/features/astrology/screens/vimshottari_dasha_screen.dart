import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/dasha_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/planet_chip.dart';
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

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const AstroAppBar(
        title: 'Vimshottari Dasha (दशा)',
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: activeProfile == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
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
                  ),
                )
              : Column(
                  children: [
                    // 1. TOP STICKY ACTIVE PROFILE BAR
                    const ActiveBirthProfileSelector(isDark: false),

                    // 2. MAIN SCROLLABLE CONTENT
                    Expanded(
                      child: _buildDashaContent(context, activeProfile),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildDashaContent(BuildContext context, BirthProfileModel profile) {
    final dashaAsync = ref.watch(vimshottariDashaForProfileProvider(profile));

    return dashaAsync.when(
      loading: () => const AstrologyLoadingState(
        message: 'Calculating Vimshottari Dasha timeline...',
      ),
      error: (error, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: AstrologyErrorState(
            error: error,
            customMessage: 'Failed to calculate Dasha timeline. Tap to retry.',
            onRetry: () => ref.refresh(vimshottariDashaForProfileProvider(profile)),
          ),
        ),
      ),
      data: (dashaTree) {
        if (dashaTree.mahadashas.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: AstrologyEmptyState(
                title: 'No Dasha Data Available',
                message: 'Could not compute Vimshottari dasha periods for this profile.',
                actionLabel: 'Refresh',
                onAction: () => ref.refresh(vimshottariDashaForProfileProvider(profile)),
              ),
            ),
          );
        }

        final now = DateTime.now();
        final currentMd = dashaTree.getCurrentMahadasha(now);
        final currentAd = dashaTree.getCurrentAntardasha(now);
        final currentPd = dashaTree.getCurrentPratyantardasha(now);

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(vimshottariDashaForProfileProvider(profile)),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Educational Explanation Card
                AstrologyExplanationCard(
                  title: context.l10n.explainDashaTitle,
                  whatIsText: context.l10n.explainDashaWhatIs,
                  howToReadText: context.l10n.explainDashaHowToRead,
                ),
                const SizedBox(height: 14),

                // 1. ACTIVE RUNNING PERIOD CARD
                _buildCurrentPeriodCard(currentMd, currentAd, currentPd, now),

                const SizedBox(height: 14),

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

                const SizedBox(height: 16),

                // 2. MAHADASHA 120-YEAR TIMELINE SECTION
                AstrologySectionCard(
                  title: '120-Year Mahadasha Timeline',
                  subtitle: 'Tap any Mahadasha to inspect Antardashas & Pratyantardashas',
                  icon: Icons.timeline_rounded,
                  badgeText: 'PARASHARI',
                  badgeColor: AppColors.secondary,
                  child: Column(
                    children: [
                      ...dashaTree.mahadashas.map((md) {
                        final isMdActive = md.isActive || md.isCurrent(now);
                        final isExpanded = _expandedMahadashas.contains(md.order);

                        return _buildMahadashaTile(md, isMdActive, isExpanded, now);
                      }),
                    ],
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Highlighted card displaying the currently operating Mahadasha, Antardasha & Pratyantardasha
  Widget _buildCurrentPeriodCard(
    DashaPeriodModel? currentMd,
    DashaPeriodModel? currentAd,
    DashaPeriodModel? currentPd,
    DateTime now,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppGradients.heroCosmic,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.35),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with ACTIVE badge and remaining duration
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.gold,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.flash_on_rounded, size: 12, color: AppColors.primary),
                    SizedBox(width: 4),
                    Text(
                      'ACTIVE PERIOD',
                      style: TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: Text(
                  currentMd != null ? currentMd.remainingDuration(now) : 'Unavailable',
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.gold,
                  ),
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Active planetary path label
          Text(
            'Current Dasha Influence',
            style: TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),

          if (currentMd == null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
              ),
              child: const Text(
                'No active Dasha period identified for the current date.',
                style: TextStyle(
                  fontFamily: AppTypography.bodyFamily,
                  fontSize: 12,
                  color: Colors.white70,
                ),
              ),
            ),
          ] else ...[
            // Primary active path display
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 6,
              runSpacing: 6,
              children: [
                _buildActivePlanetPill(currentMd.displayName, 'Mahadasha', true),
                if (currentAd != null) ...[
                  const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.gold),
                  _buildActivePlanetPill(currentAd.displayName, 'Antardasha', false),
                ],
                if (currentPd != null) ...[
                  const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.gold),
                  _buildActivePlanetPill(currentPd.displayName, 'Pratyantar', false),
                ],
              ],
            ),
          ],

          const SizedBox(height: 16),
          Divider(height: 1, color: Colors.white.withValues(alpha: 0.15)),
          const SizedBox(height: 12),

          // Date span
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.gold),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  currentMd != null
                      ? '${currentMd.displayName} Mahadasha: ${currentMd.formattedDateRange}'
                      : 'Operating period dates not available',
                  style: TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActivePlanetPill(String name, String level, bool isPrimary) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isPrimary ? AppColors.primary : Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isPrimary ? AppColors.gold : Colors.white.withValues(alpha: 0.22),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            name,
            style: const TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Text(
            level,
            style: TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontSize: 9,
              fontWeight: FontWeight.w500,
              color: isPrimary ? AppColors.gold : Colors.white70,
            ),
          ),
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
        color: isMdActive ? AppColors.goldLight.withValues(alpha: 0.2) : AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isMdActive ? AppColors.gold : AppColors.cardBorder,
          width: isMdActive ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => _toggleMahadasha(md.order),
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
              child: Row(
                children: [
                  PlanetChip(
                    planetName: md.displayName,
                    isCompact: true,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 4,
                          runSpacing: 2,
                          children: [
                            Text(
                              '${md.displayName} Mahadasha',
                              style: const TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                            if (isMdActive)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppColors.gold,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'NOW',
                                  style: TextStyle(
                                    fontFamily: AppTypography.bodyFamily,
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          md.formattedDateRange,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 10.5,
                            color: AppColors.textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        md.formattedDuration,
                        style: const TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.secondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Icon(
                        isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        color: AppColors.primary,
                        size: 18,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // EXPANDED ANTARDASHAS (LEVEL 2)
          if (isExpanded) ...[
            const Divider(height: 1, color: AppColors.cardBorder),
            Container(
              padding: const EdgeInsets.only(left: 10, right: 10, bottom: 10, top: 8),
              color: AppColors.canvasSecondary.withValues(alpha: 0.5),
              child: Column(
                children: md.subPeriods.map((ad) {
                  final isAdActive = ad.isActive || ad.isCurrent(now);
                  final adKey = '${md.order}_${ad.order}';
                  final isAdExpanded = _expandedAntardashas.contains(adKey);

                  return _buildAntardashaTile(md, ad, isAdActive, isAdExpanded, adKey, now);
                }).toList(),
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
      margin: const EdgeInsets.symmetric(vertical: 3.5),
      decoration: BoxDecoration(
        color: isAdActive ? AppColors.goldLight.withValues(alpha: 0.25) : AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isAdActive ? AppColors.gold : AppColors.cardBorder,
          width: isAdActive ? 1.2 : 0.8,
        ),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: hasPratyantar ? () => _toggleAntardasha(adKey) : null,
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: isAdActive ? AppColors.gold : AppColors.secondary,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 4,
                          runSpacing: 2,
                          children: [
                            Text(
                              '${md.displayName} – ${ad.displayName}',
                              style: const TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                            if (isAdActive)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppColors.secondary,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: const Text(
                                  'ACTIVE',
                                  style: TextStyle(
                                    fontFamily: AppTypography.bodyFamily,
                                    fontSize: 7.5,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        Text(
                          ad.formattedDateRange,
                          style: const TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  if (hasPratyantar)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          ad.formattedDuration,
                          style: TextStyle(
                            fontFamily: AppTypography.bodyFamily,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isAdActive ? AppColors.secondary : AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Icon(
                          isAdExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                          size: 16,
                          color: AppColors.secondary,
                        ),
                      ],
                    )
                  else
                    Text(
                      ad.formattedDuration,
                      style: TextStyle(
                        fontFamily: AppTypography.bodyFamily,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                        color: isAdActive ? AppColors.secondary : AppColors.primary,
                      ),
                    ),
                ],
              ),
            ),
          ),

          // LEVEL 3: PRATYANTARDASHAS
          if (isAdExpanded && hasPratyantar) ...[
            const Divider(height: 1, color: AppColors.cardBorder),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              color: AppColors.cardSurfaceParchment,
              child: Column(
                children: ad.subPeriods.map((pd) {
                  final isPdActive = pd.isActive || pd.isCurrent(now);
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3.0),
                    child: Row(
                      children: [
                        const SizedBox(width: 8),
                        Icon(
                          Icons.subdirectory_arrow_right_rounded,
                          size: 12,
                          color: isPdActive ? AppColors.gold : AppColors.textMuted,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            '${ad.displayName} – ${pd.displayName}',
                            style: TextStyle(
                              fontFamily: AppTypography.bodyFamily,
                              fontSize: 11,
                              fontWeight: isPdActive ? FontWeight.bold : FontWeight.w500,
                              color: isPdActive ? AppColors.primary : AppColors.primary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            pd.formattedDateRange,
                            style: const TextStyle(
                              fontFamily: AppTypography.bodyFamily,
                              fontSize: 9.5,
                              color: AppColors.textSecondary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isPdActive) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.gold,
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: const Text(
                              'NOW',
                              style: TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 7.5,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
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

