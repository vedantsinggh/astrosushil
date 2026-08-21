import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/astro_chart_model.dart';

/// Reusable North Indian Style Kundli Chart visualization widget.
/// Draws a responsive custom-painted Kundli diamond layout with real astronomical
/// placements, Rashi indices, and planet locations.
class KundliChartWidget extends StatelessWidget {
  final AstroChartModel? chart;
  final double size;
  final bool showTitle;

  const KundliChartWidget({
    super.key,
    this.chart,
    this.size = 320,
    this.showTitle = false,
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1.0,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.lightBorder, width: 1),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.05),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            if (showTitle) ...[
              Text(
                'KUNDLI (NORTH INDIAN STYLE)',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.secondary.withOpacity(0.8),
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),
            ],
            Expanded(
              child: Center(
                child: CustomPaint(
                  size: Size.square(size),
                  painter: _NorthIndianKundliPainter(chart: chart),
                ),
              ),
            ),
          ],
        ),
      ),
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

    // 1. Line Paints
    final borderPaint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final linePaint = Paint()
      ..color = AppColors.primary.withOpacity(0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final goldHighlightPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

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

    // Highlight Lagna / 1st House Top Center Diamond with subtle gold line
    final lagnaPath = Path()
      ..moveTo(width / 4, height / 4)
      ..lineTo(width / 2, 0)
      ..lineTo(3 * width / 4, height / 4)
      ..lineTo(width / 2, height / 2)
      ..close();
    canvas.drawPath(lagnaPath, goldHighlightPaint);

    // 5. Calculate Rashi Numbers and House Placements from real chart or fallback
    final ascendantRashiIndex = chart?.ascendant?.rashiIndex ?? 3; // Default Gemini (3) if mock

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

    // Always add Ascendant to House 1
    housePlanetsMap[1]!.add('As');

    if (chart != null && chart!.planets.isNotEmpty) {
      for (final p in chart!.planets) {
        final houseNum = p.calculateHouseNumber(ascendantRashiIndex);
        final abbr = _getPlanetAbbr(p.planet, p.isRetrograde);
        housePlanetsMap[houseNum]?.add(abbr);
      }
    } else {
      // Default mock placements matching standard reference Kundli
      housePlanetsMap[1]!.addAll([]);
      housePlanetsMap[2]!.add('Ve 5');
      housePlanetsMap[3]!.add('Mo 6');
      housePlanetsMap[5]!.add('Ju 8');
      housePlanetsMap[6]!.add('Ra 9');
      housePlanetsMap[8]!.add('Ke 10');
      housePlanetsMap[10]!.add('SaR 12');
      housePlanetsMap[12]!.addAll(['Su 4', 'Ma 2']);
    }

    // Draw Rashi indices & planet strings into each house
    const rashiStyle = TextStyle(
      fontSize: 10,
      fontWeight: FontWeight.bold,
      color: AppColors.secondary,
    );

    const planetStyle = TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w700,
      color: AppColors.primary,
    );

    const goldPlanetStyle = TextStyle(
      fontSize: 11,
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
        Offset(centerOffset.dx - textPainter.width / 2, centerOffset.dy - 12),
      );

      // Draw Planets String below Rashi Index
      final planets = housePlanetsMap[h] ?? [];
      if (planets.isNotEmpty) {
        final planetStr = planets.join(' ');
        textPainter.text = TextSpan(
          text: planetStr,
          style: h == 1 ? goldPlanetStyle : planetStyle,
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
