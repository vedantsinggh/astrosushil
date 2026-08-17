import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/astro_chart_model.dart';

class KundliPdfService {
  KundliPdfService._();

  /// Generates a PDF document for the user's Kundli and triggers platform share/save dialog.
  static Future<void> generateAndShare({
    required BirthProfileModel profile,
    required AstroChartModel chart,
  }) async {
    final pdf = pw.Document();

    final primaryColor = PdfColor.fromHex('#121440');
    final secondaryColor = PdfColor.fromHex('#61568C');
    final goldColor = PdfColor.fromHex('#D9B13B');
    final lightBg = PdfColor.fromHex('#F8F9FD');
    final borderColor = PdfColor.fromHex('#E2E8F0');

    final ascRashiIndex = chart.ascendant?.rashiIndex ?? 3; // Gemini default

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // 1. BRAND HEADER
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'ASTRO SUSHIL',
                        style: pw.TextStyle(
                          fontSize: 22,
                          fontWeight: pw.FontWeight.bold,
                          color: primaryColor,
                          letterSpacing: 2,
                        ),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        'Vedic Astrology & Planetary Chart Report',
                        style: pw.TextStyle(
                          fontSize: 10,
                          color: secondaryColor,
                        ),
                      ),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: pw.BoxDecoration(
                      color: lightBg,
                      border: pw.Border.all(color: goldColor, width: 1),
                      borderRadius: pw.BorderRadius.circular(6),
                    ),
                    child: pw.Text(
                      'CONFIDENTIAL KUNDLI',
                      style: pw.TextStyle(
                        fontSize: 9,
                        fontWeight: pw.FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 16),
              pw.Divider(color: borderColor, thickness: 1),
              pw.SizedBox(height: 16),

              // 2. USER BIRTH DETAILS SUMMARY BOX
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: lightBg,
                  borderRadius: pw.BorderRadius.circular(8),
                  border: pw.Border.all(color: borderColor),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          profile.name.toUpperCase(),
                          style: pw.TextStyle(
                            fontSize: 14,
                            fontWeight: pw.FontWeight.bold,
                            color: primaryColor,
                          ),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          'DOB: ${profile.dateOfBirth}   |   Time: ${profile.timeOfBirth}',
                          style: pw.TextStyle(fontSize: 10, color: primaryColor),
                        ),
                        pw.Text(
                          'Place: ${profile.placeName} (${profile.latitude.toStringAsFixed(2)}°N, ${profile.longitude.toStringAsFixed(2)}°E)',
                          style: pw.TextStyle(fontSize: 9, color: secondaryColor),
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          'Ayanamsa: Lahiri Sidereal',
                          style: pw.TextStyle(fontSize: 9, color: secondaryColor),
                        ),
                        pw.Text(
                          'Chart Style: North Indian',
                          style: pw.TextStyle(fontSize: 9, color: secondaryColor),
                        ),
                        pw.Text(
                          'Timezone: ${profile.timezone}',
                          style: pw.TextStyle(fontSize: 9, color: secondaryColor),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 20),

              // 3. NORTH INDIAN KUNDLI CHART DRAWING
              pw.Text(
                'NORTH INDIAN KUNDLI (D1 RASI CHART)',
                style: pw.TextStyle(
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                  color: primaryColor,
                  letterSpacing: 1,
                ),
              ),
              pw.SizedBox(height: 10),

              pw.Center(
                child: _buildPdfKundliChart(chart, ascRashiIndex, primaryColor, goldColor),
              ),

              pw.SizedBox(height: 20),

              // 4. PLANETARY POSITIONS TABLE
              pw.Text(
                'PLANETARY POSITIONS',
                style: pw.TextStyle(
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                  color: primaryColor,
                  letterSpacing: 1,
                ),
              ),
              pw.SizedBox(height: 8),

              _buildPdfPlanetsTable(chart, ascRashiIndex, primaryColor, secondaryColor, borderColor),

              pw.Spacer(),

              // 5. FOOTER
              pw.Divider(color: borderColor, thickness: 1),
              pw.SizedBox(height: 6),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'Generated deterministically by Astro Sushil',
                    style: pw.TextStyle(fontSize: 8, color: secondaryColor),
                  ),
                  pw.Text(
                    'Page 1 of 1',
                    style: pw.TextStyle(fontSize: 8, color: secondaryColor),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    final Uint8List pdfBytes = await pdf.save();
    final fileName = 'Kundli_${profile.name.replaceAll(RegExp(r'\s+'), '_')}.pdf';

    await Printing.sharePdf(
      bytes: pdfBytes,
      filename: fileName,
    );
  }

  static pw.Widget _buildPdfKundliChart(
    AstroChartModel chart,
    int ascRashiIndex,
    PdfColor primaryColor,
    PdfColor goldColor,
  ) {
    const double size = 260;

    return pw.Container(
      width: size,
      height: size,
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: primaryColor, width: 1.5),
        color: PdfColors.white,
      ),
      child: pw.Stack(
        children: [
          // Outer and inner diagonal lines canvas
          pw.CustomPaint(
            size: const PdfPoint(size, size),
            painter: (PdfGraphics canvas, PdfPoint size) {
              canvas.setStrokeColor(primaryColor);
              canvas.setLineWidth(1.0);

              // Outer boundary diagonals (North Indian Diamond Layout)
              canvas.moveTo(0, 0);
              canvas.lineTo(size.x, size.y);
              canvas.strokePath();

              canvas.moveTo(0, size.y);
              canvas.lineTo(size.x, 0);
              canvas.strokePath();

              // Inner Diamond (connecting midpoints)
              final midX = size.x / 2;
              final midY = size.y / 2;

              canvas.moveTo(midX, size.y);
              canvas.lineTo(size.x, midY);
              canvas.lineTo(midX, 0);
              canvas.lineTo(0, midY);
              canvas.lineTo(midX, size.y);
              canvas.strokePath();
            },
          ),
          // House Labels & Planets in PDF layout
          ..._buildPdfHouseOverlay(chart, ascRashiIndex, size, primaryColor, goldColor),
        ],
      ),
    );
  }

  static List<pw.Widget> _buildPdfHouseOverlay(
    AstroChartModel chart,
    int ascRashiIndex,
    double size,
    PdfColor primaryColor,
    PdfColor goldColor,
  ) {
    final Map<int, List<String>> housePlanets = {};
    for (int i = 1; i <= 12; i++) {
      housePlanets[i] = [];
    }

    // Map planets to houses
    for (final p in chart.planets) {
      final houseNum = p.calculateHouseNumber(ascRashiIndex);
      var label = p.planet.substring(0, 2);
      if (p.isRetrograde) label += '(R)';
      housePlanets[houseNum]?.add(label);
    }

    // Relative center coordinates for each of 12 North Indian Houses
    final List<PdfPoint> houseCenters = [
      PdfPoint(size * 0.50, size * 0.70), // House 1 (Top diamond)
      PdfPoint(size * 0.28, size * 0.85), // House 2
      PdfPoint(size * 0.12, size * 0.72), // House 3
      PdfPoint(size * 0.25, size * 0.50), // House 4 (Left diamond)
      PdfPoint(size * 0.12, size * 0.28), // House 5
      PdfPoint(size * 0.28, size * 0.15), // House 6
      PdfPoint(size * 0.50, size * 0.28), // House 7 (Bottom diamond)
      PdfPoint(size * 0.72, size * 0.15), // House 8
      PdfPoint(size * 0.88, size * 0.28), // House 9
      PdfPoint(size * 0.75, size * 0.50), // House 10 (Right diamond)
      PdfPoint(size * 0.88, size * 0.72), // House 11
      PdfPoint(size * 0.72, size * 0.85), // House 12
    ];

    final List<pw.Widget> widgets = [];

    for (int h = 1; h <= 12; h++) {
      final pos = houseCenters[h - 1];
      final rashiNum = ((ascRashiIndex - 1 + (h - 1)) % 12) + 1;
      final planets = housePlanets[h] ?? [];

      widgets.add(
        pw.Positioned(
          left: pos.x - 22,
          bottom: pos.y - 14,
          child: pw.Column(
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              pw.Row(
                mainAxisSize: pw.MainAxisSize.min,
                children: [
                  pw.Text(
                    '$rashiNum',
                    style: pw.TextStyle(
                      fontSize: 9,
                      fontWeight: pw.FontWeight.bold,
                      color: primaryColor,
                    ),
                  ),
                  if (h == 1) ...[
                    pw.SizedBox(width: 2),
                    pw.Text(
                      'As',
                      style: pw.TextStyle(
                        fontSize: 9,
                        fontWeight: pw.FontWeight.bold,
                        color: goldColor,
                      ),
                    ),
                  ],
                ],
              ),
              if (planets.isNotEmpty)
                pw.Text(
                  planets.join(' '),
                  style: pw.TextStyle(
                    fontSize: 8,
                    fontWeight: pw.FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
            ],
          ),
        ),
      );
    }

    return widgets;
  }

  static pw.Widget _buildPdfPlanetsTable(
    AstroChartModel chart,
    int ascRashiIndex,
    PdfColor primaryColor,
    PdfColor secondaryColor,
    PdfColor borderColor,
  ) {
    final headers = ['PLANET', 'SIGN', 'DEGREE', 'HOUSE', 'RETROGRADE'];

    final rows = chart.planets.map((p) {
      final houseNum = p.calculateHouseNumber(ascRashiIndex);
      final degreeStr =
          '${p.degreeInRashi.toStringAsFixed(0)}°${((p.degreeInRashi % 1) * 60).round()}\'';
      return [
        p.planet,
        p.rashiName,
        degreeStr,
        'House $houseNum',
        p.isRetrograde ? 'Yes (R)' : 'No',
      ];
    }).toList();

    return pw.TableHelper.fromTextArray(
      headers: headers,
      data: rows,
      border: pw.TableBorder.all(color: borderColor, width: 0.5),
      headerStyle: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: primaryColor),
      cellStyle: const pw.TextStyle(fontSize: 8),
      headerDecoration: pw.BoxDecoration(color: PdfColor.fromHex('#EDF2F7')),
      cellHeight: 18,
      cellAlignments: {
        0: pw.Alignment.centerLeft,
        1: pw.Alignment.centerLeft,
        2: pw.Alignment.center,
        3: pw.Alignment.center,
        4: pw.Alignment.center,
      },
    );
  }
}
