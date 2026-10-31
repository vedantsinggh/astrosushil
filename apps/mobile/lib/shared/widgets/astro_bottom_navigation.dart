import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';

/// Destination item for [AstroBottomNavigation]
class AstroNavigationItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const AstroNavigationItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}

/// Standardized, accessible bottom navigation bar for Astro Sushil.
///
/// Features:
/// - Warm ivory parchment surface with crisp top border
/// - Refined active tab pill indicator
/// - 48x48dp minimum accessible touch targets
/// - Full localization support
class AstroBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final List<AstroNavigationItem> items;

  const AstroBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTabSelected,
    required this.items,
  });

  /// Factory constructor for the standard 4-tab shell
  factory AstroBottomNavigation.standard({
    Key? key,
    required int currentIndex,
    required ValueChanged<int> onTabSelected,
    String homeLabel = 'Home',
    String reportsLabel = 'Reports',
    String consultLabel = 'Consult',
    String accountLabel = 'Account',
  }) {
    return AstroBottomNavigation(
      key: key,
      currentIndex: currentIndex,
      onTabSelected: onTabSelected,
      items: [
        AstroNavigationItem(
          icon: Icons.home_outlined,
          activeIcon: Icons.home_rounded,
          label: homeLabel,
        ),
        AstroNavigationItem(
          icon: Icons.description_outlined,
          activeIcon: Icons.description_rounded,
          label: reportsLabel,
        ),
        AstroNavigationItem(
          icon: Icons.support_agent_outlined,
          activeIcon: Icons.support_agent_rounded,
          label: consultLabel,
        ),
        AstroNavigationItem(
          icon: Icons.person_outline_rounded,
          activeIcon: Icons.person_rounded,
          label: accountLabel,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        border: const Border(
          top: BorderSide(color: AppColors.cardBorder, width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (index) {
              final item = items[index];
              final isSelected = index == currentIndex;

              return Expanded(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    minHeight: AppTouchTargets.minTouchTarget,
                    minWidth: AppTouchTargets.minTouchTarget,
                  ),
                  child: InkWell(
                    onTap: () => onTabSelected(index),
                    borderRadius: BorderRadius.circular(12),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.primary.withValues(alpha: 0.1)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            isSelected ? item.activeIcon : item.icon,
                            size: 22,
                            color: isSelected ? AppColors.primary : AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? AppColors.primary : AppColors.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
