import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_platform.dart';

/// Data class for tab item configuration
class AstrologyTabItem {
  final String label;
  final IconData? icon;
  final String? badge;

  const AstrologyTabItem({
    required this.label,
    this.icon,
    this.badge,
  });
}

/// Reusable segmented tab bar control for switching between astrological views and divisional charts.
/// Supports smooth animated transitions, icon indicators, badge pills, and dark/light variants.
///
/// Every tab is always visible: when the tabs fit on one line they are shown
/// as an even segmented control, otherwise they form a balanced grid of
/// equal-width buttons (no hidden tabs that can only be reached by swiping
/// sideways).
/// [isScrollable] is kept for API compatibility; it no longer hides tabs.
class AstrologyTabBar extends StatelessWidget {
  final List<AstrologyTabItem> tabs;
  final int selectedIndex;
  final ValueChanged<int> onTabSelected;
  final bool isScrollable;
  final bool isDark;
  final EdgeInsetsGeometry padding;

  const AstrologyTabBar({
    super.key,
    required this.tabs,
    required this.selectedIndex,
    required this.onTabSelected,
    this.isScrollable = false,
    this.isDark = false,
    this.padding = const EdgeInsets.all(4),
  });

  static const double _hPad = 12;
  static const double _iconSize = 18;
  static const double _gap = 6;
  static const double _fontSize = 15;

  double _naturalWidth(
    AstrologyTabItem item,
    TextScaler scaler,
    TextDirection dir,
    TextStyle base,
  ) {
    // Measure with the same font family the tab text actually renders in.
    final tp = TextPainter(
      text: TextSpan(
        text: item.label,
        style: base.copyWith(fontSize: _fontSize, fontWeight: FontWeight.w700),
      ),
      textScaler: scaler,
      textDirection: dir,
      maxLines: 1,
    )..layout();
    var w = tp.width + _hPad * 2;
    if (item.icon != null) w += scaler.scale(_iconSize) + _gap;
    if (item.badge != null) {
      final bp = TextPainter(
        text: TextSpan(
          text: item.badge,
          style: base.copyWith(fontSize: 12, fontWeight: FontWeight.w700),
        ),
        textScaler: scaler,
        textDirection: dir,
        maxLines: 1,
      )..layout();
      w += bp.width + 12 + _gap;
    }
    return w + 2; // rounding safety
  }

  @override
  Widget build(BuildContext context) {
    final scaler = MediaQuery.textScalerOf(context);
    final dir = Directionality.of(context);
    final resolvedPadding = padding.resolve(dir);
    final baseStyle = DefaultTextStyle.of(context).style;

    // iOS segmented-control track.
    final containerBg = isDark ? AppColors.tertiary : AppColors.segmentedTrack;

    return LayoutBuilder(
      builder: (context, constraints) {
        final widths = tabs.map((t) => _naturalWidth(t, scaler, dir, baseStyle)).toList();
        final innerWidth = constraints.maxWidth - resolvedPadding.horizontal;
        final widest = widths.fold<double>(0, (a, b) => a > b ? a : b);
        final equalFits = constraints.hasBoundedWidth &&
            widest * tabs.length + 4.0 * tabs.length <= innerWidth;
        // When equal-width segments don't fit, size each segment to its
        // label (like iOS) before falling back to a wrapping pill grid.
        final totalNatural = widths.fold<double>(0, (a, b) => a + b);
        final fitsInRow = equalFits ||
            (constraints.hasBoundedWidth && totalNatural + 6.0 * tabs.length <= innerWidth);

        if (fitsInRow) {
          return Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: containerBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: List.generate(tabs.length, (index) {
                return Expanded(
                  flex: equalFits ? 1 : widths[index].round(),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 0),
                    child: _TabButton(
                      item: tabs[index],
                      isSelected: selectedIndex == index,
                      isDark: isDark,
                      bordered: false,
                      onTap: () => onTabSelected(index),
                    ),
                  ),
                );
              }),
            ),
          );
        }

        if (!constraints.hasBoundedWidth) {
          return Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(tabs.length, (index) {
              return _TabButton(
                item: tabs[index],
                isSelected: selectedIndex == index,
                isDark: isDark,
                bordered: true,
                onTap: () => onTabSelected(index),
              );
            }),
          );
        }

        // Grid mode: every tab visible as an equal-width button, in as few
        // and as balanced rows as fit (e.g. 4 tabs become a 2 x 2 grid).
        const gap = 8.0;
        final maxCols = ((constraints.maxWidth + gap) / (widest + gap)).floor().clamp(1, tabs.length);
        final rowCount = (tabs.length / maxCols).ceil();
        final cols = (tabs.length / rowCount).ceil();
        final rows = <Widget>[];
        for (var start = 0; start < tabs.length; start += cols) {
          if (rows.isNotEmpty) rows.add(const SizedBox(height: gap));
          final cells = <Widget>[];
          for (var c = 0; c < cols; c++) {
            if (c > 0) cells.add(const SizedBox(width: gap));
            final index = start + c;
            cells.add(Expanded(
              child: index < tabs.length
                  ? _TabButton(
                      item: tabs[index],
                      isSelected: selectedIndex == index,
                      isDark: isDark,
                      bordered: true,
                      onTap: () => onTabSelected(index),
                    )
                  : const SizedBox.shrink(),
            ));
          }
          rows.add(Row(crossAxisAlignment: CrossAxisAlignment.start, children: cells));
        }
        return Padding(
          padding: EdgeInsets.symmetric(vertical: resolvedPadding.top),
          child: Column(mainAxisSize: MainAxisSize.min, children: rows),
        );
      },
    );
  }
}

class _TabButton extends StatelessWidget {
  final AstrologyTabItem item;
  final bool isSelected;
  final bool isDark;
  final bool bordered;
  final VoidCallback onTap;

  const _TabButton({
    required this.item,
    required this.isSelected,
    required this.isDark,
    required this.bordered,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Segmented mode (not bordered): white sliding "thumb" on the track.
    // Grid mode (bordered): pills, navy when selected.
    final activeBg = isDark ? AppColors.premiumAccent : (bordered ? AppColors.primary : Colors.white);
    final activeFg = isDark ? AppColors.primary : (bordered ? Colors.white : AppColors.textPrimary);
    final inactiveFg = isDark ? Colors.white.withValues(alpha: 0.85) : (bordered ? AppColors.textPrimary : AppColors.textSecondary);
    final radius = BorderRadius.circular(bordered ? 24 : 9);
    final inactiveBg = bordered
        ? (isDark ? AppColors.tertiary : AppColors.cardSurface)
        : Colors.transparent;
    final fg = isSelected ? activeFg : inactiveFg;

    return Semantics(
      selected: isSelected,
      button: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            constraints: BoxConstraints(minHeight: bordered || !AstroPlatform.isCupertino(context) ? 48 : 44),
            padding: const EdgeInsets.symmetric(
              horizontal: AstrologyTabBar._hPad,
              vertical: 10,
            ),
            decoration: BoxDecoration(
              color: isSelected ? activeBg : inactiveBg,
              borderRadius: radius,
              boxShadow: isSelected && !bordered && !isDark
                  ? const [BoxShadow(color: Color(0x1F121440), blurRadius: 6, offset: Offset(0, 2))]
                  : null,
              border: bordered
                  ? Border.all(
                      color: isSelected
                          ? activeBg
                          : (isDark
                              ? AppColors.secondary.withValues(alpha: 0.5)
                              : AppColors.cardBorder),
                    )
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (item.icon != null) ...[
                  Icon(item.icon, size: AstrologyTabBar._iconSize, color: fg),
                  const SizedBox(width: AstrologyTabBar._gap),
                ],
                Flexible(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      fontSize: AstrologyTabBar._fontSize,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                      color: fg,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                if (item.badge != null) ...[
                  const SizedBox(width: AstrologyTabBar._gap),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? fg.withValues(alpha: 0.2)
                          : AppColors.secondary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item.badge!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isSelected ? fg : AppColors.secondary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
