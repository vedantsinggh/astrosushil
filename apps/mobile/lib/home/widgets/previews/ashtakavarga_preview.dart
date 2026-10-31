import 'package:flutter/material.dart';
import '../../../features/astrology/models/ashtakavarga_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Miniature SAV 12-house bindu matrix heatmap for Ashtakavarga feature card.
class AshtakavargaPreview extends StatelessWidget {
  final AshtakavargaResultModel? result;
  final bool isLoading;
  final bool hasProfile;

  const AshtakavargaPreview({
    super.key,
    this.result,
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
        title: 'Ashtakavarga Matrix',
        message: 'Sarvashtakavarga 337-bindu grid will be calculated here',
        icon: Icons.grid_3x3_rounded,
      );
    }

    final sav = [28, 31, 29, 34, 26, 32, 27, 24, 30, 36, 33, 27];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Top Header: Total SAV
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'SAV Bindus (12 Houses)',
              style: TextStyle(
                fontSize: 8,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(3),
              ),
              child: const Text(
                'Total: 337',
                style: TextStyle(
                  fontSize: 7.5,
                  fontWeight: FontWeight.bold,
                  color: AppColors.secondary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        // 2x6 Grid of bindu cells
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(6, (i) => _buildBinduCell(i + 1, sav[i])),
        ),
        const SizedBox(height: 3),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(6, (i) => _buildBinduCell(i + 7, sav[i + 6])),
        ),
      ],
    );
  }

  Widget _buildBinduCell(int house, int bindus) {
    final isStrong = bindus >= 30;
    return Container(
      width: 20,
      padding: const EdgeInsets.symmetric(vertical: 2),
      decoration: BoxDecoration(
        color: isStrong ? AppColors.secondary.withValues(alpha: 0.15) : AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(3),
        border: Border.all(
          color: isStrong ? AppColors.secondary.withValues(alpha: 0.4) : AppColors.lightBorder,
          width: 0.6,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'H$house',
            style: const TextStyle(
              fontSize: 6,
              color: AppColors.lightTextSecondary,
            ),
          ),
          Text(
            '$bindus',
            style: TextStyle(
              fontSize: 7.5,
              fontWeight: FontWeight.bold,
              color: isStrong ? AppColors.secondary : AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}
