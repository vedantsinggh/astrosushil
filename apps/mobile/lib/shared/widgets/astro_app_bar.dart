import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import 'astro_nav_bar.dart';

/// Standardized Navigation AppBar for Astro Sushil screens.
///
/// Now a thin, backwards-compatible wrapper around the shared adaptive
/// [AstroNavBar] (chevron + "Back" and centred title on iOS, arrow + start
/// title on Android, frosted when content scrolls under it). Existing call
/// sites upgrade automatically. New screens should prefer `AstroPage` /
/// [AstroSliverNavBar] for the collapsing large title.
///
/// * [isDark] or a [backgroundColor] of [AppColors.primary] selects the
///   navy→indigo `hero` style.
/// * [centerTitle] is kept for API compatibility; alignment now follows the
///   platform convention.
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
    final hero = isDark || backgroundColor == AppColors.primary;
    final solid = !hero && backgroundColor != null && backgroundColor != Colors.transparent;
    return AstroNavBar(
      title: title,
      leading: leading,
      actions: actions,
      showBack: showBackButton,
      onBack: onBackPressed,
      style: hero ? AstroNavBarStyle.hero : AstroNavBarStyle.accent,
      foregroundColor: foregroundColor,
      backgroundColor: solid ? backgroundColor : null,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(AstroMetrics.navBarHeight);
}
