import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_typography.dart';

/// Friendly non-technical error widget for Jyoti AI Assistant.
class JyotiErrorCard extends StatelessWidget {
  final VoidCallback onTryAgain;
  final VoidCallback onContinueExploring;

  const JyotiErrorCard({
    super.key,
    required this.onTryAgain,
    required this.onContinueExploring,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.errorBorder, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline_rounded, color: AppColors.error, size: 24),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  "Jyoti couldn't respond right now.",
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            "Please try again or continue exploring Astro Sushil.",
            style: TextStyle(
              fontSize: 16,
              height: 1.4,
              color: AppColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: onTryAgain,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: AppTypography.labelLarge.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.refresh_rounded, size: 22),
                SizedBox(width: 8),
                Flexible(child: Text('Try Again')),
              ],
            ),
          ),
          const SizedBox(height: 4),
          TextButton(
            onPressed: onContinueExploring,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(48),
              textStyle: AppTypography.labelLarge.copyWith(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            child: const Text('Continue Exploring'),
          ),
        ],
      ),
    );
  }
}
