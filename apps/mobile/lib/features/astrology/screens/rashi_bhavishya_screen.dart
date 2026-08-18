import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/rashi_bhavishya_model.dart';
import '../providers/rashi_bhavishya_provider.dart';

class RashiBhavishyaScreen extends ConsumerWidget {
  const RashiBhavishyaScreen({super.key});

  static const List<Map<String, dynamic>> _rashisList = [
    {'index': 1, 'sanskrit': 'Mesha', 'english': 'Aries', 'dates': 'March 21 - April 19', 'symbol': '♈'},
    {'index': 2, 'sanskrit': 'Vrishabha', 'english': 'Taurus', 'dates': 'April 20 - May 20', 'symbol': '♉'},
    {'index': 3, 'sanskrit': 'Mithuna', 'english': 'Gemini', 'dates': 'May 21 - June 20', 'symbol': '♊'},
    {'index': 4, 'sanskrit': 'Karka', 'english': 'Cancer', 'dates': 'June 21 - July 22', 'symbol': '♋'},
    {'index': 5, 'sanskrit': 'Simha', 'english': 'Leo', 'dates': 'July 23 - August 22', 'symbol': '♌'},
    {'index': 6, 'sanskrit': 'Kanya', 'english': 'Virgo', 'dates': 'August 23 - September 22', 'symbol': '♍'},
    {'index': 7, 'sanskrit': 'Tula', 'english': 'Libra', 'dates': 'September 23 - October 22', 'symbol': '♎'},
    {'index': 8, 'sanskrit': 'Vrischika', 'english': 'Scorpio', 'dates': 'October 23 - November 21', 'symbol': '♏'},
    {'index': 9, 'sanskrit': 'Dhanu', 'english': 'Sagittarius', 'dates': 'November 22 - December 21', 'symbol': '♐'},
    {'index': 10, 'sanskrit': 'Makara', 'english': 'Capricorn', 'dates': 'December 22 - January 19', 'symbol': '♑'},
    {'index': 11, 'sanskrit': 'Kumbha', 'english': 'Aquarius', 'dates': 'January 20 - February 18', 'symbol': '♒'},
    {'index': 12, 'sanskrit': 'Meena', 'english': 'Pisces', 'dates': 'February 19 - March 20', 'symbol': '♓'},
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIndex = ref.watch(selectedRashiIndexProvider);
    final selectedRashi = _rashisList.firstWhere((r) => r['index'] == selectedIndex);
    final predictionAsync = ref.watch(todayRashiBhavishyaProvider(selectedIndex));

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Today\'s Rashi Bhavishya',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            onPressed: () => ref.refresh(todayRashiBhavishyaProvider(selectedIndex)),
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            physics: const BouncingScrollPhysics(),
            child: Column(
              children: [
                // 1. COMPACT RASHI SELECTOR BAR (< Aries >)
                _buildRashiSelectorBar(context, ref, selectedIndex, selectedRashi),

                const SizedBox(height: 16),

                // 2. TODAY'S DATE BADGE
                _buildDateHeaderBadge(),

                const SizedBox(height: 16),

                // 3. MAIN PREDICTION CARD
                predictionAsync.when(
                  loading: () => const AstroLoaderCard(
                    message: AstroLoaderMessages.rashiBhavishya,
                  ),
                  error: (err, _) => _buildPredictionContent(_getMockPrediction(selectedRashi)),
                  data: (data) => _buildPredictionContent(data),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRashiSelectorBar(
      BuildContext context, WidgetRef ref, int selectedIndex, Map<String, dynamic> selectedRashi) {
    final rashiAsset = AppAssets.getRashiAsset(selectedRashi['english']);

    return AstroCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left_rounded, color: AppColors.primary),
            onPressed: () {
              final newIndex = selectedIndex == 1 ? 12 : selectedIndex - 1;
              ref.read(selectedRashiIndexProvider.notifier).state = newIndex;
            },
          ),
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: rashiAsset != null
                      ? AstroImage(
                          assetPath: rashiAsset,
                          width: 46,
                          height: 46,
                          fit: BoxFit.cover,
                          fallback: AstroImageFallback.icon,
                          semanticLabel: '${selectedRashi['english']} zodiac sign',
                        )
                      : _buildSymbolText(selectedRashi['symbol'] as String),
                ),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${selectedRashi['english']} (${selectedRashi['sanskrit']})',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    selectedRashi['dates'] as String,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
            onPressed: () {
              final newIndex = selectedIndex == 12 ? 1 : selectedIndex + 1;
              ref.read(selectedRashiIndexProvider.notifier).state = newIndex;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSymbolText(String symbol) {
    return Center(
      child: Text(
        symbol,
        style: const TextStyle(fontSize: 22, color: AppColors.premiumAccent),
      ),
    );
  }

  Widget _buildDateHeaderBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withOpacity(0.1)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.primary),
          SizedBox(width: 6),
          Text(
            '18 August 2026, Monday',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPredictionContent(RashiBhavishyaModel model) {
    final pred = model.prediction;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // TODAY'S OVERALL SUMMARY CARD
        AstroCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Today\'s Outlook',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                pred.summary,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.lightTextSecondary,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 16),
              // SCORE METRIC RATINGS
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildMetricRating('Overall', '85%'),
                  _buildMetricRating('Love', '80%'),
                  _buildMetricRating('Career', '90%'),
                  _buildMetricRating('Health', '75%'),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        const Text(
          'Category Guidance',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),

        const SizedBox(height: 12),

        // CATEGORY INSIGHTS
        _buildCategoryCard('General', pred.categories.general, Icons.grid_view_rounded),
        _buildCategoryCard('Career', pred.categories.career, Icons.business_center_rounded),
        _buildCategoryCard('Love & Relationships', pred.categories.love, Icons.favorite_rounded),
        _buildCategoryCard('Health', pred.categories.health, Icons.fitness_center_rounded),
        _buildCategoryCard('Finance', pred.categories.finance, Icons.account_balance_wallet_rounded),

        const SizedBox(height: 12),

        // LUCKY DETAILS CARD
        AstroCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: AppColors.premiumAccent, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Lucky Number: ${pred.luckyNumber}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
              Container(height: 20, width: 1, color: AppColors.lightBorder),
              Row(
                children: [
                  const Icon(Icons.palette_rounded, color: AppColors.secondary, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Lucky Color: ${pred.luckyColor}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMetricRating(String label, String score) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppColors.lightTextMuted),
        ),
        const SizedBox(height: 4),
        Text(
          score,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryCard(String title, String content, IconData icon) {
    if (content.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: AstroCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.06),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 16, color: AppColors.primary),
                ),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              content,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.lightTextSecondary,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  RashiBhavishyaModel _getMockPrediction(Map<String, dynamic> rashi) {
    return RashiBhavishyaModel(
      date: '18 August 2026',
      rashi: RashiInfoModel(
        index: rashi['index'] as int,
        sanskritName: rashi['sanskrit'] as String,
        englishName: rashi['english'] as String,
        element: 'Fire',
        ruler: 'Mars',
      ),
      prediction: const RashiBhavishyaPredictionModel(
        summary:
            'A positive day for new beginnings. Your confidence will attract good opportunities. Stay focused and avoid unnecessary distractions. Financial matters look stable.',
        categories: RashiBhavishyaCategoryModel(
          general: 'The day brings positivity and helps you make progress on important tasks.',
          health: 'Take care of your energy levels and follow a balanced routine.',
          love: 'You may spend quality time with your partner. Communication will improve.',
          career: 'New opportunities may come your way. Your hard work will be recognized.',
          finance: 'Good financial management yields peace of mind today.',
        ),
        luckyNumber: 9,
        luckyColor: 'Red',
      ),
      source: 'AstroSushil Reference Content Fixtures',
      isDevelopmentFixture: true,
    );
  }
}
