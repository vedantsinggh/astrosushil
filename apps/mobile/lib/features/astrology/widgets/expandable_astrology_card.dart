import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_lists.dart';
import '../../../shared/widgets/astro_surfaces.dart';

/// Reusable expandable card component enabling progressive disclosure in astrology views.
/// Displays a summary header, optional preview badges/metrics, and smoothly expands to reveal deep data.
class ExpandableAstrologyCard extends StatefulWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final String? badgeText;
  final Color? badgeColor;
  final Widget? headerTrailing;
  final Widget? summaryWidget;
  final Widget expandedChild;
  final bool initiallyExpanded;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final ValueChanged<bool>? onExpansionChanged;

  const ExpandableAstrologyCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.badgeText,
    this.badgeColor,
    this.headerTrailing,
    this.summaryWidget,
    required this.expandedChild,
    this.initiallyExpanded = false,
    this.padding = const EdgeInsets.all(16),
    this.margin = const EdgeInsets.only(bottom: 12),
    this.onExpansionChanged,
  });

  @override
  State<ExpandableAstrologyCard> createState() => _ExpandableAstrologyCardState();
}

class _ExpandableAstrologyCardState extends State<ExpandableAstrologyCard>
    with SingleTickerProviderStateMixin {
  late bool _isExpanded;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;
  }

  @override
  void didUpdateWidget(covariant ExpandableAstrologyCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initiallyExpanded != oldWidget.initiallyExpanded) {
      _isExpanded = widget.initiallyExpanded;
    }
  }

  void _toggleExpansion() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
    widget.onExpansionChanged?.call(_isExpanded);
  }

  @override
  Widget build(BuildContext context) {
    final accent = widget.iconColor ?? AppColors.secondary;
    final badge = widget.badgeColor ?? AppColors.secondary;

    return Padding(
      padding: widget.margin,
      child: AstroSurfaceCard(
        padding: EdgeInsets.zero,
        radius: AstroMetrics.groupRadius,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Semantics(
              button: true,
              expanded: _isExpanded,
              child: InkWell(
                onTap: _toggleExpansion,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 56),
                  child: Padding(
                    padding: widget.padding,
                    child: Row(
                      children: [
                        if (widget.icon != null) ...[
                          AstroIconSquare(
                            icon: widget.icon!,
                            size: 38,
                            tint: AstroTint(accent, accent.withValues(alpha: 0.12)),
                          ),
                          const SizedBox(width: 12),
                        ],
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 8,
                                runSpacing: 4,
                                children: [
                                  Text(
                                    widget.title,
                                    style: AppTypography.rowTitle.copyWith(
                                      fontWeight: FontWeight.w700,
                                      height: 1.25,
                                    ),
                                  ),
                                  if (widget.badgeText != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: badge.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        widget.badgeText!,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: badge,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              if (widget.subtitle != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  widget.subtitle!,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppColors.lightTextSecondary,
                                    height: 1.35,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (widget.headerTrailing != null) ...[
                          const SizedBox(width: 8),
                          widget.headerTrailing!,
                        ],
                        const SizedBox(width: 8),
                        AnimatedRotation(
                          turns: _isExpanded ? 0.5 : 0.0,
                          duration: const Duration(milliseconds: 200),
                          child: const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            color: AppColors.accent,
                            size: 28,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Optional always-visible summary row
            if (widget.summaryWidget != null && !_isExpanded)
              Padding(
                padding: EdgeInsets.fromLTRB(
                  widget.padding.horizontal / 2,
                  0,
                  widget.padding.horizontal / 2,
                  widget.padding.vertical / 2,
                ),
                child: widget.summaryWidget!,
              ),

            AnimatedCrossFade(
              firstChild: const SizedBox(width: double.infinity),
              secondChild: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(height: 0.5, thickness: 0.5, color: AppColors.separator),
                  Padding(
                    padding: widget.padding,
                    child: widget.expandedChild,
                  ),
                ],
              ),
              crossFadeState:
                  _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 250),
            ),
          ],
        ),
      ),
    );
  }
}
