import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../src/print/chart_pdf.dart' show latin1Safe;
import '../../src/util/format.dart';
import 'panchang_month_model.dart';

const _navy = PdfColor.fromInt(0xFF121440);
const _muted = PdfColor.fromInt(0xFF5B5E7A);
const _border = PdfColor.fromInt(0xFFB9B0A0);
const _headerFill = PdfColor.fromInt(0xFFF3EDE2);
const _gold = PdfColor.fromInt(0xFFB45309);

pw.Widget _cell(PanchangDayRow? r, double h) {
  if (r == null) return pw.Container(height: h, color: const PdfColor.fromInt(0xFFFAF8F4));
  const small = pw.TextStyle(fontSize: 6.4);
  const label = pw.TextStyle(fontSize: 6.4, color: _muted);
  return pw.Container(
    height: h,
    padding: const pw.EdgeInsets.all(3),
    child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
        pw.Text('${r.day}', style: const pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: _navy)),
        pw.Text(latin1Safe(r.masaLabel), style: const pw.TextStyle(fontSize: 5.8, color: _gold)),
      ]),
      pw.SizedBox(height: 1),
      pw.Text(latin1Safe(r.tithiLabel), style: small, maxLines: 1),
      pw.Text(latin1Safe('to ${r.endLabel(r.tithi)}'), style: label),
      pw.Text(latin1Safe('${r.nakshatra.name}${r.nakshatra.pada == null ? '' : ' ${r.nakshatra.pada}'}'), style: small, maxLines: 1),
      pw.Text(latin1Safe('to ${r.endLabel(r.nakshatra)}'), style: label),
      pw.Spacer(),
      pw.Text('Sunrise ${r.hm(r.sunrise)}  Set ${r.hm(r.sunset)}', style: label),
    ]),
  );
}

pw.Widget _monthPage(PanchangMonthModel m, PdfPageFormat format) {
  final lead = m.rows.isEmpty ? 0 : m.rows.first.weekdayIndex.clamp(0, 6);
  final cells = <PanchangDayRow?>[...List.filled(lead, null), ...m.rows];
  while (cells.length % 7 != 0) {
    cells.add(null);
  }
  final weeks = cells.length ~/ 7;
  final available = format.availableHeight - 70;
  final h = available / (weeks == 0 ? 1 : weeks);
  final off = m.rows.isEmpty ? 0 : m.rows.first.utcOffsetMinutes;
  return pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
    pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, crossAxisAlignment: pw.CrossAxisAlignment.end, children: [
      pw.Text(latin1Safe('Panchang - ${m.title}'), style: const pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: _navy)),
      pw.Text(latin1Safe('${m.placeLabel} - ${m.timezone} (${offsetLabel(off)})'), style: const pw.TextStyle(fontSize: 8, color: _muted)),
    ]),
    pw.SizedBox(height: 6),
    pw.Table(
      border: pw.TableBorder.all(color: _border, width: 0.5),
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: _headerFill),
          children: [
            for (final d in weekdayShort)
              pw.Padding(
                padding: const pw.EdgeInsets.symmetric(vertical: 2),
                child: pw.Text(d, textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: _navy)),
              ),
          ],
        ),
        for (var w = 0; w < weeks; w++) pw.TableRow(children: [for (var k = 0; k < 7; k++) _cell(cells[w * 7 + k], h)]),
      ],
    ),
    pw.SizedBox(height: 4),
    pw.Text(
      latin1Safe('${m.reference} "+1" = ends on the next day. Times are local (${offsetLabel(off)}). Calculated by the local engine.'),
      style: const pw.TextStyle(fontSize: 6.5, color: _muted),
    ),
  ]);
}

/// Printable A4 landscape monthly panchang: one page per month, calendar grid with tithi,
/// nakshatra (with end times) and sunrise/sunset in each cell. Layout only; values are engine output.
Future<Uint8List> buildPanchangMonthPdf(List<PanchangMonthModel> months) async {
  final format = PdfPageFormat.a4.landscape.copyWith(marginLeft: 24, marginRight: 24, marginTop: 22, marginBottom: 22);
  final doc = pw.Document(title: months.isEmpty ? 'Panchang' : 'Panchang - ${months.first.title}', creator: 'Astro Sushil Desktop');
  for (final m in months) {
    doc.addPage(pw.Page(pageFormat: format, build: (_) => _monthPage(m, format)));
  }
  if (months.isEmpty) doc.addPage(pw.Page(pageFormat: format, build: (_) => pw.Text('No data')));
  return doc.save();
}
