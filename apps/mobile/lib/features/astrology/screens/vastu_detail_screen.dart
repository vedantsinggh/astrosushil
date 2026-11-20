import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/vastu_model.dart';
import '../providers/vastu_provider.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_error_state.dart';

class VastuDetailScreen extends ConsumerWidget {
  final VastuCategoryModel category;

  const VastuDetailScreen({
    super.key,
    required this.category,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final guidanceAsync = ref.watch(vastuGuidanceProvider(category.id));

    return AstroPage(
      title: category.sanskritName.isNotEmpty ? category.sanskritName : category.name,
      child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. CATEGORY SUMMARY CARD
                AdvSummaryCard(
                  label: 'Vastu guidance',
                  icon: Icons.home_rounded,
                  title: category.name,
                  subtitle: category.description,
                  child: AdvStatGrid(
                    onDark: true,
                    stats: [
                      AdvStat(label: 'Element', value: category.element),
                      AdvStat(label: 'Ideal direction', value: category.idealDirection, accent: AppColors.gold),
                    ],
                  ),
                ),

                const SizedBox(height: kAdvGap),

                // 2. GUIDANCE CONTENT FROM API (no invented fallback guidance)
                guidanceAsync.when(
                  loading: () => const SizedBox(
                    height: 200,
                    child: AstroStateView.loading(compact: true),
                  ),
                  error: (err, _) => AstrologyErrorState(
                    error: err,
                    customMessage: 'Vastu guidance for ${category.name} could not be loaded. Please try again.',
                    onRetry: () => ref.invalidate(vastuGuidanceProvider(category.id)),
                  ),
                  data: (items) => items.isEmpty
                      ? AstroEmptyState(
                          title: 'Guidance not available',
                          message: 'Detailed Vastu guidance for ${category.name} has not been published yet.',
                        )
                      : _buildGuidanceDetails(items.first),
                ),
              ],
            ),
    );
  }

  Widget _buildGuidanceDetails(VastuGuidanceModel item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // DIRECTION PLACEMENT CARD
        AdvSection(
          title: 'Directional Placement',
          icon: Icons.explore_rounded,
          tint: AstroTint.sky,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final recommended = _buildDirectionBox(
                'Recommended',
                item.idealDirection,
                AstroTint.sage,
                Icons.check_circle_rounded,
              );
              final avoid = _buildDirectionBox(
                'Avoid / Forbidden',
                item.forbiddenDirections.isNotEmpty
                    ? item.forbiddenDirections.join(', ')
                    : 'South-West',
                AstroTint.danger,
                Icons.cancel_rounded,
              );
              if (constraints.maxWidth < 360 || MediaQuery.textScalerOf(context).scale(16) > 22) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [recommended, const SizedBox(height: 10), avoid],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: recommended),
                  const SizedBox(width: 10),
                  Expanded(child: avoid),
                ],
              );
            },
          ),
        ),

        const SizedBox(height: kAdvGap),

        // KEY PRINCIPLES CARD
        if (item.keyPrinciples.isNotEmpty) ...[
          AdvSection(
            title: 'Key Principles',
            icon: Icons.lightbulb_outline_rounded,
            tint: AstroTint.amber,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: item.keyPrinciples.map((p) => _buildBulletPoint(p)).toList(),
            ),
          ),
          const SizedBox(height: kAdvGap),
        ],

        // DO'S & DON'TS CARDS (Stacked for overflow safety across all viewports)
        AdvSection(
          title: 'Recommended Practices (Do\'s)',
          icon: Icons.thumb_up_rounded,
          tint: AstroTint.sage,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: item.dos.map((d) => _buildCheckPoint(d, AppColors.successText, Icons.check_rounded)).toList(),
          ),
        ),

        const SizedBox(height: kAdvGap),

        AdvSection(
          title: 'Avoid / Inauspicious (Don\'ts)',
          icon: Icons.thumb_down_rounded,
          tint: AstroTint.coral,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: item.donts.map((d) => _buildCheckPoint(d, AppColors.errorText, Icons.close_rounded)).toList(),
          ),
        ),

        // PRACTICAL REMEDIES
        if (item.remedies.isNotEmpty) ...[
          const SizedBox(height: kAdvGap),
          AdvSection(
            title: 'Practical Remedies',
            icon: Icons.build_circle_rounded,
            tint: AstroTint.violet,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: item.remedies.map((r) => _buildBulletPoint(r)).toList(),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDirectionBox(String title, String direction, AstroTint tint, IconData icon) {
    final color = tint.foreground;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: tint.background,
        borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: kAdvSecondary.copyWith(fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            direction,
            style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 8, right: 10),
            child: Icon(Icons.circle, size: 7, color: AppColors.goldDark),
          ),
          Expanded(child: Text(text, style: kAdvBody)),
        ],
      ),
    );
  }

  Widget _buildCheckPoint(String text, Color color, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2, right: 10),
            child: Icon(icon, size: 20, color: color),
          ),
          Expanded(child: Text(text, style: kAdvBody)),
        ],
      ),
    );
  }
}
