import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_gradients.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/strength_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/expandable_astrology_card.dart';
import '../widgets/planet_chip.dart';
import '../widgets/sign_chip.dart';
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

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AstroAppBar(
        title: 'Bhava Bala (भावबल)',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.midnightNavy),
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
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Top Profile Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: ActiveBirthProfileSelector(
                  isDark: false,
                  onProfileChanged: (_) {},
                ),
              ),

              // Main Content
              Expanded(
                child: activeProfile == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: AstrologyEmptyState(
                            title: 'No Active Birth Profile',
                            message: 'Select or create a birth profile to calculate 12-house Bhava Bala potencies.',
                            actionLabel: 'Add Birth Profile',
                            onAction: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                              );
                            },
                          ),
                        ),
                      )
                    : ref.watch(activeProfileBhavaBalaProvider).when(
                          loading: () => const AstrologyLoadingState(
                            message: 'Calculating 12-house Bhava Bala strengths & cusp potencies...',
                          ),
                          error: (err, stack) => AstrologyErrorState(
                            error: err,
                            customMessage: 'Failed to calculate Bhava Bala',
                            onRetry: () => ref.invalidate(activeProfileStrengthProvider),
                          ),
                          data: (report) => report == null || report.houses.isEmpty
                              ? const Center(child: Text('No Bhava Bala data available'))
                              : _buildBhavaBalaContent(context, report),
                        ),
              ),
            ],
          ),
        ),
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
        'allHouses': report.houses.map((h) => {
          'house': h.houseNumber,
          'rupas': h.totalRupas,
          'rank': h.rank,
          'lord': h.lord,
        }).toList(),
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

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // Educational Explanation Card
        AstrologyExplanationCard(
          title: context.l10n.explainBhavaBalaTitle,
          whatIsText: context.l10n.explainBhavaBalaWhatIs,
          howToReadText: context.l10n.explainBhavaBalaHowToRead,
        ),
        const SizedBox(height: 14),

        // 1. HORIZONTAL 12-HOUSE SELECTOR
        _buildHouseSelector(houses),

        const SizedBox(height: 12),

        // Sushil Sir Explainer Button
        SushilExplainerButton(
          contextBuilder: () => _buildExplanationContext(report, selectedHouseData),
          poseAsset: AppAssets.sushilExplaining,
        ),

        const SizedBox(height: 14),

        // 2. SELECTED HOUSE HERO CARD
        _buildSelectedHouseHero(selectedHouseData),
        const SizedBox(height: 14),

        // 3. FOUR COMPONENT BREAKDOWN CARD
        _buildFourComponentsCard(selectedHouseData),
        const SizedBox(height: 14),

        // 4. ALL 12 HOUSES RANKING TABLE
        _buildHousesTable(houses),
        const SizedBox(height: 14),

        // 5. CLASSICAL BHAVA BALA GUIDE ACCORDION
        const ExpandableAstrologyCard(
          title: 'Bhava Bala Components Explained',
          subtitle: 'Classical Parashari factors determining house strength',
          icon: Icons.menu_book_rounded,
          initiallyExpanded: false,
          expandedChild: Text(
            '• Bhavadhipati Bala: The total Shadbala potency of the planetary lord governing the house.\n'
            '• Bhava Dig Bala: Directional strength conferred by the zodiacal sign presiding on the house cusp.\n'
            '• Bhava Drishti Bala: Net aspectual score resulting from benefic and malefic graha aspects on the cusp.\n'
            '• Bhava Occupant Bala: Direct strength contributed by planets resident within the house.',
            style: TextStyle(fontSize: 12.5, height: 1.45, color: AppColors.textDark),
          ),
        ),
      ],
    );
  }

  Widget _buildHouseSelector(List<HouseBhavaBalaModel> houses) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: houses.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, index) {
          final h = houses[index];
          final isSelected = h.houseNumber == _selectedHouse;

          return InkWell(
            onTap: () => setState(() => _selectedHouse = h.houseNumber),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.midnightNavy : AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? AppColors.gold : AppColors.cardBorder,
                  width: isSelected ? 1.5 : 1.0,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'H-${h.houseNumber}',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: isSelected ? Colors.white : AppColors.textDark,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    '#${h.rank}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.gold : AppColors.deepIndigo,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSelectedHouseHero(HouseBhavaBalaModel h) {
    final significance = h.houseNumber >= 1 && h.houseNumber <= 12
        ? _houseSignificances[h.houseNumber - 1]
        : '';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppGradients.heroCosmic,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(
            color: AppColors.midnightNavy.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
                ),
                child: Text(
                  'H-${h.houseNumber}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.gold,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_getHouseOrdinal(h.houseNumber)} Bhava',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Sign: ${h.sign} • Lord: ${h.lord}',
                      style: const TextStyle(fontSize: 12, color: AppColors.goldLight),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
                ),
                child: Text(
                  'RANK #${h.rank}',
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    color: AppColors.gold,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          Text(
            significance,
            style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.lavenderMuted),
          ),

          const Divider(height: 22, color: Colors.white24),

          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Virupas', style: TextStyle(fontSize: 11, color: AppColors.lavenderMuted)),
                    const SizedBox(height: 2),
                    Text(
                      '${h.totalShashtiamsas.toStringAsFixed(1)} V',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Rupas', style: TextStyle(fontSize: 11, color: AppColors.lavenderMuted)),
                    const SizedBox(height: 2),
                    Text(
                      '${h.totalRupas.toStringAsFixed(2)} Rupas',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.goldLight),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFourComponentsCard(HouseBhavaBalaModel h) {
    return AstrologySectionCard(
      title: 'Bhava Strength Breakdown',
      subtitle: 'Component contributions in Virupas',
      icon: Icons.pie_chart_outline_rounded,
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
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        border: showBorder ? const Border(bottom: BorderSide(color: AppColors.cardBorder, width: 0.8)) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textDark),
                ),
              ),
              Text(
                '${value.toStringAsFixed(1)} V',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.midnightNavy),
              ),
            ],
          ),
          const SizedBox(height: 5),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.cardSurfaceParchment,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.deepIndigo),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHousesTable(List<HouseBhavaBalaModel> houses) {
    return AstrologySectionCard(
      title: '12 Houses Potency Summary',
      subtitle: 'Comparative rankings across all Bhavas',
      icon: Icons.leaderboard_rounded,
      child: AstrologyDataTable(
        columns: const [
          AstrologyTableColumn(header: 'House', flex: 2),
          AstrologyTableColumn(header: 'Sign', flex: 3),
          AstrologyTableColumn(header: 'Lord', flex: 2),
          AstrologyTableColumn(header: 'Rupas', flex: 2, alignment: TextAlign.center),
          AstrologyTableColumn(header: 'Rank', flex: 2, alignment: TextAlign.right),
        ],
        rows: houses.map((h) {
          return [
            Text(
              'H-${h.houseNumber}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.deepIndigo),
            ),
            SignChip(signName: h.sign, isCompact: true),
            PlanetChip(planetName: h.lord, isCompact: true),
            Text(
              h.totalRupas.toStringAsFixed(2),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDark),
              textAlign: TextAlign.center,
            ),
            Text(
              '#${h.rank}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.midnightNavy),
              textAlign: TextAlign.right,
            ),
          ];
        }).toList(),
      ),
    );
  }

  String _getHouseOrdinal(int num) {
    switch (num) {
      case 1: return '1st (Tanu)';
      case 2: return '2nd (Dhana)';
      case 3: return '3rd (Sahaja)';
      case 4: return '4th (Sukha)';
      case 5: return '5th (Putra)';
      case 6: return '6th (Ari)';
      case 7: return '7th (Yuvati)';
      case 8: return '8th (Randhra)';
      case 9: return '9th (Dharma)';
      case 10: return '10th (Karma)';
      case 11: return '11th (Labha)';
      case 12: return '12th (Vyaya)';
      default: return '$num-th';
    }
  }
}
