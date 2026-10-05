import 'package:flutter/material.dart';
import '../../../features/astrology/models/strength_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Miniature planetary strength comparison bars for Shadbala feature card.
class ShadbalaPreview extends StatelessWidget {
  final ShadbalaReportModel? report;
  final bool isLoading;
  final bool hasProfile;

  const ShadbalaPreview({
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
        title: 'Shadbala Strengths',
        message: '6-fold planetary strengths will be calculated here',
        icon: Icons.bar_chart_rounded,
      );
    }

    final items = [
      {'planet': 'SUN', 'name': 'Su', 'rupas': 7.4, 'ratio': 1.14},
      {'planet': 'MOON', 'name': 'Mo', 'rupas': 8.2, 'ratio': 1.36},
      {'planet': 'MARS', 'name': 'Ma', 'rupas': 5.8, 'ratio': 1.16},
      {'planet': 'JUPITER', 'name': 'Ju', 'rupas': 8.9, 'ratio': 1.37},
    ];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: items.map((item) {
        final name = item['name'] as String;
        final rupas = item['rupas'] as double;
        final ratio = item['ratio'] as double;
        final isStrong = ratio >= 1.0;

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 1.5),
          child: Row(
            children: [
              SizedBox(
                width: 18,
                child: Text(
                  name,
                  style: const TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: Container(
                    height: 5,
                    color: AppColors.primary.withValues(alpha: 0.08),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: (rupas / 10.0).clamp(0.1, 1.0),
                      child: Container(
                        color: isStrong ? const Color(0xFF16A34A) : AppColors.secondary,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 5),
              Text(
                '${rupas.toStringAsFixed(1)} R',
                style: const TextStyle(
                  fontSize: 7.5,
                  fontWeight: FontWeight.bold,
                  color: AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
