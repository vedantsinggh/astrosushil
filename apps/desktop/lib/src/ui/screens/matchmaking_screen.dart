import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../features/matching_south/matching_south_screen.dart';

import '../../data/chart_file.dart';
import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../widgets/birth_form.dart';
import '../widgets/common.dart';

class MatchmakingScreen extends ConsumerStatefulWidget {
  const MatchmakingScreen({super.key, required this.document});
  final ChartFile document;
  @override
  ConsumerState<MatchmakingScreen> createState() => _MatchmakingScreenState();
}

class _MatchmakingScreenState extends ConsumerState<MatchmakingScreen> {
  BirthInput? partner;
  late bool currentIsBoy = widget.document.gender != 'F';
  bool south = false;

  Future<void> _enterPartner() async {
    final r = await showBirthForm(context, initial: partner, title: 'Partner birth details');
    if (r != null) setState(() => partner = r.birth);
  }

  Future<void> _openPartner() async {
    final f = await openFile(acceptedTypeGroups: const [XTypeGroup(label: 'Astro Sushil chart', extensions: [ChartFile.extension])]);
    if (f == null) return;
    try {
      final c = await ChartFile.load(f.path);
      setState(() => partner = c.birth);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not open: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = widget.document.birth;
    return PageBody(children: [
      SectionCard(
        title: 'Matching with a partner chart',
        child: Wrap(spacing: 12, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Text('Current chart (${me.name ?? 'Untitled'}) is the'),
          SegmentedButton<bool>(
            segments: const [ButtonSegment(value: true, label: Text('Boy')), ButtonSegment(value: false, label: Text('Girl'))],
            selected: {currentIsBoy},
            onSelectionChanged: (s) => setState(() => currentIsBoy = s.first),
          ),
          FilledButton.tonal(onPressed: _enterPartner, child: Text(partner == null ? 'Enter partner…' : 'Edit partner (${partner!.name ?? partner!.date})')),
          OutlinedButton(onPressed: _openPartner, child: const Text('Open partner chart…')),
        ]),
      ),
      if (partner != null)
        SegmentedButton<bool>(
          key: const Key('matching-system'),
          segments: const [
            ButtonSegment(value: false, label: Text('North Indian: Ashtakoota')),
            ButtonSegment(value: true, label: Text('South Indian: Porutham and Dashakoota')),
          ],
          selected: {south},
          onSelectionChanged: (s) => setState(() => south = s.first),
        ),
      if (partner != null && !south)
        AsyncView(
          value: ref.watch(matchProvider(currentIsBoy ? (me, partner!) : (partner!, me))),
          builder: (m) => MatchView(m: m),
        ),
      if (partner != null && south) MatchingSouthScreen(boy: currentIsBoy ? me : partner!, girl: currentIsBoy ? partner! : me, embedded: true),
    ]);
  }
}

class MatchView extends StatelessWidget {
  const MatchView({super.key, required this.m});
  final MatchModel m;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SectionCard(
          title: 'Guna Milan: ${m.total.toStringAsFixed(1)} / ${m.max.toStringAsFixed(0)}'
              '${m.effective != m.total ? '  (after engine dosha cancellations: ${m.effective.toStringAsFixed(1)})' : ''}',
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            KeyValueGrid(items: [('Boy Moon', m.boyMoon), ('Girl Moon', m.girlMoon)]),
            const SizedBox(height: 8),
            SimpleTable(
              columns: const ['Koota', 'Obtained', 'Maximum', 'Area'],
              numericColumns: const {1, 2},
              rows: [for (final k in m.kootas) [k.name, k.obtained.toStringAsFixed(1), k.maxPoints.toStringAsFixed(0), k.description]],
            ),
          ]),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: 'Mangal (Kuja) placement check',
          child: KeyValueGrid(columns: 1, items: [
            ('Boy', '${m.boyManglik.status}${m.boyManglik.cancellations.isEmpty ? '' : ' — ${m.boyManglik.cancellations.join('; ')}'}'),
            ('Girl', '${m.girlManglik.status}${m.girlManglik.cancellations.isEmpty ? '' : ' — ${m.girlManglik.cancellations.join('; ')}'}'),
          ]),
        ),
        const Padding(
          padding: EdgeInsets.only(top: 6),
          child: Text('Scores are computed by the engine (Ashtakoota tables in packages/astrology-engine/src/matchmaking).', style: TextStyle(fontSize: 11.5)),
        ),
      ]);
}
