import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'planetary_patyayini_models.dart';

/// Patyayini dasha (Tajika annual dasha) for one Varshaphala year: the krisamsa / patyamsa table,
/// the dasha periods and the antardashas of a selected dasha. Every number is the engine's output
/// from `dashaExt.patyayini`; the widget only formats it.
class PlanetaryPatyayiniView extends ConsumerStatefulWidget {
  const PlanetaryPatyayiniView({super.key, required this.birth, this.initialYear, this.location});
  final BirthInput birth;

  /// Year whose solar return opens the Tajika year. Defaults to the current calendar year.
  final int? initialYear;

  /// Annual (Varshaphala) place; the birth place when null.
  final LocationInput? location;

  @override
  ConsumerState<PlanetaryPatyayiniView> createState() => _PlanetaryPatyayiniViewState();
}

class _PlanetaryPatyayiniViewState extends ConsumerState<PlanetaryPatyayiniView> {
  late int _year;
  int? _selected;

  int get _birthYear => int.tryParse(widget.birth.date.split('-').first) ?? 1900;

  @override
  void initState() {
    super.initState();
    final y = widget.initialYear ?? DateTime.now().year;
    _year = y < _birthYear ? _birthYear : y;
  }

  EngineCall get _call => EngineCall('dashaExt.patyayini', {
        'birth': widget.birth.toJson(),
        'targetYear': _year,
        'maxLevel': 2,
        'targetDate': DateTime.now().toUtc().toIso8601String().substring(0, 10),
        if (widget.location != null) 'location': widget.location!.toJson(),
      });

  void _step(int delta) => setState(() {
        _year = (_year + delta).clamp(_birthYear, _birthYear + 150);
        _selected = null;
      });

  @override
  Widget build(BuildContext context) {
    final call = _call;
    return PageBody(children: [
      ControlBar(children: [
        Stepper2(
          key: const ValueKey('patyayini-year-stepper'),
          label: 'Tajika year',
          value: '$_year',
          prevTooltip: 'Previous year',
          nextTooltip: 'Next year',
          onPrev: () => _step(-1),
          onNext: () => _step(1),
        ),
      ]),
      const SizedBox(height: Gap.md),
      AsyncView<JsonMap>(
        value: ref.watch(engineCallProvider(call)),
        onRetry: () => ref.invalidate(engineCallProvider(call)),
        builder: (j) {
          final m = PatyayiniModel.fromJson(j);
          final table = m.dashaTable;
          final active = m.activeIndex;
          final sel = _selected ?? (active >= 0 ? active : 0);
          final hasAntar = m.periods.isNotEmpty && m.periods[sel].subPeriods.isNotEmpty;
          final antar = hasAntar ? m.antardashaTable(sel) : null;
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (m.provisional) ProvisionalBanner(source: m.source),
            const SizedBox(height: Gap.md),
            SectionCard(
              title: table.title,
              subtitle: '${table.subtitle} · ${m.placeName} · ${m.yearLengthDays.toStringAsFixed(4)} days',
              trailing: ExportButtons(tables: () => [table, if (antar != null) antar], fileStem: 'Patyayini_${m.targetYear}'),
              child: SimpleTable(showActions: false, 
                key: const ValueKey('patyayini-dasha-table'),
                columns: table.columns,
                rows: table.rows,
                title: table.title,
                numericColumns: const {0, 2, 3, 4, 5},
                highlightRows: {if (active >= 0) active},
                selectedRow: sel,
                onRowTap: (r) => setState(() => _selected = r),
                dense: true,
              ),
            ),
            if (antar != null) ...[
              const SizedBox(height: Gap.md),
              SectionCard(
                title: antar.title,
                subtitle: 'Same ratios and order, starting with the dasha itself (select a dasha above)',
                child: SimpleTable(showActions: false, 
                  key: const ValueKey('patyayini-antardasha-table'),
                  columns: antar.columns,
                  rows: antar.rows,
                  title: antar.title,
                  numericColumns: const {0, 2},
                  highlightRows: {for (var i = 0; i < m.periods[sel].subPeriods.length; i++) if (m.periods[sel].subPeriods[i].isActive) i},
                  dense: true,
                ),
              ),
            ],
            const SizedBox(height: Gap.sm),
            for (final n in m.notes) Note(n),
            const InterpretationArea(),
          ]);
        },
      ),
    ]);
  }
}
