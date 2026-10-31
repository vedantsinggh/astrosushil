import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/jyoti_message.dart';

/// Expandable astrology topic explanation card widget.
class JyotiExplanationCardWidget extends StatefulWidget {
  final JyotiExplanation explanation;
  final Function(JyotiActionType actionType)? onExecuteAction;

  const JyotiExplanationCardWidget({
    super.key,
    required this.explanation,
    this.onExecuteAction,
  });

  @override
  State<JyotiExplanationCardWidget> createState() =>
      _JyotiExplanationCardWidgetState();
}

class _JyotiExplanationCardWidgetState
    extends State<JyotiExplanationCardWidget> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final exp = widget.explanation;

    return Container(
      margin: const EdgeInsets.only(left: 52, right: 16, top: 4, bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.cardBorder,
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Category Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.tintAmberBg,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.tintAmberBorder, width: 0.8),
              ),
              child: Text(
                exp.category.toUpperCase(),
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: AppColors.tintAmberText,
                  letterSpacing: 0.5,
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Title
            Text(
              exp.title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),

            const SizedBox(height: 6),

            // Summary
            Text(
              exp.summary,
              style: const TextStyle(
                fontSize: 13.5,
                height: 1.4,
                color: AppColors.lightTextSecondary,
              ),
            ),

            // Expanded Detailed Text
            if (_isExpanded) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.cardBorderSubtle),
                ),
                child: Text(
                  exp.detailedText,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 10),

            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                // Read More / Show Less Toggle (>= 48dp target)
                InkWell(
                  onTap: () {
                    setState(() {
                      _isExpanded = !_isExpanded;
                    });
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _isExpanded ? 'Show less' : 'Read more',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.secondary,
                          ),
                        ),
                        Icon(
                          _isExpanded
                              ? Icons.keyboard_arrow_up_rounded
                              : Icons.keyboard_arrow_down_rounded,
                          size: 18,
                          color: AppColors.secondary,
                        ),
                      ],
                    ),
                  ),
                ),

                // Optional Direct Action Button (>= 48dp target)
                if (exp.actionType != null &&
                    widget.onExecuteAction != null &&
                    exp.actionButtonText != null)
                  TextButton.icon(
                    onPressed: () => widget.onExecuteAction!(exp.actionType!),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      minimumSize: const Size(0, 48),
                    ),
                    iconAlignment: IconAlignment.end,
                    icon: const Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                    ),
                    label: Text(
                      exp.actionButtonText!,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
