import 'package:flutter/material.dart';
import '../../../features/astrology/models/astro_chart_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Miniature North Indian Kundli visualizer for Birth Chart feature card.
class MiniKundliPreview extends StatelessWidget {
  final AstroChartModel? chart;
  final bool isLoading;
  final bool hasProfile;

  const MiniKundliPreview({
    super.key,
    this.chart,
    this.isLoading = false,
    this.hasProfile = true,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(
        child: PreviewSkeleton(height: 70, width: 110),
      );
    }

    if (!hasProfile) {
      return const PreviewEmptyState(
        title: 'Create Birth Profile',
        message: 'Add birth details to generate real Kundli',
        icon: Icons.add_circle_outline_rounded,
      );
    }

    final ascendant = chart?.ascendant;
    final ascSign = ascendant?.rashiName ?? 'Mesha';
    final moon = chart?.planets.firstWhere(
      (p) => p.planet.toUpperCase().contains('MOON') || p.planet.toUpperCase().contains('CHANDRA'),
      orElse: () => chart!.planets.isNotEmpty
          ? chart!.planets.first
          : const PlanetModel(
              planet: 'Moon',
              longitude: 0,
              latitude: 0,
              speedLongitude: 0,
              isRetrograde: false,
              rashiIndex: 2,
              rashiName: 'Vrishabha',
              degreeInRashi: 8.0,
              nakshatraIndex: 4,
              nakshatraName: 'Rohini',
              pada: 1,
              nakshatraLord: 'Moon',
            ),
    );
    final moonSign = moon?.rashiName ?? 'Vrishabha';
    final moonNak = moon?.nakshatraName ?? 'Rohini';

    return Row(
      children: [
        // 1. Miniature North Indian Diamond Layout
        SizedBox(
          width: 78,
          height: 78,
          child: CustomPaint(
            painter: _MiniNorthIndianPainter(chart: chart),
          ),
        ),
        const SizedBox(width: 8),
        // 2. Small Supporting Labels
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildDataPill('Lagna', ascSign, AppColors.secondary),
              const SizedBox(height: 3),
              _buildDataPill('Moon', moonSign, AppColors.primary),
              const SizedBox(height: 3),
              _buildDataPill('Nak', moonNak, const Color(0xFFD97706)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDataPill(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 0.6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label: ',
            style: TextStyle(
              fontSize: 8.5,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 8.5,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniNorthIndianPainter extends CustomPainter {
  final AstroChartModel? chart;

  _MiniNorthIndianPainter({this.chart});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final borderPaint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final linePaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.7;

    final lagnaPaint = Paint()
      ..color = AppColors.premiumAccent.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;

    // Outer boundary
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), borderPaint);

    // Diagonals
    canvas.drawLine(const Offset(0, 0), Offset(w, h), linePaint);
    canvas.drawLine(Offset(w, 0), Offset(0, h), linePaint);

    // Inner diamond
    final diamondPath = Path()
      ..moveTo(w / 2, 0)
      ..lineTo(w, h / 2)
      ..lineTo(w / 2, h)
      ..lineTo(0, h / 2)
      ..close();
    canvas.drawPath(diamondPath, linePaint);

    // 1st House highlight (Lagna)
    final lagnaPath = Path()
      ..moveTo(w / 4, h / 4)
      ..lineTo(w / 2, 0)
      ..lineTo(3 * w / 4, h / 4)
      ..lineTo(w / 2, h / 2)
      ..close();
    canvas.drawPath(lagnaPath, lagnaPaint);

    // Rashi index text painter
    final ascRashi = chart?.ascendant?.rashiIndex ?? 1;
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    // Draw Lagna Rashi number at House 1 center
    textPainter.text = TextSpan(
      text: '$ascRashi',
      style: const TextStyle(
        fontSize: 8,
        fontWeight: FontWeight.bold,
        color: AppColors.secondary,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(w * 0.5 - textPainter.width / 2, h * 0.22 - textPainter.height / 2),
    );

    // Draw 7th House Rashi number
    final h7Rashi = ((ascRashi + 5) % 12) + 1;
    textPainter.text = TextSpan(
      text: '$h7Rashi',
      style: const TextStyle(
        fontSize: 7.5,
        fontWeight: FontWeight.w600,
        color: AppColors.lightTextSecondary,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(w * 0.5 - textPainter.width / 2, h * 0.78 - textPainter.height / 2),
    );

    // Draw 4th House Rashi number
    final h4Rashi = ((ascRashi + 2) % 12) + 1;
    textPainter.text = TextSpan(
      text: '$h4Rashi',
      style: const TextStyle(
        fontSize: 7.5,
        fontWeight: FontWeight.w600,
        color: AppColors.lightTextSecondary,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(w * 0.22 - textPainter.width / 2, h * 0.5 - textPainter.height / 2),
    );

    // Draw 10th House Rashi number
    final h10Rashi = ((ascRashi + 8) % 12) + 1;
    textPainter.text = TextSpan(
      text: '$h10Rashi',
      style: const TextStyle(
        fontSize: 7.5,
        fontWeight: FontWeight.w600,
        color: AppColors.lightTextSecondary,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(w * 0.78 - textPainter.width / 2, h * 0.5 - textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(covariant _MiniNorthIndianPainter oldDelegate) =>
      oldDelegate.chart != chart;
}
