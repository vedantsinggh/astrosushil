import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Single key-value info row presentation for astrological attributes.
///
/// Label and value wrap onto extra lines instead of being cut off.
class AstrologyInfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Widget? valueWidget;
  final IconData? icon;
  final Color? iconColor;
  final bool isBold;
  final bool showBorder;

  const AstrologyInfoRow({
    super.key,
    required this.label,
    required this.value,
    this.valueWidget,
    this.icon,
    this.iconColor,
    this.isBold = false,
    this.showBorder = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 48),
      padding: const EdgeInsets.symmetric(vertical: 10.0),
      decoration: showBorder
          ? const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppColors.cardBorderSubtle, width: 1),
              ),
            )
          : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: iconColor ?? AppColors.secondary),
            const SizedBox(width: 10),
          ],
          Expanded(
            flex: 5,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.lightTextSecondary,
                fontWeight: FontWeight.w500,
                height: 1.3,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 6,
            child: Align(
              alignment: AlignmentDirectional.centerEnd,
              child: valueWidget != null
                  ? FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: AlignmentDirectional.centerEnd,
                      child: valueWidget!,
                    )
                  : Text(
                      value,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
                        color: AppColors.primary,
                        height: 1.3,
                      ),
                      textAlign: TextAlign.end,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Column configuration for AstrologyDataTable
class AstrologyTableColumn {
  final String header;
  final TextAlign alignment;
  final int flex;

  const AstrologyTableColumn({
    required this.header,
    this.alignment = TextAlign.left,
    this.flex = 1,
  });
}

/// Mobile-first reusable data presentation table for astrological positions, matrices, and scores.
///
/// On wide screens it renders a classic table. When the available width is
/// too narrow for the columns (most phones, or large system text), each row
/// becomes a small card: the first cell is the card title and the remaining
/// cells are shown underneath as labelled values that wrap onto extra lines,
/// so nothing is squeezed or cut.
class AstrologyDataTable extends StatelessWidget {
  final List<AstrologyTableColumn> columns;
  final List<List<dynamic>> rows;
  final bool isStriped;
  final double rowMinHeight;

  /// Minimum width (in logical pixels, before text scaling) each column needs
  /// for the table layout. Below that, rows are shown as cards.
  final double minColumnWidth;

  /// Force the card-style layout regardless of width.
  final bool forceCardLayout;

  const AstrologyDataTable({
    super.key,
    required this.columns,
    required this.rows,
    this.isStriped = true,
    this.rowMinHeight = 48.0,
    this.minColumnWidth = 96.0,
    this.forceCardLayout = false,
  });

  static const _cellStyle = TextStyle(
    fontSize: 15,
    color: AppColors.primary,
    fontWeight: FontWeight.w500,
    height: 1.3,
  );

  Widget _emptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: const Text(
        'No data available',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 15, color: AppColors.lightTextSecondary),
      ),
    );
  }

  Widget _cell(dynamic cellData, TextAlign align) {
    if (cellData is Widget) {
      return FittedBox(
        fit: BoxFit.scaleDown,
        alignment: align == TextAlign.center
            ? Alignment.center
            : align == TextAlign.right
                ? Alignment.centerRight
                : Alignment.centerLeft,
        child: cellData,
      );
    }
    return Text(
      cellData?.toString() ?? '',
      style: _cellStyle,
      textAlign: align,
    );
  }

  Widget _cardValue(dynamic cellData) {
    if (cellData is Widget) {
      return FittedBox(
        fit: BoxFit.scaleDown,
        alignment: AlignmentDirectional.centerStart,
        child: cellData,
      );
    }
    return Text(
      cellData?.toString() ?? '',
      style: const TextStyle(
        fontSize: 16,
        color: AppColors.primary,
        fontWeight: FontWeight.w600,
        height: 1.3,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty && forceCardLayout) return _emptyState();

    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(1.0);
        final needed = columns.length * minColumnWidth * scale;
        final useCards = forceCardLayout ||
            (constraints.hasBoundedWidth && constraints.maxWidth < needed);

        if (useCards) {
          if (rows.isEmpty) return _emptyState();
          return _buildCards();
        }
        return _buildTable();
      },
    );
  }

  Widget _buildCards() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: List.generate(rows.length, (index) {
        final row = rows[index];
        final first = row.isNotEmpty ? row[0] : '';
        return Container(
          margin: EdgeInsets.only(bottom: index == rows.length - 1 ? 0 : 10),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            color: AppColors.cardSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (first is Widget)
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: FittedBox(fit: BoxFit.scaleDown, child: first),
                )
              else
                Text(
                  first?.toString() ?? '',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                    height: 1.3,
                  ),
                ),
              if (columns.length > 1) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 20,
                  runSpacing: 10,
                  children: [
                    for (var c = 1; c < columns.length; c++)
                      ConstrainedBox(
                        constraints: const BoxConstraints(minWidth: 72),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              columns[c].header,
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.lightTextSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            _cardValue(c < row.length ? row[c] : ''),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
              ],
            ],
          ),
        );
      }),
    );
  }

  Widget _buildTable() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder, width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              color: AppColors.canvasSecondary,
              child: Row(
                children: columns.map((col) {
                  return Expanded(
                    flex: col.flex,
                    child: Text(
                      col.header,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                      textAlign: col.alignment,
                    ),
                  );
                }).toList(),
              ),
            ),
            const Divider(height: 1, color: AppColors.cardBorder),
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.all(20.0),
                child: Center(
                  child: Text(
                    'No data available',
                    style: TextStyle(fontSize: 15, color: AppColors.lightTextSecondary),
                  ),
                ),
              )
            else
              ...List.generate(rows.length, (index) {
                final row = rows[index];
                final rowBg = isStriped && index.isOdd
                    ? AppColors.canvas
                    : Colors.transparent;

                return Container(
                  constraints: BoxConstraints(minHeight: rowMinHeight),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  color: rowBg,
                  child: Row(
                    children: List.generate(columns.length, (colIdx) {
                      final col = columns[colIdx];
                      return Expanded(
                        flex: col.flex,
                        child: _cell(
                          colIdx < row.length ? row[colIdx] : '',
                          col.alignment,
                        ),
                      );
                    }),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
