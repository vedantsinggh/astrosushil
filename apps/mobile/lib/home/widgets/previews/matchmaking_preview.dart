import 'package:flutter/material.dart';
import '../../../features/astrology/models/matchmaking_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Structured 36-Point Guna Milan compatibility preview for Matchmaking card.
class MatchmakingPreview extends StatelessWidget {
  final MatchmakingReportModel? report;
  final bool isLoading;

  const MatchmakingPreview({
    super.key,
    this.report,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: PreviewSkeleton(height: 70, width: 140));
    }

    final hasScore = report != null && report!.totalScore > 0;
    final totalScore = report?.totalScore ?? 0.0;
    final isCompatible = report?.isCompatible ?? true;

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: SizedBox(
        width: 260,
        child: Row(
          children: [
            // Profile A Box
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFCE7F3).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFDB2777).withValues(alpha: 0.2), width: 0.8),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.person_rounded, size: 14, color: Color(0xFFDB2777)),
                    SizedBox(height: 2),
                    Text(
                      'Profile A',
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF9D174D),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Boy Kundli',
                      style: TextStyle(fontSize: 7, color: AppColors.lightTextSecondary),
                    ),
                  ],
                ),
              ),
            ),

            // Center Score / Link node
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: hasScore ? AppColors.success.withValues(alpha: 0.15) : AppColors.primary.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: hasScore ? AppColors.success : AppColors.primary.withValues(alpha: 0.2),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      hasScore ? '${totalScore.toStringAsFixed(1)}/36' : '36 PTS',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: hasScore ? AppColors.success : AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    hasScore ? (isCompatible ? 'Compatible' : 'Not Recommended') : 'Guna Milan',
                    style: const TextStyle(
                      fontSize: 7,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Profile B Box
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.2), width: 0.8),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.person_outline_rounded, size: 14, color: Color(0xFF0284C7)),
                    SizedBox(height: 2),
                    Text(
                      'Profile B',
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0369A1),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Girl Kundli',
                      style: TextStyle(fontSize: 7, color: AppColors.lightTextSecondary),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
