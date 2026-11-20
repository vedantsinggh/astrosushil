import 'package:flutter/material.dart';

import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_controls.dart';
import '../../../shared/widgets/astro_lists.dart';
import '../../../shared/widgets/astro_surfaces.dart';

/// Small, presentation-only building blocks shared by the advanced astrology
/// screens (dasha, gochara, ashtakavarga, shadbala, bhava bala, KP, jaimini,
/// varshaphala, prashna, matchmaking, vastu).
///
/// Design goals: flat surfaces, generous spacing, large readable text
/// (body >= 16, secondary >= 14), tap targets >= 48 and layouts that wrap
/// instead of clipping at 320px wide or 2.0x text scale.
///
/// These widgets never compute or interpret astrology. They only lay out
/// strings and numbers the screens already have.

/// Shared page padding for advanced screens.
const EdgeInsets kAdvPagePadding = EdgeInsets.fromLTRB(16, 12, 16, 32);

/// Vertical gap between top-level blocks.
const double kAdvGap = 16;

const TextStyle _kTitleStyle = TextStyle(
  fontFamily: AppTypography.headingFamily,
  fontFamilyFallback: AppTypography.headingFontFamilies,
  fontSize: 19,
  fontWeight: FontWeight.w700,
  color: AppColors.textPrimary,
  letterSpacing: -0.2,
  height: 1.25,
);

const TextStyle _kBodyStyle = TextStyle(
  fontFamily: AppTypography.bodyFamily,
  fontSize: 16,
  color: AppColors.textPrimary,
  height: 1.45,
);

const TextStyle _kSecondaryStyle = TextStyle(
  fontFamily: AppTypography.bodyFamily,
  fontSize: 14,
  color: AppColors.textSecondary,
  height: 1.4,
);

/// White content card. Delegates to the shared [AstroSurfaceCard].
class AdvCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Color? borderColor;

  const AdvCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      padding: padding,
      color: color ?? AppColors.cardSurface,
      borderColor: borderColor,
      child: child,
    );
  }
}

/// The "at a glance" block at the top of a screen: a short label, one heading,
/// one optional line of plain helper text and an optional body (stats, chips).
/// Uses the shared navy→indigo [AstroGradientCard] so it reads as the
/// primary summary (the one hero per screen).
class AdvSummaryCard extends StatelessWidget {
  final String? label;
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Widget? child;

  const AdvSummaryCard({
    super.key,
    this.label,
    required this.title,
    this.subtitle,
    this.icon,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return AstroGradientCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label != null) ...[
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 20, color: AppColors.gold),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    label!,
                    style: const TextStyle(
                      fontFamily: AppTypography.bodyFamily,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.gold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
          Text(
            title,
            style: TextStyle(
              fontFamily: AppTypography.headingFamily,
              fontFamilyFallback: AppTypography.headingFontFamilies,
              fontSize: MediaQuery.textScalerOf(context).scale(22) / 22 >= 1.6 ? 19 : 22,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              letterSpacing: -0.2,
              height: 1.2,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              style: const TextStyle(
                fontFamily: AppTypography.bodyFamily,
                fontSize: 16,
                color: AppColors.textInverseSecondary,
                height: 1.45,
              ),
            ),
          ],
          if (child != null) ...[
            const SizedBox(height: 16),
            child!,
          ],
        ],
      ),
    );
  }
}

/// One key number shown in a stat tile.
class AdvStat {
  final String label;
  final String value;
  final String? caption;
  final Color? accent;

  const AdvStat({required this.label, required this.value, this.caption, this.accent});
}

/// Responsive grid of key numbers. Two columns on phones, more on tablets,
/// one column when the text is very large.
class AdvStatGrid extends StatelessWidget {
  final List<AdvStat> stats;

  /// When true, tiles are drawn for the dark summary card.
  final bool onDark;

  const AdvStatGrid({super.key, required this.stats, this.onDark = false});

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(16) / 16;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        int columns = width >= 720 ? 4 : (width >= 480 ? 3 : 2);
        if (scale >= 1.6 && width < 480) columns = 1;
        if (columns > stats.length) columns = stats.isEmpty ? 1 : stats.length;
        const spacing = 10.0;
        final tileWidth = (width - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final s in stats)
              SizedBox(
                width: tileWidth,
                child: _AdvStatTile(stat: s, onDark: onDark),
              ),
          ],
        );
      },
    );
  }
}

class _AdvStatTile extends StatelessWidget {
  final AdvStat stat;
  final bool onDark;

  const _AdvStatTile({required this.stat, required this.onDark});

  @override
  Widget build(BuildContext context) {
    final valueColor = stat.accent ?? (onDark ? Colors.white : AppColors.textPrimary);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: onDark ? Colors.white.withValues(alpha: 0.08) : AppColors.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: onDark ? Colors.white.withValues(alpha: 0.14) : AppColors.cardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            stat.label,
            style: TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontSize: 14,
              color: onDark ? AppColors.textInverseSecondary : AppColors.textSecondary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            stat.value,
            style: TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: valueColor,
              height: 1.25,
            ),
          ),
          if (stat.caption != null) ...[
            const SizedBox(height: 2),
            Text(
              stat.caption!,
              style: TextStyle(
                fontFamily: AppTypography.bodyFamily,
                fontSize: 14,
                color: onDark ? AppColors.textInverseSecondary : AppColors.textSecondary,
                height: 1.3,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Section with a plain heading, optional one-line helper and content.
class AdvSection extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;

  /// Soft colour of the leading icon square.
  final AstroTint tint;
  final Widget child;
  final Widget? trailing;

  /// When false the child is placed directly under the heading without a card.
  final bool inCard;

  const AdvSection({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.tint = AstroTint.indigo,
    required this.child,
    this.trailing,
    this.inCard = true,
  });

  @override
  Widget build(BuildContext context) {
    final header = Row(
      crossAxisAlignment: subtitle == null ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        if (icon != null) ...[
          AstroIconSquare(icon: icon!, tint: tint, size: 38),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(header: true, child: Text(title, style: _kTitleStyle)),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle!, style: _kSecondaryStyle),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 8), trailing!],
      ],
    );

    if (!inCard) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [header, const SizedBox(height: 14), child],
      );
    }
    return AdvCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [header, const SizedBox(height: 16), child],
      ),
    );
  }
}

/// A collapsed block that reveals detailed tables on tap.
/// The child is only built when expanded.
class AdvDetailsExpander extends StatefulWidget {
  final String title;
  final String? subtitle;
  final Widget child;
  final bool initiallyExpanded;
  final IconData icon;

  const AdvDetailsExpander({
    super.key,
    this.title = 'See full details',
    this.subtitle,
    required this.child,
    this.initiallyExpanded = false,
    this.icon = Icons.table_rows_rounded,
  });

  @override
  State<AdvDetailsExpander> createState() => _AdvDetailsExpanderState();
}

class _AdvDetailsExpanderState extends State<AdvDetailsExpander> {
  late bool _expanded = widget.initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
        border: Border.all(color: _expanded ? AppColors.goldBorder : const Color(0x0F121440), width: _expanded ? 1 : 0.5),
        boxShadow: AstroShadows.card,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: _expanded,
            child: InkWell(
              onTap: () => setState(() => _expanded = !_expanded),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 56),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      AstroIconSquare(icon: widget.icon, tint: AstroTint.slate),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              style: const TextStyle(
                                fontFamily: AppTypography.bodyFamily,
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                                height: 1.3,
                              ),
                            ),
                            if (widget.subtitle != null) ...[
                              const SizedBox(height: 2),
                              Text(widget.subtitle!, style: _kSecondaryStyle),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _expanded ? 'Hide' : 'Show',
                        style: const TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.accent,
                        ),
                      ),
                      Icon(
                        _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        color: AppColors.accent,
                        size: 24,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (_expanded) ...[
            const Divider(height: 0.5, thickness: 0.5, color: AppColors.separator),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: widget.child,
            ),
          ],
        ],
      ),
    );
  }
}

/// A label / value row that wraps instead of overflowing. Used in place of
/// wide table rows on small phones.
class AdvInfoRow extends StatelessWidget {
  final String label;
  final String value;
  final String? note;
  final Widget? leading;
  final Color? valueColor;
  final bool emphasize;
  final bool showDivider;

  const AdvInfoRow({
    super.key,
    required this.label,
    required this.value,
    this.note,
    this.leading,
    this.valueColor,
    this.emphasize = false,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: showDivider
          ? const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.cardBorderSubtle)),
            )
          : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (leading != null) ...[leading!, const SizedBox(width: 10)],
          Expanded(
            flex: 5,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: _kSecondaryStyle.copyWith(fontSize: 15)),
                if (note != null) ...[
                  const SizedBox(height: 2),
                  Text(note!, style: _kSecondaryStyle),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 4,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: _kBodyStyle.copyWith(
                fontWeight: emphasize ? FontWeight.w700 : FontWeight.w600,
                color: valueColor ?? AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A row-card used instead of a wide table row: a title line with an optional
/// badge, then a wrap of small "label: value" facts.
class AdvRowCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? badge;
  final List<MapEntry<String, String>> facts;
  final bool highlight;
  final VoidCallback? onTap;

  const AdvRowCard({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.badge,
    this.facts = const [],
    this.highlight = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (leading != null) ...[leading!, const SizedBox(width: 10)],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: _kBodyStyle.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (subtitle != null) Text(subtitle!, style: _kSecondaryStyle),
                  ],
                ),
              ),
              if (badge != null) ...[const SizedBox(width: 8), badge!],
            ],
          ),
          if (facts.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 16,
              runSpacing: 6,
              children: [
                for (final f in facts)
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: '${f.key}  ', style: _kSecondaryStyle),
                        TextSpan(
                          text: f.value,
                          style: _kSecondaryStyle.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: highlight ? AppColors.tintAmberBg : AppColors.cardSurface,
        borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
        border: Border.all(
          color: highlight ? AppColors.gold : const Color(0x0F121440),
          width: highlight ? 1.5 : 0.5,
        ),
        boxShadow: highlight ? null : AstroShadows.card,
      ),
      child: onTap == null
          ? content
          : InkWell(
              onTap: onTap,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: content,
              ),
            ),
    );
  }
}

/// Small pill label. Text is never smaller than 13px.
class AdvBadge extends StatelessWidget {
  final String text;
  final Color color;
  final Color? background;
  final IconData? icon;

  const AdvBadge(this.text, {super.key, this.color = AppColors.secondary, this.background, this.icon});

  /// Gold "Now" style highlight badge.
  const AdvBadge.now(this.text, {super.key, this.icon})
      : color = AppColors.primary,
        background = AppColors.gold;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background ?? color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              text,
              style: TextStyle(
                fontFamily: AppTypography.bodyFamily,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: color,
                height: 1.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Large gold primary action button (one per screen).
/// Delegates to [AstroPrimaryButton].
class AdvPrimaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool loading;

  const AdvPrimaryButton({
    super.key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return AstroPrimaryButton(label: label, icon: icon, onPressed: onPressed, isLoading: loading);
  }
}

/// Secondary action button. Delegates to [AstroSecondaryButton] (tinted).
class AdvSecondaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;

  const AdvSecondaryButton({super.key, required this.label, this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return AstroSecondaryButton(label: label, icon: icon, onPressed: onPressed);
  }
}

/// "Step X of Y" label with a short heading, used for input forms.
/// Delegates to [AstroStepIndicator].
class AdvStepHeader extends StatelessWidget {
  final int step;
  final int total;
  final String title;
  final String? hint;

  const AdvStepHeader({super.key, required this.step, required this.total, required this.title, this.hint});

  @override
  Widget build(BuildContext context) {
    return AstroStepIndicator(current: step, total: total, title: title, hint: hint);
  }
}

/// A single line of plain helper / note text with an icon.
class AdvNote extends StatelessWidget {
  final String text;
  final IconData icon;
  final Color color;

  const AdvNote(this.text, {super.key, this.icon = Icons.info_outline_rounded, this.color = AppColors.textSecondary});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 18, color: color),
        ),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: _kSecondaryStyle.copyWith(color: color))),
      ],
    );
  }
}

/// Body paragraph text style helper for screens.
const TextStyle kAdvBody = _kBodyStyle;

/// Secondary (>= 14px) text style helper for screens.
const TextStyle kAdvSecondary = _kSecondaryStyle;

/// Section title style helper for screens.
const TextStyle kAdvTitle = _kTitleStyle;
