import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'astro_controls.dart';
import 'astro_state_illustration.dart';

/// Reusable generic server / application error state component
class AstroErrorState extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final AstroStateType illustrationType;
  final bool animate;

  const AstroErrorState({
    super.key,
    this.title = "Astro Sushil is having trouble right now",
    this.message = "Please check your connection and try again in a moment.",
    this.onRetry,
    this.illustrationType = AstroStateType.serverError,
    this.animate = true,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    // Shrink the illustration when vertical space is short (landscape,
    // split screen) and scroll instead of overflowing at large text sizes.
    final short = MediaQuery.sizeOf(context).height < 520;

    return Center(
      child: SingleChildScrollView(
        padding: EdgeInsets.symmetric(horizontal: 24.0, vertical: short ? 12.0 : 32.0),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              AnimatedAstroStateIllustration(
                type: illustrationType,
                size: short ? 92 : 148,
                animate: animate,
              ),
              SizedBox(height: short ? 12 : 24),
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: AppTypography.headlineLarge.copyWith(fontSize: 22, height: 1.25),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                message,
                style: AppTypography.bodyLarge.copyWith(color: AppColors.textSecondary, height: 1.45),
                textAlign: TextAlign.center,
              ),
              if (onRetry != null) ...[
                SizedBox(height: short ? 16 : 28),
                AstroSecondaryButton(
                  label: l10n?.commonTryAgain ?? 'Try again',
                  icon: Icons.refresh_rounded,
                  onPressed: onRetry,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
