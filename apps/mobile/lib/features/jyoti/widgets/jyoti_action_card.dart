import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/jyoti_message.dart';
import 'jyoti_bubble_layout.dart';

/// Action card widget embedded in chat stream allowing direct app action execution.
class JyotiActionCardWidget extends StatelessWidget {
  final JyotiAction action;
  final Function(JyotiActionType actionType) onExecuteAction;

  const JyotiActionCardWidget({
    super.key,
    required this.action,
    required this.onExecuteAction,
  });

  @override
  Widget build(BuildContext context) {
    return JyotiBubbleLayout.align(
      context: context,
      fromUser: false,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cardSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.goldBorder, width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Row(
              children: [
                Icon(Icons.lightbulb_outline_rounded, size: 20, color: AppColors.goldDark),
                SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'Suggested action',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.goldDark,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              action.title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              action.subtitle,
              style: const TextStyle(
                fontSize: 16,
                height: 1.4,
                color: AppColors.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => onExecuteAction(action.type),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(52),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: Text(
                  action.buttonText,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
