import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../common/engine_call.dart';
import '../common/interpretation_area.dart';
import '../common/provisional.dart';
import '../common/table_pdf.dart';
import 'sign_dasha_models.dart';

/// Mahadasha / Antardasha / Pratyantardasha tables of one extra dasha system, as computed by the
/// engine (`dashaExt.sign.compute`, or the planetary group's `dashaExt.planetary.compute`). The
/// active period at [targetDate] (default now) is highlighted; tapping a row drills down.
class SignDashaView extends ConsumerStatefulWidget {
  const SignDashaView({super.key, required this.birth, required this.system, this.method = 'dashaExt.sign.compute', this.name = '', this.targetDate});
  final BirthInput birth;
  final String system;
  final String method;
  final String name;
  final DateTime? targetDate;

  @override
  ConsumerState<SignDashaView> createState() => _SignDashaViewState();
}

class _SignDashaViewState extends ConsumerState<SignDashaView> {
  int? _md;
  int? _ad;

  bool get _isSign => widget.method == 'dashaExt.sign.compute';
  String get _target => (widget.targetDate ?? DateTime.now()).toUtc().toIso8601String().substring(0, 10);

  EngineCall get _call => EngineCall(widget.method, {
        'birth': widget.birth.toJson(),
        'system': widget.system,
        // Planetary trees are small, so they come with Pratyantardashas; sign trees fetch them per Antardasha.
        'maxLevel': _isSign ? 2 : 3,
        'targetDate': _target,
      });

  @override
  void didUpdateWidget(SignDashaView old) {
    super.didUpdateWidget(old);
    if (old.system != widget.system || old.method != widget.method) {
      _md = null;
      _ad = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final call = _call;
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(call)),
      onRetry: () => ref.invalidate(engineCallProvider(call)),
      builder: (j) {
        final t = DashaExtTree.fromJson(j, fallbackName: widget.name);
        if (t.periods.isEmpty) return const EmptyState(icon: Icons.timeline, title: 'No periods returned', message: 'The engine returned no dasha periods for this system.');
        final active = t.activeIndex;
        final md = (_md ?? (active >= 0 ? active : 0)).clamp(0, t.periods.length - 1);
        final mdp = t.periods[md];
        final activeAd = mdp.subPeriods.indexWhere((p) => p.isActive);
        final ad = mdp.subPeriods.isEmpty ? null : (_ad ?? (activeAd >= 0 ? activeAd : 0)).clamp(0, mdp.subPeriods.length - 1);
        final mdTable = t.periodTable('${t.systemName} – Mahadashas', t.periods, subtitle: t.currentPath.isEmpty ? '' : 'Running at $_target: ${t.currentPath}');
        final adTable = mdp.subPeriods.isEmpty ? null : t.periodTable('Antardashas of ${mdp.label}', mdp.subPeriods);
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (t.provisional) ProvisionalBanner(source: t.source, label: t.label),
          const SizedBox(height: Gap.md),
          if (t.facts.isNotEmpty) ...[
            SectionCard(title: 'Calculation basis', child: KeyValueGrid(items: t.facts, columns: 1, keyWidth: 150)),
            const SizedBox(height: Gap.md),
          ],
          SectionCard(
            title: mdTable.title,
            subtitle: mdTable.subtitle,
            trailing: ExportButtons(tables: () => [mdTable, if (adTable != null) adTable], fileStem: 'Dasha_${widget.system}'),
            child: SimpleTable(showActions: false, 
              key: const ValueKey('sign-dasha-md-table'),
              columns: mdTable.columns,
              rows: mdTable.rows,
              title: mdTable.title,
              numericColumns: const {0, 3, 4},
              highlightRows: {if (active >= 0) active},
              selectedRow: md,
              onRowTap: (r) => setState(() {
                _md = r;
                _ad = null;
              }),
              dense: true,
            ),
          ),
          if (adTable != null) ...[
            const SizedBox(height: Gap.md),
            SectionCard(
              title: adTable.title,
              subtitle: 'Select a Mahadasha above; tap an Antardasha for its Pratyantardashas',
              child: SimpleTable(showActions: false, 
                key: const ValueKey('sign-dasha-ad-table'),
                columns: adTable.columns,
                rows: adTable.rows,
                title: adTable.title,
                numericColumns: const {0, 4},
                highlightRows: {for (var i = 0; i < mdp.subPeriods.length; i++) if (mdp.subPeriods[i].isActive) i},
                selectedRow: ad,
                onRowTap: (r) => setState(() => _ad = r),
                dense: true,
              ),
            ),
          ],
          if (ad != null) ...[
            const SizedBox(height: Gap.md),
            _isSign
                ? _PratyantarFetched(birth: widget.birth, system: widget.system, target: _target, path: [md, ad], tree: t, title: 'Pratyantardashas of ${mdp.label} – ${mdp.subPeriods[ad].label}')
                : _PratyantarTable(tree: t, list: mdp.subPeriods[ad].subPeriods, title: 'Pratyantardashas of ${mdp.label} – ${mdp.subPeriods[ad].label}'),
          ],
          const SizedBox(height: Gap.sm),
          for (final n in t.notes) Note(n),
          const InterpretationArea(),
        ]);
      },
    );
  }
}

class _PratyantarFetched extends ConsumerWidget {
  const _PratyantarFetched({required this.birth, required this.system, required this.target, required this.path, required this.tree, required this.title});
  final BirthInput birth;
  final String system;
  final String target;
  final List<int> path;
  final DashaExtTree tree;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final call = EngineCall('dashaExt.sign.subPeriods', {'birth': birth.toJson(), 'system': system, 'path': path, 'targetDate': target});
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(call)),
      onRetry: () => ref.invalidate(engineCallProvider(call)),
      builder: (j) => _PratyantarTable(tree: tree, list: [for (final p in asMapList(j['periods'])) DashaExtPeriod.fromJson(p)], title: title),
    );
  }
}

class _PratyantarTable extends StatelessWidget {
  const _PratyantarTable({required this.tree, required this.list, required this.title});
  final DashaExtTree tree;
  final List<DashaExtPeriod> list;
  final String title;

  @override
  Widget build(BuildContext context) {
    if (list.isEmpty) return const SizedBox.shrink();
    final table = tree.periodTable(title, list);
    return SectionCard(
      title: table.title,
      child: SimpleTable(showActions: false, 
        key: const ValueKey('sign-dasha-pd-table'),
        columns: table.columns,
        rows: table.rows,
        title: table.title,
        numericColumns: const {0, 4},
        highlightRows: {for (var i = 0; i < list.length; i++) if (list[i].isActive) i},
        dense: true,
      ),
    );
  }
}
