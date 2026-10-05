import 'package:flutter/material.dart';
import '../../../features/astrology/models/gochara_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Miniature Natal -> Transit movement vector visual for Gochara feature card.
class TransitsPreview extends StatelessWidget {
  final TransitSnapshotModel? snapshot;
  final bool isLoading;
  final bool hasProfile;

  const TransitsPreview({
    super.key,
    this.snapshot,
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
        title: 'Planetary Transits',
        message: 'View live planetary transits over your natal houses',
        icon: Icons.sync_alt_rounded,
      );
    }

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: SizedBox(
        width: 260,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildTransitRow(
              planet: 'Saturn (Shani)',
              transitSign: 'Aquarius',
              natalHouse: 'H-9 Ingress',
              color: const Color(0xFF7C3AED),
            ),
            const SizedBox(height: 4),
            _buildTransitRow(
              planet: 'Jupiter (Guru)',
              transitSign: 'Taurus',
              natalHouse: 'H-12 Ingress',
              color: const Color(0xFFD97706),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransitRow({
    required String planet,
    required String transitSign,
    required String natalHouse,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 0.6),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.swap_horiz_rounded, size: 12, color: color),
              const SizedBox(width: 4),
              Text(
                planet,
                style: TextStyle(
                  fontSize: 8.5,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                transitSign,
                style: const TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 3),
              const Icon(Icons.arrow_forward_rounded, size: 9, color: AppColors.lightTextSecondary),
              const SizedBox(width: 3),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Text(
                  natalHouse,
                  style: TextStyle(
                    fontSize: 7.5,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
