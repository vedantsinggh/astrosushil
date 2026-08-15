import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Quick Access section for core free MVP features
class QuickAccessSection extends StatelessWidget {
  final VoidCallback onKundliTap;
  final VoidCallback onPlanetsTap;
  final VoidCallback onPredictionTap;
  final VoidCallback onVastuTap;

  const QuickAccessSection({
    super.key,
    required this.onKundliTap,
    required this.onPlanetsTap,
    required this.onPredictionTap,
    required this.onVastuTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4.0),
          child: Text(
            'Quick Access',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
              letterSpacing: -0.3,
            ),
          ),
        ),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.55,
          children: [
            _QuickAccessCard(
              title: 'Birth Chart',
              subtitle: 'Your Kundli',
              icon: Icons.auto_awesome_rounded,
              iconColor: AppColors.primary,
              backgroundColor: AppColors.primary.withOpacity(0.06),
              borderColor: AppColors.primary.withOpacity(0.12),
              onTap: onKundliTap,
            ),
            _QuickAccessCard(
              title: 'Planets',
              subtitle: 'Planetary positions',
              icon: Icons.public_rounded,
              iconColor: AppColors.secondary,
              backgroundColor: AppColors.secondary.withOpacity(0.06),
              borderColor: AppColors.secondary.withOpacity(0.15),
              onTap: onPlanetsTap,
            ),
            _QuickAccessCard(
              title: 'Rashi Bhavishya',
              subtitle: 'Daily prediction',
              icon: Icons.wb_sunny_outlined,
              iconColor: AppColors.premiumAccent,
              backgroundColor: AppColors.premiumAccent.withOpacity(0.08),
              borderColor: AppColors.premiumAccent.withOpacity(0.3),
              onTap: onPredictionTap,
            ),
            _QuickAccessCard(
              title: 'Vastu',
              subtitle: 'Guidance for your space',
              icon: Icons.home_work_outlined,
              iconColor: AppColors.supportingAccent,
              backgroundColor: AppColors.supportingAccent.withOpacity(0.06),
              borderColor: AppColors.supportingAccent.withOpacity(0.15),
              onTap: onVastuTap,
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color backgroundColor;
  final Color borderColor;
  final VoidCallback onTap;

  const _QuickAccessCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.backgroundColor,
    required this.borderColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.lightSurface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.lightBorder, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: backgroundColor,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: borderColor, width: 1),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: iconColor,
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
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
