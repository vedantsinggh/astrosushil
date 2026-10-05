import 'package:flutter/material.dart';
import '../../../features/astrology/models/prashna_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Instantaneous query casting preview for Prashna (Horary Astrology) card.
class PrashnaPreview extends StatelessWidget {
  final PrashnaChartModel? chart;
  final bool isLoading;

  const PrashnaPreview({
    super.key,
    this.chart,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: PreviewSkeleton(height: 70, width: 140));
    }

    final hasResult = chart != null;
    final lagnaSign = chart?.prashnaLagna.rashiName ?? 'Mesha';
    final chandraSign = chart?.moon.rashiName ?? 'Vrishabha';

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
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.help_outline_rounded, size: 8, color: AppColors.primary),
                      SizedBox(width: 3),
                      Text(
                        'Instant Horary Cast',
                        style: TextStyle(
                          fontSize: 7.5,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Text(
                  'Horary Query',
                  style: TextStyle(fontSize: 7, color: AppColors.lightTextSecondary),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                Expanded(
                  child: _buildHoraryTile('Prashna Lagna', hasResult ? lagnaSign : 'Cast on Query', AppColors.secondary),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: _buildHoraryTile('Chandra Mind', hasResult ? chandraSign : 'Active Muhurta', const Color(0xFF0284C7)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHoraryTile(String label, String value, Color color) {
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
