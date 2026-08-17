import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Quick Access section featuring the four core free tools
class QuickAccessSection extends StatelessWidget {
  final VoidCallback onKundliTap;
  final VoidCallback onPlanetsTap;
  final VoidCallback onPredictionTap;
  final VoidCallback onVastuTap;
  final VoidCallback? onSeeAllTap;

  const QuickAccessSection({
    super.key,
    required this.onKundliTap,
    required this.onPlanetsTap,
    required this.onPredictionTap,
    required this.onVastuTap,
    this.onSeeAllTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header: "Quick Access" + "See All"
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Text(
                'Quick Access',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  letterSpacing: -0.3,
                ),
              ),
              InkWell(
                onTap: onSeeAllTap ?? () {},
                borderRadius: BorderRadius.circular(8),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
                  child: Text(
                    'See All',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Responsive Cards (4-column scrollable or 2-column grid)
        LayoutBuilder(
          builder: (context, constraints) {
            final isSmallScreen = constraints.maxWidth < 360;

            if (isSmallScreen) {
              // 2-Column Grid on small screens
              return GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.15,
                children: [
                  _QuickAccessCard(
                    title: 'Birth Chart',
                    subtitle: 'Your Kundli',
                    icon: Icons.auto_awesome_rounded,
                    iconBgColor: const Color(0xFFEAE8F4),
                    iconColor: AppColors.secondary,
                    arrowBgColor: const Color(0xFFF1F0F7),
                    onTap: onKundliTap,
                  ),
                  _QuickAccessCard(
                    title: 'Planets',
                    subtitle: 'Planetary positions',
                    icon: Icons.public_rounded,
                    iconBgColor: const Color(0xFFEAE8F4),
                    iconColor: AppColors.secondary,
                    arrowBgColor: const Color(0xFFF1F0F7),
                    onTap: onPlanetsTap,
                  ),
                  _QuickAccessCard(
                    title: 'Rashi Bhavishya',
                    subtitle: 'Daily prediction',
                    icon: Icons.wb_sunny_outlined,
                    iconBgColor: const Color(0xFFFFF6E5),
                    iconColor: const Color(0xFFD98A2B),
                    arrowBgColor: const Color(0xFFFFF8EC),
                    onTap: onPredictionTap,
                  ),
                  _QuickAccessCard(
                    title: 'Vastu',
                    subtitle: 'Guidance for your space',
                    icon: Icons.home_outlined,
                    iconBgColor: const Color(0xFFFDE8EF),
                    iconColor: AppColors.supportingAccent,
                    arrowBgColor: const Color(0xFFFDF0F4),
                    onTap: onVastuTap,
                  ),
                ],
              );
            } else {
              // 4 Cards side by side
              final cardWidth = (constraints.maxWidth - 36) / 4;
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  SizedBox(
                    width: cardWidth,
                    child: _QuickAccessCard(
                      title: 'Birth Chart',
                      subtitle: 'Your Kundli',
                      icon: Icons.auto_awesome_rounded,
                      iconBgColor: const Color(0xFFEAE8F4),
                      iconColor: AppColors.secondary,
                      arrowBgColor: const Color(0xFFF1F0F7),
                      onTap: onKundliTap,
                    ),
                  ),
                  SizedBox(
                    width: cardWidth,
                    child: _QuickAccessCard(
                      title: 'Planets',
                      subtitle: 'Planetary positions',
                      icon: Icons.public_rounded,
                      iconBgColor: const Color(0xFFEAE8F4),
                      iconColor: AppColors.secondary,
                      arrowBgColor: const Color(0xFFF1F0F7),
                      onTap: onPlanetsTap,
                    ),
                  ),
                  SizedBox(
                    width: cardWidth,
                    child: _QuickAccessCard(
                      title: 'Rashi Bhavishya',
                      subtitle: 'Daily prediction',
                      icon: Icons.wb_sunny_outlined,
                      iconBgColor: const Color(0xFFFFF6E5),
                      iconColor: const Color(0xFFD98A2B),
                      arrowBgColor: const Color(0xFFFFF8EC),
                      onTap: onPredictionTap,
                    ),
                  ),
                  SizedBox(
                    width: cardWidth,
                    child: _QuickAccessCard(
                      title: 'Vastu',
                      subtitle: 'Guidance for space',
                      icon: Icons.home_outlined,
                      iconBgColor: const Color(0xFFFDE8EF),
                      iconColor: AppColors.supportingAccent,
                      arrowBgColor: const Color(0xFFFDF0F4),
                      onTap: onVastuTap,
                    ),
                  ),
                ],
              );
            }
          },
        ),
      ],
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconBgColor;
  final Color iconColor;
  final Color arrowBgColor;
  final VoidCallback onTap;

  const _QuickAccessCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconBgColor,
    required this.iconColor,
    required this.arrowBgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.lightBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Icon in subtle circle container
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: iconBgColor,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      icon,
                      size: 20,
                      color: iconColor,
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Title & Subtitle
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        height: 1.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.lightTextSecondary,
                        height: 1.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Action Indicator (Circular button with arrow)
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: arrowBgColor,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: iconColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
