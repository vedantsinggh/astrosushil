import 'dart:async';
import 'dart:ui' show AppExitResponse;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;

import '../charts/chart_geometry.dart';
import '../engine/inputs.dart';
import '../state/providers.dart';
import '../theme.dart';
import '../util/format.dart';
import 'app_actions.dart';
import 'commands.dart';
import 'screens/library_screen.dart';
import 'screens/welcome_screen.dart';
import 'section_body.dart';
import 'sections.dart';
import 'widgets/brand.dart';

export 'sections.dart';

/// Main window: menu bar, sidebar, chart tabs, top bar, workspace and status bar.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});
  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  late final AppLifecycleListener _lifecycle;
  final _specs = buildCommandSpecs();
  late final Map<ShortcutActivator, Intent> _shortcuts = buildShortcutMap(_specs);

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(onExitRequested: _onExitRequested);
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  Future<AppExitResponse> _onExitRequested() async {
    final ok = await AppActions(context, ref).confirmDiscardAll();
    if (ok) await ref.read(prefsProvider.notifier).flush();
    return ok ? AppExitResponse.exit : AppExitResponse.cancel;
  }

  @override
  Widget build(BuildContext context) {
    final actions = AppActions(context, ref);
    ref.listen<EngineStatus>(engineStatusProvider, (prev, next) {
      if (prev == null) return;
      if (next.phase == EngineRunState.restarting && next.restarts > prev.restarts) {
        actions.toast('The calculation engine stopped unexpectedly and is being restarted. Your charts are safe.');
      } else if (prev.phase == EngineRunState.restarting && next.phase == EngineRunState.ready) {
        actions.toast('The calculation engine is running again.');
      }
    });

    final body = Shortcuts(
      shortcuts: _shortcuts,
      child: Actions(
        actions: {
          CommandIntent: CallbackAction<CommandIntent>(onInvoke: (i) => actions.run(i.cmd)),
          SectionIntent: CallbackAction<SectionIntent>(onInvoke: (i) => actions.openSection(i.section)),
          TabIntent: CallbackAction<TabIntent>(onInvoke: (i) => ref.read(tabsProvider.notifier).activateIndex(i.index)),
        },
        child: Focus(
          autofocus: true,
          child: Scaffold(
            body: Column(children: [
              if (!isMacOS) AppMenuBar(specs: _specs),
              const Expanded(
                child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Sidebar(),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      ChartTabStrip(),
                      TopBar(),
                      Expanded(child: WorkspaceArea()),
                    ]),
                  ),
                ]),
              ),
            ]),
            bottomNavigationBar: const StatusBar(),
          ),
        ),
      ),
    );
    if (!isMacOS) return body;
    return PlatformMenuBar(menus: buildPlatformMenus(_specs, actions, ref), child: body);
  }
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

const _menuOrder = ['File', 'Edit', 'View', 'Chart', 'Tools', 'Help'];

/// In-app menu bar for Windows and Linux.
class AppMenuBar extends ConsumerWidget {
  const AppMenuBar({super.key, required this.specs});
  final List<CommandSpec> specs;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final actions = AppActions(context, ref);
    ref.watch(tabsProvider);
    final prefs = ref.watch(prefsProvider);
    final recent = ref.watch(recentProvider).valueOrNull ?? const [];
    final pal = context.palette;

    Widget item(Cmd c, {Widget? leading, bool checked = false}) {
      final s = specs.firstWhere((x) => x.cmd == c);
      return MenuItemButton(
        key: Key('menu-${c.name}'),
        shortcut: s.shortcut,
        leadingIcon: leading ?? (checked ? const Icon(Icons.check_rounded, size: 18) : Icon(s.icon, size: 18, color: s.icon == null ? Colors.transparent : null)),
        onPressed: actions.enabled(c) ? () => actions.run(c) : null,
        child: Text(s.label),
      );
    }

    final hasChart = ref.read(tabsProvider).active != null;
    final section = ref.read(sectionProvider);
    final nav = Section.navigable;

    final menus = <String, List<Widget>>{
      'File': [
        item(Cmd.newChart),
        item(Cmd.openChart),
        SubmenuButton(
          leadingIcon: const Icon(Icons.history_rounded, size: 18),
          menuChildren: recent.isEmpty
              ? [const MenuItemButton(onPressed: null, child: Text('No recent charts'))]
              : [for (final path in recent.take(10)) MenuItemButton(onPressed: () => actions.openPath(path), child: Text(p.basenameWithoutExtension(path)))],
          child: const Text('Open recent'),
        ),
        item(Cmd.library),
        const Divider(height: 8),
        item(Cmd.save),
        item(Cmd.saveAs),
        const Divider(height: 8),
        item(Cmd.print),
        item(Cmd.exportPdf),
        const Divider(height: 8),
        item(Cmd.closeTab),
        item(Cmd.quit),
      ],
      'Edit': [item(Cmd.editBirth), item(Cmd.copySummary), const Divider(height: 8), item(Cmd.preferences)],
      'View': [
        item(Cmd.home),
        item(Cmd.library),
        const Divider(height: 8),
        item(Cmd.styleNorth, checked: prefs.chartStyle == ChartStyle.north),
        item(Cmd.styleSouth, checked: prefs.chartStyle == ChartStyle.south),
        item(Cmd.styleEast, checked: prefs.chartStyle == ChartStyle.east),
        const Divider(height: 8),
        item(Cmd.toggleTheme),
        item(Cmd.zoomIn),
        item(Cmd.zoomOut),
        item(Cmd.zoomReset),
        item(Cmd.toggleSidebar),
        const Divider(height: 8),
        item(Cmd.nextTab),
        item(Cmd.prevTab),
      ],
      'Chart': [
        for (final g in SectionGroup.values) ...[
          if (g != SectionGroup.values.first) const Divider(height: 8),
          for (final s in nav.where((s) => s.group == g))
            MenuItemButton(
              key: Key('menu-section-${s.name}'),
              leadingIcon: Icon(hasChart && s == section ? Icons.check_rounded : s.icon, size: 18),
              shortcut: nav.indexOf(s) < 9 ? sectionShortcut(nav.indexOf(s)) : null,
              onPressed: hasChart ? () => actions.openSection(s) : null,
              child: Text(s.label),
            ),
        ],
        const Divider(height: 8),
        item(Cmd.prevSection),
        item(Cmd.nextSection),
        item(Cmd.recalculate),
      ],
      'Tools': [
        for (final s in [Section.matching, Section.prashna, Section.eclipses, Section.timeline, Section.ephemeris, Section.lagnaRising, Section.panchangMonth, Section.horoscopePdf, Section.rectification])
          MenuItemButton(leadingIcon: Icon(s.icon, size: 18), onPressed: hasChart ? () => actions.openSection(s) : null, child: Text(s.label)),
        item(Cmd.library),
        const Divider(height: 8),
        item(Cmd.restartEngine),
      ],
      'Help': [item(Cmd.shortcuts), item(Cmd.showHint), const Divider(height: 8), item(Cmd.about)],
    };

    return Container(
      height: 34,
      decoration: BoxDecoration(color: pal.topBar, border: Border(bottom: BorderSide(color: pal.border))),
      child: Row(children: [
        MenuBar(children: [
          for (final m in _menuOrder) SubmenuButton(key: Key('menubar-$m'), menuChildren: menus[m]!, child: Text(m, style: const TextStyle(fontSize: 13.5))),
        ]),
        const Spacer(),
      ]),
    );
  }
}

/// Native macOS menu bar.
List<PlatformMenuItem> buildPlatformMenus(List<CommandSpec> specs, AppActions actions, WidgetRef ref) {
  PlatformMenuItem item(Cmd c) {
    final s = specs.firstWhere((x) => x.cmd == c);
    return PlatformMenuItem(label: s.label, shortcut: s.shortcut, onSelected: actions.enabled(c) ? () => actions.run(c) : null);
  }

  final nav = Section.navigable;
  return [
    PlatformMenu(label: 'Astro Sushil', menus: [
      PlatformMenuItemGroup(members: [item(Cmd.about)]),
      PlatformMenuItemGroup(members: [item(Cmd.preferences)]),
      if (PlatformProvidedMenuItem.hasMenu(PlatformProvidedMenuItemType.quit)) const PlatformProvidedMenuItem(type: PlatformProvidedMenuItemType.quit),
    ]),
    PlatformMenu(label: 'File', menus: [
      PlatformMenuItemGroup(members: [item(Cmd.newChart), item(Cmd.openChart), item(Cmd.library)]),
      PlatformMenuItemGroup(members: [item(Cmd.save), item(Cmd.saveAs)]),
      PlatformMenuItemGroup(members: [item(Cmd.print), item(Cmd.exportPdf)]),
      PlatformMenuItemGroup(members: [item(Cmd.closeTab)]),
    ]),
    PlatformMenu(label: 'Edit', menus: [item(Cmd.editBirth), item(Cmd.copySummary)]),
    PlatformMenu(label: 'View', menus: [
      PlatformMenuItemGroup(members: [item(Cmd.home), item(Cmd.library)]),
      PlatformMenuItemGroup(members: [item(Cmd.styleNorth), item(Cmd.styleSouth), item(Cmd.styleEast)]),
      PlatformMenuItemGroup(members: [item(Cmd.toggleTheme), item(Cmd.zoomIn), item(Cmd.zoomOut), item(Cmd.zoomReset), item(Cmd.toggleSidebar)]),
      PlatformMenuItemGroup(members: [item(Cmd.nextTab), item(Cmd.prevTab)]),
    ]),
    PlatformMenu(label: 'Chart', menus: [
      PlatformMenuItemGroup(members: [
        for (var i = 0; i < nav.length; i++)
          PlatformMenuItem(label: nav[i].label, shortcut: i < 9 ? sectionShortcut(i) : null, onSelected: () => actions.openSection(nav[i])),
      ]),
      PlatformMenuItemGroup(members: [item(Cmd.prevSection), item(Cmd.nextSection), item(Cmd.recalculate)]),
    ]),
    PlatformMenu(label: 'Tools', menus: [item(Cmd.restartEngine)]),
    PlatformMenu(label: 'Help', menus: [item(Cmd.shortcuts), item(Cmd.showHint)]),
  ];
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

class Sidebar extends ConsumerWidget {
  const Sidebar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final tabs = ref.watch(tabsProvider);
    final expanded = ref.watch(prefsProvider.select((p) => p.sidebarExpanded));
    final actions = AppActions(context, ref);
    final hasChart = tabs.active != null;
    final current = tabs.page == null ? tabs.active?.section : null;
    final collapsed = ref.watch(collapsedSidebarGroupsProvider);

    Widget entry({required String label, required IconData icon, required bool selected, required VoidCallback? onTap, String? tooltip, Key? key}) =>
        _SidebarItem(key: key, label: label, icon: icon, selected: selected, onTap: onTap, expanded: expanded, tooltip: tooltip);

    return AnimatedContainer(
      duration: Motion.medium,
      curve: Motion.curve,
      width: expanded ? 236 : 64,
      color: pal.sidebar,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          height: 52,
          padding: EdgeInsets.only(left: expanded ? 14 : 0),
          child: Row(mainAxisAlignment: expanded ? MainAxisAlignment.start : MainAxisAlignment.center, children: [
            if (expanded) ...[const BrandMark(size: 28), const SizedBox(width: 10), const Expanded(child: BrandWordmark(size: 14.5))],
            IconButton(
              key: const Key('nav-collapse'),
              tooltip: '${expanded ? 'Collapse' : 'Expand'} sidebar (${shortcutLabel(primary(LogicalKeyboardKey.keyB))})',
              onPressed: () => actions.run(Cmd.toggleSidebar),
              icon: Icon(expanded ? Icons.keyboard_double_arrow_left_rounded : Icons.keyboard_double_arrow_right_rounded, size: 18, color: pal.sidebarMuted),
            ),
          ]),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            entry(key: const Key('nav-home'), label: GlobalPage.home.label, icon: GlobalPage.home.icon, selected: tabs.page == GlobalPage.home, onTap: () => actions.run(Cmd.home)),
            entry(key: const Key('nav-library'), label: GlobalPage.library.label, icon: GlobalPage.library.icon, selected: tabs.page == GlobalPage.library, onTap: () => actions.run(Cmd.library)),
            for (final g in SectionGroup.values) ...[
              if (expanded)
                _GroupHeader(
                  key: Key('nav-group-${g.name}'),
                  label: g.label,
                  open: !collapsed.contains(g) || current?.group == g,
                  onTap: () => ref.read(collapsedSidebarGroupsProvider.notifier).state = collapsed.contains(g) ? ({...collapsed}..remove(g)) : {...collapsed, g},
                )
              else
                Divider(color: pal.sidebarMuted.withValues(alpha: 0.2), height: 16, indent: 14, endIndent: 14),
              if (!expanded || !collapsed.contains(g) || current?.group == g)
                for (final s in Section.navigable.where((s) => s.group == g))
                  entry(
                    key: Key('nav-${s.name}'),
                    label: s.label,
                    icon: s.icon,
                    selected: current == s,
                    onTap: hasChart ? () => actions.openSection(s) : null,
                    tooltip: hasChart ? s.description : 'Open or create a chart first',
                  ),
            ],
            ]),
          ),
        ),
        Divider(color: pal.sidebarMuted.withValues(alpha: 0.2), height: 1),
        entry(key: const Key('nav-preferences'), label: 'Preferences', icon: Icons.tune_rounded, selected: false, onTap: () => actions.run(Cmd.preferences)),
        entry(key: const Key('nav-shortcuts'), label: 'Shortcuts (F1)', icon: Icons.keyboard_outlined, selected: false, onTap: () => actions.run(Cmd.shortcuts)),
        const SizedBox(height: 6),
      ]),
    );
  }
}

/// Sidebar groups folded in the expanded sidebar (labelled headers; the group holding the current
/// section always stays open). The larger tool groups start folded so the sidebar fits at 1280×800.
final collapsedSidebarGroupsProvider = StateProvider<Set<SectionGroup>>((ref) => {SectionGroup.moreSystems, SectionGroup.tables});

class _GroupHeader extends StatelessWidget {
  const _GroupHeader({super.key, required this.label, required this.open, required this.onTap});
  final String label;
  final bool open;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return Semantics(
      button: true,
      expanded: open,
      label: '$label group',
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 12, 3),
          child: Row(children: [
            Expanded(child: Text(label.toUpperCase(), style: TextStyle(color: pal.sidebarMuted, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.9))),
            Icon(open ? Icons.expand_less_rounded : Icons.expand_more_rounded, size: 16, color: pal.sidebarMuted),
          ]),
        ),
      ),
    );
  }
}

class _SidebarItem extends StatefulWidget {
  const _SidebarItem({super.key, required this.label, required this.icon, required this.selected, required this.onTap, required this.expanded, this.tooltip});
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback? onTap;
  final bool expanded;
  final String? tooltip;

  @override
  State<_SidebarItem> createState() => _SidebarItemState();
}

class _SidebarItemState extends State<_SidebarItem> {
  bool hover = false;
  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final enabled = widget.onTap != null;
    final fg = !enabled ? pal.sidebarMuted.withValues(alpha: 0.5) : (widget.selected ? Colors.white : pal.sidebarText);
    final tile = MouseRegion(
      onEnter: (_) => setState(() => hover = true),
      onExit: (_) => setState(() => hover = false),
      cursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: Motion.fast,
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
          height: 32,
          padding: EdgeInsets.symmetric(horizontal: widget.expanded ? 10 : 0),
          decoration: BoxDecoration(
            color: widget.selected ? pal.sidebarSelected : (hover && enabled ? pal.sidebarSelected.withValues(alpha: 0.5) : Colors.transparent),
            borderRadius: BorderRadius.circular(7),
          ),
          child: Row(mainAxisAlignment: widget.expanded ? MainAxisAlignment.start : MainAxisAlignment.center, children: [
            if (widget.expanded)
              Container(width: 3, height: 18, margin: const EdgeInsets.only(right: 7), decoration: BoxDecoration(color: widget.selected ? DesktopColors.gold : Colors.transparent, borderRadius: BorderRadius.circular(2))),
            Icon(widget.icon, size: 19, color: widget.selected ? DesktopColors.gold : fg),
            if (widget.expanded) ...[
              const SizedBox(width: 12),
              Expanded(
                child: Text(widget.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: fg, fontSize: 13.5, fontWeight: widget.selected ? FontWeight.w700 : FontWeight.w500)),
              ),
            ],
          ]),
        ),
      ),
    );
    final tip = widget.expanded ? widget.tooltip : '${widget.label}${widget.tooltip == null ? '' : '\n${widget.tooltip}'}';
    return Semantics(
      button: true,
      selected: widget.selected,
      enabled: enabled,
      label: widget.label,
      child: tip == null ? tile : Tooltip(message: tip, waitDuration: const Duration(milliseconds: 700), preferBelow: false, child: tile),
    );
  }
}

// ---------------------------------------------------------------------------
// Tabs, top bar
// ---------------------------------------------------------------------------

class ChartTabStrip extends ConsumerWidget {
  const ChartTabStrip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final s = ref.watch(tabsProvider);
    final actions = AppActions(context, ref);
    return Container(
      height: 40,
      decoration: BoxDecoration(color: pal.canvasAlt, border: Border(bottom: BorderSide(color: pal.border))),
      padding: const EdgeInsets.only(left: 8, top: 6),
      child: Row(children: [
        Expanded(
          child: ListView(scrollDirection: Axis.horizontal, children: [
            for (var i = 0; i < s.tabs.length; i++)
              _TabChip(
                key: Key('tab-${s.tabs[i].id}'),
                tab: s.tabs[i],
                index: i,
                active: s.tabs[i].id == s.activeId && s.page == null,
                onTap: () => ref.read(tabsProvider.notifier).activate(s.tabs[i].id),
                onClose: () => actions.closeTab(s.tabs[i].id),
              ),
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 4),
              child: TextButton.icon(
                key: const Key('tab-new'),
                onPressed: actions.newChart,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(s.tabs.isEmpty ? 'New chart' : 'New'),
                style: TextButton.styleFrom(foregroundColor: pal.textMuted, visualDensity: VisualDensity.compact),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _TabChip extends StatefulWidget {
  const _TabChip({super.key, required this.tab, required this.index, required this.active, required this.onTap, required this.onClose});
  final ChartTab tab;
  final int index;
  final bool active;
  final VoidCallback onTap;
  final VoidCallback onClose;
  @override
  State<_TabChip> createState() => _TabChipState();
}

class _TabChipState extends State<_TabChip> {
  bool hover = false;
  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final t = widget.tab;
    final hint = '${t.title}${t.doc.path == null ? ' (not saved yet)' : '\n${t.doc.path}'}${widget.index < 9 ? '\n${shortcutLabel(tabShortcut(widget.index))}' : ''}';
    return Tooltip(
      message: hint,
      waitDuration: const Duration(milliseconds: 800),
      child: MouseRegion(
        onEnter: (_) => setState(() => hover = true),
        onExit: (_) => setState(() => hover = false),
        child: GestureDetector(
          onTap: widget.onTap,
          onTertiaryTapUp: (_) => widget.onClose(),
          child: AnimatedContainer(
            duration: Motion.fast,
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.only(left: 12, right: 4),
            constraints: const BoxConstraints(minWidth: 120, maxWidth: 240),
            decoration: BoxDecoration(
              color: widget.active ? pal.canvas : (hover ? pal.card.withValues(alpha: 0.6) : Colors.transparent),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
              border: widget.active ? Border.all(color: pal.border) : null,
            ),
            foregroundDecoration: widget.active
                ? const BoxDecoration(border: Border(top: BorderSide(color: DesktopColors.gold, width: 2)))
                : null,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.brightness_7_outlined, size: 15, color: widget.active ? pal.accentText : pal.textMuted),
              const SizedBox(width: 8),
              Flexible(
                child: Text(t.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, fontWeight: widget.active ? FontWeight.w700 : FontWeight.w500, color: widget.active ? pal.heading : pal.textMuted)),
              ),
              if (t.dirty)
                Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: Tooltip(message: 'Unsaved changes', child: Container(width: 7, height: 7, decoration: BoxDecoration(color: pal.accentText, shape: BoxShape.circle))),
                ),
              const SizedBox(width: 2),
              IconButton(
                key: Key('tab-close-${t.id}'),
                tooltip: 'Close ${t.title} (${shortcutLabel(primary(LogicalKeyboardKey.keyW))})',
                onPressed: widget.onClose,
                icon: const Icon(Icons.close_rounded, size: 15),
                visualDensity: VisualDensity.compact,
                splashRadius: 14,
                constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                padding: EdgeInsets.zero,
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Chart name, date and place with quick actions; for global pages, the page title.
class TopBar extends ConsumerWidget {
  const TopBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final s = ref.watch(tabsProvider);
    final style = ref.watch(chartStyleProvider);
    ref.watch(prefsProvider.select((p) => p.dateStyle));
    final actions = AppActions(context, ref);
    final tab = s.page == null ? s.active : null;
    final theme = Theme.of(context).textTheme;

    Widget lead;
    List<Widget> trailing;
    if (tab == null) {
      final page = s.page ?? GlobalPage.home;
      lead = Row(children: [
        Icon(page.icon, color: pal.accentText),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(page.label, style: theme.titleLarge),
          Text(page.description, style: theme.bodySmall),
        ]),
      ]);
      trailing = [
        OutlinedButton.icon(onPressed: actions.openChart, icon: const Icon(Icons.folder_open_outlined, size: 18), label: const Text('Open…')),
        const SizedBox(width: 8),
        FilledButton.icon(onPressed: actions.newChart, icon: const Icon(Icons.add_rounded, size: 18), label: const Text('New chart')),
      ];
    } else {
      final b = tab.doc.birth;
      final initials = tab.title.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();
      lead = Row(children: [
        CircleAvatar(radius: 20, backgroundColor: DesktopColors.primary, child: Text(initials.isEmpty ? '?' : initials, style: const TextStyle(color: DesktopColors.gold, fontWeight: FontWeight.w700))),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
            Row(children: [
              Flexible(child: Text(tab.title, key: const Key('topbar-title'), style: theme.titleLarge, maxLines: 1, overflow: TextOverflow.ellipsis)),
              if (tab.dirty) ...[
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: pal.accent.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(10)),
                  child: Text(tab.doc.path == null ? 'Not saved yet' : 'Unsaved changes', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: pal.accentText)),
                ),
              ],
            ]),
            Text(
              '${civilDate(b.date)}  ·  ${b.time}  ·  ${b.placeName ?? latLon(b.latitude, b.longitude)}  ·  ${b.timezone}',
              key: const Key('topbar-details'),
              style: theme.bodySmall?.copyWith(fontSize: 12.5, fontFeatures: tabularFigures),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ]),
        ),
      ]);
      ButtonStyle compact = TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: const EdgeInsets.symmetric(horizontal: 10));
      trailing = [
        Tooltip(message: 'Edit birth details (${shortcutLabel(primary(LogicalKeyboardKey.keyE))})', child: TextButton.icon(style: compact, onPressed: actions.edit, icon: const Icon(Icons.edit_outlined, size: 18), label: const Text('Edit'))),
        Tooltip(message: 'Save (${shortcutLabel(primary(LogicalKeyboardKey.keyS))})', child: TextButton.icon(style: compact, onPressed: () => actions.save(), icon: const Icon(Icons.save_outlined, size: 18), label: const Text('Save'))),
        Tooltip(message: 'Print (${shortcutLabel(primary(LogicalKeyboardKey.keyP))})', child: TextButton.icon(style: compact, onPressed: actions.print, icon: const Icon(Icons.print_outlined, size: 18), label: const Text('Print'))),
        if (MediaQuery.sizeOf(context).width >= 1500) Tooltip(message: 'Export a PDF summary', child: TextButton.icon(style: compact, onPressed: actions.exportPdf, icon: const Icon(Icons.picture_as_pdf_outlined, size: 18), label: const Text('PDF'))),
        const SizedBox(width: 8),
        Tooltip(
          message: 'Chart style',
          child: SegmentedButton<ChartStyle>(
            key: const Key('style-toggle'),
            showSelectedIcon: false,
            segments: [for (final st in ChartStyle.values) ButtonSegment(value: st, label: Text(st.label.split(' ').first))],
            selected: {style},
            onSelectionChanged: (v) => ref.read(prefsProvider.notifier).update((p) => p.copyWith(chartStyle: v.first)),
          ),
        ),
      ];
    }

    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(color: pal.topBar, border: Border(bottom: BorderSide(color: pal.border))),
      child: Row(children: [
        Expanded(child: lead),
        const SizedBox(width: 12),
        ...trailing,
      ]),
    );
  }
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

/// All open tabs stay mounted (offstage when hidden) so switching is instant and each tab keeps
/// its scroll positions and selections. Global pages are shown above them.
class WorkspaceArea extends ConsumerWidget {
  const WorkspaceArea({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(tabsProvider);
    final page = s.page ?? (s.tabs.isEmpty ? GlobalPage.home : null);
    final activeIndex = s.activeIndex;
    return Stack(fit: StackFit.expand, children: [
      if (s.tabs.isNotEmpty)
        Offstage(
          offstage: page != null,
          child: IndexedStack(
            index: activeIndex < 0 ? 0 : activeIndex,
            sizing: StackFit.expand,
            children: [
              for (final t in s.tabs)
                TickerMode(
                  key: ValueKey('tab-workspace-${t.id}'),
                  enabled: t.id == s.activeId && page == null,
                  child: TabWorkspace(tabId: t.id),
                ),
            ],
          ),
        ),
      if (page != null)
        AnimatedSwitcher(
          duration: Motion.medium,
          child: switch (page) {
            GlobalPage.home => const WelcomeScreen(key: ValueKey('home')),
            GlobalPage.library => const LibraryScreen(key: ValueKey('library')),
          },
        ),
    ]);
  }
}

/// One chart's workspace: breadcrumb header and the current section (with a short fade).
class TabWorkspace extends ConsumerWidget {
  const TabWorkspace({super.key, required this.tabId});
  final int tabId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tab = ref.watch(tabsProvider.select((s) => s.tabs.where((t) => t.id == tabId).firstOrNull));
    ref.watch(prefsProvider.select((p) => p.dateStyle)); // rebuild dates when the format changes
    if (tab == null) return const SizedBox.shrink();
    final pal = context.palette;
    final s = tab.section;
    final theme = Theme.of(context).textTheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 14, 24, 2),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text.rich(
            key: const Key('breadcrumb'),
            TextSpan(children: [
              TextSpan(text: tab.title),
              const TextSpan(text: '  ›  '),
              TextSpan(text: s.group.label),
              const TextSpan(text: '  ›  '),
              TextSpan(text: s.label, style: TextStyle(color: pal.heading, fontWeight: FontWeight.w600)),
            ]),
            style: theme.bodySmall,
          ),
          const SizedBox(height: 2),
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(s.label, key: const Key('section-title'), style: theme.headlineSmall),
            const SizedBox(width: 12),
            Expanded(child: Padding(padding: const EdgeInsets.only(bottom: 4), child: Text(s.description, style: theme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis))),
          ]),
        ]),
      ),
      Expanded(
        child: AnimatedSwitcher(
          duration: Motion.medium,
          switchInCurve: Motion.curve,
          transitionBuilder: (child, anim) => FadeTransition(
            opacity: anim,
            child: SlideTransition(position: Tween(begin: const Offset(0, 0.012), end: Offset.zero).animate(anim), child: child),
          ),
          child: KeyedSubtree(
            key: ValueKey('${s.name}-${tab.doc.birth.hashCode}'),
            child: buildSectionBody(ref, s, tab.doc),
          ),
        ),
      ),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

class StatusBar extends ConsumerWidget {
  const StatusBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final status = ref.watch(engineStatusProvider);
    final busy = ref.watch(engineBusyProvider).valueOrNull ?? 0;
    final prefs = ref.watch(prefsProvider);
    final doc = ref.watch(documentProvider);
    final chart = doc == null ? null : ref.watch(chartResultProvider(doc.birth)).valueOrNull;
    // Conventions of the current view, as echoed by the engine: the KP screen uses its own
    // (Placidus) cusps; every other chart view uses the chart's house system.
    final onKp = doc != null && ref.watch(sectionProvider) == Section.kp;
    final kp = onKp ? ref.watch(kpProvider(doc.birth)).valueOrNull : null;
    final calcText = chart == null
        ? null
        : '${ayanamsaShort(kp?.ayanamsaType ?? chart.ayanamsaName)} ayanamsa  ·  '
            '${houseSystemLabel(onKp ? (kp?.cuspSystem ?? CalcOptions.defaultKpCuspSystem) : chart.houseSystem)} houses  ·  '
            '${nodeLabel(chart.nodeCalculation)}';
    final st = TextStyle(fontSize: 12, color: pal.textMuted);

    final (Color dot, String text) = switch (status.phase) {
      EngineRunState.starting => (pal.warning, 'Starting calculation engine…'),
      EngineRunState.ready => busy > 0 ? (pal.accent, 'Calculating…') : (pal.success, 'Engine ready'),
      EngineRunState.restarting => (pal.warning, 'Restarting calculation engine…'),
      EngineRunState.failed => (pal.error, status.message ?? 'Calculation engine stopped'),
    };

    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(color: pal.canvasAlt, border: Border(top: BorderSide(color: pal.border))),
      child: Row(children: [
        Container(key: const Key('engine-dot'), width: 8, height: 8, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Flexible(child: Text(text, key: const Key('engine-status'), style: st, maxLines: 1, overflow: TextOverflow.ellipsis)),
        if (status.phase == EngineRunState.failed) ...[
          const SizedBox(width: 8),
          TextButton(
            style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: const EdgeInsets.symmetric(horizontal: 8)),
            onPressed: () => AppActions(context, ref).run(Cmd.restartEngine),
            child: const Text('Restart engine'),
          ),
        ],
        if (busy > 0 && status.phase == EngineRunState.ready) ...[
          const SizedBox(width: 8),
          const SizedBox(width: 60, child: LinearProgressIndicator(minHeight: 2)),
        ],
        const Spacer(),
        if (calcText != null) Flexible(child: Text(calcText, key: const Key('calc-status'), style: st, maxLines: 1, overflow: TextOverflow.ellipsis)),
        const SizedBox(width: 16),
        Text('Text ${(prefs.textScale * 100).round()}%', style: st),
        const SizedBox(width: 16),
        Text('F1  Shortcuts', style: st),
      ]),
    );
  }
}
