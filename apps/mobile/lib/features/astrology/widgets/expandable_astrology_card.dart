import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_card.dart';

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
    this.padding = const EdgeInsets.all(14),
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

  void _toggleExpansion() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
    widget.onExpansionChanged?.call(_isExpanded);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: widget.margin,
      child: AstroCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header (Tappable to expand / collapse)
            InkWell(
              onTap: _toggleExpansion,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: widget.padding,
                child: Row(
                  children: [
                    if (widget.icon != null) ...[
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: (widget.iconColor ?? AppColors.secondary)
                              .withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Icon(
                            widget.icon,
                            size: 16,
                            color: widget.iconColor ?? AppColors.secondary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  widget.title,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                    letterSpacing: -0.1,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (widget.badgeText != null) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: (widget.badgeColor ??
                                            AppColors.premiumAccent)
                                        .withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(
                                      color: (widget.badgeColor ??
                                              AppColors.premiumAccent)
                                          .withValues(alpha: 0.4),
                                      width: 0.7,
                                    ),
                                  ),
                                  child: Text(
                                    widget.badgeText!,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: widget.badgeColor ??
                                          AppColors.premiumAccent,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          if (widget.subtitle != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              widget.subtitle!,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.lightTextSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (widget.headerTrailing != null) ...[
                      const SizedBox(width: 6),
                      widget.headerTrailing!,
                    ],
                    const SizedBox(width: 6),
                    AnimatedRotation(
                      turns: _isExpanded ? 0.5 : 0.0,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: AppColors.lightTextMuted,
                        size: 22,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Optional Always-Visible Summary Row
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

            // Expandable Detail Body with Animated CrossFade
            AnimatedCrossFade(
              firstChild: const SizedBox.shrink(),
              secondChild: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(
                    height: 1,
                    thickness: 1,
                    color: AppColors.lightBorder,
                  ),
                  Padding(
                    padding: widget.padding,
                    child: widget.expandedChild,
                  ),
                ],
              ),
              crossFadeState: _isExpanded
                  ? CrossFadeState.showSecond
                  : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 250),
            ),
          ],
        ),
      ),
    );
  }
}
