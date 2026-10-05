import 'package:flutter/material.dart';
import '../../../features/astrology/models/special_points_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Upagrahas and Special Lagnas mathematical coordinate grid preview for Special Points card.
class SpecialPointsPreview extends StatelessWidget {
  final SpecialPointsReportModel? report;
  final bool isLoading;
  final bool hasProfile;

  const SpecialPointsPreview({
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
        title: 'Special Points',
        message: 'Hora, Ghatika, Gulika & Mandi coordinates will appear here',
        icon: Icons.flare_rounded,
      );
    }

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: SizedBox(
        width: 260,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Expanded(child: _buildPointTile('Hora Lagna (HL)', 'Gemini 08°', AppColors.secondary)),
                const SizedBox(width: 4),
                Expanded(child: _buildPointTile('Ghatika (GL)', 'Virgo 21°', const Color(0xFF0284C7))),
              ],
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                Expanded(child: _buildPointTile('Gulika (Gk)', 'Scorpio 14°', const Color(0xFFE11D48))),
                const SizedBox(width: 4),
                Expanded(child: _buildPointTile('Mandi (Md)', 'Sagittarius 02°', const Color(0xFFD97706))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPointTile(String name, String coord, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 0.6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            name,
            style: TextStyle(
              fontSize: 7,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            coord,
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
