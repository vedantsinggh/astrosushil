import 'package:flutter/material.dart';
import '../../../features/astrology/models/strength_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// 12-House potency miniature strength bar spectrum for Bhava Bala card.
class BhavaBalaPreview extends StatelessWidget {
  final BhavaBalaReportModel? report;
  final bool isLoading;
  final bool hasProfile;

  const BhavaBalaPreview({
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
        title: 'Bhava Bala',
        message: '12-house potency and strengths will appear here',
        icon: Icons.home_work_outlined,
      );
    }

    // Default sample 12 houses strengths
    final sampleBhavas = [
      {'h': 1, 'v': 8.5},
      {'h': 2, 'v': 7.1},
      {'h': 3, 'v': 6.8},
      {'h': 4, 'v': 9.2},
      {'h': 5, 'v': 8.9},
      {'h': 6, 'v': 6.4},
      {'h': 7, 'v': 7.8},
      {'h': 8, 'v': 5.9},
      {'h': 9, 'v': 9.6},
      {'h': 10, 'v': 9.8},
      {'h': 11, 'v': 9.0},
      {'h': 12, 'v': 6.1},
    ];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Top Summary: Strongest Bhavas
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Strongest: H-10, H-9, H-4',
              style: TextStyle(
                fontSize: 8,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: const Color(0xFF16A34A).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(3),
              ),
              child: const Text(
                '10th House (9.8R)',
                style: TextStyle(
                  fontSize: 7.5,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF16A34A),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        // 12-bar horizontal histogram
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: sampleBhavas.map((b) {
            final val = b['v'] as double;
            final isHigh = val >= 8.5;
            final height = (val / 10.0) * 26.0;

            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: height,
                  decoration: BoxDecoration(
                    color: isHigh ? AppColors.secondary : AppColors.primary.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${b['h']}',
                  style: TextStyle(
                    fontSize: 6.5,
                    fontWeight: isHigh ? FontWeight.bold : FontWeight.normal,
                    color: isHigh ? AppColors.secondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }
}
