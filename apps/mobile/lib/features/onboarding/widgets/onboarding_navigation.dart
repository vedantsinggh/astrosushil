import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/astro_controls.dart';
import 'onboarding_indicator.dart';

/// Navigation footer for the onboarding flow.
///
/// Designed for users of all ages and technical comfort levels:
/// - a plain "Step X of Y" progress label next to the dots
/// - one large, labelled primary button ("Next" / "Get Started")
/// - a short written hint telling the user exactly what to do next
class OnboardingNavigation extends StatelessWidget {
  final int currentIndex;
  final int pageCount;
  final VoidCallback onNext;
  final VoidCallback onGetStarted;

  const OnboardingNavigation({
    super.key,
    required this.currentIndex,
    required this.pageCount,
    required this.onNext,
    required this.onGetStarted,
  });

  @override
  Widget build(BuildContext context) {
    final isLastPage = currentIndex == pageCount - 1;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24.0, 8.0, 24.0, 20.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Progress: dots + plain-language step counter
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OnboardingIndicator(count: pageCount, currentIndex: currentIndex),
              const SizedBox(width: 12),
              Semantics(
                liveRegion: true,
                child: Text(
                  AppLocalizations.of(context)?.commonStepOf(currentIndex + 1, pageCount) ??
                      'Step ${currentIndex + 1} of $pageCount',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textInverseSecondary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Single, large, clearly labelled action
          AstroPrimaryButton(
            label: isLastPage ? 'Get Started' : 'Next',
            icon: isLastPage ? Icons.check_circle_outline_rounded : Icons.arrow_forward,
            onPressed: isLastPage ? onGetStarted : onNext,
          ),

          const SizedBox(height: 12),

          // Written instruction so nobody has to guess the gesture
          Text(
            isLastPage
                ? 'Tap "Get Started" to sign in or create your account'
                : 'Tap "Next" to continue, or swipe the screen left',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              height: 1.4,
              color: AppColors.textInverseMuted,
            ),
          ),
        ],
      ),
    );
  }
}
