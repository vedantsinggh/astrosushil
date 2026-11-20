import 'dart:io';
import 'dart:math' as math;

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme.dart';
import '../../util/format.dart';

/// Desktop data table: zebra rows, tabular figures, sticky header (long tables scroll under
/// it), right-click menu (copy value / row / table) and Copy / Export CSV actions.
class SimpleTable extends StatelessWidget {
  const SimpleTable({
    super.key,
    required this.columns,
    required this.rows,
    this.highlightRows = const {},
    this.numericColumns = const {},
    this.title,
    this.maxHeight,
    this.showActions,
    this.onRowTap,
    this.selectedRow,
    this.dense = false,
  });

  final List<String> columns;
  final List<List<String>> rows;
  final Set<int> highlightRows;
  final Set<int> numericColumns;

  /// Used as the default CSV file name.
  final String? title;

  /// Height limit; when rows exceed it they scroll beneath the pinned header.
  /// Defaults to 460 for tables with more than 14 rows.
  final double? maxHeight;

  /// Show the Copy / Export CSV actions (default: when there are 3+ rows).
  final bool? showActions;
  final ValueChanged<int>? onRowTap;
  final int? selectedRow;
  final bool dense;

  static const _maxColumnWidth = 380.0;
  static const _cellPad = 12.0;

  String get csv => toCsv(columns, rows);

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final scaler = MediaQuery.textScalerOf(context);
    final base = Theme.of(context).textTheme.bodyMedium!.copyWith(fontSize: 13, fontFeatures: tabularFigures);
    final headStyle = base.copyWith(fontWeight: FontWeight.w700, color: pal.heading, fontSize: 12.5);

    double measure(String s, TextStyle st) {
      final tp = TextPainter(text: TextSpan(text: s, style: st), textDirection: TextDirection.ltr, textScaler: scaler, maxLines: 1)..layout();
      return tp.width;
    }

    final natural = List<double>.generate(columns.length, (c) {
      var w = measure(columns[c], headStyle);
      for (final r in rows) {
        if (c < r.length && r[c].isNotEmpty) w = math.max(w, measure(r[c], base));
      }
      return math.min(w, _maxColumnWidth) + _cellPad * 2 + 2;
    });

    final rowH = (dense ? 26.0 : 30.0) * scaler.scale(1);
    final limit = maxHeight ?? (rows.length > 14 ? 460.0 : null);
    final actions = showActions ?? rows.length >= 3;

    return LayoutBuilder(builder: (context, constraints) {
      final total = natural.fold<double>(0, (a, b) => a + b);
      final avail = constraints.maxWidth.isFinite ? constraints.maxWidth - 5 : total; // 3px row marker + 2px frame
      final widths = total < avail ? [for (final w in natural) w + (avail - total) * (w / total)] : natural;
      final tableWidth = widths.fold<double>(0, (a, b) => a + b) + 3;

      Widget cell(String text, int c, TextStyle st, {bool header = false}) {
        final numeric = numericColumns.contains(c);
        return SizedBox(
          width: widths[c],
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: _cellPad, vertical: 6),
            child: Text(
              text,
              style: st,
              textAlign: numeric ? TextAlign.right : TextAlign.left,
              maxLines: header ? 1 : 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        );
      }

      final header = Container(
        decoration: BoxDecoration(color: pal.tableHeader, border: Border(bottom: BorderSide(color: pal.border), left: const BorderSide(color: Colors.transparent, width: 3))),
        constraints: BoxConstraints(minHeight: rowH),
        child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [for (var c = 0; c < columns.length; c++) cell(columns[c], c, headStyle, header: true)]),
      );

      Widget rowAt(int r) => _TableRow(
            key: ValueKey(r),
            height: rowH,
            background: r == selectedRow || highlightRows.contains(r) ? pal.highlightRow : (r.isOdd ? pal.zebra : pal.card),
            emphasised: highlightRows.contains(r) || r == selectedRow,
            onTap: onRowTap == null ? null : () => onRowTap!(r),
            onSecondaryTap: (pos) => _showMenu(context, pos, r, null),
            children: [
              for (var c = 0; c < columns.length; c++)
                GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onSecondaryTapUp: (d) => _showMenu(context, d.globalPosition, r, c),
                  child: cell(c < rows[r].length ? rows[r][c] : '', c, base.copyWith(color: pal.text, fontWeight: highlightRows.contains(r) ? FontWeight.w700 : FontWeight.w400)),
                ),
            ],
          );

      Widget body;
      if (limit != null && rows.length * rowH > limit) {
        body = SizedBox(
          height: limit,
          child: Scrollbar(
            child: ListView.builder(primary: false, itemCount: rows.length, itemBuilder: (_, r) => rowAt(r)),
          ),
        );
      } else {
        body = Column(mainAxisSize: MainAxisSize.min, children: [for (var r = 0; r < rows.length; r++) rowAt(r)]);
      }

      Widget table = SizedBox(
        width: tableWidth,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [header, body]),
      );
      if (total > avail) {
        table = Scrollbar(
          notificationPredicate: (n) => n.depth == 0 && n.metrics.axis == Axis.horizontal,
          child: SingleChildScrollView(scrollDirection: Axis.horizontal, primary: false, child: table),
        );
      }

      final framed = DecoratedBox(
        decoration: BoxDecoration(border: Border.all(color: pal.border), borderRadius: BorderRadius.circular(6)),
        child: ClipRRect(borderRadius: BorderRadius.circular(6), child: table),
      );
      if (!actions) return framed;
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Align(
          alignment: Alignment.centerRight,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Wrap(spacing: 2, children: [
              _MiniAction(icon: Icons.copy_rounded, label: 'Copy', tooltip: 'Copy this table (CSV) to the clipboard', onPressed: () => copyCsv(context)),
              _MiniAction(icon: Icons.download_rounded, label: 'Export CSV', tooltip: 'Save this table as a CSV file', onPressed: () => exportCsv(context)),
            ]),
          ),
        ),
        framed,
      ]);
    });
  }

  Future<void> copyCsv(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: csv));
    if (context.mounted) _toast(context, 'Table copied (${rows.length} rows). Paste it into a spreadsheet.');
  }

  Future<void> exportCsv(BuildContext context) async {
    final name = (title ?? 'table').replaceAll(RegExp(r'[^A-Za-z0-9 _()-]'), '').trim();
    final loc = await getSaveLocation(suggestedName: '${name.isEmpty ? 'table' : name}.csv', acceptedTypeGroups: const [XTypeGroup(label: 'CSV', extensions: ['csv'])]);
    if (loc == null) return;
    var path = loc.path;
    if (!path.toLowerCase().endsWith('.csv')) path = '$path.csv';
    try {
      await File(path).writeAsString('﻿$csv', flush: true); // BOM so Excel reads UTF-8
      if (context.mounted) _toast(context, 'Saved ${path.split(Platform.pathSeparator).last}');
    } catch (e) {
      if (context.mounted) _toast(context, 'Could not save the CSV file: $e');
    }
  }

  void _toast(BuildContext context, String m) => ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(m), duration: const Duration(seconds: 3)));

  Future<void> _showMenu(BuildContext context, Offset pos, int r, int? c) async {
    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    final value = c != null && c < rows[r].length ? rows[r][c] : null;
    final choice = await showMenu<String>(
      context: context,
      position: RelativeRect.fromRect(pos & const Size(1, 1), Offset.zero & overlay.size),
      items: [
        if (value != null && value.isNotEmpty)
          PopupMenuItem(value: 'cell', child: Text('Copy "${value.length > 28 ? '${value.substring(0, 28)}…' : value}"')),
        const PopupMenuItem(value: 'row', child: Text('Copy row')),
        const PopupMenuItem(value: 'table', child: Text('Copy table as CSV')),
        const PopupMenuItem(value: 'export', child: Text('Export table as CSV…')),
      ],
    );
    if (!context.mounted) return;
    switch (choice) {
      case 'cell':
        await Clipboard.setData(ClipboardData(text: value!));
      case 'row':
        await Clipboard.setData(ClipboardData(text: [for (var i = 0; i < columns.length; i++) '${columns[i]}: ${i < rows[r].length ? rows[r][i] : ''}'].join('\n')));
      case 'table':
        if (context.mounted) await copyCsv(context);
      case 'export':
        if (context.mounted) await exportCsv(context);
    }
  }
}

class _TableRow extends StatefulWidget {
  const _TableRow({super.key, required this.height, required this.background, required this.children, required this.emphasised, this.onTap, required this.onSecondaryTap});
  final double height;
  final Color background;
  final List<Widget> children;
  final bool emphasised;
  final VoidCallback? onTap;
  final void Function(Offset) onSecondaryTap;

  @override
  State<_TableRow> createState() => _TableRowState();
}

class _TableRowState extends State<_TableRow> {
  bool hover = false;
  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return MouseRegion(
      onEnter: (_) => setState(() => hover = true),
      onExit: (_) => setState(() => hover = false),
      cursor: widget.onTap != null ? SystemMouseCursors.click : MouseCursor.defer,
      child: GestureDetector(
        onTap: widget.onTap,
        onSecondaryTapUp: (d) => widget.onSecondaryTap(d.globalPosition),
        child: Container(
          constraints: BoxConstraints(minHeight: widget.height),
          decoration: BoxDecoration(
            color: hover ? Color.alphaBlend(pal.accent.withValues(alpha: 0.08), widget.background) : widget.background,
            border: Border(left: BorderSide(color: widget.emphasised ? pal.accent : Colors.transparent, width: 3)),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: widget.children),
        ),
      ),
    );
  }
}

class _MiniAction extends StatelessWidget {
  const _MiniAction({required this.icon, required this.label, required this.tooltip, required this.onPressed});
  final IconData icon;
  final String label;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Tooltip(
        message: tooltip,
        child: TextButton.icon(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            minimumSize: const Size(0, 28),
            foregroundColor: context.palette.textMuted,
            textStyle: Theme.of(context).textTheme.labelMedium?.copyWith(fontSize: 12, fontWeight: FontWeight.w600),
          ),
          icon: Icon(icon, size: 15),
          label: Text(label),
        ),
      );
}
