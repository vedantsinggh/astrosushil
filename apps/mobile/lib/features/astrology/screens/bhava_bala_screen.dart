import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/strength_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen presenting Bhava Bala (12-House Potency & Strength)
/// Evaluated deterministically via Fastify backend /astrology/strength
class BhavaBalaScreen extends ConsumerStatefulWidget {
  const BhavaBalaScreen({super.key});

  @override
  ConsumerState<BhavaBalaScreen> createState() => _BhavaBalaScreenState();
}

class _BhavaBalaScreenState extends ConsumerState<BhavaBalaScreen> {
  int _selectedHouse = 1;

  static const _houseSignificances = [
    'Self, Physical Constitution, Vitality, Personality',
    'Wealth, Family, Speech, Material Accumulation',
    'Courage, Siblings, Communication, Short Journeys',
    'Mother, Domestic Happiness, Home, Vehicles',
    'Intellect, Progeny, Creativity, Past Life Merits',
    'Enemies, Debts, Health Challenges, Daily Service',
    'Marriage, Partnerships, Public Relations',
    'Longevity, Transformation, Occult, Sudden Events',
    'Dharma, Higher Wisdom, Father, Long Pilgrimages',
    'Career, Status, Executive Authority, Public Standing',
    'Gains, Aspirations, Eldest Sibling, Social Network',
    'Expenditures, Spiritual Liberation, Foreign Residence'
  ];

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return AstroPage(
      title: 'Bhava Bala (भावबल)',
      actions: [
        AstroNavAction(
          icon: Icons.info_outline_rounded,
          tooltip: 'About Bhava Bala',
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Bhava Bala evaluates the composite strength of all 12 astrological houses based on Lord strength, cusp direction, aspects, and occupants.',
                ),
                duration: Duration(seconds: 4),
              ),
            );
          },
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ActiveBirthProfileSelector(
            isDark: false,
            onProfileChanged: (_) {},
          ),
          const SizedBox(height: kAdvGap),
          if (activeProfile == null)
            AstrologyEmptyState(
              title: 'No Active Birth Profile',
              message: 'Select or create a birth profile to calculate 12-house Bhava Bala potencies.',
              actionLabel: 'Add Birth Profile',
              onAction: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
            )
          else
            ref.watch(activeProfileBhavaBalaProvider).when(
                  loading: () => const AstrologyLoadingState(
                    message: 'Calculating 12-house Bhava Bala strengths & cusp potencies...',
                  ),
                  error: (err, stack) => AstrologyErrorState(
                    error: err,
                    customMessage: 'Failed to calculate Bhava Bala',
                    onRetry: () => ref.invalidate(activeProfileStrengthProvider),
                  ),
                  data: (report) => report == null || report.houses.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Text('No Bhava Bala data available', style: kAdvBody, textAlign: TextAlign.center),
                        )
                      : _buildBhavaBalaContent(context, report),
                ),
        ],
      ),
    );
  }

  ExplanationContext _buildExplanationContext(
    BhavaBalaReportModel report,
    HouseBhavaBalaModel selectedHouseData,
  ) {
    return ExplanationContext(
      feature: 'bhava_bala',
      screenTitle: 'Bhava Bala (House Strength)',
      purpose: 'Explain the 12-house potency scores and the strength of selected House ${selectedHouseData.houseNumber}.',
      astrologyData: {
        'selectedHouse': {
          'houseNumber': selectedHouseData.houseNumber,
          'totalRupas': selectedHouseData.totalRupas,
          'totalShashtiamsas': selectedHouseData.totalShashtiamsas,
          'rank': selectedHouseData.rank,
          'sign': selectedHouseData.sign,
          'lord': selectedHouseData.lord,
        },
        'allHouses': report.houses
            .map((h) => {
                  'house': h.houseNumber,
                  'rupas': h.totalRupas,
                  'rank': h.rank,
                  'lord': h.lord,
                })
            .toList(),
      },
      importantValues: {
        'selectedHouseRupas': selectedHouseData.totalRupas,
        'selectedHouseRank': selectedHouseData.rank,
      },
    );
  }

  Widget _buildBhavaBalaContent(BuildContext context, BhavaBalaReportModel report) {
    final houses = report.houses;
    final selectedHouseData = houses.firstWhere(
      (h) => h.houseNumber == _selectedHouse,
      orElse: () => houses.first,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. 12-HOUSE SELECTOR
        _buildHouseSelector(houses),
        const SizedBox(height: kAdvGap),

        // 2. AT-A-GLANCE: SELECTED HOUSE
        _buildSelectedHouseHero(selectedHouseData),
        const SizedBox(height: kAdvGap),

        // Sushil Sir Explainer Button
        SushilExplainerButton(
          contextBuilder: () => _buildExplanationContext(report, selectedHouseData),
          poseAsset: AppAssets.sushilExplaining,
        ),
        const SizedBox(height: kAdvGap),

        // 3. FOUR COMPONENT BREAKDOWN CARD
        _buildFourComponentsCard(selectedHouseData),
        const SizedBox(height: kAdvGap),

        // 4. ALL 12 HOUSES RANKING (COLLAPSED)
        _buildHousesTable(houses),
        const SizedBox(height: 12),

        // 5. CLASSICAL BHAVA BALA GUIDE (COLLAPSED)
        const AdvDetailsExpander(
          title: 'Bhava Bala Components Explained',
          subtitle: 'Classical Parashari factors determining house strength',
          icon: Icons.menu_book_rounded,
          child: Text(
            '• Bhavadhipati Bala: The total Shadbala potency of the planetary lord governing the house.\n'
            '• Bhava Dig Bala: Directional strength conferred by the zodiacal sign presiding on the house cusp.\n'
            '• Bhava Drishti Bala: Net aspectual score resulting from benefic and malefic graha aspects on the cusp.\n'
            '• Bhava Occupant Bala: Direct strength contributed by planets resident within the house.',
            style: kAdvBody,
          ),
        ),
        const SizedBox(height: kAdvGap),

        // 6. LEARN MORE
        AstrologyExplanationCard(
          title: context.l10n.explainBhavaBalaTitle,
          whatIsText: context.l10n.explainBhavaBalaWhatIs,
          howToReadText: context.l10n.explainBhavaBalaHowToRead,
        ),
      ],
    );
  }

  Widget _buildHouseSelector(List<HouseBhavaBalaModel> houses) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Choose a house', style: kAdvTitle),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: houses.map((h) {
            final isSelected = h.houseNumber == _selectedHouse;
            return Semantics(
              button: true,
              selected: isSelected,
              child: Material(
                color: isSelected ? AppColors.gold : AppColors.cardSurface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: isSelected ? AppColors.gold : AppColors.cardBorder),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => setState(() => _selectedHouse = h.houseNumber),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48, minWidth: 64),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'H-${h.houseNumber}',
                            style: kAdvBody.copyWith(
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                              color: AppColors.primary,
                              height: 1.2,
                            ),
                          ),
                          Text(
                            '#${h.rank}',
                            style: kAdvSecondary.copyWith(color: AppColors.primary, height: 1.2),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSelectedHouseHero(HouseBhavaBalaModel h) {
    final significance = h.houseNumber >= 1 && h.houseNumber <= 12 ? _houseSignificances[h.houseNumber - 1] : '';

    return AdvSummaryCard(
      label: 'H-${h.houseNumber} · Rank #${h.rank} of 12',
      icon: Icons.home_work_rounded,
      title: '${_getHouseOrdinal(h.houseNumber)} Bhava',
      subtitle: 'Sign: ${h.sign} • Lord: ${h.lord}${significance.isNotEmpty ? '\n$significance' : ''}',
      child: AdvStatGrid(
        onDark: true,
        stats: [
          AdvStat(
            label: 'Total Virupas',
            value: '${h.totalShashtiamsas.toStringAsFixed(1)} V',
          ),
          AdvStat(
            label: 'Total Rupas',
            value: '${h.totalRupas.toStringAsFixed(2)} Rupas',
            accent: AppColors.gold,
          ),
        ],
      ),
    );
  }

  Widget _buildFourComponentsCard(HouseBhavaBalaModel h) {
    return AdvSection(
      title: 'Bhava Strength Breakdown',
      subtitle: 'Component contributions in Virupas',
      icon: Icons.pie_chart_outline_rounded,
      tint: AstroTint.sage,
      child: Column(
        children: [
          _buildComponentBar('1. Bhavadhipati Bala (Lord ${h.lord})', h.bhavadhipatiBala, 450.0),
          _buildComponentBar('2. Bhava Dig Bala (Directional)', h.bhavaDigBala, 60.0),
          _buildComponentBar('3. Bhava Drishti Bala (Aspectual)', h.bhavaDrishtiBala, 60.0),
          _buildComponentBar('4. Bhava Occupant Bala', h.bhavaOccupantBala, 120.0, showBorder: false),
        ],
      ),
    );
  }

  Widget _buildComponentBar(String label, double value, double benchmark, {bool showBorder = true}) {
    final double progress = (value / (benchmark > 0 ? benchmark : 1.0)).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        border: showBorder ? const Border(bottom: BorderSide(color: AppColors.cardBorderSubtle)) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(label, style: kAdvBody.copyWith(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(width: 8),
              Text(
                '${value.toStringAsFixed(1)} V',
                style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: AppColors.cardSurfaceParchment,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.secondary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHousesTable(List<HouseBhavaBalaModel> houses) {
    return AdvDetailsExpander(
      title: '12 Houses Potency Summary',
      subtitle: 'Comparative rankings across all Bhavas',
      icon: Icons.leaderboard_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: houses.map((h) {
          return AdvRowCard(
            title: 'H-${h.houseNumber}',
            highlight: h.houseNumber == _selectedHouse,
            badge: AdvBadge('Rank #${h.rank}'),
            facts: [
              MapEntry('Sign', h.sign),
              MapEntry('Lord', h.lord),
              MapEntry('Rupas', h.totalRupas.toStringAsFixed(2)),
            ],
          );
        }).toList(),
      ),
    );
  }

  String _getHouseOrdinal(int num) {
    switch (num) {
      case 1:
        return '1st (Tanu)';
      case 2:
        return '2nd (Dhana)';
      case 3:
        return '3rd (Sahaja)';
      case 4:
        return '4th (Sukha)';
      case 5:
        return '5th (Putra)';
      case 6:
        return '6th (Ari)';
      case 7:
        return '7th (Yuvati)';
      case 8:
        return '8th (Randhra)';
      case 9:
        return '9th (Dharma)';
      case 10:
        return '10th (Karma)';
      case 11:
        return '11th (Labha)';
      case 12:
        return '12th (Vyaya)';
      default:
        return '$num-th';
    }
  }
}
