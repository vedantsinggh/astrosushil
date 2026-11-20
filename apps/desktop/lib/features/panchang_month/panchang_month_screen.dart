import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart' show saveBytes;
import 'panchang_month_model.dart';
import 'panchang_month_pdf.dart';

/// Monthly panchang at a place: calendar grid + day table, printable as A4 landscape.
class PanchangMonthScreen extends ConsumerStatefulWidget {
  const PanchangMonthScreen({super.key, required this.location, this.initialYear, this.initialMonth});
  final LocationInput location;
  final int? initialYear;
  final int? initialMonth;

  @override
  ConsumerState<PanchangMonthScreen> createState() => _PanchangMonthScreenState();
}

class _PanchangMonthScreenState extends ConsumerState<PanchangMonthScreen> {
  late int _year = widget.initialYear ?? DateTime.now().year;
  late int _month = widget.initialMonth ?? DateTime.now().month;

  EngineCall get _call => EngineCall('panchang.month', {'year': _year, 'month': _month, 'location': widget.location.toJson()});

  void _step(int delta) => setState(() {
        final m = _month - 1 + delta;
        _year += m < 0 ? -1 : (m > 11 ? 1 : 0);
        _month = (m % 12) + 1;
      });

  String get _stem => 'Panchang_${_year}_${_month.toString().padLeft(2, '0')}';

  Future<void> _save(PanchangMonthModel m) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      final path = await saveBytes(await buildPanchangMonthPdf([m]), suggestedName: '$_stem.pdf', extension: 'pdf', label: 'PDF');
      if (path != null) messenger?.showSnackBar(SnackBar(content: Text('Saved $path')));
    } catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text('Save failed: $e')));
    }
  }

  Future<void> _print(PanchangMonthModel m) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      final bytes = await buildPanchangMonthPdf([m]);
      await Printing.layoutPdf(onLayout: (_) async => bytes, name: '$_stem.pdf');
    } catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text('Print failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final call = _call;
    final value = ref.watch(engineCallProvider(call)).whenData(PanchangMonthModel.new);
    return PageBody(children: [
      ControlBar(children: [
        Stepper2(label: 'Month', value: '${monthNames[_month - 1]} $_year', onPrev: () => _step(-1), onNext: () => _step(1), prevTooltip: 'Previous month', nextTooltip: 'Next month'),
        Text(widget.location.placeName ?? latLon(widget.location.latitude, widget.location.longitude), style: TextStyle(color: context.palette.textMuted)),
        if (value.hasValue) ...[
          FilledButton.icon(onPressed: () => _save(value.value!), icon: const Icon(Icons.save_alt_outlined, size: 18), label: const Text('Save PDF')),
          OutlinedButton.icon(onPressed: () => _print(value.value!), icon: const Icon(Icons.print_outlined, size: 18), label: const Text('Print')),
        ],
      ]),
      AsyncView<PanchangMonthModel>(
        value: value,
        onRetry: () => ref.invalidate(engineCallProvider(call)),
        builder: (m) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SectionCard(
            title: 'Panchang - ${m.title}',
            subtitle: '${m.placeLabel} - ${m.timezone}${m.rows.isEmpty ? '' : ' (${offsetLabel(m.rows.first.utcOffsetMinutes)})'}',
            child: MonthGrid(model: m),
          ),
          const SizedBox(height: Gap.lg),
          SectionCard(
            title: 'Daily table',
            child: SimpleTable(title: _stem, columns: PanchangMonthModel.columns, rows: m.tableRows, maxHeight: 640, dense: true),
          ),
          const SizedBox(height: Gap.sm),
          Note('${m.reference} "+1" = ends on the next day. Times are local.'),
        ]),
      ),
    ]);
  }
}

/// Calendar grid (Sunday first); leading blanks come from the engine's weekday index of day 1.
class MonthGrid extends StatelessWidget {
  const MonthGrid({super.key, required this.model});
  final PanchangMonthModel model;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final rows = model.rows;
    final lead = rows.isEmpty ? 0 : rows.first.weekdayIndex.clamp(0, 6);
    final cells = <PanchangDayRow?>[...List.filled(lead, null), ...rows];
    while (cells.length % 7 != 0) {
      cells.add(null);
    }
    final small = TextStyle(fontSize: 11.5, color: pal.text);
    final muted = TextStyle(fontSize: 11, color: pal.textMuted);
    Widget cell(PanchangDayRow? r) => Container(
          height: 104,
          padding: const EdgeInsets.all(6),
          color: r == null ? pal.canvasAlt : pal.card,
          child: r == null
              ? null
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Text('${r.day}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: pal.heading)),
                    const Spacer(),
                    Flexible(child: Text(r.masaLabel, style: muted, overflow: TextOverflow.ellipsis)),
                  ]),
                  Text('${r.tithiLabel} · ${r.endLabel(r.tithi)}', style: small, overflow: TextOverflow.ellipsis),
                  Text('${r.nakshatra.name} · ${r.endLabel(r.nakshatra)}', style: small, overflow: TextOverflow.ellipsis),
                  const Spacer(),
                  Text('↑ ${r.hm(r.sunrise)}  ↓ ${r.hm(r.sunset)}', style: muted),
                ]),
        );
    return Table(
      border: TableBorder.all(color: pal.border),
      children: [
        TableRow(
          decoration: BoxDecoration(color: pal.tableHeader),
          children: [
            for (final d in weekdayShort)
              Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(d, textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, color: pal.heading))),
          ],
        ),
        for (var w = 0; w < cells.length ~/ 7; w++) TableRow(children: [for (var k = 0; k < 7; k++) cell(cells[w * 7 + k])]),
      ],
    );
  }
}
