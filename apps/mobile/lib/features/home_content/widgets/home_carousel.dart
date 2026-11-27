import 'package:flutter/material.dart';

import '../../../shared/widgets/astro_design_system.dart';

/// One home section: a heading (with an optional "See all") over a horizontal row of cards.
/// Card width is a share of the screen so the next card peeks in and the row reads as swipeable.
class HomeCarousel extends StatelessWidget {
  final String title;
  final String? seeAllLabel;
  final VoidCallback? onSeeAll;
  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;

  /// Share of the screen width one card takes (0.72 big cards, 0.42 small ones).
  final double widthFactor;
  final double height;

  const HomeCarousel({
    super.key,
    required this.title,
    required this.itemCount,
    required this.itemBuilder,
    required this.height,
    this.widthFactor = 0.72,
    this.seeAllLabel,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.sizeOf(context).width;
    final cardWidth = (screen * widthFactor).clamp(140.0, 360.0);
    // Rows grow with the phone's text size so titles and prices never get cut off.
    final textScale = MediaQuery.textScalerOf(context).scale(16) / 16;
    final rowHeight = height * textScale.clamp(1.0, 2.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AstroSectionHeading(
          title,
          padding: const EdgeInsets.only(left: 4),
          trailing: onSeeAll == null
              ? null
              : TextButton(
                  onPressed: onSeeAll,
                  style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: const Size(44, 36)),
                  child: Text(seeAllLabel ?? 'See all', style: AppTypography.labelLarge.copyWith(color: AppColors.primary)),
                ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: rowHeight,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            itemCount: itemCount,
            separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
            itemBuilder: (context, index) => SizedBox(width: cardWidth, child: itemBuilder(context, index)),
          ),
        ),
      ],
    );
  }
}
