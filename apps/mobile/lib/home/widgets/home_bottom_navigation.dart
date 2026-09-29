import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Clean floating rounded light bottom navigation container matching reference UI
class HomeBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const HomeBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 4, 20, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(35),
          border: Border.all(
            color: AppColors.lightBorder,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                index: 0,
                currentIndex: currentIndex,
                icon: Icons.home_rounded,
                label: 'Home',
                onTap: () => onTap(0),
              ),
              _NavItem(
                index: 1,
                currentIndex: currentIndex,
                icon: Icons.assignment_outlined,
                activeIcon: Icons.assignment_rounded,
                label: 'Reports',
                onTap: () => onTap(1),
              ),
              _NavItem(
                index: 2,
                currentIndex: currentIndex,
                icon: Icons.person_outline_rounded,
                activeIcon: Icons.person_rounded,
                label: 'Profile',
                onTap: () => onTap(2),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final int index;
  final int currentIndex;
  final IconData icon;
  final IconData? activeIcon;
  final String label;
  final VoidCallback onTap;

  const _NavItem({
    required this.index,
    required this.currentIndex,
    required this.icon,
    this.activeIcon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = index == currentIndex;
    final displayIcon = (isSelected && activeIcon != null) ? activeIcon! : icon;

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFEAE8F4) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                displayIcon,
                size: 20,
                color: isSelected ? AppColors.primary : AppColors.lightTextSecondary,
              ),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppColors.primary : AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
