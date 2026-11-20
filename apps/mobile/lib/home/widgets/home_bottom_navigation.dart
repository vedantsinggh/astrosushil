import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_platform.dart';

/// Main tab bar with 4 always-labelled destinations, native on each platform:
///
/// * iOS: frosted translucent tab bar (blur + cream tint + top hairline),
///   filled icon + indigo tint for the selected tab, light haptic on change.
/// * Android: Material 3 navigation bar: tonal surface, pill indicator
///   behind the selected icon, labels always visible.
///
/// Labels never shrink below 14sp (accessibility rule) and scale down rather
/// than clip at very large text sizes. Every item is >= 48pt tall.
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
    final l10n = context.l10n;
    final isIOS = AstroPlatform.isCupertino(context);
    final items = <_TabSpec>[
      _TabSpec(Icons.home_outlined, Icons.home_rounded, l10n.navHome),
      _TabSpec(Icons.description_outlined, Icons.description_rounded, l10n.navReports),
      _TabSpec(Icons.forum_outlined, Icons.forum_rounded, l10n.navConsult),
      _TabSpec(Icons.person_outline_rounded, Icons.person_rounded, l10n.navAccount),
    ];

    final row = Center(
      heightFactor: 1,
      child: ConstrainedBox(
        // Comfortable spread on tablets / landscape.
        constraints: const BoxConstraints(maxWidth: 680),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < items.length; i++)
              Expanded(
                child: _NavItem(
                  index: i,
                  count: items.length,
                  selected: i == currentIndex,
                  spec: items[i],
                  isIOS: isIOS,
                  onTap: () {
                    if (i != currentIndex && isIOS) HapticFeedback.selectionClick();
                    onTap(i);
                  },
                ),
              ),
          ],
        ),
      ),
    );

    if (isIOS) {
      final hairline = math.max(0.5, 1 / MediaQuery.devicePixelRatioOf(context));
      return ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.navBarFrost,
              border: Border(top: BorderSide(color: AppColors.separator, width: hairline)),
            ),
            child: SafeArea(
              top: false,
              minimum: const EdgeInsets.only(bottom: 4),
              child: Padding(padding: const EdgeInsets.fromLTRB(4, 6, 4, 2), child: row),
            ),
          ),
        ),
      );
    }

    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Color(0xFFF4EFE7),
        border: Border(top: BorderSide(color: Color(0x14121440), width: 0.5)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(padding: const EdgeInsets.fromLTRB(4, 12, 4, 12), child: row),
      ),
    );
  }
}

class _TabSpec {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _TabSpec(this.icon, this.activeIcon, this.label);
}

class _NavItem extends StatelessWidget {
  final int index;
  final int count;
  final bool selected;
  final _TabSpec spec;
  final bool isIOS;
  final VoidCallback onTap;

  const _NavItem({
    required this.index,
    required this.count,
    required this.selected,
    required this.spec,
    required this.isIOS,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final selectedColor = isIOS ? AppColors.accent : AppColors.primary;
    final color = selected ? selectedColor : AppColors.textSecondary;
    final icon = Icon(selected ? spec.activeIcon : spec.icon, size: isIOS ? 26 : 24, color: color);

    final Widget iconArea = isIOS
        ? SizedBox(height: 28, child: Center(child: icon))
        : AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            width: 64,
            height: 32,
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFE4E0F3) : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(child: icon),
          );

    final label = FittedBox(
      fit: BoxFit.scaleDown,
      child: Text(
        spec.label,
        maxLines: 1,
        style: AppTypography.labelLarge.copyWith(
          fontSize: 14,
          height: 1.2,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: color,
        ),
      ),
    );

    return Semantics(
      button: true,
      selected: selected,
      label: '${spec.label}, tab ${index + 1} of $count',
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        // iOS tab bars have no ripple.
        splashFactory: isIOS ? NoSplash.splashFactory : null,
        highlightColor: isIOS ? Colors.transparent : null,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                iconArea,
                SizedBox(height: isIOS ? 2 : 4),
                label,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
