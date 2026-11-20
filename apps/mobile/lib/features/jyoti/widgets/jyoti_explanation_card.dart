import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/jyoti_message.dart';
import 'jyoti_bubble_layout.dart';

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

    return JyotiBubbleLayout.align(
      context: context,
      fromUser: false,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.cardSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppColors.cardBorder,
            width: 1,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Category label
              Text(
                exp.category,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.goldDark,
                ),
              ),

              const SizedBox(height: 4),

              // Title
              Text(
                exp.title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),

              const SizedBox(height: 6),

              // Summary
              Text(
                exp.summary,
                style: const TextStyle(
                  fontSize: 16,
                  height: 1.45,
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
                      fontSize: 16,
                      height: 1.5,
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
                      padding: const EdgeInsets.symmetric(
                          vertical: 12, horizontal: 8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _isExpanded ? 'Show less' : 'Read more',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.secondary,
                            ),
                          ),
                          Icon(
                            _isExpanded
                                ? Icons.keyboard_arrow_up_rounded
                                : Icons.keyboard_arrow_down_rounded,
                            size: 22,
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
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 8),
                        minimumSize: const Size(0, 48),
                      ),
                      iconAlignment: IconAlignment.end,
                      icon: const Icon(
                        Icons.chevron_right_rounded,
                        size: 22,
                      ),
                      label: Text(
                        exp.actionButtonText!,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
