import 'package:flutter/material.dart';
import '../../../core/errors/app_exception.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/error_banner.dart';

/// Reusable astrology error presentation component.
/// Translates common exceptions into user-friendly guidance with retry actions.
class AstrologyErrorState extends StatelessWidget {
  final Object? error;
  final String? customMessage;
  final VoidCallback? onRetry;
  final bool isCompact;

  const AstrologyErrorState({
    super.key,
    this.error,
    this.customMessage,
    this.onRetry,
    this.isCompact = false,
  });

  String _deriveErrorMessage() {
    if (customMessage != null) return customMessage!;
    if (error is AppException) {
      return (error as AppException).message;
    }
    final errStr = error?.toString().toLowerCase() ?? '';
    if (errStr.contains('offline') || errStr.contains('socket') || errStr.contains('network')) {
      return 'You appear to be offline. Please check your internet connection.';
    }
    if (errStr.contains('timeout')) {
      return 'Calculation timed out. Please try again.';
    }
    return 'Could not calculate astrology data. Please check your details and try again.';
  }

  @override
  Widget build(BuildContext context) {
    final message = _deriveErrorMessage();

    if (isCompact) {
      return ErrorBanner(
        message: message,
        onRetry: onRetry,
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.warning_amber_rounded,
              color: AppColors.error,
              size: 24,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Calculation Unavailable',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
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
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
