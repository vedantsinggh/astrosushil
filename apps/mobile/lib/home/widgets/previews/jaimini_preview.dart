import 'package:flutter/material.dart';
import '../../../features/astrology/models/jaimini_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Clean Chara Karakas hierarchy preview for Jaimini Astrology card.
class JaiminiPreview extends StatelessWidget {
  final JaiminiReportModel? report;
  final bool isLoading;
  final bool hasProfile;

  const JaiminiPreview({
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
        title: 'Jaimini Sutras',
        message: '7/8 Chara Karakas (AK, AmK, BK) will be identified here',
        icon: Icons.hub_rounded,
      );
    }

    final karakas = [
      {'role': 'AK', 'title': 'Atmakaraka', 'planet': 'Saturn (Sa)', 'deg': '28°14\'', 'color': const Color(0xFF7C3AED)},
      {'role': 'AmK', 'title': 'Amatyakaraka', 'planet': 'Jupiter (Ju)', 'deg': '24°50\'', 'color': const Color(0xFFD97706)},
      {'role': 'BK', 'title': 'Bhratrikaraka', 'planet': 'Mars (Ma)', 'deg': '21°32\'', 'color': const Color(0xFFE11D48)},
    ];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: karakas.map((k) {
        final color = k['color'] as Color;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2.0),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: color.withValues(alpha: 0.2), width: 0.6),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: Text(
                        k['role'] as String,
                        style: TextStyle(
                          fontSize: 7.5,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      k['title'] as String,
                      style: const TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                Text(
                  '${k['planet']} • ${k['deg']}',
                  style: const TextStyle(
                    fontSize: 7.5,
                    color: AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
