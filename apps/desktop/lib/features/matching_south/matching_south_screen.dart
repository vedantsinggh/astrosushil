import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'matching_south_models.dart';

/// South Indian Porutham and Dashakoota matching (ADR-016 §4), side by side, with the Moon
/// inputs of both people. Everything shown is the engine's output (`matching.porutham`,
/// `matching.dashakoota`); no verdict or interpretation text.
class MatchingSouthScreen extends ConsumerWidget {
  const MatchingSouthScreen({super.key, required this.boy, required this.girl, this.embedded = false});

  /// When true the content is a plain column (to sit inside another scrolling page).
  final bool embedded;
  final BirthInput boy;
  final BirthInput girl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final params = {'boy': boy.toJson(), 'girl': girl.toJson()};
    final pCall = EngineCall('matching.porutham', params);
    final dCall = EngineCall('matching.dashakoota', params);
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(pCall)),
      onRetry: () => ref.invalidate(engineCallProvider(pCall)),
      builder: (pj) => AsyncView<JsonMap>(
        value: ref.watch(engineCallProvider(dCall)),
        onRetry: () => ref.invalidate(engineCallProvider(dCall)),
        builder: (dj) {
          final p = SouthMatchingModel.fromJson(pj);
          final d = SouthMatchingModel.fromJson(dj);
          final children = <Widget>[
            if (p.provisional) ProvisionalBanner(key: const ValueKey('porutham-provisional'), source: p.source),
            if (d.provisional) ProvisionalBanner(key: const ValueKey('dashakoota-provisional'), source: d.source),
            SectionCard(
              title: 'Inputs',
              subtitle: 'Moon nakshatra and rashi of each chart; counts run from the girl\'s star / sign to the boy\'s',
              child: Wrap(spacing: Gap.lg, runSpacing: Gap.md, children: [
                _person('Girl', girl, p.girl),
                _person('Boy', boy, p.boy),
              ]),
            ),
            Wrap(spacing: Gap.lg, runSpacing: Gap.lg, crossAxisAlignment: WrapCrossAlignment.start, children: [
              _systemCard(p, const ValueKey('porutham-table')),
              _systemCard(d, const ValueKey('dashakoota-table')),
            ]),
            SectionCard(
              title: 'Conventions',
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (final n in {...p.conventionNotes, ...d.conventionNotes})
                  Padding(padding: const EdgeInsets.only(bottom: Gap.xs), child: Note(n)),
              ]),
            ),
            const InterpretationArea(),
          ];
          if (!embedded) return PageBody(children: children);
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (final c in children) Padding(padding: const EdgeInsets.only(bottom: Gap.lg), child: c),
          ]);
        },
      ),
    );
  }

  Widget _person(String label, BirthInput b, SouthMatchPersonModel m) => SizedBox(
        width: 520,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$label${b.name == null ? '' : ' — ${b.name}'}', style: const TextStyle(fontWeight: FontWeight.w700)),
          Text('${b.date} ${b.time} · ${b.placeName ?? '${b.latitude}, ${b.longitude}'} · ${b.timezone}', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: Gap.sm),
          KeyValueGrid(items: m.items, columns: 2, keyWidth: 90),
        ]),
      );

  Widget _systemCard(SouthMatchingModel m, Key key) {
    final t = m.table;
    return SizedBox(
      width: 640,
      child: SectionCard(
        key: key,
        title: m.title,
        subtitle: t.subtitle,
        trailing: ExportButtons(tables: () => [t], fileStem: m.system == 'DASHAKOOTA' ? 'Dashakoota' : 'Porutham'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SimpleTable(showActions: false, columns: t.columns, rows: t.rows, title: t.title, highlightRows: m.matchedRows, dense: true),
          const SizedBox(height: Gap.sm),
          Text('Matched ${m.matchedCount} / ${m.totalKootas}', key: ValueKey('${m.system}-count'), style: const TextStyle(fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }
}
