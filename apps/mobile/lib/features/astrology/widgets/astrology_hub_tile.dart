import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_lists.dart';
import '../../../shared/widgets/astro_platform.dart';
import '../../../shared/widgets/astro_surfaces.dart';

/// One entry shown in an [AstrologyToolGrid].
class AstrologyToolItem {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color color;

  /// Soft category colour for the icon square. Derived from [color] when null.
  final AstroTint? tint;
  final VoidCallback onTap;

  const AstrologyToolItem({
    required this.title,
    required this.icon,
    required this.onTap,
    this.subtitle,
    this.color = AppColors.secondary,
    this.tint,
  });

  AstroTint get resolvedTint => tint ?? AstroTint(color, color.withValues(alpha: 0.12));
}

/// Premium tool tile: white surface (radius 20, soft shadow), tinted icon
/// square, serif-free bold title and a quiet subtitle. Stacked (grid cell)
/// or as a full-width row with a chevron.
class AstrologyHubTile extends StatelessWidget {
  final AstrologyToolItem item;
  final bool stacked;

  const AstrologyHubTile({super.key, required this.item, this.stacked = true});

  @override
  Widget build(BuildContext context) {
    final icon = AstroIconSquare(icon: item.icon, tint: item.resolvedTint, size: 44);

    final texts = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(item.title, style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700, height: 1.25)),
        if (item.subtitle != null) ...[
          const SizedBox(height: 4),
          Text(item.subtitle!, style: AppTypography.rowSubtitle.copyWith(fontSize: 14, height: 1.35)),
        ],
      ],
    );

    return Semantics(
      button: true,
      child: AstroSurfaceCard(
        onTap: item.onTap,
        padding: EdgeInsets.zero,
        radius: AstroMetrics.cardRadius,
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: stacked ? 136 : 76),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: stacked
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          icon,
                          const Spacer(),
                          Icon(AstroIcons.chevron(context), size: 22, color: AppColors.textMuted),
                        ],
                      ),
                      const SizedBox(height: 14),
                      texts,
                    ],
                  )
                : Row(
                    children: [
                      icon,
                      const SizedBox(width: 14),
                      Expanded(child: texts),
                      const SizedBox(width: 8),
                      Icon(AstroIcons.chevron(context), size: 24, color: AppColors.textMuted),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class AstrologyToolGrid extends StatelessWidget {
  final List<AstrologyToolItem> items;
  final double minTileWidth;
  final double spacing;

  const AstrologyToolGrid({
    super.key,
    required this.items,
    this.minTileWidth = 160,
    this.spacing = 12,
  });

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 3.0);
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final cols = ((width + spacing) / (minTileWidth * scale + spacing))
            .floor()
            .clamp(1, 4);

        if (cols == 1) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < items.length; i++) ...[
                if (i > 0) SizedBox(height: spacing),
                AstrologyHubTile(item: items[i], stacked: false),
              ],
            ],
          );
        }

        final rows = <Widget>[];
        for (var start = 0; start < items.length; start += cols) {
          final cells = <Widget>[];
          for (var c = 0; c < cols; c++) {
            final idx = start + c;
            if (c > 0) cells.add(SizedBox(width: spacing));
            cells.add(
              Expanded(
                child: idx < items.length
                    ? AstrologyHubTile(item: items[idx])
                    : const SizedBox.shrink(),
              ),
            );
          }
          if (rows.isNotEmpty) rows.add(SizedBox(height: spacing));
          rows.add(
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: cells,
              ),
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: rows,
        );
      },
    );
  }
}
