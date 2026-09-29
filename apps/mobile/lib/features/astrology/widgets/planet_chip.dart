import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Reusable visual chip representing a Vedic Graha (Planet) or Ascendant.
/// Displays planet symbol, name, retrograde (R) indicator, and optional house/dignity.
class PlanetChip extends StatelessWidget {
  final String planetName;
  final bool isRetrograde;
  final String? houseOrSign;
  final bool isSelected;
  final VoidCallback? onTap;
  final bool isCompact;

  const PlanetChip({
    super.key,
    required this.planetName,
    this.isRetrograde = false,
    this.houseOrSign,
    this.isSelected = false,
    this.onTap,
    this.isCompact = false,
  });

  static IconData getPlanetIcon(String name) {
    final clean = name.replaceAll('(R)', '').trim().toUpperCase();
    switch (clean) {
      case 'SUN':
      case 'SURYA':
        return Icons.wb_sunny_rounded;
      case 'MOON':
      case 'CHANDRA':
        return Icons.nights_stay_rounded;
      case 'MARS':
      case 'MANGAL':
        return Icons.local_fire_department_rounded;
      case 'MERCURY':
      case 'BUDHA':
        return Icons.auto_awesome_rounded;
      case 'JUPITER':
      case 'GURU':
        return Icons.military_tech_rounded;
      case 'VENUS':
      case 'SHUKRA':
        return Icons.favorite_rounded;
      case 'SATURN':
      case 'SHANI':
        return Icons.hourglass_bottom_rounded;
      case 'RAHU':
        return Icons.all_inclusive_rounded;
      case 'KETU':
        return Icons.trip_origin_rounded;
      case 'ASCENDANT':
      case 'LAGNA':
        return Icons.flare_rounded;
      default:
        return Icons.circle_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final icon = getPlanetIcon(planetName);
    final cleanName = planetName.replaceAll('(R)', '').trim();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 8 : 12,
          vertical: isCompact ? 4 : 6,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : AppColors.lightBorder,
            width: 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: isCompact ? 12 : 14,
              color: isSelected ? AppColors.premiumAccent : AppColors.secondary,
            ),
            const SizedBox(width: 5),
            Flexible(
              child: Text(
                cleanName,
                style: TextStyle(
                  fontSize: isCompact ? 11 : 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.primary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (isRetrograde) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.supportingAccent,
                  borderRadius: BorderRadius.circular(3),
                ),
                child: const Text(
                  'R',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
            if (houseOrSign != null) ...[
              const SizedBox(width: 5),
              Text(
                '• $houseOrSign',
                style: TextStyle(
                  fontSize: isCompact ? 10 : 11,
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.8)
                      : AppColors.lightTextSecondary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
