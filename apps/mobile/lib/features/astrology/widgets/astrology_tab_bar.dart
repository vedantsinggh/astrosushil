import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

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

  @override
  Widget build(BuildContext context) {
    final containerBg = isDark
        ? AppColors.tertiary
        : AppColors.primary.withValues(alpha: 0.06);

    final activeTabBg = isDark
        ? AppColors.premiumAccent
        : AppColors.primary;

    final activeTextColor = isDark
        ? AppColors.primary
        : Colors.white;

    final inactiveTextColor = isDark
        ? Colors.white.withValues(alpha: 0.7)
        : AppColors.lightTextSecondary;

    if (isScrollable) {
      return Container(
        padding: padding,
        decoration: BoxDecoration(
          color: containerBg,
          borderRadius: BorderRadius.circular(30),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(tabs.length, (index) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2.0),
                child: _buildTabButton(
                  item: tabs[index],
                  index: index,
                  isSelected: selectedIndex == index,
                  activeTabBg: activeTabBg,
                  activeTextColor: activeTextColor,
                  inactiveTextColor: inactiveTextColor,
                ),
              );
            }),
          ),
        ),
      );
    }

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: containerBg,
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(tabs.length, (index) {
          final isSelected = selectedIndex == index;
          return Expanded(
            child: _buildTabButton(
              item: tabs[index],
              index: index,
              isSelected: isSelected,
              activeTabBg: activeTabBg,
              activeTextColor: activeTextColor,
              inactiveTextColor: inactiveTextColor,
            ),
          );
        }),
      ),
    );
  }

  Widget _buildTabButton({
    required AstrologyTabItem item,
    required int index,
    required bool isSelected,
    required Color activeTabBg,
    required Color activeTextColor,
    required Color inactiveTextColor,
  }) {
    final textWidget = Text(
      item.label,
      style: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? activeTextColor : inactiveTextColor,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      textAlign: TextAlign.center,
    );

    return InkWell(
      onTap: () => onTabSelected(index),
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? activeTabBg : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeTabBg.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (item.icon != null) ...[
              Icon(
                item.icon,
                size: 14,
                color: isSelected
                    ? activeTextColor
                    : inactiveTextColor,
              ),
              const SizedBox(width: 5),
            ],
            if (isScrollable) textWidget else Flexible(child: textWidget),
            if (item.badge != null) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? AppColors.primary.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.2))
                      : AppColors.secondary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  item.badge!,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? activeTextColor : AppColors.secondary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
