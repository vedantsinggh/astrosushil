import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Standardized Navigation AppBar for Astro Sushil screens.
/// Guarantees high contrast and visible back buttons for light and dark themes.
class AstroAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final Widget? leading;
  final List<Widget>? actions;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final bool isDark;
  final bool centerTitle;

  const AstroAppBar({
    super.key,
    required this.title,
    this.leading,
    this.actions,
    this.showBackButton = true,
    this.onBackPressed,
    this.backgroundColor,
    this.foregroundColor,
    this.isDark = false,
    this.centerTitle = true,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveIsDark = isDark || backgroundColor == AppColors.primary;
    final defaultFgColor = effectiveIsDark ? Colors.white : AppColors.primary;
    final fgColor = foregroundColor ?? defaultFgColor;
    final bgColor = backgroundColor ?? (effectiveIsDark ? AppColors.primary : Colors.transparent);

    return AppBar(
      backgroundColor: bgColor,
      foregroundColor: fgColor,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: centerTitle,
      iconTheme: IconThemeData(color: fgColor),
      actionsIconTheme: IconThemeData(color: fgColor),
      leading: leading ??
          (showBackButton
              ? IconButton(
                  icon: Icon(
                    Icons.arrow_back_ios_new_rounded,
                    color: fgColor,
                    size: 20,
                  ),
                  tooltip: 'Back',
                  onPressed: onBackPressed ?? () => Navigator.of(context).pop(),
                )
              : null),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: fgColor,
          letterSpacing: -0.2,
        ),
      ),
      actions: actions,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
