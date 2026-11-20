import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/chart_library.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../app_actions.dart';
import '../widgets/common.dart';

/// Chart database: search and filter saved charts (recent files plus chart folders).
class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});
  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  final _search = TextEditingController();
  final _from = TextEditingController();
  final _to = TextEditingController();
  LibraryQuery q = const LibraryQuery();
  int? _selected;

  @override
  void dispose() {
    _search.dispose();
    _from.dispose();
    _to.dispose();
    super.dispose();
  }

  Future<void> _addFolder() async {
    final dir = await getDirectoryPath(confirmButtonText: 'Use this folder');
    if (dir == null) return;
    ref.read(prefsProvider.notifier).update((p) => p.copyWith(libraryFolders: {...p.libraryFolders, dir}.toList()));
  }

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final lib = ref.watch(chartLibraryProvider);
    final folders = ref.watch(prefsProvider.select((p) => p.libraryFolders));
    final defFolder = ref.watch(defaultChartFolderProvider).valueOrNull;
    final actions = AppActions(context, ref);

    final filters = ControlBar(children: [
      SizedBox(
        width: 340,
        child: TextField(
          key: const Key('library-search'),
          controller: _search,
          autofocus: true,
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.search_rounded),
            hintText: 'Search name, place, notes or date',
            suffixIcon: _search.text.isEmpty ? null : IconButton(tooltip: 'Clear search', icon: const Icon(Icons.close_rounded), onPressed: () => setState(() {
                  _search.clear();
                  q = q.copyWith(text: '');
                })),
          ),
          onChanged: (v) => setState(() => q = q.copyWith(text: v)),
        ),
      ),
      SegmentedButton<String?>(
        key: const Key('library-gender'),
        showSelectedIcon: false,
        segments: const [ButtonSegment(value: null, label: Text('Everyone')), ButtonSegment(value: 'M', label: Text('Male')), ButtonSegment(value: 'F', label: Text('Female'))],
        selected: {q.gender},
        onSelectionChanged: (s) => setState(() => q = s.first == null ? q.copyWith(clearGender: true) : q.copyWith(gender: s.first)),
      ),
      SizedBox(
        width: 110,
        child: TextField(
          key: const Key('library-from'),
          controller: _from,
          decoration: const InputDecoration(labelText: 'Born from', hintText: 'year', isDense: true),
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4)],
          onChanged: (v) => setState(() => q = v.length == 4 ? q.copyWith(fromYear: int.parse(v)) : q.copyWith(clearFrom: true)),
        ),
      ),
      SizedBox(
        width: 110,
        child: TextField(
          key: const Key('library-to'),
          controller: _to,
          decoration: const InputDecoration(labelText: 'to', hintText: 'year', isDense: true),
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4)],
          onChanged: (v) => setState(() => q = v.length == 4 ? q.copyWith(toYear: int.parse(v)) : q.copyWith(clearTo: true)),
        ),
      ),
      DropdownButton<LibrarySort>(
        value: q.sort,
        items: [for (final s in LibrarySort.values) DropdownMenuItem(value: s, child: Text('Sort: ${s.label}'))],
        onChanged: (s) => setState(() => q = q.copyWith(sort: s)),
      ),
      TextButton.icon(
        onPressed: () => setState(() => q = q.copyWith(descending: !q.descending)),
        icon: Icon(q.descending ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded, size: 18),
        label: Text(q.descending ? 'Descending' : 'Ascending'),
      ),
      TextButton.icon(onPressed: () => ref.invalidate(chartLibraryProvider), icon: const Icon(Icons.refresh_rounded, size: 18), label: const Text('Refresh')),
    ]);

    return PageBody(children: [
      filters,
      AsyncView(
        value: lib,
        onRetry: () => ref.invalidate(chartLibraryProvider),
        builder: (res) {
          final rows = q.apply(res.entries);
          if (res.entries.isEmpty) {
            return Card(
              child: EmptyState(
                icon: Icons.folder_copy_outlined,
                title: 'No saved charts found',
                message: 'Charts you save appear here. You can also add a folder that already contains .aschart files.',
                actions: [
                  FilledButton.icon(onPressed: actions.newChart, icon: const Icon(Icons.add_rounded), label: const Text('New chart')),
                  OutlinedButton.icon(onPressed: _addFolder, icon: const Icon(Icons.create_new_folder_outlined), label: const Text('Add a chart folder…')),
                ],
              ),
            );
          }
          return SectionCard(
            title: q.isFiltered ? '${rows.length} of ${res.entries.length} charts match' : '${res.entries.length} charts',
            subtitle: 'Double-click or press Enter on a row to open it. Right-click for more.',
            trailing: res.skipped > 0 ? Text('${res.skipped} unreadable file(s) skipped', style: TextStyle(color: pal.warning, fontSize: 12)) : null,
            child: rows.isEmpty
                ? EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'No charts match these filters',
                    message: 'Try fewer words or clear the year range.',
                    actions: [
                      TextButton(
                        onPressed: () => setState(() {
                          _search.clear();
                          _from.clear();
                          _to.clear();
                          q = LibraryQuery(sort: q.sort, descending: q.descending);
                        }),
                        child: const Text('Clear all filters'),
                      ),
                    ],
                  )
                : _LibraryTable(
                    rows: rows,
                    selected: _selected,
                    onSelect: (i) => setState(() => _selected = i),
                    onOpen: (e) => actions.openPath(e.path),
                  ),
          );
        },
      ),
      SectionCard(
        title: 'Chart folders',
        subtitle: 'Recent charts and every .aschart file in these folders are included.',
        trailing: OutlinedButton.icon(onPressed: _addFolder, icon: const Icon(Icons.create_new_folder_outlined, size: 18), label: const Text('Add folder…')),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (defFolder != null) _FolderRow(path: defFolder, note: 'default save folder'),
          for (final f in folders)
            _FolderRow(
              path: f,
              onRemove: () => ref.read(prefsProvider.notifier).update((p) => p.copyWith(libraryFolders: p.libraryFolders.where((x) => x != f).toList())),
            ),
        ]),
      ),
    ]);
  }
}

class _FolderRow extends StatelessWidget {
  const _FolderRow({required this.path, this.note, this.onRemove});
  final String path;
  final String? note;
  final VoidCallback? onRemove;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Icon(Icons.folder_outlined, size: 18, color: context.palette.textMuted),
          const SizedBox(width: 8),
          Expanded(child: SelectableText(path, style: const TextStyle(fontSize: 13))),
          if (note != null) Text(note!, style: Theme.of(context).textTheme.bodySmall),
          if (onRemove != null) TextButton(onPressed: onRemove, child: const Text('Remove')),
        ]),
      );
}

class _LibraryTable extends ConsumerWidget {
  const _LibraryTable({required this.rows, required this.selected, required this.onSelect, required this.onOpen});
  final List<ChartLibraryEntry> rows;
  final int? selected;
  final ValueChanged<int> onSelect;
  final ValueChanged<ChartLibraryEntry> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final head = TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: pal.heading);
    const widths = [260.0, 120.0, 80.0, 260.0, 70.0, 140.0];
    Widget cell(String t, double w, {TextStyle? style, bool right = false}) => SizedBox(
          width: w,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            child: Text(t, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: right ? TextAlign.right : TextAlign.left, style: style),
          ),
        );
    final sel = selected != null && selected! < rows.length ? selected : null;
    return Focus(
      autofocus: false,
      onKeyEvent: (node, e) {
        if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
        if (e.logicalKey == LogicalKeyboardKey.arrowDown) {
          onSelect(((sel ?? -1) + 1).clamp(0, rows.length - 1));
          return KeyEventResult.handled;
        }
        if (e.logicalKey == LogicalKeyboardKey.arrowUp) {
          onSelect(((sel ?? 1) - 1).clamp(0, rows.length - 1));
          return KeyEventResult.handled;
        }
        if (e.logicalKey == LogicalKeyboardKey.enter && sel != null) {
          onOpen(rows[sel]);
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: Container(
        decoration: BoxDecoration(border: Border.all(color: pal.border), borderRadius: BorderRadius.circular(6)),
        clipBehavior: Clip.antiAlias,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              color: pal.tableHeader,
              child: Row(children: [
                for (final (i, h) in ['Name', 'Birth date', 'Time', 'Place', 'Gender', 'Last changed'].indexed) cell(h, widths[i], style: head),
              ]),
            ),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 520),
              child: SizedBox(
                width: widths.reduce((a, b) => a + b),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: rows.length,
                  itemBuilder: (context, i) {
                    final e = rows[i];
                    final b = e.file.birth;
                    final selectedRow = i == sel;
                    return GestureDetector(
                      key: Key('library-row-$i'),
                      onTap: () {
                        Focus.of(context).requestFocus();
                        onSelect(i);
                      },
                      onDoubleTap: () => onOpen(e),
                      onSecondaryTapUp: (d) => _menu(context, d.globalPosition, e),
                      child: Container(
                        color: selectedRow ? pal.highlightRow : (i.isOdd ? pal.zebra : pal.card),
                        child: Row(children: [
                          cell(e.name, widths[0], style: const TextStyle(fontWeight: FontWeight.w600)),
                          cell(civilDate(b.date), widths[1], style: const TextStyle(fontFeatures: tabularFigures)),
                          cell(b.time.length >= 5 ? b.time.substring(0, 5) : b.time, widths[2], style: const TextStyle(fontFeatures: tabularFigures)),
                          cell(e.place, widths[3]),
                          cell(switch (e.file.gender) { 'M' => 'Male', 'F' => 'Female', _ => '—' }, widths[4]),
                          cell(localDateTime(e.modified.toUtc(), e.modified.timeZoneOffset.inMinutes), widths[5], style: TextStyle(color: pal.textMuted, fontFeatures: tabularFigures)),
                        ]),
                      ),
                    );
                  },
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _menu(BuildContext context, Offset pos, ChartLibraryEntry e) async {
    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    final c = await showMenu<String>(
      context: context,
      position: RelativeRect.fromRect(pos & const Size(1, 1), Offset.zero & overlay.size),
      items: const [
        PopupMenuItem(value: 'open', child: Text('Open')),
        PopupMenuItem(value: 'copy', child: Text('Copy file location')),
      ],
    );
    if (c == 'open') onOpen(e);
    if (c == 'copy') await Clipboard.setData(ClipboardData(text: e.path));
  }
}
