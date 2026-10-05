import 'package:flutter/material.dart';
import '../../../features/astrology/models/yoga_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Relationship and planetary combination preview for Vedic Yogas card.
class YogasPreview extends StatelessWidget {
  final YogaEvaluationReportModel? report;
  final bool isLoading;
  final bool hasProfile;

  const YogasPreview({
    super.key,
    this.report,
    this.isLoading = false,
    this.hasProfile = true,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: PreviewSkeleton(height: 70, width: 140));
    }

    if (!hasProfile) {
      return const PreviewEmptyState(
        title: 'Vedic Yogas',
        message: 'Auspicious combinations will be evaluated from your chart',
        icon: Icons.stars_rounded,
      );
    }

    final topYoga = report?.detectedYogas.isNotEmpty == true
        ? report!.detectedYogas.first
        : null;

    final yogaCount = report?.detectedCount ?? 8;
    final yogaName = topYoga?.canonicalName ?? 'Gaja Kesari Yoga';
    final yogaCategory = topYoga?.formattedCategory ?? 'Raja Yoga';

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: SizedBox(
        width: 260,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Top Detected Pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F2),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFE11D48).withValues(alpha: 0.3), width: 0.8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.verified_rounded, size: 9, color: Color(0xFFE11D48)),
                  const SizedBox(width: 4),
                  Text(
                    '$yogaCount Verified Combinations',
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF9F1239),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 5),
            // Planetary Relationship Node
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(5),
                border: Border.all(color: AppColors.lightBorder, width: 0.6),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildPlanetNode('Jupiter', const Color(0xFFD97706)),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.0),
                    child: Text('+', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.lightTextSecondary)),
                  ),
                  _buildPlanetNode('Moon', AppColors.primary),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.0),
                    child: Icon(Icons.arrow_forward_rounded, size: 10, color: AppColors.lightTextSecondary),
                  ),
                  Flexible(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          yogaName,
                          style: const TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          yogaCategory,
                          style: const TextStyle(
                            fontSize: 6.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFE11D48),
                          ),
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

  Widget _buildPlanetNode(String name, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        name,
        style: TextStyle(
          fontSize: 7.5,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
