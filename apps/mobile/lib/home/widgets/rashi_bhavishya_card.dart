import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_section_header.dart';
import '../models/home_models.dart';

/// Section and preview card for Today's Rashi Bhavishya
class RashiBhavishyaSection extends StatelessWidget {
  final RashiBhavishyaPreview preview;
  final VoidCallback onReadTap;
  final VoidCallback? onViewAllTap;

  const RashiBhavishyaSection({
    super.key,
    required this.preview,
    required this.onReadTap,
    this.onViewAllTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        AstroSectionHeader(
          title: "Today's Rashi Bhavishya",
          leadingIcon: Icons.auto_awesome_rounded,
          actionLabel: 'View All',
          onActionTap: onViewAllTap ?? onReadTap,
        ),
        const SizedBox(height: 12),
        RashiBhavishyaCard(
          preview: preview,
          onReadTap: onReadTap,
        ),
      ],
    );
  }
}

/// Compact preview card for daily Rashi Bhavishya prediction
class RashiBhavishyaCard extends StatelessWidget {
  final RashiBhavishyaPreview preview;
  final VoidCallback onReadTap;

  const RashiBhavishyaCard({
    super.key,
    required this.preview,
    required this.onReadTap,
  });

  String _getGlyph(String rashi) {
    final clean = rashi.toUpperCase();
    if (clean.contains('ARIES') || clean.contains('MESHA')) return '♈';
    if (clean.contains('TAURUS') || clean.contains('VRISHABHA')) return '♉';
    if (clean.contains('GEMINI') || clean.contains('MITHUNA')) return '♊';
    if (clean.contains('CANCER') || clean.contains('KARKATA')) return '♋';
    if (clean.contains('LEO') || clean.contains('SIMHA')) return '♌';
    if (clean.contains('VIRGO') || clean.contains('KANYA')) return '♍';
    if (clean.contains('LIBRA') || clean.contains('TULA')) return '♎';
    if (clean.contains('SCORPIO') || clean.contains('VRISHCHIKA')) return '♏';
    if (clean.contains('SAGITTARIUS') || clean.contains('DHANU')) return '♐';
    if (clean.contains('CAPRICORN') || clean.contains('MAKARA')) return '♑';
    if (clean.contains('AQUARIUS') || clean.contains('KUMBHA')) return '♒';
    if (clean.contains('PISCES') || clean.contains('MEENA')) return '♓';
    return '♈';
  }

  @override
  Widget build(BuildContext context) {
    // Extract sign name (e.g. "Aries" from "Mesha (Aries)" or use preview.rashiName)
    final rashiTitle = preview.rashiName.contains('(')
        ? preview.rashiName.split('(').last.replaceAll(')', '').trim()
        : preview.rashiName;

    final glyph = _getGlyph(preview.rashiName);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.cardBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onReadTap,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Left Sign Icon Circle Container (Dark Navy + Gold Zodiac Glyph)
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.gold,
                      width: 1.2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      glyph,
                      style: const TextStyle(
                        fontSize: 24,
                        color: AppColors.gold,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 14),

                // Middle Details Column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            rashiTitle,
                            style: AppTypography.titleMedium.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.tintAmberBg,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(
                                color: AppColors.tintAmberBorder,
                                width: 0.8,
                              ),
                            ),
                            child: Text(
                              'TODAY',
                              style: AppTypography.caption.copyWith(
                                fontSize: 8.5,
                                fontWeight: FontWeight.bold,
                                color: AppColors.tintAmberText,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Daily Transit Planetary Influence',
                        style: AppTypography.caption.copyWith(
                          color: AppColors.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'A favorable period for analytical focus and methodical progress. Beneficial planetary transits support strategic initiatives.',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.lightTextSecondary,
                          height: 1.35,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 8),

                // Right Arrow Indicator
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: AppColors.primary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
