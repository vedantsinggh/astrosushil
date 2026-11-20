import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/ui/widgets/common.dart';
import '../common/engine_call.dart';
import 'planetary_patyayini_view.dart';
import 'sign_dasha_models.dart';
import 'sign_dasha_view.dart';

/// Extra dasha systems (ADR-016 decision 3): one dropdown over both groups listed by the engine's
/// `dashaExt.list` (sign dashas and planetary dashas), the selected system's period tables below.
/// Systems the engine lists as not implemented are shown with the reason, never computed here.
class DashasExtendedScreen extends ConsumerStatefulWidget {
  const DashasExtendedScreen({super.key, required this.birth, this.initialSystem, this.targetDate});
  final BirthInput birth;

  /// `system` code to select first (e.g. 'SUDASA'); the first implemented system when null.
  final String? initialSystem;
  final DateTime? targetDate;

  @override
  ConsumerState<DashasExtendedScreen> createState() => _DashasExtendedScreenState();
}

class _DashasExtendedScreenState extends ConsumerState<DashasExtendedScreen> {
  String? _key;
  static final _listCall = EngineCall('dashaExt.list', const {});

  @override
  Widget build(BuildContext context) {
    return AsyncView<JsonMap>(
      value: ref.watch(engineCallProvider(_listCall)),
      onRetry: () => ref.invalidate(engineCallProvider(_listCall)),
      builder: (j) {
        final all = dashaExtEntries(j);
        final usable = [for (final e in all) if (e.implemented && e.method != null) e];
        final pending = [for (final e in all) if (!e.implemented) e];
        if (usable.isEmpty) {
          return const EmptyState(icon: Icons.timeline, title: 'No extra dasha systems', message: 'The engine lists no implemented extra dasha systems.');
        }
        final initial = widget.initialSystem == null ? null : usable.where((e) => e.system == widget.initialSystem).firstOrNull;
        final sel = usable.where((e) => e.key == _key).firstOrNull ?? initial ?? usable.first;
        final pendingCard = pending.isEmpty
            ? null
            : SectionCard(
                title: 'Not yet available',
                subtitle: 'Requested systems whose rules could not be fixed from a published source (awaiting client review)',
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  for (final p in pending) Note('${p.name}: ${p.notImplementedReason}'),
                ]),
              );
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            child: ControlBar(children: [
              DropdownButton<String>(
                key: const ValueKey('dashas-ext-system'),
                value: sel.key,
                items: [
                  for (final group in ['SIGN', 'PLANETARY'])
                    for (final e in usable.where((x) => x.group == group))
                      DropdownMenuItem(value: e.key, child: Text('${e.group == 'SIGN' ? 'Sign' : 'Planetary'} · ${e.name}')),
                ],
                onChanged: (v) => setState(() => _key = v),
              ),
            ]),
          ),
          Expanded(
            child: sel.method == 'dashaExt.patyayini'
                // The Patyayini view brings its own scrolling page.
                ? PlanetaryPatyayiniView(key: ValueKey(sel.key), birth: widget.birth)
                : PageBody(children: [
                    SignDashaView(key: ValueKey(sel.key), birth: widget.birth, system: sel.system, method: sel.method!, name: sel.name, targetDate: widget.targetDate),
                    if (pendingCard != null) pendingCard,
                  ]),
          ),
        ]);
      },
    );
  }
}
