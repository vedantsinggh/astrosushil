import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import '../theme/app_typography.dart';
import '../widgets/astro_controls.dart';
import '../widgets/astro_lists.dart';
import '../widgets/astro_nav_bar.dart';
import '../widgets/astro_surfaces.dart';

/// Small set of presentation-only building blocks shared by the simple,
/// accessibility-first screens (birth profiles, settings, notifications,
/// support, legal and system screens).
///
/// These are now thin wrappers over the shared design system in
/// `lib/shared/widgets` (AstroNavBar, AstroGroupedSection, AstroListRow,
/// AstroPrimaryButton, AstroStateView, ...). Their public APIs are kept so
/// existing screens keep working; new code should use the shared
/// components directly.
///
/// Design rules baked in:
/// - body text >= 16px, secondary text >= 14px
/// - tap targets >= 44-48px, icons always paired with a text label
/// - platform back button (iOS: chevron + "Back"; Android: arrow)
/// - inset-grouped white sections on the cream canvas, gold only for the
///   primary action

/// Shared adaptive nav bar with an optional short title. Long page titles
/// belong in [SimplePageHeading] (or `AstroPage`'s large title).
class SimpleScreenAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final List<Widget>? actions;
  final bool showBack;
  final String? backLabel;
  final VoidCallback? onBack;

  const SimpleScreenAppBar({
    super.key,
    this.title,
    this.actions,
    this.showBack = true,
    this.backLabel,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return AstroNavBar(
      title: title,
      actions: actions,
      showBack: showBack,
      backLabel: backLabel,
      onBack: onBack,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(AstroMetrics.navBarHeight);
}

/// Large page heading (serif, large-title look) with at most one line of
/// helper text.
class SimplePageHeading extends StatelessWidget {
  final String title;
  final String? subtitle;

  const SimplePageHeading({super.key, required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Headings are already large; cap their growth so long words
          // still fit at 2x system text.
          MediaQuery.withClampedTextScaling(
            maxScaleFactor: 1.4,
            child: Text(
              title,
              style: AppTypography.largeTitle.copyWith(fontSize: 30, letterSpacing: -0.6, height: 1.15),
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              style: AppTypography.bodyLarge.copyWith(color: AppColors.textSecondary, height: 1.4),
            ),
          ],
        ],
      ),
    );
  }
}

/// Small grey label shown above a group of rows (iOS section header).
class SimpleSectionLabel extends StatelessWidget {
  final String text;

  const SimpleSectionLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, bottom: 8),
      child: Semantics(header: true, child: Text(text, style: AppTypography.sectionHeader)),
    );
  }
}

/// White inset-grouped section that draws inset hairlines between rows.
/// Delegates to [AstroGroupedSection].
class SimpleGroupCard extends StatelessWidget {
  final List<Widget> children;
  final EdgeInsetsGeometry? padding;
  final Color? borderColor;

  const SimpleGroupCard({super.key, required this.children, this.padding, this.borderColor});

  @override
  Widget build(BuildContext context) {
    final iconRows = children.isNotEmpty && children.first is SimpleListRow;
    return AstroGroupedSection(
      padding: padding,
      borderColor: borderColor,
      dividerInset: iconRows ? 16 + AstroMetrics.iconSquare + 14 : 16,
      children: children,
    );
  }
}

/// List row: tinted icon square + title (+ optional subtitle) + trailing.
/// Delegates to [AstroListRow].
class SimpleListRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color iconColor;
  final Color? iconBackground;
  final Color titleColor;
  final bool showChevron;

  const SimpleListRow({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.iconColor = AppColors.primary,
    this.iconBackground,
    this.titleColor = AppColors.textPrimary,
    this.showChevron = true,
  });

  @override
  Widget build(BuildContext context) {
    return AstroListRow(
      icon: icon,
      tint: AstroTint(iconColor, iconBackground ?? iconColor.withValues(alpha: 0.10)),
      title: title,
      subtitle: subtitle,
      trailing: trailing,
      onTap: onTap,
      showChevron: onTap != null && showChevron && trailing == null,
      titleColor: titleColor,
    );
  }
}

/// Rounded-square tinted icon used at the start of rows and cards.
/// Delegates to [AstroIconSquare].
class SimpleIconBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color? background;
  final double size;

  const SimpleIconBadge({
    super.key,
    required this.icon,
    this.color = AppColors.primary,
    this.background,
    this.size = 44,
  });

  @override
  Widget build(BuildContext context) {
    return AstroIconSquare(
      icon: icon,
      tint: AstroTint(color, background ?? color.withValues(alpha: 0.10)),
      size: size,
    );
  }
}

/// The one big gold button on a screen. Delegates to [AstroPrimaryButton].
class SimplePrimaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;

  const SimplePrimaryButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return AstroPrimaryButton(label: label, icon: icon, onPressed: onPressed, isLoading: isLoading);
  }
}

/// Secondary button: tinted for the default navy colour, destructive for
/// red colours, otherwise outlined in [color]. Delegates to
/// [AstroSecondaryButton].
class SimpleSecondaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final Color color;

  const SimpleSecondaryButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.color = AppColors.primary,
  });

  @override
  Widget build(BuildContext context) {
    final destructive = color == AppColors.error || color == AppColors.errorText || color == AppColors.destructive;
    final variant = color == AppColors.primary
        ? AstroSecondaryVariant.tinted
        : destructive
            ? AstroSecondaryVariant.destructive
            : AstroSecondaryVariant.outlined;
    return AstroSecondaryButton(
      label: label,
      icon: icon,
      onPressed: onPressed,
      variant: variant,
      color: variant == AstroSecondaryVariant.outlined ? color : null,
    );
  }
}

/// Calm full-page state (empty, error, maintenance, not found) with one
/// action. Delegates to [AstroStateView].
class SimpleStateView extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String? message;
  final Widget? extra;
  final String? actionLabel;
  final IconData? actionIcon;
  final VoidCallback? onAction;

  const SimpleStateView({
    super.key,
    required this.icon,
    required this.title,
    this.iconColor = AppColors.secondary,
    this.message,
    this.extra,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return AstroStateView.empty(
      icon: icon,
      title: title,
      message: message,
      extra: extra,
      actionLabel: actionLabel,
      actionIcon: actionIcon,
      onAction: onAction,
    );
  }
}

/// Soft informational note (one icon + short text). Delegates to [AstroNote].
class SimpleNote extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  final Color? background;

  const SimpleNote({
    super.key,
    required this.icon,
    required this.text,
    this.color = AppColors.secondary,
    this.background,
  });

  @override
  Widget build(BuildContext context) {
    final fg = color == AppColors.secondary ? AppColors.accent : color;
    return AstroNote(text, icon: icon, tint: AstroTint(fg, background ?? color.withValues(alpha: 0.08)));
  }
}

/// Simple labelled "Learn more" expander. Delegates to [AstroExpander].
class SimpleExpander extends StatelessWidget {
  final String label;
  final Widget child;
  final bool initiallyExpanded;

  const SimpleExpander({
    super.key,
    required this.label,
    required this.child,
    this.initiallyExpanded = false,
  });

  @override
  Widget build(BuildContext context) {
    return AstroExpander(label: label, initiallyExpanded: initiallyExpanded, child: child);
  }
}

/// Tap-to-filter choice pill that wraps onto new lines (no hidden
/// horizontal scrolling). Delegates to [AstroPill].
class SimpleChoicePill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const SimpleChoicePill({super.key, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return AstroPill(label: label, selected: selected, onTap: onTap);
  }
}
