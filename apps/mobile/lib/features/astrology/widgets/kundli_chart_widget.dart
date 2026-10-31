import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_typography.dart';
import '../models/astro_chart_model.dart';

/// Reusable North Indian Style Kundli Chart visualization widget.
/// Draws a responsive custom-painted Kundli diamond layout with real astronomical
/// placements, Rashi indices, Lagna, and planet locations.
class KundliChartWidget extends StatelessWidget {
  final AstroChartModel? chart;
  final double size;
  final bool showTitle;
  final bool showLegend;

  const KundliChartWidget({
    super.key,
    this.chart,
    this.size = 300,
    this.showTitle = false,
    this.showLegend = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showTitle) ...[
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.star_rate_rounded, size: 12, color: AppColors.gold),
                SizedBox(width: 6),
                Text(
                  'JANMA KUNDLI (NORTH INDIAN)',
                  style: TextStyle(
                    fontFamily: AppTypography.headingFamily,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: 1.1,
                  ),
                ),
                SizedBox(width: 6),
                Icon(Icons.star_rate_rounded, size: 12, color: AppColors.gold),
              ],
            ),
            const SizedBox(height: 10),
          ],
          LayoutBuilder(
            builder: (context, constraints) {
              final chartDim = math.min(constraints.maxWidth, size);
              return SizedBox(
                width: chartDim,
                height: chartDim,
                child: CustomPaint(
                  size: Size.square(chartDim),
                  painter: _NorthIndianKundliPainter(chart: chart),
                ),
              );
            },
          ),
          if (showLegend) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.canvasSecondary,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.cardBorderSubtle, width: 0.8),
              ),
              child: const Wrap(
                alignment: WrapAlignment.spaceAround,
                spacing: 10,
                runSpacing: 6,
                children: [
                  _LegendItem(
                    color: AppColors.gold,
                    label: 'Top Diamond = Lagna (H1)',
                  ),
                  _LegendItem(
                    color: AppColors.secondary,
                    label: '1–12 = Zodiac Signs',
                  ),
                  _LegendItem(
                    color: AppColors.primary,
                    label: 'Grahas = Placements',
                  ),
                  _LegendItem(
                    color: AppColors.saffron,
                    label: '(R) = Retrograde',
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Flexible(
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }
}

class _NorthIndianKundliPainter extends CustomPainter {
  final AstroChartModel? chart;

  _NorthIndianKundliPainter({this.chart});

  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final height = size.height;

    // 0. Warm Canvas Background
    final bgPaint = Paint()..color = AppColors.cardSurfaceWarm;
    canvas.drawRect(Rect.fromLTWH(0, 0, width, height), bgPaint);

    // 1. Line Paints
    final borderPaint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final linePaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.80)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.3;

    final goldHighlightPaint = Paint()
      ..color = AppColors.gold.withValues(alpha: 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    // 2. Draw Outer Box Square
    final outerRect = Rect.fromLTWH(0, 0, width, height);
    canvas.drawRect(outerRect, borderPaint);

    // 3. Draw Diagonals (Corner to Corner)
    canvas.drawLine(const Offset(0, 0), Offset(width, height), linePaint);
    canvas.drawLine(Offset(width, 0), Offset(0, height), linePaint);

    // 4. Draw Inner Diamond (Midpoint to Midpoint)
    final path = Path()
      ..moveTo(width / 2, 0)
      ..lineTo(width, height / 2)
      ..lineTo(width / 2, height)
      ..lineTo(0, height / 2)
      ..close();
    canvas.drawPath(path, linePaint);

    // Highlight Lagna / 1st House Top Center Diamond with gold tint & stroke
    final lagnaPath = Path()
      ..moveTo(width / 4, height / 4)
      ..lineTo(width / 2, 0)
      ..lineTo(3 * width / 4, height / 4)
      ..lineTo(width / 2, height / 2)
      ..close();
    final lagnaFillPaint = Paint()..color = AppColors.gold.withValues(alpha: 0.10);
    canvas.drawPath(lagnaPath, lagnaFillPaint);
    canvas.drawPath(lagnaPath, goldHighlightPaint);

    // 5. Calculate Rashi Numbers and House Placements from real chart
    final ascendantRashiIndex = chart?.ascendant?.rashiIndex ?? 1;

    // Map house index (1..12) to house center offsets on canvas
    final houseCenterOffsets = <int, Offset>{
      1: Offset(width * 0.50, height * 0.25),  // Top central diamond (1st House)
      2: Offset(width * 0.25, height * 0.12),  // Upper-left top triangle
      3: Offset(width * 0.12, height * 0.25),  // Upper-left corner triangle
      4: Offset(width * 0.25, height * 0.50),  // Left central diamond (4th House)
      5: Offset(width * 0.12, height * 0.75),  // Lower-left corner triangle
      6: Offset(width * 0.25, height * 0.88),  // Lower-left bottom triangle
      7: Offset(width * 0.50, height * 0.75),  // Bottom central diamond (7th House)
      8: Offset(width * 0.75, height * 0.88),  // Lower-right bottom triangle
      9: Offset(width * 0.88, height * 0.75),  // Lower-right corner triangle
      10: Offset(width * 0.75, height * 0.50), // Right central diamond (10th House)
      11: Offset(width * 0.88, height * 0.25), // Upper-right corner triangle
      12: Offset(width * 0.75, height * 0.12), // Upper-right top triangle
    };

    // Build planet text map per house
    final housePlanetsMap = <int, List<String>>{};
    for (int i = 1; i <= 12; i++) {
      housePlanetsMap[i] = [];
    }

    if (chart != null) {
      // Add Ascendant label to House 1
      housePlanetsMap[1]!.add('As');

      if (chart!.planets.isNotEmpty) {
        for (final p in chart!.planets) {
          final houseNum = p.calculateHouseNumber(ascendantRashiIndex);
          final abbr = _getPlanetAbbr(p.planet, p.isRetrograde);
          if (abbr.isNotEmpty) {
            housePlanetsMap[houseNum]?.add(abbr);
          }
        }
      }
    }

    // Dynamic font sizing proportional to canvas dimensions
    final rashiFontSize = (width * 0.034).clamp(8.5, 12.0);
    final planetFontSize = (width * 0.036).clamp(9.0, 12.5);

    final rashiStyle = TextStyle(
      fontFamily: AppTypography.bodyFamily,
      fontSize: rashiFontSize,
      fontWeight: FontWeight.bold,
      color: AppColors.secondary,
    );

    final planetStyle = TextStyle(
      fontFamily: AppTypography.bodyFamily,
      fontSize: planetFontSize,
      fontWeight: FontWeight.w700,
      color: AppColors.primary,
    );

    final lagnaPlanetStyle = TextStyle(
      fontFamily: AppTypography.bodyFamily,
      fontSize: planetFontSize,
      fontWeight: FontWeight.w800,
      color: AppColors.primary,
    );

    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (int h = 1; h <= 12; h++) {
      final centerOffset = houseCenterOffsets[h]!;

      // Calculate Rashi index for house h
      final rashiIndex = ((ascendantRashiIndex + h - 2) % 12) + 1;

      // Draw Rashi Index Number
      textPainter.text = TextSpan(text: '$rashiIndex', style: rashiStyle);
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(centerOffset.dx - textPainter.width / 2, centerOffset.dy - (rashiFontSize + 3)),
      );

      // Draw Planets String below Rashi Index
      final planets = housePlanetsMap[h] ?? [];
      if (planets.isNotEmpty) {
        final planetStr = planets.join(' ');
        textPainter.text = TextSpan(
          text: planetStr,
          style: h == 1 ? lagnaPlanetStyle : planetStyle,
        );
        textPainter.layout();
        textPainter.paint(
          canvas,
          Offset(centerOffset.dx - textPainter.width / 2, centerOffset.dy + 2),
        );
      }
    }
  }

  String _getPlanetAbbr(String planet, bool isRetrograde) {
    final suffix = isRetrograde ? '(R)' : '';
    final clean = planet.replaceAll('(R)', '').trim().toUpperCase();
    switch (clean) {
      case 'SUN': case 'SURYA': case 'SOORYA':
        return 'Su$suffix';
      case 'MOON': case 'CHANDRA':
        return 'Mo$suffix';
      case 'MARS': case 'MANGAL': case 'KUJA':
        return 'Ma$suffix';
      case 'MERCURY': case 'BUDHA':
        return 'Me$suffix';
      case 'JUPITER': case 'GURU': case 'BRHASPATI':
        return 'Ju$suffix';
      case 'VENUS': case 'SHUKRA':
        return 'Ve$suffix';
      case 'SATURN': case 'SHANI':
        return 'Sa$suffix';
      case 'RAHU':
        return 'Ra$suffix';
      case 'KETU':
        return 'Ke$suffix';
      default:
        if (clean.isEmpty) return '';
        return clean.substring(0, math.min(2, clean.length)) + suffix;
    }
  }

  @override
  bool shouldRepaint(covariant _NorthIndianKundliPainter oldDelegate) {
    return oldDelegate.chart != chart;
  }
}
