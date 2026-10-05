import 'package:flutter/material.dart';
import '../../../features/astrology/models/kp_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// 4-tier sub-lord hierarchy preview (Cusp -> Sign Lord -> Star Lord -> Sub Lord) for KP Astrology card.
class KPPreview extends StatelessWidget {
  final KPReportModel? report;
  final bool isLoading;
  final bool hasProfile;

  const KPPreview({
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
        title: 'KP Astrology',
        message: 'Placidus cusps and 4-tier Sub-Lords will appear here',
        icon: Icons.layers_rounded,
      );
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Cusp 1 (Lagna)
        _buildCuspRow(
          cusp: 'Cusp 1',
          degree: 'Gemini 14°22\'',
          signLord: 'Mercury',
          starLord: 'Rahu',
          subLord: 'Jupiter',
        ),
        const SizedBox(height: 4),
        // Cusp 10 (Career)
        _buildCuspRow(
          cusp: 'Cusp 10',
          degree: 'Pisces 11°08\'',
          signLord: 'Jupiter',
          starLord: 'Saturn',
          subLord: 'Venus',
        ),
      ],
    );
  }

  Widget _buildCuspRow({
    required String cusp,
    required String degree,
    required String signLord,
    required String starLord,
    required String subLord,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.lightBorder, width: 0.6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                cusp,
                style: const TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              Text(
                degree,
                style: const TextStyle(
                  fontSize: 7.5,
                  color: AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              _buildLordBadge('Sign', signLord, AppColors.secondary),
              const SizedBox(width: 3),
              const Icon(Icons.arrow_forward_rounded, size: 7, color: AppColors.lightTextSecondary),
              const SizedBox(width: 3),
              _buildLordBadge('Star', starLord, const Color(0xFF0284C7)),
              const SizedBox(width: 3),
              const Icon(Icons.arrow_forward_rounded, size: 7, color: AppColors.lightTextSecondary),
              const SizedBox(width: 3),
              _buildLordBadge('Sub', subLord, const Color(0xFFD97706)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLordBadge(String type, String lord, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        '$type: $lord',
        style: TextStyle(
          fontSize: 6.5,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
