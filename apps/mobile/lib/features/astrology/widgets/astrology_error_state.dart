import 'package:flutter/material.dart';
import '../../../core/errors/app_exception.dart';
import '../../../shared/widgets/astro_surfaces.dart';
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
    if (errStr.contains('offline') ||
        errStr.contains('socket') ||
        errStr.contains('network')) {
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

    final isOffline = _isOfflineError();
    return AstroSurfaceCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: AstroStateView.error(
        compact: true,
        icon: isOffline ? Icons.wifi_off_rounded : Icons.warning_amber_rounded,
        title: isOffline ? 'You appear offline' : 'Calculation Unavailable',
        message: message,
        onRetry: onRetry,
        retryLabel: 'Try Again',
      ),
    );
  }

  bool _isOfflineError() {
    if (error is NetworkException || error is TimeoutException) return true;
    final errStr = error?.toString().toLowerCase() ?? '';
    return errStr.contains('offline') || errStr.contains('socket') || errStr.contains('network');
  }
}
