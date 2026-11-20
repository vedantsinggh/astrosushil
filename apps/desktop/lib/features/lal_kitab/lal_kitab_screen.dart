import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/charts/chart_geometry.dart';
import '../../src/charts/chart_view.dart';
import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'lal_kitab_models.dart';

/// Lal Kitab chart (teva) and Varshphal (ADR-016 §1: calculation only). Everything shown is the
/// engine's output from `lalKitab.chart` / `lalKitab.varshphal`; no remedies or interpretation.
class LalKitabScreen extends ConsumerStatefulWidget {
  const LalKitabScreen({super.key, required this.birth, this.initialAge});
  final BirthInput birth;

  /// Running year of life to open on (1–120). When null, the running year beginning in the
  /// current calendar year is requested from the engine (`targetYear`).
  final int? initialAge;

  @override
  ConsumerState<LalKitabScreen> createState() => _LalKitabScreenState();
}

class _LalKitabScreenState extends ConsumerState<LalKitabScreen> {
  static const _minAge = 1;
  static const _maxAge = 120;
  int? _age;

  @override
  void initState() {
    super.initState();
    _age = widget.initialAge;
  }

  EngineCall get _varshphalCall {
    if (_age != null) return EngineCall('lalKitab.varshphal', {'birth': widget.birth.toJson(), 'age': _age});
    final birthYear = int.tryParse(widget.birth.date.split('-').first) ?? DateTime.now().year;
    final now = DateTime.now().year;
    final inRange = now >= birthYear && now <= birthYear + _maxAge - 1;
    return EngineCall('lalKitab.varshphal', {'birth': widget.birth.toJson(), if (inRange) 'targetYear': now else 'age': _minAge});
  }

  void _step(int current, int delta) => setState(() => _age = (current + delta).clamp(_minAge, _maxAge));

  @override
  Widget build(BuildContext context) {
    final chartCall = EngineCall('lalKitab.chart', {'birth': widget.birth.toJson()});
    final vCall = _varshphalCall;
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(chartCall)),
      onRetry: () => ref.invalidate(engineCallProvider(chartCall)),
      builder: (cj) {
        final chart = LalKitabChartModel.fromJson(cj);
        return PageBody(children: [
          if (chart.provisional) ProvisionalBanner(source: chart.source),
          SectionCard(
            title: 'Lal Kitab birth chart (teva)',
            subtitle: 'Fixed chart: house 1 = Mesha; each planet in the house it occupies from the natal lagna (${chart.lagnaName})',
            trailing: ExportButtons(tables: () => [chart.placementTable], fileStem: 'Lal_Kitab_chart'),
            child: Wrap(spacing: Gap.lg, runSpacing: Gap.md, crossAxisAlignment: WrapCrossAlignment.start, children: [
              ChartView(key: const ValueKey('lal-kitab-natal-chart'), data: chart.chartData, style: ChartStyle.north, size: 340),
              SizedBox(
                width: 420,
                child: SimpleTable(showActions: false, columns: chart.placementTable.columns, rows: chart.placementTable.rows, title: chart.placementTable.title, dense: true),
              ),
            ]),
          ),
          for (final n in chart.notes) Note(n),
          AsyncView<JsonMap>(
            value: ref.watch(engineCallProvider(vCall)),
            onRetry: () => ref.invalidate(engineCallProvider(vCall)),
            builder: (vj) {
              final v = LalKitabVarshphalModel.fromJson(vj);
              final table = v.mappingTable;
              return SectionCard(
                title: 'Lal Kitab Varshphal',
                subtitle: 'Annual chart for running year ${v.age} of life (begins on the birthday in ${v.startsInYear})',
                trailing: ExportButtons(tables: () => [table], fileStem: 'Lal_Kitab_varshphal_${v.age}'),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  ControlBar(children: [
                    Stepper2(
                      key: const ValueKey('lal-kitab-year-stepper'),
                      label: 'Year of age',
                      value: '${v.age}',
                      prevTooltip: 'Previous year',
                      nextTooltip: 'Next year',
                      onPrev: () => _step(v.age, -1),
                      onNext: () => _step(v.age, 1),
                    ),
                  ]),
                  const SizedBox(height: Gap.md),
                  if (v.provisional) ProvisionalBanner(source: v.source),
                  const SizedBox(height: Gap.md),
                  Wrap(spacing: Gap.lg, runSpacing: Gap.md, crossAxisAlignment: WrapCrossAlignment.start, children: [
                    ChartView(key: const ValueKey('lal-kitab-annual-chart'), data: v.chartData, style: ChartStyle.north, size: 340),
                    SizedBox(width: 420, child: SimpleTable(showActions: false, columns: table.columns, rows: table.rows, title: table.title, dense: true)),
                  ]),
                  const SizedBox(height: Gap.sm),
                  for (final n in v.notes) Note(n),
                ]),
              );
            },
          ),
          const InterpretationArea(),
        ]);
      },
    );
  }
}
