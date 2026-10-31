import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/models/astro_chart_model.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../features/sushil_explainer/models/explanation_context.dart';
import '../../features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';

/// Sushil Sir Contextual Explainer Banner directly inspired by the visual reference mockup.
/// Features a deep midnight indigo card, glowing celestial orbit motif, Sushil Sir portrait artwork,
/// and triggers the Phase 8 AI explainer with real structured astrology context.
class SushilSirExplainerBanner extends ConsumerWidget {
  final BirthProfileModel? activeProfile;
  final AstroChartModel? chart;

  const SushilSirExplainerBanner({
    super.key,
    this.activeProfile,
    this.chart,
  });

  void _openExplainer(BuildContext context, WidgetRef ref) {
    final locale = ref.read(localeProvider);
    final hasProfile = activeProfile != null;

    final contextData = ExplanationContext(
      feature: 'home_dashboard',
      screenTitle: 'Home Screen',
      purpose: hasProfile
          ? 'Explaining key patterns, lagna, and current planetary alignments from Janma Kundli'
          : 'Introducing Vedic astrology concepts and guiding the user to create their birth profile',
      mode: 'standard',
      language: locale.languageCode == 'hi' ? 'hi' : 'en',
      birthProfileId: activeProfile?.id,
      astrologyData: {
        'hasProfile': hasProfile,
        if (activeProfile != null) 'profileName': activeProfile!.name,
        if (activeProfile != null) 'dateOfBirth': activeProfile!.dateOfBirth,
        if (chart?.ascendant != null) 'ascendant': chart!.ascendant!.rashiName,
        if (chart != null) 'planetsCount': chart!.planets.length,
      },
      importantValues: {
        if (chart?.ascendant != null) 'lagna': chart!.ascendant!.rashiName,
        if (activeProfile != null) 'location': activeProfile!.placeName,
      },
    );

    SushilExplainerSheet.show(
      context,
      explanationContext: contextData,
      initialPoseAsset: AppAssets.sushilExplainingChart,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final hasProfile = activeProfile != null;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1D2059), // Tertiary dark indigo
            Color(0xFF2E3378), // Surface elevated indigo
            Color(0xFF121440), // Primary navy
          ],
        ),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.4),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF121440).withValues(alpha: 0.2),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // Celestial orbit background watermark
            Positioned(
              right: 10,
              top: -20,
              bottom: -20,
              width: 180,
              child: Opacity(
                opacity: 0.15,
                child: Image.asset(
                  AppAssets.kundliDecorativeOrbit,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),

            // Card content layout
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 16.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Left Column: Text & CTA
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // AI Guide Badge
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.gold,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'AI VEDIC GUIDE',
                                style: AppTypography.caption.copyWith(
                                  color: AppColors.primary,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 8),

                        // Title: "Let Sushil Sir explain this chart"
                        Text(
                          hasProfile
                              ? l10n.askSushilSirBannerTitle
                              : 'Let Sushil Sir explain Vedic Astrology',
                          style: AppTypography.titleMedium.copyWith(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: -0.2,
                            height: 1.2,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),

                        const SizedBox(height: 4),

                        // Subtitle
                        Text(
                          l10n.askSushilSirBannerSubtitle,
                          style: AppTypography.bodySmall.copyWith(
                            color: Colors.white.withValues(alpha: 0.85),
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),

                        const SizedBox(height: 14),

                        // Action Button: [ Ask Sushil Sir -> ] (>= 48dp touch bounds)
                        ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: AppTouchTargets.minTouchTarget),
                          child: ElevatedButton(
                            onPressed: () => _openExplainer(context, ref),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.gold,
                              foregroundColor: AppColors.primary,
                              elevation: 2,
                              shadowColor: AppColors.gold.withValues(alpha: 0.3),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Flexible(
                                  child: Text(
                                    l10n.askSushilSirButton,
                                    style: AppTypography.labelMedium.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(
                                  Icons.arrow_forward_rounded,
                                  size: 13,
                                  color: AppColors.primary,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 10),

                  // Right: Sushil Sir portrait cutout
                  SizedBox(
                    width: 76,
                    height: 84,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Soft golden aura glow
                        Container(
                          width: 68,
                          height: 68,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.gold.withValues(alpha: 0.15),
                          ),
                        ),
                        // Cutout image
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Image.asset(
                            AppAssets.sushilExplainingChart,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Image.asset(
                              AppAssets.sushilAvatar,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

