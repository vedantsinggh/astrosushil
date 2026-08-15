import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Section highlighting free astrology features available to all authenticated users
class FreeFeaturesSection extends StatelessWidget {
  final VoidCallback onKundliTap;
  final VoidCallback onPlanetsTap;
  final VoidCallback onRashiTap;
  final VoidCallback onVastuTap;

  const FreeFeaturesSection({
    super.key,
    required this.onKundliTap,
    required this.onPlanetsTap,
    required this.onRashiTap,
    required this.onVastuTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Explore Astrology',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.lightTextPrimary,
                letterSpacing: -0.3,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.success.withOpacity(0.3), width: 1),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_outline, size: 12, color: AppColors.success),
                  SizedBox(width: 4),
                  Text(
                    'FREE TOOLS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppColors.success,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 120,
          child: ListView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            children: [
              _FreeFeatureCard(
                title: 'Kundli / Chart',
                subtitle: 'D1 Rasi & Bhava Details',
                icon: Icons.grid_4x4_rounded,
                badge: 'FREE',
                onTap: onKundliTap,
              ),
              const SizedBox(width: 12),
              _FreeFeatureCard(
                title: 'Planet Details',
                subtitle: 'Degrees & Nakshatras',
                icon: Icons.explore_outlined,
                badge: 'FREE',
                onTap: onPlanetsTap,
              ),
              const SizedBox(width: 12),
              _FreeFeatureCard(
                title: 'Rashi Bhavishya',
                subtitle: 'Daily Transits & Guidance',
                icon: Icons.wb_twilight_rounded,
                badge: 'FREE',
                onTap: onRashiTap,
              ),
              const SizedBox(width: 12),
              _FreeFeatureCard(
                title: 'Vastu Alignment',
                subtitle: 'Spatial Directional Energy',
                icon: Icons.compass_calibration_outlined,
                badge: 'FREE',
                onTap: onVastuTap,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FreeFeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final String badge;
  final VoidCallback onTap;

  const _FreeFeatureCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.lightBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(
                    icon,
                    size: 24,
                    color: AppColors.primary,
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.lightTextPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.lightTextSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
