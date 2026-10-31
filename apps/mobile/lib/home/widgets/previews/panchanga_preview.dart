import 'package:flutter/material.dart';
import '../../../features/astrology/models/panchang_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Compact 5-element Panchanga preview (Tithi, Vara, Nakshatra, Yoga, Karana).
class PanchangaPreview extends StatelessWidget {
  final PanchangModel? panchang;
  final bool isLoading;

  const PanchangaPreview({
    super.key,
    this.panchang,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: PreviewSkeleton(height: 70, width: 140));
    }

    final tithi = panchang?.tithi.name ?? 'Shukla Dashami';
    final vara = panchang?.vara.name ?? 'Somavara';
    final nak = panchang?.nakshatra.name ?? 'Rohini';
    final yoga = panchang?.yoga.name ?? 'Siddhi';
    final karana = panchang?.karana.name ?? 'Taitila';

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: SizedBox(
        width: 260,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Expanded(child: _buildElementTile('Tithi', tithi, const Color(0xFF16A34A))),
                const SizedBox(width: 3),
                Expanded(child: _buildElementTile('Vara', vara, AppColors.secondary)),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Expanded(child: _buildElementTile('Nakshatra', nak, const Color(0xFFD97706))),
                const SizedBox(width: 3),
                Expanded(child: _buildElementTile('Yoga / Kar', '$yoga • $karana', AppColors.primary)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildElementTile(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
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
