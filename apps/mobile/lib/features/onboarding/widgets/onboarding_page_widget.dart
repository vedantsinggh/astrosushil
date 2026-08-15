import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme.dart';
import '../models/onboarding_page_model.dart';

/// Single page widget displaying the card illustration, headline, and supporting text
class OnboardingPageWidget extends StatelessWidget {
  final OnboardingPageModel page;

  const OnboardingPageWidget({
    super.key,
    required this.page,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final goldColor = theme.colorScheme.premiumAccent;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        children: [
          const SizedBox(height: 12),

          // Illustration Card Container with subtle border & elevation
          Expanded(
            flex: 5,
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.tertiary,
                borderRadius: BorderRadius.circular(24.0),
                border: Border.all(
                  color: AppColors.secondary.withOpacity(0.25),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.35),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                  BoxShadow(
                    color: AppColors.secondary.withOpacity(0.15),
                    blurRadius: 15,
                    spreadRadius: 1,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24.0),
                child: Stack(
                  children: [
                    // Image Asset with Image.asset and error fallback
                    Positioned.fill(
                      child: Image.asset(
                        page.imagePath,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return _FallbackIllustration(pageIndex: page.imagePath);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 28),

          // Badge Icon
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.tertiary,
              shape: BoxShape.circle,
              border: Border.all(
                color: goldColor.withOpacity(0.3),
                width: 1.5,
              ),
            ),
            child: Icon(
              page.badgeText == 'chart'
                  ? Icons.all_inclusive
                  : page.badgeText == 'direction'
                      ? Icons.explore_outlined
                      : Icons.workspace_premium_outlined,
              size: 22,
              color: goldColor,
            ),
          ),

          const SizedBox(height: 16),

          // Headline Text
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: theme.textTheme.headlineMedium?.copyWith(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
                color: Colors.white,
              ),
              children: [
                TextSpan(text: '${page.titlePrefix} '),
                TextSpan(
                  text: page.titleHighlight,
                  style: TextStyle(
                    color: goldColor,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Supporting Text Description
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text(
              page.description,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontSize: 14,
                height: 1.5,
                color: theme.colorScheme.textSecondary,
              ),
            ),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

/// Vector Painter Fallback if image asset files are loading or unavailable
class _FallbackIllustration extends StatelessWidget {
  final String pageIndex;

  const _FallbackIllustration({required this.pageIndex});

  @override
  Widget build(BuildContext context) {
    final goldColor = Theme.of(context).colorScheme.premiumAccent;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.tertiary,
            AppColors.primary,
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              pageIndex.contains('chart')
                  ? Icons.auto_graph_rounded
                  : pageIndex.contains('direction')
                      ? Icons.alt_route_rounded
                      : Icons.stars_rounded,
              size: 72,
              color: goldColor,
            ),
          ],
        ),
      ),
    );
  }
}
