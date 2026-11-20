import 'package:flutter/material.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/widgets/astro_lists.dart';

/// Reusable beginner-friendly explanation card providing plain-language educational context
/// in English and Hindi for core astrological tools and calculation results.
class AstrologyExplanationCard extends StatefulWidget {
  final String title;
  final String whatIsText;
  final String howToReadText;
  final String? limitationsText;
  final bool initiallyExpanded;
  final EdgeInsetsGeometry margin;

  const AstrologyExplanationCard({
    super.key,
    required this.title,
    String? whatIsText,
    String? whatIs,
    String? howToReadText,
    String? howToRead,
    this.limitationsText,
    this.initiallyExpanded = false,
    this.margin = const EdgeInsets.only(bottom: 16.0),
  })  : whatIsText = whatIsText ?? whatIs ?? '',
        howToReadText = howToReadText ?? howToRead ?? '';

  @override
  State<AstrologyExplanationCard> createState() =>
      _AstrologyExplanationCardState();
}

class _AstrologyExplanationCardState extends State<AstrologyExplanationCard> {
  late bool _isExpanded;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Padding(
      padding: widget.margin,
      child: Semantics(
        expanded: _isExpanded,
        button: true,
        label: '${widget.title}. ${l10n.explainWhatDoesThisMean}',
        child: Material(
          type: MaterialType.transparency,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AstroMetrics.groupRadius),
              color: AppColors.cardSurface,
              boxShadow: AstroShadows.card,
              border: Border.all(
                color: _isExpanded ? AppColors.goldBorder : const Color(0x0F121440),
                width: _isExpanded ? 1 : 0.5,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header Row (Min 48dp height for accessible tap targets)
                InkWell(
                  onTap: _toggleExpanded,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 56),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          const AstroIconSquare(
                            icon: Icons.lightbulb_outline_rounded,
                            tint: AstroTint.amber,
                            size: 38,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  widget.title,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.lightTextPrimary,
                                    height: 1.25,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  l10n.explainWhatDoesThisMean,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          AnimatedRotation(
                            turns: _isExpanded ? 0.5 : 0.0,
                            duration: const Duration(milliseconds: 200),
                            child: const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              size: 28,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Collapsible Educational Details
                if (_isExpanded) ...[
                  const Divider(height: 1, color: AppColors.lightBorder),
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Section 1: What is this?
                        _SectionBlock(
                          icon: Icons.info_outline_rounded,
                          label: l10n.explainWhatDoesThisMean,
                          text: widget.whatIsText,
                        ),
                        const SizedBox(height: 14),

                        // Section 2: How to read this
                        _SectionBlock(
                          icon: Icons.auto_awesome_rounded,
                          label: l10n.explainHowToRead,
                          text: widget.howToReadText,
                        ),
                        const SizedBox(height: 14),

                        // Section 3: Limitations & Disclaimer
                        _SectionBlock(
                          icon: Icons.verified_user_outlined,
                          label: l10n.explainLimitations,
                          text:
                              widget.limitationsText ?? l10n.explainDisclaimer,
                          isMuted: true,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionBlock extends StatelessWidget {
  final IconData icon;
  final String label;
  final String text;
  final bool isMuted;

  const _SectionBlock({
    required this.icon,
    required this.label,
    required this.text,
    this.isMuted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: isMuted ? AppColors.lightTextMuted : AppColors.primary,
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: isMuted
                      ? AppColors.lightTextSecondary
                      : AppColors.primary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          text,
          style: TextStyle(
            fontSize: isMuted ? 14 : 16,
            height: 1.5,
            color: AppColors.lightTextSecondary,
          ),
        ),
      ],
    );
  }
}
