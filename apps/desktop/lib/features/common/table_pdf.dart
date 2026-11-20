import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../src/print/chart_pdf.dart' show latin1Safe;
import '../../src/util/format.dart' show toCsv;

/// A titled table for export (CSV or A4 PDF). Rows are already-formatted engine values.
class ExportTable {
  const ExportTable({required this.title, required this.columns, required this.rows, this.subtitle = '', this.footnote = ''});
  final String title;
  final String subtitle;
  final String footnote;
  final List<String> columns;
  final List<List<String>> rows;

  String get csv => toCsv(columns, rows);
}

const _navy = PdfColor.fromInt(0xFF121440);
const _muted = PdfColor.fromInt(0xFF5B5E7A);

/// Multi-page A4 PDF of one or more tables (landscape when a table is wide). Header rows repeat
/// on each page.
Future<Uint8List> buildTablesPdf(List<ExportTable> tables, {String? docTitle}) async {
  final doc = pw.Document(title: docTitle ?? (tables.isEmpty ? 'Table' : tables.first.title), creator: 'Astro Sushil Desktop');
  final wide = tables.any((t) => t.columns.length > 8);
  doc.addPage(pw.MultiPage(
    pageFormat: wide ? PdfPageFormat.a4.landscape : PdfPageFormat.a4,
    margin: const pw.EdgeInsets.all(28),
    footer: (ctx) => pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
      pw.Text('Astro Sushil Desktop - calculated by the local engine', style: const pw.TextStyle(fontSize: 7, color: _muted)),
      pw.Text('Page ${ctx.pageNumber} of ${ctx.pagesCount}', style: const pw.TextStyle(fontSize: 7, color: _muted)),
    ]),
    build: (ctx) => [
      for (final t in tables) ...[
        pw.Text(latin1Safe(t.title), style: const pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: _navy)),
        if (t.subtitle.isNotEmpty) pw.Padding(padding: const pw.EdgeInsets.only(top: 2), child: pw.Text(latin1Safe(t.subtitle), style: const pw.TextStyle(fontSize: 8, color: _muted))),
        pw.SizedBox(height: 6),
        pw.TableHelper.fromTextArray(
          headers: t.columns.map(latin1Safe).toList(),
          data: [for (final r in t.rows) r.map(latin1Safe).toList()],
          headerStyle: const pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold, color: _navy),
          cellStyle: const pw.TextStyle(fontSize: 7.2),
          headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFF4EFE5)),
          cellPadding: const pw.EdgeInsets.symmetric(horizontal: 3, vertical: 2),
          oddRowDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFFBF8F2)),
        ),
        if (t.footnote.isNotEmpty) pw.Padding(padding: const pw.EdgeInsets.only(top: 4), child: pw.Text(latin1Safe(t.footnote), style: const pw.TextStyle(fontSize: 7, color: _muted))),
        pw.SizedBox(height: 14),
      ],
    ],
  ));
  return doc.save();
}

String _safeName(String s) => s.replaceAll(RegExp(r'[^A-Za-z0-9_ -]+'), '').trim().replaceAll(' ', '_');

/// Asks for a location and writes [bytes]; returns the path or null when cancelled.
Future<String?> saveBytes(Uint8List bytes, {required String suggestedName, required String extension, required String label}) async {
  final loc = await getSaveLocation(suggestedName: suggestedName, acceptedTypeGroups: [XTypeGroup(label: label, extensions: [extension])]);
  if (loc == null) return null;
  var path = loc.path;
  if (!path.toLowerCase().endsWith('.$extension')) path = '$path.$extension';
  await File(path).writeAsBytes(bytes, flush: true);
  return path;
}

/// "Export CSV" and "Export PDF" buttons for [tables] (built lazily, so large tables cost
/// nothing until the user exports).
class ExportButtons extends StatelessWidget {
  const ExportButtons({super.key, this.tables, this.asyncTables, this.fileStem}) : assert(tables != null || asyncTables != null);
  final List<ExportTable> Function()? tables;

  /// Alternative to [tables] for paged results: fetches every page before exporting.
  final Future<List<ExportTable>> Function()? asyncTables;
  final String? fileStem;

  Future<void> _run(BuildContext context, bool pdf) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    final ts = asyncTables != null ? await asyncTables!() : tables!();
    if (ts.isEmpty) return;
    final stem = _safeName(fileStem ?? ts.first.title);
    try {
      final String? path;
      if (pdf) {
        path = await saveBytes(await buildTablesPdf(ts), suggestedName: '$stem.pdf', extension: 'pdf', label: 'PDF');
      } else {
        final text = ts.map((t) => ts.length > 1 ? '# ${t.title}\n${t.csv}' : t.csv).join('\n');
        // UTF-8 with BOM so spreadsheet apps detect the encoding (degree signs, Devanagari).
        path = await saveBytes(Uint8List.fromList([0xEF, 0xBB, 0xBF, ...utf8.encode(text)]),
            suggestedName: '$stem.csv', extension: 'csv', label: 'CSV');
      }
      if (path != null) messenger?.showSnackBar(SnackBar(content: Text('Saved $path')));
    } catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text('Export failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) => Wrap(spacing: 8, children: [
        OutlinedButton.icon(onPressed: () => _run(context, false), icon: const Icon(Icons.table_view_outlined, size: 18), label: const Text('Export CSV')),
        OutlinedButton.icon(onPressed: () => _run(context, true), icon: const Icon(Icons.picture_as_pdf_outlined, size: 18), label: const Text('Export PDF')),
      ]);
}
