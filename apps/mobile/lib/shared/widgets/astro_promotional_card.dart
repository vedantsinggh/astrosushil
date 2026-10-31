import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme_tokens.dart';
import '../assets/app_assets.dart';

enum AstroPromoStyle {
  amberSaffron,
  deepIndigo,
}

/// Reusable illustrated promotional or explainer banner.
///
/// Features:
/// - Warm amber/saffron or deep indigo gradients
/// - Official Sushil Sir avatar/portrait or custom illustration
/// - Title, subtitle, and prominent action button
/// - Micro-constellation backdrop
class AstroPromotionalCard extends StatelessWidget {
  final String title;
  final String description;
  final String buttonLabel;
  final VoidCallback onButtonPressed;
  final String? badgeText;
  final String? imageAsset;
  final AstroPromoStyle style;
  final VoidCallback? onCardTap;

  const AstroPromotionalCard({
    super.key,
    required this.title,
    required this.description,
    required this.buttonLabel,
    required this.onButtonPressed,
    this.badgeText,
    this.imageAsset = AppAssets.sushilAvatar,
    this.style = AstroPromoStyle.amberSaffron,
    this.onCardTap,
  });

  /// Factory for Sushil Sir AI Vedic Explainer banner
  factory AstroPromotionalCard.explainer({
    Key? key,
    required VoidCallback onAskTap,
    String? title,
    String? description,
  }) {
    return AstroPromotionalCard(
      key: key,
      title: title ?? 'Let Sushil Sir explain this chart',
      description: description ?? 'Get simple, clear explanations of your astrology and planetary dasha.',
      buttonLabel: 'Ask Sushil Sir →',
      onButtonPressed: onAskTap,
      badgeText: 'AI VEDIC GUIDE',
      imageAsset: AppAssets.sushilAvatar,
      style: AstroPromoStyle.amberSaffron,
    );
  }

  /// Factory for 1-on-1 Consultation banner
  factory AstroPromotionalCard.consultation({
    Key? key,
    required VoidCallback onBookTap,
    String? title,
    String? description,
  }) {
    return AstroPromotionalCard(
      key: key,
      title: title ?? 'Consult with Astro Sushil',
      description: description ?? 'Personalized guidance for career, marriage, and life decisions.',
      buttonLabel: 'Book a Consultation →',
      onButtonPressed: onBookTap,
      badgeText: 'MOST POPULAR',
      imageAsset: AppAssets.sushilAvatar,
      style: AstroPromoStyle.deepIndigo,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAmber = style == AstroPromoStyle.amberSaffron;
    final gradient = isAmber ? AppGradients.promotionalAmber : AppGradients.heroCosmic;
    final borderColor = isAmber
        ? AppColors.gold.withValues(alpha: 0.35)
        : AppColors.secondary.withValues(alpha: 0.4);

    return InkWell(
      onTap: onCardTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: isAmber
                  ? const Color(0xFF7A3516).withValues(alpha: 0.25)
                  : AppColors.midnight.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(
            children: [
              // Constellation Watermark
              Positioned(
                right: -20,
                bottom: -20,
                width: 140,
                height: 140,
                child: Opacity(
                  opacity: 0.08,
                  child: Image.asset(
                    AppAssets.constellationsOverlay,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox(),
                  ),
                ),
              ),

              // Content Padding
              Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Text Column
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (badgeText != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                badgeText!,
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.1,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                          Text(
                            title,
                            style: AppTypography.headlineMedium.copyWith(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            description,
                            style: AppTypography.bodySmall.copyWith(
                              color: Colors.white.withValues(alpha: 0.88),
                              fontSize: 12,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 14),

                          // CTA Button
                          ElevatedButton(
                            onPressed: onButtonPressed,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: isAmber ? AppColors.goldDark : AppColors.primary,
                              elevation: 2,
                              minimumSize: const Size(120, 38),
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: Text(
                              buttonLabel,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 12),

                    // Avatar / Illustration Column
                    if (imageAsset != null)
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.gold, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.25),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            imageAsset!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.person_rounded,
                              size: 40,
                              color: AppColors.gold,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
