import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_lists.dart';
import '../../shared/widgets/astro_surfaces.dart';

/// One destination on the home screen services grid: an icon paired with a
/// short (1–2 word) label. Presentation only — [onTap] is supplied by the screen.
class HomeServiceItem {
  final String id;
  final String label;
  final IconData icon;

  /// Optional image (e.g. an existing brand asset) shown instead of [icon].
  final String? imageAsset;
  final VoidCallback onTap;

  /// Soft category colour for the icon square.
  final AstroTint tint;

  const HomeServiceItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.onTap,
    this.imageAsset,
    this.tint = AstroTint.indigo,
  });
}

/// Section title used between home screen groups.
class HomeSectionTitle extends StatelessWidget {
  final String title;

  const HomeSectionTitle(this.title, {super.key});

  @override
  Widget build(BuildContext context) {
    return AstroSectionHeading(title, padding: const EdgeInsets.only(left: 4));
  }
}

/// Grid of large, labelled icon tiles.
///
/// Uses plain rows instead of a fixed-aspect [GridView] so tiles grow with the
/// system font size instead of clipping. The column count is chosen so the
/// longest single word of any label fits on one line (labels may wrap between
/// words but never break inside a word); if even 2 columns are too narrow, the
/// label font is reduced just enough to fit.
class HomeServiceGrid extends StatelessWidget {
  final List<HomeServiceItem> items;

  /// Labels used to size the grid. Pass the labels of every grid on the
  /// screen so all sections get the same column count. Defaults to [items].
  final List<String>? sizingLabels;

  const HomeServiceGrid({super.key, required this.items, this.sizingLabels});

  static const double _gap = 12;
  static const double _labelFontSize = 15;
  static const double _tileInset = 2 * HomeServiceTile.horizontalPadding + 2; // padding + hairline
  static const int _minColumns = 2;
  static const int _maxColumns = 4;

  static TextStyle labelStyle(double fontSize) => AppTypography.titleMedium.copyWith(
        fontSize: fontSize,
        height: 1.2,
        fontWeight: FontWeight.w600,
        color: AppColors.primary,
      );

  double _longestWordWidth(BuildContext context) {
    final labels = sizingLabels ?? items.map((i) => i.label).toList();
    final scaler = MediaQuery.textScalerOf(context);
    final direction = Directionality.of(context);
    var widest = 0.0;
    for (final label in labels) {
      for (final word in label.split(RegExp(r'\s+'))) {
        if (word.isEmpty) continue;
        final painter = TextPainter(
          text: TextSpan(text: word, style: labelStyle(_labelFontSize)),
          textDirection: direction,
          textScaler: scaler,
          maxLines: 1,
        )..layout();
        if (painter.width > widest) widest = painter.width;
        painter.dispose();
      }
    }
    return widest;
  }

  @override
  Widget build(BuildContext context) {
    final longestWord = _longestWordWidth(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        // Tiles should be at least ~86dp wide even for short labels.
        final minTileWidth = (longestWord + _tileInset + 4).clamp(86.0, double.infinity);
        final columns = ((width + _gap) / (minTileWidth + _gap)).floor().clamp(_minColumns, _maxColumns);
        final tileWidth = (width - _gap * (columns - 1)) / columns;
        final innerWidth = tileWidth - _tileInset - 2;
        final fontSize = longestWord > innerWidth && longestWord > 0
            ? (_labelFontSize * innerWidth / longestWord).clamp(10.0, _labelFontSize)
            : _labelFontSize;

        final rows = <Widget>[];
        for (var start = 0; start < items.length; start += columns) {
          final cells = <Widget>[];
          for (var col = 0; col < columns; col++) {
            if (col > 0) cells.add(const SizedBox(width: _gap));
            final index = start + col;
            cells.add(Expanded(
              child: index < items.length
                  ? HomeServiceTile(item: items[index], labelFontSize: fontSize)
                  : const SizedBox.shrink(),
            ));
          }
          if (rows.isNotEmpty) rows.add(const SizedBox(height: _gap));
          // IntrinsicHeight keeps every tile in a row the same height. The
          // tiles themselves contain no LayoutBuilder, so this is safe.
          rows.add(IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: cells,
            ),
          ));
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: rows,
        );
      },
    );
  }
}

/// A single large tile: icon in a soft circle above a short label.
class HomeServiceTile extends StatelessWidget {
  final HomeServiceItem item;
  final double labelFontSize;

  static const double horizontalPadding = 6;

  const HomeServiceTile({super.key, required this.item, this.labelFontSize = 15});

  @override
  Widget build(BuildContext context) {
    const iconSize = 48.0;
    final Widget icon = item.imageAsset != null
        ? Container(
            width: iconSize,
            height: iconSize,
            padding: const EdgeInsets.all(1.5),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [Color(0xFFE9C766), AppColors.gold]),
            ),
            child: ClipOval(
              child: Image.asset(
                item.imageAsset!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => AstroIconSquare(icon: item.icon, tint: item.tint, size: iconSize),
              ),
            ),
          )
        : AstroIconSquare(icon: item.icon, tint: item.tint, size: iconSize);

    return Semantics(
      key: ValueKey('home-service-${item.id}'),
      button: true,
      label: item.label,
      onTap: item.onTap,
      excludeSemantics: true,
      child: AstroSurfaceCard(
        onTap: item.onTap,
        radius: 18,
        padding: const EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 16),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 76),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              icon,
              const SizedBox(height: 10),
              Text(
                item.label,
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: HomeServiceGrid.labelStyle(labelFontSize),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Full-width, clearly labelled row link (e.g. "All astrology tools").
class HomeLinkRow extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const HomeLinkRow({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: AstroSurfaceCard(
        onTap: onTap,
        radius: 16,
        padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 40),
          child: Row(
            children: [
              AstroIconSquare(icon: icon, tint: AstroTint.navy),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w600, color: AppColors.accent),
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, size: 24, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
