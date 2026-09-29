import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Reusable empty state view when no birth profile or chart data exists.
class AstrologyEmptyState extends StatelessWidget {
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  const AstrologyEmptyState({
    super.key,
    this.title = 'No Birth Profile Selected',
    this.message = 'Please select or add a birth profile to view detailed astrological calculations.',
    this.actionLabel = 'Add Birth Profile',
    this.onAction,
    this.icon = Icons.auto_awesome_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.lightBorder),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.premiumAccent.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Icon(
                icon,
                size: 28,
                color: AppColors.premiumAccent,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.lightTextSecondary,
              height: 1.35,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: onAction,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.premiumAccent,
                foregroundColor: AppColors.primary,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                actionLabel!,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ],
        ],
      ),
    ),
  );
}
}
