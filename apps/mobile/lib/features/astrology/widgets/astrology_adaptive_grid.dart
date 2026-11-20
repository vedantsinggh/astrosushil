import 'package:flutter/material.dart';

/// Lays out [children] in equal-height rows of 1..[maxColumns] columns.
///
/// The column count comes from the available width and the user's text
/// size, so cells never get cramped on small phones or at large text. Cells
/// in the same row share the tallest cell's height.
///
/// Note: children are measured with IntrinsicHeight, so they must not
/// contain a LayoutBuilder (or other widgets that cannot report intrinsic
/// sizes).
class AstrologyAdaptiveGrid extends StatelessWidget {
  final List<Widget> children;
  final double minItemWidth;
  final int maxColumns;
  final double spacing;

  const AstrologyAdaptiveGrid({
    super.key,
    required this.children,
    this.minItemWidth = 150,
    this.maxColumns = 2,
    this.spacing = 12,
  });

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 3.0);
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.hasBoundedWidth ? constraints.maxWidth : minItemWidth;
        final cols = ((width + spacing) / (minItemWidth * scale + spacing))
            .floor()
            .clamp(1, maxColumns < 1 ? 1 : maxColumns);

        final rows = <Widget>[];
        for (var start = 0; start < children.length; start += cols) {
          if (rows.isNotEmpty) rows.add(SizedBox(height: spacing));
          if (cols == 1) {
            rows.add(children[start]);
            continue;
          }
          final cells = <Widget>[];
          for (var c = 0; c < cols; c++) {
            if (c > 0) cells.add(SizedBox(width: spacing));
            final idx = start + c;
            cells.add(Expanded(
              child: idx < children.length ? children[idx] : const SizedBox.shrink(),
            ));
          }
          rows.add(IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: cells),
          ));
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: rows,
        );
      },
    );
  }
}
