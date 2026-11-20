import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;

import '../data/chart_file.dart';
import '../ui/sections.dart';
import 'preferences.dart';

/// One open chart. Results for its birth data stay cached in the engine providers, and its
/// widget subtree stays alive while other tabs are shown, so switching is instant.
class ChartTab {
  const ChartTab({required this.id, required this.doc, required this.section, this.dirty = false});
  final int id;
  final ChartFile doc;
  final Section section;

  /// Edited since the last save (or never saved).
  final bool dirty;

  String get title => doc.displayName;

  ChartTab copyWith({ChartFile? doc, Section? section, bool? dirty}) =>
      ChartTab(id: id, doc: doc ?? this.doc, section: section ?? this.section, dirty: dirty ?? this.dirty);
}

class TabsState {
  const TabsState({this.tabs = const [], this.activeId, this.page = GlobalPage.home});
  final List<ChartTab> tabs;
  final int? activeId;

  /// When non-null a global page (home, chart database) is shown instead of the active tab.
  final GlobalPage? page;

  ChartTab? get active => tabs.where((t) => t.id == activeId).firstOrNull;
  int get activeIndex => tabs.indexWhere((t) => t.id == activeId);
  bool get showingChart => page == null && active != null;

  TabsState copyWith({List<ChartTab>? tabs, int? activeId, GlobalPage? page, bool clearPage = false, bool clearActive = false}) => TabsState(
        tabs: tabs ?? this.tabs,
        activeId: clearActive ? null : (activeId ?? this.activeId),
        page: clearPage ? null : (page ?? this.page),
      );
}

class TabsNotifier extends Notifier<TabsState> {
  int _nextId = 1;

  @override
  TabsState build() => const TabsState();

  Section _openingSection() {
    final prefs = ref.read(prefsProvider);
    final name = prefs.defaultSection == 'last' ? prefs.lastSection : prefs.defaultSection;
    return Section.byName(name) ?? Section.chart;
  }

  /// Opens [doc] in a new tab, or activates the tab that already has the same file.
  int open(ChartFile doc, {Section? section, bool dirty = false}) {
    if (doc.path != null) {
      final existing = state.tabs.where((t) => t.doc.path != null && p.equals(t.doc.path!, doc.path!)).firstOrNull;
      if (existing != null) {
        state = state.copyWith(activeId: existing.id, clearPage: true);
        return existing.id;
      }
    }
    final tab = ChartTab(id: _nextId++, doc: doc, section: section ?? _openingSection(), dirty: dirty);
    state = state.copyWith(tabs: [...state.tabs, tab], activeId: tab.id, clearPage: true);
    return tab.id;
  }

  void activate(int id) {
    if (state.tabs.any((t) => t.id == id)) state = state.copyWith(activeId: id, clearPage: true);
  }

  void activateIndex(int index) {
    if (index >= 0 && index < state.tabs.length) activate(state.tabs[index].id);
  }

  /// Cycles through open tabs (wraps around).
  void cycle(int delta) {
    if (state.tabs.isEmpty) return;
    final i = state.activeIndex < 0 ? 0 : state.activeIndex;
    activateIndex((i + delta) % state.tabs.length);
  }

  void close(int id) {
    final i = state.tabs.indexWhere((t) => t.id == id);
    if (i < 0) return;
    final tabs = [...state.tabs]..removeAt(i);
    if (tabs.isEmpty) {
      state = const TabsState(page: GlobalPage.home);
      return;
    }
    final wasActive = state.activeId == id;
    final nextActive = wasActive ? tabs[i.clamp(0, tabs.length - 1)].id : state.activeId;
    state = state.copyWith(tabs: tabs, activeId: nextActive);
  }

  void _replace(int id, ChartTab Function(ChartTab t) f) {
    state = state.copyWith(tabs: [for (final t in state.tabs) t.id == id ? f(t) : t]);
  }

  void setSection(Section s) {
    final a = state.active;
    if (a == null) return;
    _replace(a.id, (t) => t.copyWith(section: s));
    state = state.copyWith(clearPage: true);
    if (s != Section.about) ref.read(prefsProvider.notifier).update((p) => p.copyWith(lastSection: s.name));
  }

  /// Replaces the active tab's document (edit birth data, save, save as).
  void updateActive(ChartFile doc, {required bool dirty}) {
    final a = state.active;
    if (a == null) return;
    _replace(a.id, (t) => t.copyWith(doc: doc, dirty: dirty));
  }

  void showPage(GlobalPage page) => state = state.copyWith(page: page);

  void showChart() {
    if (state.active != null) state = state.copyWith(clearPage: true);
  }
}

final tabsProvider = NotifierProvider<TabsNotifier, TabsState>(TabsNotifier.new);

/// The active chart document (null when no chart is open).
final documentProvider = Provider<ChartFile?>((ref) => ref.watch(tabsProvider.select((s) => s.active?.doc)));

/// The active tab's section.
final sectionProvider = Provider<Section>((ref) => ref.watch(tabsProvider.select((s) => s.active?.section ?? Section.chart)));
