import 'package:flutter/material.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/astro_image.dart';

/// Large Hero Card for Home Screen representing main birth chart entry point
class HeroAstrologyCard extends StatelessWidget {
  final VoidCallback onViewChartTap;
  final bool hasBirthProfile;

  const HeroAstrologyCard({
    super.key,
    required this.onViewChartTap,
    this.hasBirthProfile = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.premiumAccent.withOpacity(0.35),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Celestial Background Zodiac Wheel Artwork (Right Aligned)
            Positioned(
              right: -35,
              top: -20,
              bottom: -20,
              width: 260,
              child: AstroImage(
                assetPath: AppAssets.homeHero,
                fit: BoxFit.contain,
                fallback: AstroImageFallback.celestial,
                semanticLabel: 'Celestial zodiac wheel illustration',
              ),
            ),

            // Gradient Overlay for crisp text contrast
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      AppColors.primary,
                      AppColors.primary.withOpacity(0.92),
                      AppColors.primary.withOpacity(0.35),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.45, 0.75, 1.0],
                  ),
                ),
              ),
            ),

            // Hero Content
            Padding(
              padding: const EdgeInsets.all(22.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Gold pill badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.premiumAccent.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.premiumAccent.withOpacity(0.4),
                        width: 0.8,
                      ),
                    ),
                    child: const FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            size: 11,
                            color: AppColors.premiumAccent,
                          ),
                          SizedBox(width: 5),
                          Text(
                            'BIRTH CHART & KUNDLI',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                              color: AppColors.premiumAccent,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Main Heading (Dual-color title: White + Gold)
                  Text.rich(
                    TextSpan(
                      children: hasBirthProfile
                          ? const [
                              TextSpan(
                                text: 'Your Cosmic\n',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                              TextSpan(
                                text: 'Journey',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.premiumAccent,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                            ]
                          : const [
                              TextSpan(
                                text: 'Create Your\n',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                              TextSpan(
                                text: 'Birth Profile',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.premiumAccent,
                                  letterSpacing: -0.4,
                                  height: 1.15,
                                ),
                              ),
                            ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 210),
                    child: Text(
                      hasBirthProfile
                          ? 'Explore your birth chart, planetary positions and personalized insights.'
                          : 'Add your birth details to generate your Kundli.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withOpacity(0.85),
                        height: 1.35,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Primary Gold CTA Button
                  ElevatedButton(
                    onPressed: onViewChartTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.premiumAccent,
                      foregroundColor: AppColors.primary,
                      elevation: 2,
                      shadowColor: AppColors.premiumAccent.withOpacity(0.4),
                      minimumSize: const Size(120, 42),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            hasBirthProfile ? 'View Your Chart' : 'Add Birth Details',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            size: 15,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Hero Carousel Indicators (Subtle dots)
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 6,
                        decoration: BoxDecoration(
                          color: AppColors.premiumAccent,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.25),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.25),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
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

