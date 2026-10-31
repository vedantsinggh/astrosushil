import 'package:flutter/material.dart';
import '../../../features/astrology/models/varshaphala_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Annual solar return timeline preview for Varshaphala card.
class VarshaphalaPreview extends StatelessWidget {
  final VarshaphalaChartModel? chart;
  final bool isLoading;
  final bool hasProfile;

  const VarshaphalaPreview({
    super.key,
    this.chart,
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
        title: 'Varshaphala & Prashna',
        message: 'Annual solar return and horary queries will appear here',
        icon: Icons.wb_sunny_rounded,
      );
    }

    final year = DateTime.now().year;

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: SizedBox(
        width: 260,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFFCA8A04).withValues(alpha: 0.3), width: 0.8),
                  ),
                  child: Text(
                    'Solar Year $year',
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF854D0E),
                    ),
                  ),
                ),
                const Text(
                  'Tajika System',
                  style: TextStyle(fontSize: 7.5, color: AppColors.lightTextSecondary),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                Expanded(
                  child: _buildMetricTile('Muntha', 'House 9', const Color(0xFFCA8A04)),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: _buildMetricTile('Varsheshwara', 'Jupiter (Ju)', AppColors.secondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 0.6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 7,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
