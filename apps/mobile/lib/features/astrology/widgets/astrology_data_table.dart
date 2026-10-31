import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Single key-value info row presentation for astrological attributes.
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
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      decoration: showBorder
          ? const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppColors.lightBorder, width: 0.8),
              ),
            )
          : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 14,
              color: iconColor ?? AppColors.secondary,
            ),
            const SizedBox(width: 8),
          ],
          Expanded(
            flex: 5,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.lightTextSecondary,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 6,
            child: Align(
              alignment: Alignment.centerRight,
              child: valueWidget != null
                  ? FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerRight,
                      child: valueWidget!,
                    )
                  : Text(
                      value,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
                        color: AppColors.primary,
                      ),
                      textAlign: TextAlign.right,
                      overflow: TextOverflow.ellipsis,
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
class AstrologyDataTable extends StatelessWidget {
  final List<AstrologyTableColumn> columns;
  final List<List<dynamic>> rows;
  final bool isStriped;
  final double rowMinHeight;

  const AstrologyDataTable({
    super.key,
    required this.columns,
    required this.rows,
    this.isStriped = true,
    this.rowMinHeight = 36.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder, width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            // Header Row
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              color: AppColors.cardSurfaceParchment,
              child: Row(
                children: columns.map((col) {
                  return Expanded(
                    flex: col.flex,
                    child: Text(
                      col.header,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: 0.3,
                      ),
                      textAlign: col.alignment,
                    ),
                  );
                }).toList(),
              ),
            ),
            const Divider(height: 1, color: AppColors.cardBorder),

            // Data Rows
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Center(
                  child: Text(
                    'No data available',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.lightTextMuted,
                    ),
                  ),
                ),
              )
            else
              ...List.generate(rows.length, (index) {
                final row = rows[index];
                final isEven = index % 2 == 0;
                final rowBg = isStriped && !isEven
                    ? AppColors.cardSurfaceParchment.withValues(alpha: 0.5)
                    : Colors.transparent;

                return Container(
                  constraints: BoxConstraints(minHeight: rowMinHeight),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  color: rowBg,
                  child: Row(
                    children: List.generate(columns.length, (colIdx) {
                      final cellData = colIdx < row.length ? row[colIdx] : '';
                      final col = columns[colIdx];

                      Widget cellWidget;
                      if (cellData is Widget) {
                        cellWidget = FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: col.alignment == TextAlign.center
                              ? Alignment.center
                              : col.alignment == TextAlign.right
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                          child: cellData,
                        );
                      } else {
                        cellWidget = Text(
                          cellData?.toString() ?? '',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: col.alignment,
                          overflow: TextOverflow.ellipsis,
                        );
                      }

                      return Expanded(
                        flex: col.flex,
                        child: cellWidget,
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
