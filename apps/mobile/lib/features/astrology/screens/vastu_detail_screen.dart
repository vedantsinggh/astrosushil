import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/vastu_model.dart';
import '../providers/vastu_provider.dart';

class VastuDetailScreen extends ConsumerWidget {
  final VastuCategoryModel category;

  const VastuDetailScreen({
    super.key,
    required this.category,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final guidanceAsync = ref.watch(vastuGuidanceProvider(category.id));

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: category.sanskritName.isNotEmpty ? category.sanskritName : category.name,
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. CATEGORY TITLE CARD
                AstroCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        category.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        category.description,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.lightTextSecondary,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildPillBadge('Element: ${category.element}', AppColors.secondary),
                          const SizedBox(width: 8),
                          _buildPillBadge('Ideal: ${category.idealDirection}', AppColors.primary),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                // 2. GUIDANCE CONTENT FROM API OR MOCK
                guidanceAsync.when(
                  loading: () => const SizedBox(
                    height: 200,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (err, _) => _buildGuidanceDetails(_getMockGuidance(category)),
                  data: (items) => _buildGuidanceDetails(
                    items.isNotEmpty ? items.first : _getMockGuidance(category),
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGuidanceDetails(VastuGuidanceModel item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // DIRECTION PLACEMENT CARD
        AstroCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Directional Placement',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _buildDirectionBox(
                      'Recommended',
                      item.idealDirection,
                      AppColors.success,
                      Icons.check_circle_rounded,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildDirectionBox(
                      'Avoid / Forbidden',
                      item.forbiddenDirections.isNotEmpty
                          ? item.forbiddenDirections.join(', ')
                          : 'South-West',
                      AppColors.error,
                      Icons.cancel_rounded,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // KEY PRINCIPLES CARD
        if (item.keyPrinciples.isNotEmpty) ...[
          AstroCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Key Principles',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 10),
                ...item.keyPrinciples.map((p) => _buildBulletPoint(p)),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // DO'S & DON'TS CARDS (Stacked for overflow safety across all viewports)
        AstroCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.thumb_up_rounded, size: 16, color: AppColors.success),
                  SizedBox(width: 8),
                  Text(
                    'Recommended Practices (Do\'s)',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...item.dos.map((d) => _buildCheckPoint(d, AppColors.success)),
            ],
          ),
        ),

        const SizedBox(height: 12),

        AstroCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.thumb_down_rounded, size: 16, color: AppColors.error),
                  SizedBox(width: 8),
                  Text(
                    'Avoid / Inauspicious (Don\'ts)',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...item.donts.map((d) => _buildCheckPoint(d, AppColors.error)),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // PRACTICAL REMEDIES
        if (item.remedies.isNotEmpty) ...[
          AstroCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.build_circle_rounded, size: 18, color: AppColors.premiumAccent),
                    SizedBox(width: 8),
                    Text(
                      'Practical Remedies',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ...item.remedies.map((r) => _buildBulletPoint(r)),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDirectionBox(String title, String direction, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                title,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            direction,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
          ),
        ],
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 12.5, color: AppColors.lightTextSecondary, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckPoint(String text, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary, height: 1.3),
      ),
    );
  }

  Widget _buildPillBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }

  VastuGuidanceModel _getMockGuidance(VastuCategoryModel category) {
    return VastuGuidanceModel(
      categoryId: category.id,
      categorySlug: category.slug,
      categoryName: category.name,
      idealDirection: category.idealDirection,
      alternativeDirections: const ['East'],
      forbiddenDirections: const ['South-West'],
      element: category.element,
      rulingPlanet: 'Jupiter',
      keyPrinciples: const [
        'Maintain bright illumination and keep the threshold free of clutter.',
        'Ensure the door opens inward in a clockwise direction.',
      ],
      dos: const [
        'Keep the doorway clean.',
        'Use warm welcoming light.',
      ],
      donts: const [
        'Do not place garbage bins near entrance.',
        'Avoid mirrors directly facing main door.',
      ],
      remedies: const [
        'Place a brass pyramid above the doorframe if misaligned.',
      ],
    );
  }
}
