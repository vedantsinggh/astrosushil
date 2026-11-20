import 'dart:io';
import 'dart:ui' show AppExitType;

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:printing/printing.dart';

import '../charts/chart_geometry.dart';
import '../data/chart_file.dart';
import '../engine/inputs.dart';
import '../print/chart_pdf.dart';
import '../state/providers.dart';
import '../util/format.dart';
import 'commands.dart';
import 'dialogs/about_dialog.dart';
import 'dialogs/preferences_dialog.dart';
import 'dialogs/shortcuts_dialog.dart';
import 'sections.dart';
import 'widgets/birth_form.dart';

/// File, print and view commands shared by menus, shortcuts, toolbars and the welcome page.
class AppActions {
  AppActions(this.context, this.ref);
  final BuildContext context;
  final WidgetRef ref;

  static const chartTypes = [XTypeGroup(label: 'Astro Sushil chart', extensions: [ChartFile.extension])];

  /// Test hook: replaces the native open dialog.
  static Future<String?> Function()? debugPickOpenPath;

  /// Test hook: replaces the native save dialog.
  static Future<String?> Function(String suggestedName)? debugPickSavePath;

  /// Shows a short message; a new message replaces the current one instead of queueing.
  void toast(String m) {
    final sm = ScaffoldMessenger.maybeOf(context);
    if (sm == null) return;
    sm.hideCurrentSnackBar();
    sm.showSnackBar(SnackBar(content: Text(m), duration: const Duration(seconds: 4)));
  }

  ChartTab? get _active => ref.read(tabsProvider).active;
  bool get _hasChart => ref.read(tabsProvider).active != null;

  bool enabled(Cmd c) => switch (c) {
        Cmd.save || Cmd.saveAs || Cmd.print || Cmd.exportPdf || Cmd.closeTab || Cmd.editBirth || Cmd.copySummary || Cmd.recalculate => _hasChart,
        Cmd.prevSection || Cmd.nextSection => _hasChart,
        Cmd.nextTab || Cmd.prevTab => ref.read(tabsProvider).tabs.length > 1,
        _ => true,
      };

  Future<void> run(Cmd c) async {
    if (!enabled(c)) return;
    switch (c) {
      case Cmd.newChart:
        return newChart();
      case Cmd.openChart:
        return openChart();
      case Cmd.library:
        ref.read(tabsProvider.notifier).showPage(GlobalPage.library);
      case Cmd.save:
        await save();
      case Cmd.saveAs:
        await saveAs();
      case Cmd.print:
        return print();
      case Cmd.exportPdf:
        return exportPdf();
      case Cmd.closeTab:
        final a = _active;
        if (a != null) await closeTab(a.id);
      case Cmd.quit:
        if (await confirmDiscardAll()) {
          await ref.read(prefsProvider.notifier).flush();
          await ServicesBinding.instance.exitApplication(AppExitType.required);
        }
      case Cmd.editBirth:
        return edit();
      case Cmd.copySummary:
        return copySummary();
      case Cmd.preferences:
        await showPreferencesDialog(context);
      case Cmd.home:
        ref.read(tabsProvider.notifier).showPage(GlobalPage.home);
      case Cmd.prevSection:
      case Cmd.nextSection:
        final nav = Section.navigable;
        final i = nav.indexOf(ref.read(sectionProvider));
        final n = (i + (c == Cmd.nextSection ? 1 : -1)) % nav.length;
        ref.read(tabsProvider.notifier).setSection(nav[n < 0 ? n + nav.length : n]);
      case Cmd.nextTab:
        ref.read(tabsProvider.notifier).cycle(1);
      case Cmd.prevTab:
        ref.read(tabsProvider.notifier).cycle(-1);
      case Cmd.styleNorth:
        _style(ChartStyle.north);
      case Cmd.styleSouth:
        _style(ChartStyle.south);
      case Cmd.styleEast:
        _style(ChartStyle.east);
      case Cmd.toggleTheme:
        final brightness = Theme.of(context).brightness;
        ref.read(prefsProvider.notifier).update((p) => p.copyWith(themeMode: brightness == Brightness.dark ? ThemeMode.light : ThemeMode.dark));
      case Cmd.zoomIn:
        _zoom(0.1);
      case Cmd.zoomOut:
        _zoom(-0.1);
      case Cmd.zoomReset:
        ref.read(prefsProvider.notifier).update((p) => p.copyWith(textScale: 1.0));
      case Cmd.toggleSidebar:
        ref.read(prefsProvider.notifier).update((p) => p.copyWith(sidebarExpanded: !p.sidebarExpanded));
      case Cmd.recalculate:
        final a = _active;
        if (a != null) {
          invalidateChart(ref, a.doc.birth);
          toast('Recalculating ${a.title}…');
        }
      case Cmd.restartEngine:
        ref.read(engineStatusProvider.notifier).manualRestart();
        ref.invalidate(engineProvider);
        toast('Restarting the calculation engine…');
      case Cmd.shortcuts:
        await showShortcutsDialog(context);
      case Cmd.showHint:
        ref.read(prefsProvider.notifier).update((p) => p.copyWith(hintDismissed: false));
        ref.read(tabsProvider.notifier).showPage(GlobalPage.home);
      case Cmd.about:
        await showAstroAboutDialog(context);
    }
  }

  void _style(ChartStyle s) => ref.read(prefsProvider.notifier).update((p) => p.copyWith(chartStyle: s));

  void _zoom(double d) => ref.read(prefsProvider.notifier).update((p) => p.copyWith(textScale: ((p.textScale + d) * 10).roundToDouble() / 10));

  void openSection(Section s) {
    if (!_hasChart) return;
    ref.read(tabsProvider.notifier).setSection(s);
  }

  Future<void> newChart() async {
    final r = await showBirthForm(context, title: 'New chart', submitLabel: 'Create chart');
    if (r == null) return;
    ref.read(tabsProvider.notifier).open(ChartFile(birth: r.birth, gender: r.gender, notes: r.notes), dirty: true);
  }

  Future<void> edit() async {
    final a = _active;
    if (a == null) return;
    final doc = a.doc;
    final r = await showBirthForm(context, initial: doc.birth, gender: doc.gender, notes: doc.notes, title: 'Edit birth details', submitLabel: 'Apply changes');
    if (r == null) return;
    final changed = r.birth != doc.birth || r.gender != doc.gender || r.notes != doc.notes;
    if (!changed) return;
    ref.read(tabsProvider.notifier).updateActive(ChartFile(birth: r.birth, gender: r.gender, notes: r.notes, createdAt: doc.createdAt, path: doc.path), dirty: true);
  }

  Future<void> openPath(String path) async {
    try {
      final f = await ChartFile.load(path);
      ref.read(tabsProvider.notifier).open(f);
      await ref.read(recentProvider.notifier).add(path);
    } catch (e) {
      final missing = !File(path).existsSync();
      toast(missing ? '${p.basename(path)} was moved or deleted. It has been removed from the recent list.' : 'Could not open ${p.basename(path)}: ${_plain(e)}');
      if (missing) await ref.read(recentProvider.notifier).remove(path);
    }
  }

  String _plain(Object e) => e is FormatException ? e.message : '$e';

  Future<void> openChart() async {
    final String? path;
    if (debugPickOpenPath != null) {
      path = await debugPickOpenPath!();
    } else {
      final dir = await ref.read(defaultChartFolderProvider.future);
      final f = await openFile(acceptedTypeGroups: chartTypes, initialDirectory: dir != null && Directory(dir).existsSync() ? dir : null);
      path = f?.path;
    }
    if (path != null) await openPath(path);
  }

  /// Returns true if saved.
  Future<bool> save([int? tabId]) async {
    final tab = tabId == null ? _active : ref.read(tabsProvider).tabs.where((t) => t.id == tabId).firstOrNull;
    if (tab == null) return false;
    if (tab.doc.path == null) return saveAs(tab.id);
    return _write(tab, tab.doc.path!);
  }

  Future<bool> saveAs([int? tabId]) async {
    final tab = tabId == null ? _active : ref.read(tabsProvider).tabs.where((t) => t.id == tabId).firstOrNull;
    if (tab == null) return false;
    final safe = tab.doc.displayName.replaceAll(RegExp(r'[^A-Za-z0-9 _-]'), '').trim();
    final suggested = '${safe.isEmpty ? 'chart' : safe}.${ChartFile.extension}';
    String? path;
    if (debugPickSavePath != null) {
      path = await debugPickSavePath!(suggested);
    } else {
      final dir = await ref.read(defaultChartFolderProvider.future);
      if (dir != null) await Directory(dir).create(recursive: true).catchError((_) => Directory(dir));
      final loc = await getSaveLocation(acceptedTypeGroups: chartTypes, suggestedName: suggested, initialDirectory: dir);
      path = loc?.path;
    }
    if (path == null) return false;
    if (p.extension(path).isEmpty) path = '$path.${ChartFile.extension}';
    return _write(tab, path);
  }

  Future<bool> _write(ChartTab tab, String path) async {
    try {
      final saved = await tab.doc.saveTo(path);
      final n = ref.read(tabsProvider.notifier);
      final prevActive = ref.read(tabsProvider).activeId;
      n.activate(tab.id);
      n.updateActive(saved, dirty: false);
      if (prevActive != null) n.activate(prevActive);
      await ref.read(recentProvider.notifier).add(path);
      ref.invalidate(chartLibraryProvider);
      toast('Saved ${p.basename(path)}');
      return true;
    } catch (e) {
      toast('Could not save: $e');
      return false;
    }
  }

  /// Closes a tab, asking to save unsaved changes first.
  Future<void> closeTab(int id) async {
    final tab = ref.read(tabsProvider).tabs.where((t) => t.id == id).firstOrNull;
    if (tab == null) return;
    if (tab.dirty) {
      final choice = await _askSave([tab]);
      if (choice == null) return;
      if (choice && !await save(tab.id)) return;
    }
    ref.read(tabsProvider.notifier).close(id);
  }

  /// Asks about every unsaved tab before quitting. Returns false to cancel.
  Future<bool> confirmDiscardAll() async {
    final dirty = ref.read(tabsProvider).tabs.where((t) => t.dirty).toList();
    if (dirty.isEmpty) return true;
    final choice = await _askSave(dirty);
    if (choice == null) return false;
    if (choice) {
      for (final t in dirty) {
        if (!await save(t.id)) return false;
      }
    }
    return true;
  }

  /// true = save, false = discard, null = cancel.
  Future<bool?> _askSave(List<ChartTab> tabs) => showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(tabs.length == 1 ? 'Save changes to “${tabs.first.title}”?' : 'Save changes to ${tabs.length} charts?'),
          content: Text(tabs.length == 1
              ? 'This chart has changes that are not saved yet.'
              : 'These charts have changes that are not saved yet:\n${tabs.map((t) => '•  ${t.title}').join('\n')}'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            OutlinedButton(key: const Key('discard'), onPressed: () => Navigator.pop(ctx, false), child: const Text("Don't save")),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
          ],
        ),
      );

  Future<List<int>?> _pdfBytes() async {
    final a = _active;
    if (a == null) return null;
    try {
      final chart = await ref.read(chartResultProvider(a.doc.birth).future);
      final dasha = await ref.read(dashaProvider((a.doc.birth, 'VIMSHOTTARI', 1)).future);
      return await buildChartSummaryPdf(birth: a.doc.birth, chart: chart, style: ref.read(chartStyleProvider), vimshottari: dasha);
    } catch (e) {
      toast('Could not build the PDF: $e');
      return null;
    }
  }

  Future<void> print() async {
    final bytes = await _pdfBytes();
    if (bytes == null) return;
    try {
      await Printing.layoutPdf(onLayout: (_) async => Uint8List.fromList(bytes), name: _active?.title ?? 'chart');
    } catch (e) {
      toast('Printing is not available on this computer. Use Export PDF instead.');
    }
  }

  Future<void> exportPdf() async {
    final a = _active;
    final bytes = await _pdfBytes();
    if (a == null || bytes == null) return;
    final loc = await getSaveLocation(
      suggestedName: '${a.title.replaceAll(RegExp(r'[^A-Za-z0-9 _-]'), '')} - chart summary.pdf',
      acceptedTypeGroups: const [XTypeGroup(label: 'PDF', extensions: ['pdf'])],
    );
    if (loc == null) return;
    await File(loc.path).writeAsBytes(bytes, flush: true);
    toast('Exported ${p.basename(loc.path)}');
  }

  Future<void> copySummary() async {
    final a = _active;
    if (a == null) return;
    try {
      final r = await ref.read(chartResultProvider(a.doc.birth).future);
      final b = a.doc.birth;
      final buf = StringBuffer()
        ..writeln(a.title)
        ..writeln('${civilDate(b.date)} ${b.time} (${b.timezone}, ${offsetLabel(r.utcOffsetMinutes)})')
        ..writeln('${b.placeName ?? ''} ${latLon(b.latitude, b.longitude)}'.trim())
        ..writeln('Ayanamsa ${ayanamsaShort(r.ayanamsaName)} ${dms(r.ayanamsa)}, ${nodeLabel(r.nodeCalculation)}')
        ..writeln()
        ..writeln('Lagna\t${r.rasi.ascendant.sign}\t${dms(r.rasi.ascendant.degree)}\t${r.rasi.ascendant.nakshatra} ${r.rasi.ascendant.pada}');
      for (final pl in r.rasi.planets) {
        buf.writeln('${planetName(pl.name)}\t${pl.sign}\t${dms(pl.degree)}${pl.retrograde ? ' R' : ''}\t${pl.nakshatra} ${pl.pada}\tHouse ${pl.house}');
      }
      await Clipboard.setData(ClipboardData(text: buf.toString()));
      toast('Chart summary copied');
    } catch (e) {
      toast('Could not copy: $e');
    }
  }

  /// A moment at the active chart's place (for forms).
  BirthInput? get activeBirth => _active?.doc.birth;
}
