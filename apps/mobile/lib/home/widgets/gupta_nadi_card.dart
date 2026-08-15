import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Visually distinct flagship product card for Gupta Nadi analysis
class GuptaNadiCard extends StatelessWidget {
  final VoidCallback onExploreTap;

  const GuptaNadiCard({
    super.key,
    required this.onExploreTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.tertiary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.premiumAccent,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: AppColors.premiumAccent.withOpacity(0.12),
            blurRadius: 20,
            spreadRadius: 1,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // Celestial Geometric Watermark
            Positioned(
              right: -30,
              bottom: -30,
              child: Opacity(
                opacity: 0.12,
                child: Icon(
                  Icons.auto_awesome,
                  size: 180,
                  color: AppColors.premiumAccent,
                ),
              ),
            ),

            // Card Padding & Content
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // FLAGSHIP BRAND BADGE
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.premiumAccent,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.premiumAccent.withOpacity(0.4),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.star_rounded,
                              size: 12,
                              color: AppColors.primary,
                            ),
                            SizedBox(width: 4),
                            Text(
                              'FLAGSHIP PREMIUM',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                                letterSpacing: 1.0,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.verified_outlined,
                        size: 20,
                        color: AppColors.premiumAccent.withOpacity(0.8),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  const Text(
                    'Gupta Nadi',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.4,
                    ),
                  ),

                  const SizedBox(height: 6),

                  Text(
                    'Explore deeper insights through Gupta Nadi analysis — our deterministic BNN planetary interaction engine.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.white.withOpacity(0.85),
                      height: 1.4,
                    ),
                  ),

                  const SizedBox(height: 18),

                  ElevatedButton(
                    onPressed: onExploreTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      foregroundColor: AppColors.premiumAccent,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(44),
                      side: const BorderSide(
                        color: AppColors.premiumAccent,
                        width: 1.5,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Explore Gupta Nadi',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.premiumAccent,
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 16,
                          color: AppColors.premiumAccent,
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
