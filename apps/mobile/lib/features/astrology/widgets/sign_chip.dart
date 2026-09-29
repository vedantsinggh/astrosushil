import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Reusable visual chip representing a Zodiac Sign (Rashi).
/// Displays Sanskrit and English sign names, element glyph, and selection indicator.
class SignChip extends StatelessWidget {
  final String signName;
  final String? sanskritName;
  final int? houseNumber;
  final bool isSelected;
  final VoidCallback? onTap;
  final bool isCompact;

  const SignChip({
    super.key,
    required this.signName,
    this.sanskritName,
    this.houseNumber,
    this.isSelected = false,
    this.onTap,
    this.isCompact = false,
  });

  static String getSignGlyph(String name) {
    final clean = name.trim().toUpperCase();
    if (clean.contains('ARIES') || clean.contains('MESHA')) return '♈';
    if (clean.contains('TAURUS') || clean.contains('VRISHABHA')) return '♉';
    if (clean.contains('GEMINI') || clean.contains('MITHUNA')) return '♊';
    if (clean.contains('CANCER') || clean.contains('KARKATA')) return '♋';
    if (clean.contains('LEO') || clean.contains('SIMHA')) return '♌';
    if (clean.contains('VIRGO') || clean.contains('KANYA')) return '♍';
    if (clean.contains('LIBRA') || clean.contains('TULA')) return '♎';
    if (clean.contains('SCORPIO') || clean.contains('VRISCHIKA')) return '♏';
    if (clean.contains('SAGITTARIUS') || clean.contains('DHANU')) return '♐';
    if (clean.contains('CAPRICORN') || clean.contains('MAKARA')) return '♑';
    if (clean.contains('AQUARIUS') || clean.contains('KUMBHA')) return '♒';
    if (clean.contains('PISCES') || clean.contains('MEENA')) return '♓';
    return '✦';
  }

  @override
  Widget build(BuildContext context) {
    final glyph = getSignGlyph(signName);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 8 : 12,
          vertical: isCompact ? 4 : 6,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.tertiary
              : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? AppColors.premiumAccent
                : AppColors.lightBorder,
            width: isSelected ? 1.5 : 1,
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
            Text(
              glyph,
              style: TextStyle(
                fontSize: isCompact ? 13 : 15,
                color: isSelected ? AppColors.premiumAccent : AppColors.secondary,
              ),
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                signName,
                style: TextStyle(
                  fontSize: isCompact ? 11 : 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.primary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (sanskritName != null) ...[
              const SizedBox(width: 4),
              Text(
                '($sanskritName)',
                style: TextStyle(
                  fontSize: isCompact ? 10 : 11,
                  color: isSelected
                      ? AppColors.premiumAccent
                      : AppColors.lightTextSecondary,
                ),
              ),
            ],
            if (houseNumber != null) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.premiumAccent.withValues(alpha: 0.25)
                      : AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'H$houseNumber',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? AppColors.premiumAccent : AppColors.primary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
