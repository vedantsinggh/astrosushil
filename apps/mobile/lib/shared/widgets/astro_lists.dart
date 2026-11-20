import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import '../theme/app_typography.dart';

/// Rounded tinted icon square used at the start of list rows and cards
/// (iOS Settings style, in soft brand tints).
class AstroIconSquare extends StatelessWidget {
  final IconData icon;
  final AstroTint tint;
  final double size;

  const AstroIconSquare({
    super.key,
    required this.icon,
    this.tint = AstroTint.indigo,
    this.size = AstroMetrics.iconSquare,
  });

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: tint.background,
          borderRadius: BorderRadius.circular(size * 0.28),
        ),
        child: Icon(icon, color: tint.foreground, size: size * 0.56),
      ),
    );
  }
}

/// iOS inset-grouped section: optional sentence-case [header] above a white
/// rounded group of rows with inset hairline dividers, and an optional
/// [footer] note below.
///
/// ```dart
/// AstroGroupedSection(header: 'Notifications', children: [
///   AstroListRow(icon: Icons.notifications_rounded, title: 'Daily horoscope', trailing: Switch.adaptive(...)),
///   AstroListRow(icon: Icons.language_rounded, title: 'Language', value: 'English', onTap: ...),
/// ])
/// ```
class AstroGroupedSection extends StatelessWidget {
  final String? header;
  final String? footer;
  final List<Widget> children;

  /// Left inset of the dividers. Defaults to aligning with row text when the
  /// first row has an icon, otherwise 16.
  final double? dividerInset;
  final EdgeInsetsGeometry margin;
  final EdgeInsetsGeometry? padding;
  final Color? borderColor;

  const AstroGroupedSection({
    super.key,
    this.header,
    this.footer,
    required this.children,
    this.dividerInset,
    this.margin = EdgeInsets.zero,
    this.padding,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final hasIcons = children.isNotEmpty && children.first is AstroListRow && (children.first as AstroListRow).icon != null;
    final inset = dividerInset ?? (hasIcons ? 16 + AstroMetrics.iconSquare + 14 : 16);
    final items = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) {
        items.add(Padding(
          padding: EdgeInsetsDirectional.only(start: inset),
          child: const Divider(height: 0.5, thickness: 0.5, color: AppColors.separator),
        ));
      }
      items.add(children[i]);
    }

    return Padding(
      padding: margin,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (header != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Semantics(header: true, child: Text(header!, style: AppTypography.sectionHeader)),
            ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.cardSurface,
              borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
              border: borderColor == null ? null : Border.all(color: borderColor!),
              boxShadow: AstroShadows.card,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
              child: Material(
                type: MaterialType.transparency,
                child: Padding(
                  padding: padding ?? EdgeInsets.zero,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: items,
                  ),
                ),
              ),
            ),
          ),
          if (footer != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(footer!, style: AppTypography.rowSubtitle.copyWith(fontSize: 14)),
            ),
        ],
      ),
    );
  }
}

/// iOS list row: leading tinted icon square, title, optional subtitle, and a
/// trailing [value] text, custom [trailing] widget or chevron (shown when
/// tappable). Min 52pt tall; everything wraps at large text sizes.
class AstroListRow extends StatelessWidget {
  final IconData? icon;
  final AstroTint tint;
  final String title;
  final String? subtitle;

  /// Short trailing value ("English", "₹299").
  final String? value;

  /// Custom trailing widget (switch, badge, button). Replaces the chevron.
  final Widget? trailing;
  final VoidCallback? onTap;

  /// Show the disclosure chevron. Defaults to true when [onTap] is set and
  /// there is no custom [trailing].
  final bool? showChevron;

  /// Red title, for "Sign out" / "Delete" rows.
  final bool destructive;

  /// Custom leading widget (avatar, radio). Replaces [icon].
  final Widget? leading;
  final Color? titleColor;

  const AstroListRow({
    super.key,
    required this.title,
    this.icon,
    this.tint = AstroTint.indigo,
    this.subtitle,
    this.value,
    this.trailing,
    this.onTap,
    this.showChevron,
    this.destructive = false,
    this.leading,
    this.titleColor,
  });

  @override
  Widget build(BuildContext context) {
    final chevron = showChevron ?? (onTap != null && trailing == null);
    final lead = leading ?? (icon == null ? null : AstroIconSquare(icon: icon!, tint: destructive ? AstroTint.danger : tint));
    final color = titleColor ?? (destructive ? AppColors.errorText : AppColors.textPrimary);

    final row = ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 52),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
        child: Row(
          children: [
            if (lead != null) ...[lead, const SizedBox(width: 14)],
            Expanded(
              flex: 5,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, style: AppTypography.rowTitle.copyWith(color: color)),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(subtitle!, style: AppTypography.rowSubtitle),
                  ],
                ],
              ),
            ),
            if (value != null) ...[
              const SizedBox(width: 10),
              Flexible(
                flex: 3,
                child: Text(
                  value!,
                  textAlign: TextAlign.end,
                  style: AppTypography.rowTitle.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.w400),
                ),
              ),
            ],
            if (trailing != null) ...[const SizedBox(width: 10), trailing!],
            if (chevron) ...[
              const SizedBox(width: 6),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 24),
            ],
          ],
        ),
      ),
    );

    if (onTap == null) return MergeSemantics(child: row);
    return MergeSemantics(
      child: Semantics(button: true, child: InkWell(onTap: onTap, child: row)),
    );
  }
}

/// Section heading for content pages (serif, 22pt) with optional one-line
/// subtitle and a trailing action (e.g. "See all").
class AstroSectionHeading extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  const AstroSectionHeading(
    this.title, {
    super.key,
    this.subtitle,
    this.trailing,
    this.padding = const EdgeInsets.only(left: 2, bottom: 10),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Semantics(
                  header: true,
                  child: Text(title, style: AppTypography.headlineLarge.copyWith(fontSize: 22, letterSpacing: -0.3)),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: AppTypography.rowSubtitle),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 8), trailing!],
        ],
      ),
    );
  }
}
