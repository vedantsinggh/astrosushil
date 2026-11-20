import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/matchmaking_model.dart';
import '../providers/astrology_provider.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';

/// Kundli Matchmaking (Ashtakoota Guna Milan & Manglik Comparison) Screen.
/// Provides deterministic compatibility analysis for two birth profiles.
class MatchmakingScreen extends ConsumerStatefulWidget {
  const MatchmakingScreen({super.key});

  @override
  ConsumerState<MatchmakingScreen> createState() => _MatchmakingScreenState();
}

class _MatchmakingScreenState extends ConsumerState<MatchmakingScreen> {
  void _recalculate(BirthProfileModel? personA, BirthProfileModel? personB) {
    if (personA != null && personB != null) {
      ref.read(matchmakingProvider.notifier).calculateMatchmaking(
            personA: personA,
            personB: personB,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final personA = ref.watch(matchmakingPersonAProvider);
    final personB = ref.watch(matchmakingPersonBProvider);
    final matchState = ref.watch(matchmakingProvider);
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final allProfiles = profilesState.profiles;

    final Widget body = matchState.isLoading
        ? const AstrologyLoadingState(
            message: 'Calculating 36-point Ashtakoota & Manglik compatibility...',
          )
        : matchState.errorMessage != null
            ? AstrologyErrorState(
                customMessage: matchState.errorMessage!,
                onRetry: () => _recalculate(personA, personB),
              )
            : matchState.result != null
                ? _buildResultView(matchState.result!, personA, personB)
                : _buildSetupView(context, personA, personB, allProfiles);

    return AstroPage(
      title: 'Kundli Matchmaking (Guna Milan)',
      child: body,
    );
  }

  Widget _buildSetupView(
    BuildContext context,
    BirthProfileModel? personA,
    BirthProfileModel? personB,
    List<BirthProfileModel> allProfiles,
  ) {
    final isSameProfile = personA != null && personB != null && personA.id == personB.id;
    final canCalculate = personA != null && personB != null && !isSameProfile;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Intro summary
        const AdvSummaryCard(
          label: 'Kundli matching',
          icon: Icons.favorite_rounded,
          title: '36-Point Ashtakoota Milan',
          subtitle: 'Select two birth profiles to evaluate classical Guna matching & Manglik compatibility.',
        ),
        const SizedBox(height: kAdvGap),

        // Person A Selection Card
        _buildProfileSelectorCard(
          context: context,
          step: 1,
          title: 'Person A (Boy / First Partner)',
          subtitle: 'Select active primary profile',
          icon: Icons.person_rounded,
          selectedProfile: personA,
          allProfiles: allProfiles,
          onSelect: (p) => ref.read(matchmakingPersonAProvider.notifier).state = p,
        ),
        const SizedBox(height: kAdvGap),

        // Person B Selection Card
        _buildProfileSelectorCard(
          context: context,
          step: 2,
          title: 'Person B (Girl / Second Partner)',
          subtitle: 'Select partner birth profile',
          icon: Icons.person_2_rounded,
          selectedProfile: personB,
          allProfiles: allProfiles,
          onSelect: (p) => ref.read(matchmakingPersonBProvider.notifier).state = p,
        ),
        const SizedBox(height: 24),

        if (isSameProfile) ...[
          AstroNote(
            context.l10n.matchmakingSameProfileWarning,
            icon: Icons.warning_amber_rounded,
            tint: AstroTint.danger,
          ),
          const SizedBox(height: kAdvGap),
        ],

        // Calculate Action Button (the single primary action)
        AdvPrimaryButton(
          onPressed: canCalculate
              ? () {
                  ref.read(matchmakingProvider.notifier).calculateMatchmaking(
                        personA: personA,
                        personB: personB,
                      );
                }
              : null,
          icon: Icons.favorite_rounded,
          label: 'Calculate Compatibility',
        ),

        if (!canCalculate && !isSameProfile) ...[
          const SizedBox(height: 12),
          const Text(
            'Please select both birth profiles to proceed.',
            textAlign: TextAlign.center,
            style: kAdvSecondary,
          ),
        ],

        const SizedBox(height: 24),

        // Educational Explanation Card ("Learn more")
        AstrologyExplanationCard(
          title: context.l10n.explainMatchmakingTitle,
          whatIsText: context.l10n.explainMatchmakingWhatIs,
          howToReadText: context.l10n.explainMatchmakingHowToRead,
        ),
      ],
    );
  }

  Widget _buildProfileSelectorCard({
    required BuildContext context,
    required int step,
    required String title,
    required String subtitle,
    required IconData icon,
    required BirthProfileModel? selectedProfile,
    required List<BirthProfileModel> allProfiles,
    required ValueChanged<BirthProfileModel?> onSelect,
  }) {
    final selected = selectedProfile != null;
    return AdvCard(
      padding: const EdgeInsets.all(18),
      borderColor: selected ? AppColors.goldBorder : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdvStepHeader(step: step, total: 2, title: title, hint: subtitle),
          const SizedBox(height: 14),
          if (selectedProfile != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AstroTint.rose.background.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AstroIconSquare(icon: icon, tint: AstroTint.rose, size: 40),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          selectedProfile.name,
                          style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${selectedProfile.dateOfBirth} • ${selectedProfile.timeOfBirth}',
                          style: kAdvSecondary,
                        ),
                        Text(
                          selectedProfile.placeName.isNotEmpty
                              ? selectedProfile.placeName
                              : '${selectedProfile.latitude}, ${selectedProfile.longitude}',
                          style: kAdvSecondary,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () => _showProfileSelectionModal(
                  context,
                  allProfiles,
                  selectedProfile,
                  onSelect,
                ),
                style: TextButton.styleFrom(
                  minimumSize: const Size(48, 48),
                  foregroundColor: AppColors.accent,
                  textStyle: kAdvBody.copyWith(fontWeight: FontWeight.w600),
                ),
                icon: const Icon(Icons.swap_horiz_rounded, size: 22),
                label: const Text('Change'),
              ),
            ),
          ] else ...[
            AdvSecondaryButton(
              onPressed: () => _showProfileSelectionModal(
                context,
                allProfiles,
                selectedProfile,
                onSelect,
              ),
              icon: Icons.add_rounded,
              label: 'Select Profile',
            ),
          ],
        ],
      ),
    );
  }

  void _showProfileSelectionModal(
    BuildContext context,
    List<BirthProfileModel> allProfiles,
    BirthProfileModel? currentSelected,
    ValueChanged<BirthProfileModel?> onSelect,
  ) {
    showAstroSheet<void>(
      context: context,
      title: 'Select Saved Profile',
      builder: (ctx) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (allProfiles.isEmpty)
              const AstroStateView.empty(
                compact: true,
                icon: Icons.people_outline_rounded,
                title: 'No saved profiles found.',
              )
            else
              AstroGroupedSection(
                children: [
                  for (final p in allProfiles)
                    AstroListRow(
                      leading: CircleAvatar(
                        radius: 18,
                        backgroundColor: currentSelected?.id == p.id
                            ? AppColors.primary
                            : AstroTint.rose.background,
                        foregroundColor: currentSelected?.id == p.id ? Colors.white : AstroTint.rose.foreground,
                        child: Text(
                          p.name.isNotEmpty ? p.name[0].toUpperCase() : '?',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                      title: p.name,
                      subtitle: '${p.dateOfBirth} • ${p.placeName}',
                      trailing: currentSelected?.id == p.id
                          ? const Icon(Icons.check_rounded, color: AppColors.accent)
                          : null,
                      onTap: () {
                        onSelect(p);
                        Navigator.pop(ctx);
                      },
                    ),
                ],
              ),
            const SizedBox(height: 16),
            AstroSecondaryButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
              icon: Icons.add_rounded,
              label: 'Add New Birth Profile',
            ),
          ],
        );
      },
    );
  }

  ExplanationContext _buildExplanationContext(
    MatchmakingReportModel result,
    BirthProfileModel? personA,
    BirthProfileModel? personB,
  ) {
    return ExplanationContext(
      feature: 'matchmaking',
      screenTitle: 'Kundli Matchmaking (Guna Milan)',
      purpose: 'Explain the 36-point Ashtakoota compatibility score (${result.totalScore}/36) and Manglik balance for ${personA?.name ?? "Partner 1"} and ${personB?.name ?? "Partner 2"}.',
      astrologyData: {
        'totalScore': result.totalScore,
        'maxScore': result.maxScore,
        'isCompatible': result.isCompatible,
        'verdict': result.overallVerdict ?? (result.isCompatible ? 'AUSPICIOUS_MATCH' : 'INCOMPATIBLE_MATCH'),
        'kootas': result.ashtakoota.kootaList.map((k) => {
          'name': k.name,
          'score': k.scoreFormatted,
          'maxPoints': k.maxPoints,
          'obtainedPoints': k.obtainedPoints,
          'isDoshaCancelled': k.isDoshaCancelled,
          'description': k.description,
        }).toList(),
        'manglikComparison': {
          'isHarmonious': result.manglikComparison.isHarmonious,
          'verdict': result.manglikComparison.verdict,
          'personAIsManglik': result.manglikComparison.personA.isManglik,
          'personBIsManglik': result.manglikComparison.personB.isManglik,
        },
      },
      importantValues: {
        'totalScore': '${result.totalScore}/${result.maxScore.toInt()}',
        'manglikHarmonious': result.manglikComparison.isHarmonious,
      },
      userProfileContext: {
        'personA': personA?.name,
        'personB': personB?.name,
      },
    );
  }

  Widget _buildResultView(
    MatchmakingReportModel result,
    BirthProfileModel? personA,
    BirthProfileModel? personB,
  ) {
    final ashtakoota = result.ashtakoota;
    final manglik = result.manglikComparison;
    final moonA = result.personA;
    final moonB = result.personB;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. HERO COMPATIBILITY SCORE CARD
        _buildHeroScoreCard(result),

        const SizedBox(height: kAdvGap),

        // Sushil Sir Explainer Button
        SushilExplainerButton(
          contextBuilder: () => _buildExplanationContext(result, personA, personB),
          poseAsset: AppAssets.sushilFriendly,
        ),

        const SizedBox(height: kAdvGap),

        // 2. 8-KOOTA BREAKDOWN
        _buildAshtakootaBreakdownCard(ashtakoota),
        const SizedBox(height: kAdvGap),

        // 3. MANGLIK COMPATIBILITY EVALUATION
        _buildManglikComparisonCard(manglik, personA?.name ?? 'Person A', personB?.name ?? 'Person B'),
        const SizedBox(height: kAdvGap),

        // 4. MOON PROFILES COMPARISON (detail, collapsed)
        _buildMoonProfilesComparisonCard(personA, personB, moonA, moonB),
        const SizedBox(height: 24),

        // 5. RECALCULATE / CHANGE PROFILES
        AdvSecondaryButton(
          onPressed: () {
            ref.read(matchmakingProvider.notifier).clear();
          },
          icon: Icons.people_outline_rounded,
          label: 'Select Different Profiles',
        ),
        const SizedBox(height: 8),
        Center(
          child: TextButton.icon(
            onPressed: () => _recalculate(personA, personB),
            style: TextButton.styleFrom(
              minimumSize: const Size(48, 48),
              foregroundColor: AppColors.accent,
              textStyle: kAdvBody.copyWith(fontWeight: FontWeight.w600),
            ),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Recalculate'),
          ),
        ),
      ],
    );
  }

  Widget _buildHeroScoreCard(MatchmakingReportModel result) {
    final score = result.totalScore;
    final isCompatible = result.isCompatible;
    final manglikHarmonious = result.manglikComparison.isHarmonious;

    // Lighter tints so the score stays readable on the dark summary card.
    const goodOnDark = Color(0xFF6EE7B7);
    const midOnDark = Color(0xFF5EEAD4);
    const lowOnDark = Color(0xFFFCA5A5);

    Color scoreColor;
    String scoreStatus;
    if (score >= 28) {
      scoreColor = goodOnDark;
      scoreStatus = 'Excellent Match (Uttama)';
    } else if (score >= 18) {
      scoreColor = midOnDark;
      scoreStatus = 'Favorable Match (Madhyama)';
    } else {
      scoreColor = lowOnDark;
      scoreStatus = 'Low Guna Match (< 18 Points)';
    }

    return AdvSummaryCard(
      label: 'Compatibility score',
      icon: Icons.favorite_rounded,
      title: scoreStatus,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 8,
            children: [
              Text(
                score % 1 == 0 ? score.toInt().toString() : score.toStringAsFixed(1),
                style: TextStyle(
                  fontFamily: AppTypography.headingFamily,
                  fontFamilyFallback: AppTypography.headingFontFamilies,
                  fontSize: 52,
                  fontWeight: FontWeight.w700,
                  color: scoreColor,
                  height: 1.0,
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Text(
                  '/ 36',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textInverseSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          AdvStatGrid(
            onDark: true,
            stats: [
              AdvStat(
                label: 'Ashtakoota',
                value: isCompatible ? 'PASSED (≥ 18)' : 'FAILED (< 18)',
                accent: isCompatible ? goodOnDark : lowOnDark,
              ),
              AdvStat(
                label: 'Manglik Status',
                value: manglikHarmonious ? 'HARMONIOUS' : 'MISMATCH',
                accent: manglikHarmonious ? goodOnDark : lowOnDark,
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Label on top, value underneath: reads well on narrow phones and at large
  /// text sizes where a side-by-side "A vs B" row would be cramped.
  Widget _stackedRow(String label, String value, {bool bold = false, bool last = false}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: last
          ? null
          : const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.cardBorderSubtle)),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: kAdvSecondary),
          const SizedBox(height: 2),
          Text(value, style: kAdvBody.copyWith(fontWeight: bold ? FontWeight.w700 : FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildMoonProfilesComparisonCard(
    BirthProfileModel? personA,
    BirthProfileModel? personB,
    DerivedMoonProfileModel moonA,
    DerivedMoonProfileModel moonB,
  ) {
    return AdvDetailsExpander(
      title: 'Moon Placement Comparison',
      subtitle: 'Derived natal factors forming the foundation of Guna Milan',
      icon: Icons.nightlight_round,
      child: Column(
        children: [
          _stackedRow(
            'Querent / Person',
            '${personA?.name ?? "Person A"} vs ${personB?.name ?? "Person B"}',
            bold: true,
          ),
          _stackedRow(
            'Moon Sign (Rashi)',
            '${moonA.rashiName} (${moonA.rashiLord}) vs ${moonB.rashiName} (${moonB.rashiLord})',
          ),
          _stackedRow(
            'Nakshatra & Pada',
            '${moonA.nakshatraName} P${moonA.pada} vs ${moonB.nakshatraName} P${moonB.pada}',
          ),
          _stackedRow(
            'Varna & Rank',
            '${moonA.varna} (${moonA.varnaRank}) vs ${moonB.varna} (${moonB.varnaRank})',
          ),
          _stackedRow(
            'Gana (Temperament)',
            '${moonA.gana} vs ${moonB.gana}',
          ),
          _stackedRow(
            'Yoni Animal',
            '${moonA.yoniAnimal} (${moonA.yoniGender}) vs ${moonB.yoniAnimal} (${moonB.yoniGender})',
          ),
          _stackedRow(
            'Nadi (Pulse/Constitution)',
            '${moonA.nadi} vs ${moonB.nadi}',
            last: true,
          ),
        ],
      ),
    );
  }

  Widget _buildAshtakootaBreakdownCard(AshtakootaReportModel ashtakoota) {
    return AdvSection(
      title: '8-Koota Breakdown (${ashtakoota.totalObtainedPoints.toStringAsFixed(ashtakoota.totalObtainedPoints % 1 == 0 ? 0 : 1)} / 36)',
      subtitle: 'Detailed evaluation of all 8 classical compatibility pillars',
      icon: Icons.checklist_rounded,
      tint: AstroTint.rose,
      inCard: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: ashtakoota.kootaList.map((koota) {
          return _buildKootaTile(koota);
        }).toList(),
      ),
    );
  }

  Widget _buildKootaTile(IndividualKootaModel koota) {
    final bool full = koota.isFullScore;
    final bool zero = koota.isZeroScore;
    final Color badgeColor = full
        ? const Color(0xFF047857)
        : zero
            ? const Color(0xFFB91C1C)
            : AppColors.goldDark;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text.rich(
                  TextSpan(
                    text: koota.name,
                    style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
                    children: [
                      if (koota.sanskritName.isNotEmpty) ...[
                        const TextSpan(text: ' '),
                        TextSpan(
                          text: '(${koota.sanskritName})',
                          style: kAdvSecondary,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              AdvBadge(koota.scoreFormatted, color: badgeColor),
            ],
          ),
          const SizedBox(height: 6),
          Text(koota.description, style: kAdvSecondary),
          if (koota.isDoshaCancelled && koota.cancellationReason != null) ...[
            const SizedBox(height: 8),
            AdvNote(
              'Neutralized: ${koota.cancellationReason}',
              icon: Icons.check_circle_outline_rounded,
              color: const Color(0xFF047857),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildManglikComparisonCard(
    ManglikComparisonModel manglik,
    String nameA,
    String nameB,
  ) {
    return AdvSection(
      title: 'Manglik Compatibility Evaluation',
      subtitle: 'Pairwise Mars placement and partnership dynamics',
      icon: Icons.shield_rounded,
      tint: AstroTint.coral,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.canvas,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorderSubtle),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Verdict: ${manglik.verdict.replaceAll("_", " ")}',
                  style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
                ),
                if (manglik.explanation.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(manglik.explanation, style: kAdvSecondary),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          _buildIndividualManglikStatus(nameA, manglik.personA),
          const SizedBox(height: 4),
          _buildIndividualManglikStatus(nameB, manglik.personB, last: true),
        ],
      ),
    );
  }

  Widget _buildIndividualManglikStatus(String personName, ManglikStatusModel status, {bool last = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: last
          ? null
          : const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.cardBorderSubtle)),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(personName, style: kAdvBody.copyWith(fontWeight: FontWeight.w700)),
              AdvBadge(
                status.isManglik ? 'PRESENT' : 'NOT PRESENT',
                color: status.isManglik ? AppColors.primary : const Color(0xFF047857),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Mars House from Lagna: H${status.houseFromLagna} • From Moon: H${status.houseFromMoon}',
            style: kAdvSecondary,
          ),
          if (status.cancellationFactors.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              'Alignment Factors: ${status.cancellationFactors.join(", ")}',
              style: kAdvSecondary.copyWith(color: const Color(0xFF047857)),
            ),
          ],
        ],
      ),
    );
  }
}
