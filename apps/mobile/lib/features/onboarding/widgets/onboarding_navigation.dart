import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import 'onboarding_indicator.dart';

/// Navigation footer control handling Page Indicators and Next / Get Started CTAs
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
    final theme = Theme.of(context);
    final goldColor = theme.colorScheme.premiumAccent;
    final isLastPage = currentIndex == pageCount - 1;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
      child: isLastPage
          ? Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                OnboardingIndicator(
                  count: pageCount,
                  currentIndex: currentIndex,
                ),
                const SizedBox(height: 20),
                CustomButton(
                  text: 'Get Started',
                  onPressed: onGetStarted,
                ),
              ],
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const SizedBox(width: 48), // Balance alignment

                OnboardingIndicator(
                  count: pageCount,
                  currentIndex: currentIndex,
                ),

                // Next Circular Arrow Button
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onNext,
                    borderRadius: BorderRadius.circular(28.0),
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.tertiary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: goldColor.withOpacity(0.5),
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: goldColor.withOpacity(0.2),
                            blurRadius: 10,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.arrow_forward,
                        color: goldColor,
                        size: 22,
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
