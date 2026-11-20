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

    // Genuine backend Bhava Bala only.
    final houses = [...(report?.houses ?? const <HouseBhavaBalaModel>[])]
      ..sort((a, b) => a.houseNumber.compareTo(b.houseNumber));
    if (houses.isEmpty) {
      return const PreviewEmptyState(
        title: 'Bhava Bala',
        message: 'Bhava Bala data is not available right now',
        icon: Icons.home_work_outlined,
      );
    }
    final byStrength = [...houses]..sort((a, b) => b.totalRupas.compareTo(a.totalRupas));
    final strongest = byStrength.take(3).toList();
    final top = strongest.first;
    final maxRupas = byStrength.first.totalRupas <= 0 ? 1.0 : byStrength.first.totalRupas;
    final highThreshold = strongest.last.totalRupas;
    final sampleBhavas = houses.map((h) => {'h': h.houseNumber, 'v': h.totalRupas}).toList();

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Top Summary: Strongest Bhavas
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Strongest: ${strongest.map((h) => 'H-${h.houseNumber}').join(', ')}',
              style: const TextStyle(
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
              child: Text(
                'House ${top.houseNumber} (${top.totalRupas.toStringAsFixed(1)}R)',
                style: const TextStyle(
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
            final isHigh = val >= highThreshold;
            final height = ((val / maxRupas).clamp(0.05, 1.0)) * 26.0;

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
