import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';

import '../../src/charts/chart_geometry.dart';
import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart' show saveBytes;
import 'horoscope_data.dart';
import 'horoscope_pdf.dart';

/// Full A4 horoscope PDF: choose chart style and sections, preview, save or print.
class HoroscopePdfScreen extends ConsumerStatefulWidget {
  const HoroscopePdfScreen({super.key, required this.birth, this.initialStyle = ChartStyle.north});
  final BirthInput birth;
  final ChartStyle initialStyle;

  @override
  ConsumerState<HoroscopePdfScreen> createState() => _HoroscopePdfScreenState();
}

class _HoroscopePdfScreenState extends ConsumerState<HoroscopePdfScreen> {
  late ChartStyle _style = widget.initialStyle;
  // Every section is on by default, Bhava Chalit included (engine 0.2.0 Sripati from the real MC,
  // ADR-017).
  final Set<HoroscopeSection> _sections = {...HoroscopeSection.values};
  bool _preview = false;
  bool _busy = false;

  HoroscopePdfOptions get _options => HoroscopePdfOptions(style: _style, sections: {..._sections});

  String get _fileStem => 'Horoscope_${(widget.birth.name ?? 'chart').replaceAll(RegExp(r'[^A-Za-z0-9_-]+'), '_')}';

  Future<void> _save(HoroscopeData data) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    setState(() => _busy = true);
    try {
      final bytes = await buildHoroscopePdf(data, options: _options);
      final path = await saveBytes(bytes, suggestedName: '$_fileStem.pdf', extension: 'pdf', label: 'PDF');
      if (path != null) messenger?.showSnackBar(SnackBar(content: Text('Saved $path')));
    } catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text('Save failed: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _print(HoroscopeData data) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      final bytes = await buildHoroscopePdf(data, options: _options);
      await Printing.layoutPdf(onLayout: (_) async => bytes, name: '$_fileStem.pdf');
    } catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text('Print failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final req = HoroscopeRequests(widget.birth);
    final values = [for (final c in req.all) ref.watch(engineCallProvider(c))];
    final error = values.where((v) => v.hasError).firstOrNull;
    final AsyncValue<HoroscopeData> data = error != null
        ? AsyncValue.error(error.error!, error.stackTrace ?? StackTrace.empty)
        : values.every((v) => v.hasValue)
            ? AsyncValue.data(HoroscopeData(
                birth: widget.birth,
                chart: values[0].value!,
                vargas: values[1].value!,
                variants: values[2].value!,
                avakhada: values[3].value!,
                vimshottari: values[4].value!,
                yogini: values[5].value!,
                strength: values[6].value!,
              ))
            : const AsyncValue.loading();

    return PageBody(children: [
      SectionCard(
        title: 'Horoscope PDF',
        subtitle: 'A4, multi-page. ${widget.birth.name ?? 'Untitled chart'} - ${widget.birth.date} ${widget.birth.time}, ${widget.birth.placeName ?? latLon(widget.birth.latitude, widget.birth.longitude)}',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ControlBar(children: [
            const Text('Chart style'),
            SegmentedButton<ChartStyle>(
              segments: [for (final s in ChartStyle.values) ButtonSegment(value: s, label: Text(s.label))],
              selected: {_style},
              onSelectionChanged: (v) => setState(() => _style = v.first),
            ),
          ]),
          const SizedBox(height: Gap.md),
          Text('Sections', style: Theme.of(context).textTheme.titleSmall),
          Wrap(spacing: Gap.sm, runSpacing: Gap.xs, children: [
            for (final s in HoroscopeSection.values)
              FilterChip(
                label: Text(s.label),
                selected: _sections.contains(s),
                onSelected: (on) => setState(() => on ? _sections.add(s) : _sections.remove(s)),
              ),
          ]),
          const SizedBox(height: Gap.md),
          AsyncView<HoroscopeData>(
            value: data,
            onRetry: () {
              for (final c in req.all) {
                ref.invalidate(engineCallProvider(c));
              }
            },
            builder: (d) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              KeyValueGrid(items: [
                ('Lagna', '${d.chart.rasi.ascendant.sign} ${dms(d.chart.rasi.ascendant.degree)}'),
                ('Moon nakshatra', '${d.chart.panchang.nakshatra.name} pada ${d.chart.panchang.nakshatra.pada ?? ''}'),
                ('Vimshottari mahadashas', '${d.vimshottari.periods.length}'),
                ('Shadbala rows', '${d.strength.shadbala.length}'),
              ]),
              const SizedBox(height: Gap.md),
              ControlBar(children: [
                FilledButton.icon(
                  onPressed: _busy ? null : () => _save(d),
                  icon: const Icon(Icons.save_alt_outlined, size: 18),
                  label: const Text('Save PDF'),
                ),
                OutlinedButton.icon(onPressed: () => _print(d), icon: const Icon(Icons.print_outlined, size: 18), label: const Text('Print')),
                OutlinedButton.icon(
                  onPressed: () => setState(() => _preview = !_preview),
                  icon: Icon(_preview ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                  label: Text(_preview ? 'Hide preview' : 'Preview'),
                ),
              ]),
              if (_preview) ...[
                const SizedBox(height: Gap.md),
                SizedBox(
                  height: 760,
                  child: PdfPreview(
                    key: ValueKey('${_style.name}-${_sections.map((s) => s.name).join(',')}'),
                    build: (_) => buildHoroscopePdf(d, options: _options).then(Uint8List.fromList),
                    canChangePageFormat: false,
                    canChangeOrientation: false,
                    canDebug: false,
                    allowPrinting: false,
                    allowSharing: false,
                    pdfFileName: '$_fileStem.pdf',
                  ),
                ),
              ],
            ]),
          ),
        ]),
      ),
      const Note('Every value is calculated by the local engine; the PDF only lays the results out. '
          'Text uses the built-in PDF fonts, so non-Latin characters are transliterated or replaced.'),
    ]);
  }
}
