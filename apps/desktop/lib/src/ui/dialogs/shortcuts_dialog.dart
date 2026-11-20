import 'package:flutter/material.dart';

import '../../theme.dart';
import '../commands.dart';
import '../sections.dart';

/// Keyboard shortcut cheat-sheet (F1).
Future<void> showShortcutsDialog(BuildContext context) => showDialog<void>(context: context, builder: (_) => const ShortcutsDialog());

class ShortcutsDialog extends StatelessWidget {
  const ShortcutsDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final specs = buildCommandSpecs().where((s) => s.shortcut != null).toList();
    final groups = <String, List<(String, String)>>{};
    for (final s in specs) {
      groups.putIfAbsent(s.group, () => []).add((s.label.replaceAll('…', ''), [s.shortcut!, ...s.altShortcuts].map(shortcutLabel).join('  or  ')));
    }
    final nav = Section.navigable;
    groups['Go to'] = [
      for (var i = 0; i < 9 && i < nav.length; i++) (nav[i].label, shortcutLabel(sectionShortcut(i))),
      ('Chart tab 1 … 9', '${shortcutLabel(tabShortcut(0))} … ${shortcutLabel(tabShortcut(8))}'),
    ];
    groups['Charts and tables'] = [
      ('Details of a house or planet', 'Hover, or right-click'),
      ('Copy a table value, row or table', 'Right-click the table'),
      ('Resize side-by-side panes', 'Drag the divider'),
      ('Select a place in the birth form', '↑ / ↓ then Enter'),
    ];
    return AlertDialog(
      title: const Row(children: [Icon(Icons.keyboard_outlined), SizedBox(width: 10), Text('Keyboard shortcuts')]),
      content: SizedBox(
        width: 820,
        height: 560,
        child: Scrollbar(
          child: SingleChildScrollView(
            child: Wrap(spacing: 28, runSpacing: 20, children: [
              for (final e in groups.entries) SizedBox(width: 380, child: _Group(title: e.key, rows: e.value)),
            ]),
          ),
        ),
      ),
      actions: [FilledButton(autofocus: true, onPressed: () => Navigator.pop(context), child: const Text('Close'))],
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.title, required this.rows});
  final String title;
  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title.toUpperCase(), style: Theme.of(context).textTheme.labelSmall),
      const SizedBox(height: 6),
      for (final (label, keys) in rows)
        Container(
          padding: const EdgeInsets.symmetric(vertical: 5),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: pal.border.withValues(alpha: 0.6)))),
          child: Row(children: [
            Expanded(flex: 3, child: Text(label, style: const TextStyle(fontSize: 13.5))),
            const SizedBox(width: 8),
            Flexible(
              flex: 2,
              child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: pal.canvasAlt, border: Border.all(color: pal.border), borderRadius: BorderRadius.circular(5)),
              child: Text(keys, textAlign: TextAlign.right, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: pal.heading)),
              ),
            ),
          ]),
        ),
    ]);
  }
}
