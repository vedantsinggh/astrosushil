import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';
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
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Expanded(
                child: Text(
                  "Today's Rashi Bhavishya",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              InkWell(
                onTap: onViewAllTap ?? onReadTap,
                borderRadius: BorderRadius.circular(8),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
                  child: Text(
                    'View All',
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.lightBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Content
          Material(
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
                      width: 52,
                      height: 52,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          glyph,
                          style: const TextStyle(
                            fontSize: 26,
                            color: AppColors.premiumAccent,
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
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFD98A2B).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'TODAY',
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFB45309),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Daily Transit Planetary Influence',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'A favorable period for analytical focus and methodical progress. Beneficial planetary transits support strategic initiatives.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.lightTextSecondary,
                              height: 1.35,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 12),

                    // Right Arrow Indicator
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 22,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
