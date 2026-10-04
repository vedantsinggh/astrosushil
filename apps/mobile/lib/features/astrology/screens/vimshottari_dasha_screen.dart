import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
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
      backgroundColor: AppColors.lightBackground,
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
                // 1. ACTIVE RUNNING PERIOD CARD
                _buildCurrentPeriodCard(currentMd, currentAd, currentPd, now),

                const SizedBox(height: 18),

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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.88),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 12,
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
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.flash_on_rounded, size: 12, color: AppColors.primary),
                    SizedBox(width: 4),
                    Text(
                      'ACTIVE PERIOD',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              if (currentMd != null)
                Flexible(
                  child: Text(
                    currentMd.remainingDuration(now),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.premiumAccent,
                    ),
                    textAlign: TextAlign.right,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
          ),

          const SizedBox(height: 14),

          // Active planetary path label
          Text(
            'Current Dasha Influence',
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.75),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),

          // Primary active path display
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 6,
            runSpacing: 6,
            children: [
              if (currentMd != null) ...[
                _buildActivePlanetPill(currentMd.displayName, 'Mahadasha', true),
              ],
              if (currentAd != null) ...[
                const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.premiumAccent),
                _buildActivePlanetPill(currentAd.displayName, 'Antardasha', false),
              ],
              if (currentPd != null) ...[
                const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.premiumAccent),
                _buildActivePlanetPill(currentPd.displayName, 'Pratyantar', false),
              ],
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: Colors.white24),
          const SizedBox(height: 12),

          // Date span
          if (currentMd != null)
            Row(
              children: [
                const Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.premiumAccent),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '${currentMd.displayName} Mahadasha: ${currentMd.formattedDateRange}',
                    style: TextStyle(
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
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: isPrimary ? AppColors.secondary : Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isPrimary ? AppColors.premiumAccent : Colors.white24,
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
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Text(
            level,
            style: TextStyle(
              fontSize: 8.5,
              color: isPrimary ? AppColors.premiumAccent : Colors.white70,
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
        color: isMdActive ? AppColors.primary.withValues(alpha: 0.04) : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isMdActive ? AppColors.primary : AppColors.lightBorder,
          width: isMdActive ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => _toggleMahadasha(md.order),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                          spacing: 6,
                          runSpacing: 2,
                          children: [
                            Text(
                              '${md.displayName} Mahadasha',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                            if (isMdActive)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppColors.secondary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'NOW',
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          md.formattedDateRange,
                          style: TextStyle(
                            fontSize: 10.5,
                            color: AppColors.primary.withValues(alpha: 0.7),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    md.formattedDuration,
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),

          // EXPANDED ANTARDASHAS (LEVEL 2)
          if (isExpanded) ...[
            const Divider(height: 1, color: AppColors.lightBorder),
            Container(
              padding: const EdgeInsets.only(left: 10, right: 10, bottom: 8, top: 6),
              color: AppColors.lightBackground.withValues(alpha: 0.5),
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
      margin: const EdgeInsets.symmetric(vertical: 3),
      decoration: BoxDecoration(
        color: isAdActive ? AppColors.secondary.withValues(alpha: 0.08) : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isAdActive ? AppColors.secondary : AppColors.lightBorder,
          width: isAdActive ? 1.2 : 0.8,
        ),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: hasPratyantar ? () => _toggleAntardasha(adKey) : null,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
              child: Row(
                children: [
                  Container(
                    width: 5,
                    height: 5,
                    decoration: BoxDecoration(
                      color: isAdActive ? AppColors.secondary : AppColors.primary.withValues(alpha: 0.4),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
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
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.bold,
                                color: isAdActive ? AppColors.secondary : AppColors.primary,
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
                                  style: TextStyle(fontSize: 7.5, fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                              ),
                          ],
                        ),
                        Text(
                          ad.formattedDateRange,
                          style: TextStyle(
                            fontSize: 9.5,
                            color: AppColors.primary.withValues(alpha: 0.65),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Text(
                    ad.formattedDuration,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: isAdActive ? AppColors.secondary : AppColors.primary,
                    ),
                  ),
                  if (hasPratyantar) ...[
                    const SizedBox(width: 2),
                    Icon(
                      isAdExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      size: 15,
                      color: AppColors.secondary,
                    ),
                  ],
                ],
              ),
            ),
          ),

          // LEVEL 3: PRATYANTARDASHAS
          if (isAdExpanded && hasPratyantar) ...[
            const Divider(height: 1, color: AppColors.lightBorder),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              color: AppColors.lightSurface,
              child: Column(
                children: ad.subPeriods.map((pd) {
                  final isPdActive = pd.isActive || pd.isCurrent(now);
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2.5),
                    child: Row(
                      children: [
                        const SizedBox(width: 8),
                        Icon(
                          Icons.subdirectory_arrow_right_rounded,
                          size: 11,
                          color: isPdActive ? AppColors.secondary : AppColors.lightBorder,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '${ad.displayName} – ${pd.displayName}',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: isPdActive ? FontWeight.bold : FontWeight.w500,
                              color: isPdActive ? AppColors.secondary : AppColors.primary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            pd.formattedDateRange,
                            style: TextStyle(
                              fontSize: 9,
                              color: AppColors.primary.withValues(alpha: 0.6),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isPdActive) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.premiumAccent,
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: const Text(
                              'NOW',
                              style: TextStyle(fontSize: 7.5, fontWeight: FontWeight.bold, color: AppColors.primary),
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
}
