import 'package:flutter/material.dart';
import 'astro_state_illustration.dart';

/// Reusable generic server / application error state component
class AstroErrorState extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final AstroStateType illustrationType;

  const AstroErrorState({
    super.key,
    this.title = "Astro Sushil is having trouble right now",
    this.message = "Please check your connection and try again in a moment.",
    this.onRetry,
    this.illustrationType = AstroStateType.serverError,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            AstroStateIllustration(type: illustrationType),
            const SizedBox(height: 24),
            Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: const Color(0xFF121440),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF61568C),
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 28),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Retry'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF121440),
                  side: const BorderSide(color: Color(0xFF121440), width: 1.5),
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
