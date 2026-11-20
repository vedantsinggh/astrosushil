import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../charts/chart_data.dart';
import '../../charts/chart_geometry.dart';
import '../../charts/chart_view.dart';
import '../../engine/inputs.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../sections.dart';

Future<void> showPreferencesDialog(BuildContext context) => showDialog<void>(context: context, builder: (_) => const PreferencesDialog());

/// Preferences apply immediately (live preview) and are saved automatically.
class PreferencesDialog extends ConsumerWidget {
  const PreferencesDialog({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(prefsProvider);
    final n = ref.read(prefsProvider.notifier);
    final pal = context.palette;
    // Allowed calculation options come from the engine (`engine.info` → `options`).
    final info = ref.watch(engineInfoProvider).valueOrNull;
    final engineOptions = info?['options'] is Map ? (info!['options'] as Map).cast<String, Object?>() : const <String, Object?>{};
    List<String> allowed(String field, String current) {
      final v = engineOptions[field];
      final list = v is List ? v.whereType<String>().toList() : <String>[];
      return list.contains(current) ? list : [...list, current];
    }

    const sample = ChartData(title: 'Preview', ascSign: 5, bodies: {
      5: [ChartBody('As', highlight: true, code: 'LAGNA')],
      1: [ChartBody('Su', code: 'SUN'), ChartBody('Me', code: 'MERCURY')],
      9: [ChartBody('Ju', code: 'JUPITER', retrograde: true)],
      4: [ChartBody('Mo', code: 'MOON')],
    });

    Widget row(String label, String help, Widget control) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
            SizedBox(
              width: 200,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                Text(help, style: TextStyle(color: pal.textMuted, fontSize: 12)),
              ]),
            ),
            const SizedBox(width: Gap.lg),
            Expanded(child: Align(alignment: Alignment.centerLeft, child: FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: control))),
          ]),
        );

    return AlertDialog(
      title: const Row(children: [Icon(Icons.tune_rounded), SizedBox(width: 10), Text('Preferences')]),
      content: SizedBox(
        width: 880,
        child: SingleChildScrollView(
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                row(
                  'Chart style',
                  'How charts are drawn',
                  SegmentedButton<ChartStyle>(
                    key: const Key('pref-style'),
                    showSelectedIcon: false,
                    segments: [for (final s in ChartStyle.values) ButtonSegment(value: s, label: Text(s.label.split(' ').first))],
                    selected: {prefs.chartStyle},
                    onSelectionChanged: (s) => n.update((p) => p.copyWith(chartStyle: s.first)),
                  ),
                ),
                row(
                  'Theme',
                  'Light, dark, or follow the system',
                  SegmentedButton<ThemeMode>(
                    key: const Key('pref-theme'),
                    showSelectedIcon: false,
                    segments: const [
                      ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode_outlined, size: 16), label: Text('Light')),
                      ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode_outlined, size: 16), label: Text('Dark')),
                      ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.computer_outlined, size: 16), label: Text('System')),
                    ],
                    selected: {prefs.themeMode},
                    onSelectionChanged: (s) => n.update((p) => p.copyWith(themeMode: s.first)),
                  ),
                ),
                row(
                  'Text size',
                  'Make everything easier to read',
                  Row(children: [
                    SizedBox(
                      width: 220,
                      child: Slider(
                        key: const Key('pref-scale'),
                        min: Preferences.minScale,
                        max: Preferences.maxScale,
                        divisions: 6,
                        value: prefs.textScale,
                        label: '${(prefs.textScale * 100).round()}%',
                        onChanged: (v) => n.update((p) => p.copyWith(textScale: (v * 10).roundToDouble() / 10)),
                      ),
                    ),
                    SizedBox(width: 52, child: Text('${(prefs.textScale * 100).round()}%', style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: tabularFigures))),
                    TextButton(onPressed: () => n.update((p) => p.copyWith(textScale: 1.0)), child: const Text('Reset')),
                  ]),
                ),
                row(
                  'Date format',
                  'Used in tables and summaries',
                  DropdownButton<DateStyle>(
                    key: const Key('pref-date'),
                    value: prefs.dateStyle,
                    items: [for (final d in DateStyle.values) DropdownMenuItem(value: d, child: Text(d.example))],
                    onChanged: (d) => n.update((p) => p.copyWith(dateStyle: d)),
                  ),
                ),
                row(
                  'Open charts at',
                  'Section shown when a chart opens',
                  DropdownButton<String>(
                    key: const Key('pref-section'),
                    value: prefs.defaultSection,
                    items: [
                      const DropdownMenuItem(value: 'last', child: Text('The last section I used')),
                      for (final s in Section.navigable) DropdownMenuItem(value: s.name, child: Text(s.label)),
                    ],
                    onChanged: (v) => n.update((p) => p.copyWith(defaultSection: v)),
                  ),
                ),
                const SizedBox(height: Gap.md),
                Text('Calculation', key: const Key('pref-calculation'), style: Theme.of(context).textTheme.titleMedium),
                Text(
                  'Used for every chart. Changing them recalculates the open charts.',
                  style: TextStyle(color: pal.textMuted, fontSize: 12),
                ),
                row(
                  'Ayanamsa',
                  'Sidereal zodiac offset',
                  DropdownButton<String>(
                    key: const Key('pref-ayanamsa'),
                    value: prefs.ayanamsa,
                    items: [for (final a in allowed('ayanamsa', prefs.ayanamsa)) DropdownMenuItem(value: a, child: Text(ayanamsaLabel(a)))],
                    onChanged: info == null ? null : (v) => n.update((p) => p.copyWith(ayanamsa: v)),
                  ),
                ),
                row(
                  'Rahu / Ketu',
                  'Mean or true (osculating) lunar node',
                  SegmentedButton<String>(
                    key: const Key('pref-node'),
                    showSelectedIcon: false,
                    segments: [
                      for (final v in allowed('nodeType', prefs.nodeType))
                        ButtonSegment(value: v, label: Text(v == CalcOptions.defaultNodeType ? '${nodeLabel(v)} (default)' : nodeLabel(v))),
                    ],
                    selected: {prefs.nodeType},
                    onSelectionChanged: info == null ? null : (s) => n.update((p) => p.copyWith(nodeType: s.first)),
                  ),
                ),
                Text(
                  'Panchang, eclipses, Prashna and the transit timeline always use Lahiri.',
                  style: TextStyle(color: pal.textMuted, fontSize: 12),
                ),
              ]),
            ),
            const SizedBox(width: Gap.lg),
            Column(children: [
              Text('Preview', style: Theme.of(context).textTheme.labelSmall),
              const SizedBox(height: 6),
              ChartView(data: sample, style: prefs.chartStyle, size: 190, showTitle: false, interactive: false),
            ]),
          ]),
        ),
      ),
      actions: [
        TextButton(onPressed: () => n.update((_) => const Preferences().copyWith(libraryFolders: prefs.libraryFolders, hintDismissed: prefs.hintDismissed)), child: const Text('Restore defaults')),
        FilledButton(autofocus: true, onPressed: () => Navigator.pop(context), child: const Text('Done')),
      ],
    );
  }
}
