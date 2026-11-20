import 'package:flutter/foundation.dart' show defaultTargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'sections.dart';

/// Every user command. Menus, keyboard shortcuts, the shortcut cheat-sheet and toolbar buttons
/// all use this one list, so labels and shortcuts are always consistent.
enum Cmd {
  newChart,
  openChart,
  library,
  save,
  saveAs,
  print,
  exportPdf,
  closeTab,
  quit,
  editBirth,
  copySummary,
  preferences,
  home,
  prevSection,
  nextSection,
  nextTab,
  prevTab,
  styleNorth,
  styleSouth,
  styleEast,
  toggleTheme,
  zoomIn,
  zoomOut,
  zoomReset,
  toggleSidebar,
  recalculate,
  restartEngine,
  shortcuts,
  showHint,
  about,
}

bool get isMacOS => defaultTargetPlatform == TargetPlatform.macOS;

/// Ctrl on Windows/Linux, Cmd on macOS.
SingleActivator primary(LogicalKeyboardKey key, {bool shift = false, bool alt = false}) =>
    SingleActivator(key, control: !isMacOS, meta: isMacOS, shift: shift, alt: alt);

class CommandSpec {
  const CommandSpec(this.cmd, this.label, this.group, {this.shortcut, this.altShortcuts = const [], this.icon, this.help});
  final Cmd cmd;
  final String label;
  final String group; // menu / cheat-sheet group
  final SingleActivator? shortcut;
  final List<SingleActivator> altShortcuts;
  final IconData? icon;
  final String? help;
}

List<CommandSpec> buildCommandSpecs() => [
      CommandSpec(Cmd.newChart, 'New chart…', 'File', shortcut: primary(LogicalKeyboardKey.keyN), icon: Icons.add_rounded, help: 'Enter birth details for a new chart'),
      CommandSpec(Cmd.openChart, 'Open chart…', 'File', shortcut: primary(LogicalKeyboardKey.keyO), icon: Icons.folder_open_outlined, help: 'Open a saved .aschart file'),
      CommandSpec(Cmd.library, 'Chart database', 'File', shortcut: primary(LogicalKeyboardKey.keyF), icon: Icons.folder_copy_outlined, help: 'Search and filter saved charts'),
      CommandSpec(Cmd.save, 'Save', 'File', shortcut: primary(LogicalKeyboardKey.keyS), icon: Icons.save_outlined),
      CommandSpec(Cmd.saveAs, 'Save as…', 'File', shortcut: primary(LogicalKeyboardKey.keyS, shift: true), icon: Icons.save_as_outlined),
      CommandSpec(Cmd.print, 'Print…', 'File', shortcut: primary(LogicalKeyboardKey.keyP), icon: Icons.print_outlined),
      CommandSpec(Cmd.exportPdf, 'Export PDF…', 'File', shortcut: primary(LogicalKeyboardKey.keyE, shift: true), icon: Icons.picture_as_pdf_outlined),
      CommandSpec(Cmd.closeTab, 'Close chart', 'File', shortcut: primary(LogicalKeyboardKey.keyW), icon: Icons.close_rounded),
      CommandSpec(Cmd.quit, isMacOS ? 'Quit Astro Sushil' : 'Exit', 'File', shortcut: primary(LogicalKeyboardKey.keyQ), icon: Icons.logout_rounded),
      CommandSpec(Cmd.editBirth, 'Edit birth details…', 'Edit', shortcut: primary(LogicalKeyboardKey.keyE), icon: Icons.edit_outlined),
      CommandSpec(Cmd.copySummary, 'Copy chart summary', 'Edit', shortcut: primary(LogicalKeyboardKey.keyC, shift: true), icon: Icons.content_copy_rounded, help: 'Birth data and planet positions as text'),
      CommandSpec(Cmd.preferences, 'Preferences…', 'Edit', shortcut: primary(LogicalKeyboardKey.comma), icon: Icons.tune_rounded),
      CommandSpec(Cmd.home, 'Home', 'View', shortcut: primary(LogicalKeyboardKey.keyH, shift: true), icon: Icons.home_outlined),
      const CommandSpec(Cmd.prevSection, 'Previous section', 'View', shortcut: SingleActivator(LogicalKeyboardKey.arrowUp, alt: true), icon: Icons.keyboard_arrow_up_rounded),
      const CommandSpec(Cmd.nextSection, 'Next section', 'View', shortcut: SingleActivator(LogicalKeyboardKey.arrowDown, alt: true), icon: Icons.keyboard_arrow_down_rounded),
      CommandSpec(Cmd.nextTab, 'Next chart tab', 'View',
          shortcut: const SingleActivator(LogicalKeyboardKey.tab, control: true), altShortcuts: [primary(LogicalKeyboardKey.pageDown)]),
      CommandSpec(Cmd.prevTab, 'Previous chart tab', 'View',
          shortcut: const SingleActivator(LogicalKeyboardKey.tab, control: true, shift: true), altShortcuts: [primary(LogicalKeyboardKey.pageUp)]),
      CommandSpec(Cmd.styleNorth, 'North Indian chart', 'View', shortcut: primary(LogicalKeyboardKey.digit1, alt: true)),
      CommandSpec(Cmd.styleSouth, 'South Indian chart', 'View', shortcut: primary(LogicalKeyboardKey.digit2, alt: true)),
      CommandSpec(Cmd.styleEast, 'East Indian chart', 'View', shortcut: primary(LogicalKeyboardKey.digit3, alt: true)),
      CommandSpec(Cmd.toggleTheme, 'Switch light / dark theme', 'View', shortcut: primary(LogicalKeyboardKey.keyL, shift: true), icon: Icons.dark_mode_outlined),
      CommandSpec(Cmd.zoomIn, 'Larger text', 'View', shortcut: primary(LogicalKeyboardKey.equal), altShortcuts: [primary(LogicalKeyboardKey.numpadAdd)], icon: Icons.text_increase_rounded),
      CommandSpec(Cmd.zoomOut, 'Smaller text', 'View', shortcut: primary(LogicalKeyboardKey.minus), altShortcuts: [primary(LogicalKeyboardKey.numpadSubtract)], icon: Icons.text_decrease_rounded),
      CommandSpec(Cmd.zoomReset, 'Normal text size', 'View', shortcut: primary(LogicalKeyboardKey.digit0)),
      CommandSpec(Cmd.toggleSidebar, 'Show / hide sidebar labels', 'View', shortcut: primary(LogicalKeyboardKey.keyB), icon: Icons.view_sidebar_outlined),
      const CommandSpec(Cmd.recalculate, 'Recalculate', 'Chart', shortcut: SingleActivator(LogicalKeyboardKey.f5), icon: Icons.refresh_rounded, help: 'Ask the engine to compute this chart again'),
      const CommandSpec(Cmd.restartEngine, 'Restart calculation engine', 'Tools', icon: Icons.restart_alt_rounded),
      CommandSpec(Cmd.shortcuts, 'Keyboard shortcuts', 'Help',
          shortcut: const SingleActivator(LogicalKeyboardKey.f1), altShortcuts: [primary(LogicalKeyboardKey.slash)], icon: Icons.keyboard_outlined),
      const CommandSpec(Cmd.showHint, 'Show getting-started tips', 'Help', icon: Icons.lightbulb_outline),
      const CommandSpec(Cmd.about, 'About Astro Sushil Desktop', 'Help', icon: Icons.info_outline),
    ];

/// Shortcut for jumping to the n-th section (Alt+1 … Alt+9) of [Section.navigable].
SingleActivator sectionShortcut(int index) => SingleActivator(LogicalKeyboardKey(LogicalKeyboardKey.digit1.keyId + index), alt: true);

/// Shortcut for jumping to the n-th open chart tab (Ctrl/Cmd+1 … 9).
SingleActivator tabShortcut(int index) => primary(LogicalKeyboardKey(LogicalKeyboardKey.digit1.keyId + index));

/// Human-readable label for an activator, e.g. "Ctrl+Shift+S" / "⌘⇧S".
String shortcutLabel(SingleActivator a) {
  final parts = <String>[];
  if (isMacOS) {
    if (a.control) parts.add('⌃');
    if (a.alt) parts.add('⌥');
    if (a.shift) parts.add('⇧');
    if (a.meta) parts.add('⌘');
  } else {
    if (a.control) parts.add('Ctrl');
    if (a.alt) parts.add('Alt');
    if (a.shift) parts.add('Shift');
    if (a.meta) parts.add('Win');
  }
  final k = a.trigger;
  final name = switch (k) {
    LogicalKeyboardKey.equal => '=',
    LogicalKeyboardKey.minus => '−',
    LogicalKeyboardKey.comma => ',',
    LogicalKeyboardKey.slash => '/',
    LogicalKeyboardKey.arrowUp => '↑',
    LogicalKeyboardKey.arrowDown => '↓',
    LogicalKeyboardKey.pageUp => 'PgUp',
    LogicalKeyboardKey.pageDown => 'PgDn',
    LogicalKeyboardKey.numpadAdd => 'Num +',
    LogicalKeyboardKey.numpadSubtract => 'Num −',
    _ => k.keyLabel.length == 1 ? k.keyLabel.toUpperCase() : k.keyLabel,
  };
  parts.add(name);
  return isMacOS ? parts.join() : parts.join('+');
}

/// Intent carrying a command; handled by the shell's [Actions].
class CommandIntent extends Intent {
  const CommandIntent(this.cmd);
  final Cmd cmd;
}

class SectionIntent extends Intent {
  const SectionIntent(this.section);
  final Section section;
}

class TabIntent extends Intent {
  const TabIntent(this.index);
  final int index;
}

/// All key bindings (commands, sections, tabs).
Map<ShortcutActivator, Intent> buildShortcutMap(List<CommandSpec> specs) {
  final map = <ShortcutActivator, Intent>{};
  for (final s in specs) {
    if (s.shortcut != null) map[s.shortcut!] = CommandIntent(s.cmd);
    for (final a in s.altShortcuts) {
      map[a] = CommandIntent(s.cmd);
    }
  }
  final nav = Section.navigable;
  for (var i = 0; i < 9 && i < nav.length; i++) {
    map[sectionShortcut(i)] = SectionIntent(nav[i]);
  }
  for (var i = 0; i < 9; i++) {
    map[tabShortcut(i)] = TabIntent(i);
  }
  return map;
}
