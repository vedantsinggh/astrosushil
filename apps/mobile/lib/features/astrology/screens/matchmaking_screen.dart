import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/matchmaking_model.dart';
import '../providers/astrology_provider.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';

/// Kundli Matchmaking (Ashtakoota Guna Milan & Manglik Comparison) Screen.
/// Provides deterministic compatibility analysis for two birth profiles.
class MatchmakingScreen extends ConsumerStatefulWidget {
  const MatchmakingScreen({super.key});

  @override
  ConsumerState<MatchmakingScreen> createState() => _MatchmakingScreenState();
}

class _MatchmakingScreenState extends ConsumerState<MatchmakingScreen> {
  @override
  Widget build(BuildContext context) {
    final personA = ref.watch(matchmakingPersonAProvider);
    final personB = ref.watch(matchmakingPersonBProvider);
    final matchState = ref.watch(matchmakingProvider);
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final allProfiles = profilesState.profiles;

    return Scaffold(
      appBar: AstroAppBar(
        title: 'Kundli Matchmaking (Guna Milan)',
        actions: [
          if (matchState.result != null)
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
              tooltip: 'Recalculate',
              onPressed: () {
                if (personA != null && personB != null) {
                  ref.read(matchmakingProvider.notifier).calculateMatchmaking(
                        personA: personA,
                        personB: personB,
                      );
                }
              },
            ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: matchState.isLoading
            ? const Center(
                child: AstrologyLoadingState(
                  message: 'Calculating 36-point Ashtakoota & Manglik compatibility...',
                ),
              )
            : matchState.errorMessage != null
                ? Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: AstrologyErrorState(
                      customMessage: matchState.errorMessage!,
                      onRetry: () {
                        if (personA != null && personB != null) {
                          ref.read(matchmakingProvider.notifier).calculateMatchmaking(
                                personA: personA,
                                personB: personB,
                              );
                        }
                      },
                    ),
                  )
                : matchState.result != null
                    ? _buildResultView(matchState.result!, personA, personB)
                    : _buildSetupView(context, personA, personB, allProfiles),
      ),
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

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainMatchmakingTitle,
          whatIsText: context.l10n.explainMatchmakingWhatIs,
          howToReadText: context.l10n.explainMatchmakingHowToRead,
        ),
        const SizedBox(height: 12),

        // Intro Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.primary.withValues(alpha: 0.08),
                AppColors.secondary.withValues(alpha: 0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.favorite_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '36-Point Ashtakoota Milan',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Select two birth profiles to evaluate classical Guna matching & Manglik compatibility.',
                      style: TextStyle(
                        fontSize: 11.5,
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

        // Person A Selection Card
        _buildProfileSelectorCard(
          context: context,
          title: 'Person A (Boy / First Partner)',
          subtitle: 'Select active primary profile',
          icon: Icons.person_rounded,
          iconColor: Colors.indigo,
          selectedProfile: personA,
          allProfiles: allProfiles,
          onSelect: (p) => ref.read(matchmakingPersonAProvider.notifier).state = p,
        ),
        const SizedBox(height: 16),

        // Person B Selection Card
        _buildProfileSelectorCard(
          context: context,
          title: 'Person B (Girl / Second Partner)',
          subtitle: 'Select partner birth profile',
          icon: Icons.person_2_rounded,
          iconColor: Colors.pink,
          selectedProfile: personB,
          allProfiles: allProfiles,
          onSelect: (p) => ref.read(matchmakingPersonBProvider.notifier).state = p,
        ),
        const SizedBox(height: 24),

        if (isSameProfile) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.l10n.matchmakingSameProfileWarning,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Calculate Action Button
        ElevatedButton.icon(
          onPressed: canCalculate
              ? () {
                  ref.read(matchmakingProvider.notifier).calculateMatchmaking(
                        personA: personA,
                        personB: personB,
                      );
                }
              : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            disabledBackgroundColor: Colors.grey.shade300,
            disabledForegroundColor: Colors.grey.shade600,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          icon: const Icon(Icons.favorite_rounded, color: Colors.white),
          label: const Text(
            'Calculate Compatibility',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        if (!canCalculate && !isSameProfile) ...[
          const SizedBox(height: 12),
          const Center(
            child: Text(
              'Please select both birth profiles to proceed.',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.secondary,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildProfileSelectorCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required BirthProfileModel? selectedProfile,
    required List<BirthProfileModel> allProfiles,
    required ValueChanged<BirthProfileModel?> onSelect,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selectedProfile != null
              ? iconColor.withValues(alpha: 0.4)
              : AppColors.border.withValues(alpha: 0.2),
          width: selectedProfile != null ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: iconColor,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          if (selectedProfile != null) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          selectedProfile.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${selectedProfile.dateOfBirth} • ${selectedProfile.timeOfBirth}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.secondary,
                          ),
                        ),
                        Text(
                          selectedProfile.placeName.isNotEmpty
                              ? selectedProfile.placeName
                              : '${selectedProfile.latitude}, ${selectedProfile.longitude}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => _showProfileSelectionModal(
                      context,
                      allProfiles,
                      selectedProfile,
                      onSelect,
                    ),
                    icon: const Icon(Icons.swap_horiz_rounded, size: 16),
                    label: const Text('Change', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ),
          ] else ...[
            OutlinedButton.icon(
              onPressed: () => _showProfileSelectionModal(
                context,
                allProfiles,
                selectedProfile,
                onSelect,
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(44),
                side: BorderSide(color: iconColor.withValues(alpha: 0.5)),
                foregroundColor: iconColor,
              ),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Select Profile', style: TextStyle(fontWeight: FontWeight.w600)),
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Select Saved Profile',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const Divider(),
                if (allProfiles.isEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text('No saved profiles found.'),
                    ),
                  ),
                ] else ...[
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.45,
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: allProfiles.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final p = allProfiles[index];
                        final isChosen = currentSelected?.id == p.id;
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: isChosen
                                ? AppColors.primary
                                : AppColors.primary.withValues(alpha: 0.1),
                            foregroundColor: isChosen ? Colors.white : AppColors.primary,
                            child: Text(
                              p.name.isNotEmpty ? p.name[0].toUpperCase() : '?',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('${p.dateOfBirth} • ${p.placeName}'),
                          trailing: isChosen
                              ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                              : null,
                          onTap: () {
                            onSelect(p);
                            Navigator.pop(ctx);
                          },
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(44),
                  ),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Add New Birth Profile'),
                ),
              ],
            ),
          ),
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

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        // 1. HERO COMPATIBILITY SCORE CARD
        _buildHeroScoreCard(result),

        const SizedBox(height: 12),

        // Sushil Sir Explainer Button
        SushilExplainerButton(
          contextBuilder: () => _buildExplanationContext(result, personA, personB),
          poseAsset: AppAssets.sushilFriendly,
        ),

        const SizedBox(height: 16),

        // 2. MOON PROFILES COMPARISON CARD
        _buildMoonProfilesComparisonCard(personA, personB, moonA, moonB),
        const SizedBox(height: 16),

        // 3. 8-KOOTA BREAKDOWN
        _buildAshtakootaBreakdownCard(ashtakoota),
        const SizedBox(height: 16),

        // 4. MANGLIK DOSHA COMPARISON
        _buildManglikComparisonCard(manglik, personA?.name ?? 'Person A', personB?.name ?? 'Person B'),
        const SizedBox(height: 24),

        // 5. RECALCULATE / CHANGE PROFILES
        OutlinedButton.icon(
          onPressed: () {
            ref.read(matchmakingProvider.notifier).clear();
          },
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            side: const BorderSide(color: AppColors.primary),
            foregroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          icon: const Icon(Icons.people_outline_rounded),
          label: const Text(
            'Select Different Profiles',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildHeroScoreCard(MatchmakingReportModel result) {
    final score = result.totalScore;
    final isCompatible = result.isCompatible;
    final manglikHarmonious = result.manglikComparison.isHarmonious;

    Color scoreColor;
    String scoreStatus;
    if (score >= 28) {
      scoreColor = AppColors.success;
      scoreStatus = 'Excellent Match (Uttama)';
    } else if (score >= 18) {
      scoreColor = Colors.teal;
      scoreStatus = 'Favorable Match (Madhyama)';
    } else {
      scoreColor = AppColors.error;
      scoreStatus = 'Low Guna Match (< 18 Points)';
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scoreColor.withValues(alpha: 0.35), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: scoreColor.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                score % 1 == 0 ? score.toInt().toString() : score.toStringAsFixed(1),
                style: TextStyle(
                  fontSize: 42,
                  fontWeight: FontWeight.bold,
                  color: scoreColor,
                  letterSpacing: -1,
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                '/ 36',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: scoreColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              scoreStatus,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: scoreColor,
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildVerdictPill(
                  label: 'Ashtakoota',
                  verdict: isCompatible ? 'PASSED (≥ 18)' : 'FAILED (< 18)',
                  isPositive: isCompatible,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildVerdictPill(
                  label: 'Manglik Status',
                  verdict: manglikHarmonious ? 'HARMONIOUS' : 'MISMATCH',
                  isPositive: manglikHarmonious,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVerdictPill({
    required String label,
    required String verdict,
    required bool isPositive,
  }) {
    final color = isPositive ? AppColors.success : AppColors.error;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AppColors.secondary),
          ),
          const SizedBox(height: 2),
          Text(
            verdict,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
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
    return AstrologySectionCard(
      title: 'Moon Placement Comparison',
      subtitle: 'Derived natal factors forming the foundation of Guna Milan',
      icon: Icons.nightlight_round,
      child: Column(
        children: [
          AstrologyInfoRow(
            label: 'Querent / Person',
            value: '${personA?.name ?? "Person A"} vs ${personB?.name ?? "Person B"}',
            isBold: true,
          ),
          AstrologyInfoRow(
            label: 'Moon Sign (Rashi)',
            value: '${moonA.rashiName} (${moonA.rashiLord}) vs ${moonB.rashiName} (${moonB.rashiLord})',
          ),
          AstrologyInfoRow(
            label: 'Nakshatra & Pada',
            value: '${moonA.nakshatraName} P${moonA.pada} vs ${moonB.nakshatraName} P${moonB.pada}',
          ),
          AstrologyInfoRow(
            label: 'Varna & Rank',
            value: '${moonA.varna} (${moonA.varnaRank}) vs ${moonB.varna} (${moonB.varnaRank})',
          ),
          AstrologyInfoRow(
            label: 'Gana (Temperament)',
            value: '${moonA.gana} vs ${moonB.gana}',
          ),
          AstrologyInfoRow(
            label: 'Yoni Animal',
            value: '${moonA.yoniAnimal} (${moonA.yoniGender}) vs ${moonB.yoniAnimal} (${moonB.yoniGender})',
          ),
          AstrologyInfoRow(
            label: 'Nadi (Pulse/Constitution)',
            value: '${moonA.nadi} vs ${moonB.nadi}',
          ),
        ],
      ),
    );
  }

  Widget _buildAshtakootaBreakdownCard(AshtakootaReportModel ashtakoota) {
    return AstrologySectionCard(
      title: '8-Koota Breakdown (${ashtakoota.totalObtainedPoints.toStringAsFixed(ashtakoota.totalObtainedPoints % 1 == 0 ? 0 : 1)} / 36)',
      subtitle: 'Detailed evaluation of all 8 classical compatibility pillars',
      icon: Icons.checklist_rounded,
      child: Column(
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
        ? AppColors.success
        : zero
            ? AppColors.error
            : Colors.amber.shade800;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      text: koota.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      children: [
                        if (koota.sanskritName.isNotEmpty) ...[
                          const TextSpan(text: ' '),
                          TextSpan(
                            text: '(${koota.sanskritName})',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.normal,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    koota.scoreFormatted,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: badgeColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              koota.description,
              style: const TextStyle(
                fontSize: 11.5,
                color: AppColors.secondary,
              ),
            ),
            if (koota.isDoshaCancelled && koota.cancellationReason != null) ...[
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Dosha Cancelled: ${koota.cancellationReason}',
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.success,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildManglikComparisonCard(
    ManglikComparisonModel manglik,
    String nameA,
    String nameB,
  ) {
    return AstrologySectionCard(
      title: 'Manglik Dosha Comparison (Kuja Dosha)',
      subtitle: 'Pairwise Mars placement, severity, and dosha neutralization',
      icon: Icons.shield_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: manglik.isHarmonious
                  ? AppColors.success.withValues(alpha: 0.08)
                  : AppColors.error.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: manglik.isHarmonious
                    ? AppColors.success.withValues(alpha: 0.25)
                    : AppColors.error.withValues(alpha: 0.25),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Verdict: ${manglik.verdict.replaceAll("_", " ")}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: manglik.isHarmonious ? AppColors.success : AppColors.error,
                  ),
                ),
                if (manglik.explanation.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    manglik.explanation,
                    style: const TextStyle(fontSize: 12, height: 1.35),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          _buildIndividualManglikStatus(nameA, manglik.personA),
          const SizedBox(height: 8),
          _buildIndividualManglikStatus(nameB, manglik.personB),
        ],
      ),
    );
  }

  Widget _buildIndividualManglikStatus(String personName, ManglikStatusModel status) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  personName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: status.isManglik
                      ? (status.isCancelled ? Colors.orange.withValues(alpha: 0.12) : AppColors.error.withValues(alpha: 0.12))
                      : AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  status.isManglik
                      ? (status.isCancelled ? 'MANGLIK (CANCELLED)' : 'MANGLIK (${status.severity})')
                      : 'NON-MANGLIK',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: status.isManglik
                        ? (status.isCancelled ? Colors.orange.shade900 : AppColors.error)
                        : AppColors.success,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Mars House from Lagna: H${status.houseFromLagna} • From Moon: H${status.houseFromMoon}',
            style: const TextStyle(fontSize: 11, color: AppColors.secondary),
          ),
          if (status.cancellationFactors.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              'Cancellations: ${status.cancellationFactors.join(", ")}',
              style: const TextStyle(fontSize: 10.5, color: AppColors.success),
            ),
          ],
        ],
      ),
    );
  }
}
