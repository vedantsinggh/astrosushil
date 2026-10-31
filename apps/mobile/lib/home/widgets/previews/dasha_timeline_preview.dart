import 'package:flutter/material.dart';
import '../../../features/astrology/models/dasha_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Horizontal timeline preview for Vimshottari Dasha card.
class DashaTimelinePreview extends StatelessWidget {
  final DashaTreeModel? dashaTree;
  final bool isLoading;
  final bool hasProfile;

  const DashaTimelinePreview({
    super.key,
    this.dashaTree,
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
        title: 'Vimshottari Dasha',
        message: 'Create birth profile to view your active Dasha period',
        icon: Icons.timeline_rounded,
      );
    }

    final activeInfo = dashaTree?.activeDasha;
    final activeMaha = activeInfo?.mahadasha;
    final activeAntar = activeInfo?.antardasha;

    final mahaLord = activeMaha?.lord ?? 'Jupiter';
    final antarLord = activeAntar?.lord ?? 'Saturn';
    final mahaEnd = activeMaha != null ? '${activeMaha.endDate.year}' : '2028';

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Active Dasha Pill & Period
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.3), width: 0.8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.circle, size: 6, color: Color(0xFFD97706)),
                  const SizedBox(width: 4),
                  Text(
                    '$mahaLord / $antarLord',
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF92400E),
                    ),
                  ),
                ],
              ),
            ),
            Text(
              'Until $mahaEnd',
              style: const TextStyle(
                fontSize: 8,
                color: AppColors.lightTextSecondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        // Timeline Strip
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: Container(
            height: 6,
            width: double.infinity,
            color: AppColors.primary.withValues(alpha: 0.08),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Container(color: const Color(0xFFD97706)),
                ),
                Expanded(
                  flex: 2,
                  child: Container(color: AppColors.secondary),
                ),
                Expanded(
                  flex: 4,
                  child: Container(color: AppColors.primary.withValues(alpha: 0.15)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        // Mini sequence labels
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Mahadasha', style: TextStyle(fontSize: 7.5, color: Color(0xFFD97706), fontWeight: FontWeight.bold)),
            Text('Antardasha', style: TextStyle(fontSize: 7.5, color: AppColors.secondary, fontWeight: FontWeight.bold)),
            Text('Pratyantardasha', style: TextStyle(fontSize: 7.5, color: AppColors.lightTextSecondary)),
          ],
        ),
      ],
    );
  }
}
