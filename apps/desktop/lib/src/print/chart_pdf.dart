import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../charts/chart_data.dart';
import '../charts/chart_geometry.dart';
import '../engine/inputs.dart';
import '../engine/models.dart';
import '../util/format.dart';

const _navy = PdfColor.fromInt(0xFF121440);
const _gold = PdfColor.fromInt(0xFFB45309);
const _muted = PdfColor.fromInt(0xFF5B5E7A);
const _burgundy = PdfColor.fromInt(0xFF824661);
const _border = PdfColor.fromInt(0xFFE2DACB);

/// Draws one chart (same geometry as the screen painter) as PDF vector graphics.
pw.Widget pdfChart(ChartData data, ChartStyle style, double s) {
  final layout = buildLayout(style, data.ascSign);
  final children = <pw.Widget>[
    pw.CustomPaint(
      size: PdfPoint(s, s),
      painter: (canvas, size) {
        canvas
          ..setStrokeColor(_navy)
          ..setLineWidth(0.8);
        for (final seg in layout.lines) {
          canvas
            ..moveTo(seg.a.x * s, s - seg.a.y * s)
            ..lineTo(seg.b.x * s, s - seg.b.y * s);
        }
        canvas.strokePath();
        if (layout.ascMarker != null) {
          canvas
            ..setStrokeColor(_gold)
            ..setLineWidth(1.4)
            ..moveTo(layout.ascMarker!.a.x * s, s - layout.ascMarker!.a.y * s)
            ..lineTo(layout.ascMarker!.b.x * s, s - layout.ascMarker!.b.y * s)
            ..strokePath();
        }
      },
    ),
  ];
  final bw = s * 0.24;
  final bh = s * 0.2;
  for (final cell in layout.cells) {
    final label = style == ChartStyle.north ? '${cell.sign}' : signShort[cell.sign - 1];
    children.add(pw.Positioned(
      left: cell.signLabelAnchor.x * s - 10,
      top: cell.signLabelAnchor.y * s - 4,
      child: pw.SizedBox(width: 20, child: pw.Text(label, textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 6, color: _muted))),
    ));
    final items = data.bodies[cell.sign] ?? const <ChartBody>[];
    if (items.isEmpty) continue;
    final fs = (s / 26) * (cell.capacity < 0.7 ? 0.8 : 1.0) * (items.length > 4 ? 0.85 : 1.0);
    children.add(pw.Positioned(
      left: cell.anchor.x * s - bw / 2,
      top: cell.anchor.y * s - bh / 2,
      child: pw.Container(
        width: bw,
        height: bh,
        alignment: pw.Alignment.center,
        child: pw.Wrap(alignment: pw.WrapAlignment.center, spacing: 3, runSpacing: 1, children: [
          for (final b in items)
            pw.Text(
              b.retrograde ? '${b.text}(R)' : b.text,
              style: pw.TextStyle(fontSize: fs, color: b.highlight ? _gold : (b.retrograde ? _burgundy : PdfColors.black), fontWeight: b.highlight ? pw.FontWeight.bold : pw.FontWeight.normal),
            ),
        ]),
      ),
    ));
  }
  return pw.Column(children: [
    pw.Text(data.title, style: const pw.TextStyle(fontWeight: pw.FontWeight.bold, color: _navy, fontSize: 10)),
    pw.SizedBox(height: 3),
    pw.SizedBox(width: s, height: s, child: pw.Stack(children: children)),
  ]);
}

/// The PDF uses the built-in base-14 fonts (no font files to ship), which only cover Latin-1.
String latin1Safe(String s) => s.replaceAll('—', '-').replaceAll('–', '-').replaceAll('℞', '(R)').replaceAll(RegExp(r'[^\x00-\xFF]'), '?');

pw.Widget _kv(List<(String, String)> items) => pw.Table(
      columnWidths: const {0: pw.FixedColumnWidth(90), 1: pw.FlexColumnWidth()},
      children: [
        for (final (k, v) in items)
          pw.TableRow(children: [
            pw.Padding(padding: const pw.EdgeInsets.symmetric(vertical: 1.5), child: pw.Text(latin1Safe(k), style: const pw.TextStyle(fontSize: 8, color: _muted))),
            pw.Padding(padding: const pw.EdgeInsets.symmetric(vertical: 1.5), child: pw.Text(latin1Safe(v), style: const pw.TextStyle(fontSize: 8))),
          ]),
      ],
    );

pw.Widget _table(List<String> header, List<List<String>> rows) => pw.TableHelper.fromTextArray(
      headers: header.map(latin1Safe).toList(),
      data: [for (final r in rows) r.map(latin1Safe).toList()],
      headerStyle: const pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold, color: _navy),
      cellStyle: const pw.TextStyle(fontSize: 7.5),
      headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFF3EDE2)),
      border: const pw.TableBorder(horizontalInside: pw.BorderSide(color: _border, width: 0.4), bottom: pw.BorderSide(color: _border, width: 0.4)),
      cellPadding: const pw.EdgeInsets.symmetric(horizontal: 3, vertical: 2),
    );

pw.Widget _section(String title, pw.Widget body) => pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      pw.SizedBox(height: 8),
      pw.Text(title, style: const pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: _navy)),
      pw.Container(height: 1, width: 40, color: _gold, margin: const pw.EdgeInsets.only(top: 2, bottom: 4)),
      body,
    ]);

/// One-to-two page chart summary: birth data, Rasi + Navamsa, positions, panchanga, Vimshottari.
Future<Uint8List> buildChartSummaryPdf({
  required BirthInput birth,
  required ChartResult chart,
  required ChartStyle style,
  DashaResultModel? vimshottari,
  PdfPageFormat format = PdfPageFormat.a4,
}) async {
  final doc = pw.Document(title: 'Chart summary - ${birth.name ?? 'Untitled'}', creator: 'Astro Sushil Desktop', author: 'Astro Sushil Desktop');
  final p = chart.panchang;
  final off = chart.utcOffsetMinutes;
  final a = chart.rasi.ascendant;
  final positions = [
    ['Lagna', a.sign, dms(a.degree), '${a.nakshatra} ${a.pada}', titleCase(a.lord), '1', '', ''],
    for (final x in chart.rasi.planets)
      [titleCase(x.name), x.sign, dms(x.degree), '${x.nakshatra} ${x.pada}', titleCase(x.nakshatraLord), '${x.house}', titleCase(x.dignity), [if (x.retrograde) 'R', if (x.combust) 'C'].join(' ')],
  ];
  doc.addPage(pw.MultiPage(
    pageFormat: format,
    margin: const pw.EdgeInsets.all(28),
    header: (ctx) => pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
      pw.Text('Astro Sushil Desktop', style: const pw.TextStyle(fontSize: 9, color: _navy, fontWeight: pw.FontWeight.bold)),
      pw.Text('Chart summary', style: const pw.TextStyle(fontSize: 8, color: _muted)),
    ]),
    footer: (ctx) => pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
      pw.Text(latin1Safe('Engine ${chart.engineVersion} · ${ayanamsaShort(chart.ayanamsaName)} ayanamsa · ${houseSystemLabel(chart.houseSystem)} houses · ${nodeLabel(chart.nodeCalculation)}'),
          style: const pw.TextStyle(fontSize: 6.5, color: _muted)),
      pw.Text('Page ${ctx.pageNumber} of ${ctx.pagesCount}', style: const pw.TextStyle(fontSize: 6.5, color: _muted)),
    ]),
    build: (ctx) => [
      pw.Text(latin1Safe(birth.name ?? 'Untitled chart'), style: const pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: _navy)),
      pw.SizedBox(height: 6),
      pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
        pw.Expanded(
          child: _kv([
            ('Date / time', '${birth.date} ${birth.time} (${offsetLabel(off)})'),
            ('Time zone', birth.timezone),
            ('Place', birth.placeName ?? '-'),
            ('Coordinates', latLon(birth.latitude, birth.longitude)),
            ('UTC', localDateTime(chart.utc, 0)),
            ('Julian day (UT)', chart.julianDayUT.toStringAsFixed(5)),
          ]),
        ),
        pw.SizedBox(width: 12),
        pw.Expanded(
          child: _kv([
            ('Ayanamsa', '${ayanamsaShort(chart.ayanamsaName)} ${dms(chart.ayanamsa)} · ${nodeLabel(chart.nodeCalculation)}'),
            ('Lagna', '${a.sign} ${dms(a.degree)} - ${a.nakshatra} ${a.pada}'),
            ('Tithi', '${p.tithi.name} (${titleCase(p.tithi.extra ?? '')})'),
            ('Vara', p.vara.name),
            ('Nakshatra', '${p.nakshatra.name} ${p.nakshatra.pada ?? ''}'),
            ('Yoga / Karana', '${p.yoga.name} / ${p.karana.name}'),
          ]),
        ),
      ]),
      pw.SizedBox(height: 10),
      pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceEvenly, children: [
        pdfChart(ChartData.fromNormalized('Rasi (D1)', chart.rasi), style, 230),
        pdfChart(ChartData.fromNormalized('Navamsa (D9)', chart.navamsa, showDegrees: false), style, 230),
      ]),
      _section('Planetary positions', _table(const ['Body', 'Sign', 'Degree', 'Nakshatra', 'Nak. lord', 'House', 'Dignity', 'R/C'], positions)),
      if (vimshottari != null && vimshottari.isEligible)
        _section(
          'Vimshottari Mahadashas',
          _table(const ['Lord', 'From', 'To', 'Years'], [
            for (final d in vimshottari.periods) [d.label == d.lord ? titleCase(d.label) : d.label, localDate(d.start, off), localDate(d.end, off), d.durationYears.toStringAsFixed(2)],
          ]),
        ),
    ],
  ));
  return doc.save();
}
