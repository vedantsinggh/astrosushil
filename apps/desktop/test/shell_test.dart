import 'package:astro_desktop/src/charts/chart_geometry.dart';
import 'package:astro_desktop/src/charts/chart_view.dart';
import 'package:astro_desktop/src/data/chart_file.dart';
import 'package:astro_desktop/src/data/chart_library.dart';
import 'package:astro_desktop/src/state/providers.dart';
import 'package:astro_desktop/src/ui/dialogs/preferences_dialog.dart';
import 'package:astro_desktop/src/ui/dialogs/shortcuts_dialog.dart';
import 'package:astro_desktop/src/ui/screens/dasha_screen.dart';
import 'package:astro_desktop/src/ui/screens/transit_timeline_screen.dart';
import 'package:astro_desktop/src/ui/shell.dart';
import 'package:astro_desktop/src/ui/widgets/birth_form.dart';
import 'package:astro_desktop/src/ui/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'app_harness.dart';

void main() {
  group('shell', () {
    testWidgets('shows menu bar, labelled sidebar, top bar, status bar and the welcome page', (tester) async {
      final h = Harness(prefs: const Preferences());
      await h.pump(tester);
      for (final m in ['File', 'Edit', 'View', 'Chart', 'Tools', 'Help']) {
        expect(find.byKey(Key('menubar-$m')), findsOneWidget);
      }
      // Every group has a labelled header; folded groups open on click. Every entry has a visible label.
      for (final g in SectionGroup.values) {
        expect(find.byKey(Key('nav-group-${g.name}')), findsOneWidget, reason: g.name);
      }
      await tester.ensureVisible(find.byKey(const Key('nav-group-tables')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('nav-group-tables')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('nav-ephemeris')), findsOneWidget);
      h.container.read(collapsedSidebarGroupsProvider.notifier).state = {};
      await tester.pumpAndSettle();
      for (final s in Section.navigable) {
        expect(find.descendant(of: find.byKey(Key('nav-${s.name}')), matching: find.text(s.label)), findsOneWidget, reason: s.name);
      }
      expect(find.text('Engine ready'), findsOneWidget);
      expect(find.byKey(const Key('first-run-hint')), findsOneWidget);
      expect(find.text('Calculation engine ready'), findsOneWidget);
      await h.finish(tester);
    });

    testWidgets('opening a chart shows its name, date and place and a breadcrumb', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      expect(find.byKey(const Key('topbar-title')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('topbar-title')), matching: find.text('Reference Chart 001')), findsNothing); // Text itself
      expect(tester.widget<Text>(find.byKey(const Key('topbar-title'))).data, 'Reference Chart 001');
      final details = tester.widget<Text>(find.byKey(const Key('topbar-details'))).data!;
      expect(details, contains('15 May 1990'));
      expect(details, contains('New Delhi, India'));
      expect(tester.widget<Text>(find.byKey(const Key('section-title'))).data, 'Chart');
      expect(find.text('Rasi (D1)'), findsOneWidget);
      expect(find.text('Birth data'), findsOneWidget);
      expect(find.byType(ChartLegend), findsWidgets);
      await h.finish(tester);
    });

    testWidgets('every section renders from engine data without errors, in every chart style', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      for (final s in Section.values) {
        h.tabs.setSection(s);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: 'section ${s.name}');
        expect(find.byType(ErrorWidget), findsNothing, reason: 'section ${s.name}');
        expect(find.byType(ErrorPanel), findsNothing, reason: 'section ${s.name}');
      }
      for (final st in ChartStyle.values) {
        h.tabs.setSection(Section.chart);
        h.container.read(prefsProvider.notifier).update((p) => p.copyWith(chartStyle: st));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      }
      await h.finish(tester);
    });

    testWidgets('sidebar navigation changes section; chart sections are disabled with no chart', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await tester.tap(find.byKey(const Key('nav-dashas')));
      await tester.pumpAndSettle();
      expect(h.container.read(tabsProvider).active, isNull); // nothing happened
      await h.openRef(tester);
      await tester.tap(find.byKey(const Key('nav-dashas')));
      await tester.pumpAndSettle();
      expect(h.container.read(sectionProvider), Section.dashas);
      await tester.pump(const Duration(milliseconds: 400)); // saved after a short debounce
      expect(h.store.value.lastSection, 'dashas');
      await h.finish(tester);
    });

    testWidgets('chart hover shows house details', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      final chart = find.byType(ChartView).first;
      final gesture = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await gesture.addPointer(location: Offset.zero);
      final box = tester.getRect(find.descendant(of: chart, matching: find.byType(CustomPaint)).first);
      await gesture.moveTo(Offset(box.center.dx, box.top + box.height * 0.22));
      await tester.pumpAndSettle();
      expect(find.textContaining('house 1 (Lagna)'), findsOneWidget);
      await gesture.removePointer();
      await h.finish(tester);
    });
  });

  group('keyboard shortcuts', () {
    testWidgets('Ctrl+N opens the birth form, F1 the cheat-sheet, Ctrl+, preferences', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await pressShortcut(tester, LogicalKeyboardKey.keyN, ctrl: true);
      expect(find.byType(BirthFormDialog), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      await pressShortcut(tester, LogicalKeyboardKey.f1);
      expect(find.byType(ShortcutsDialog), findsOneWidget);
      expect(find.text('Ctrl+N'), findsOneWidget);
      expect(find.text('Ctrl+Tab  or  Ctrl+PgDn'), findsOneWidget);
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
      await pressShortcut(tester, LogicalKeyboardKey.comma, ctrl: true);
      expect(find.byType(PreferencesDialog), findsOneWidget);
      await h.finish(tester);
    });

    testWidgets('Alt+number jumps to sections, Alt+arrows step through them, Ctrl+= enlarges text', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      await pressShortcut(tester, LogicalKeyboardKey.digit4, alt: true);
      expect(h.container.read(sectionProvider), Section.navigable[3]);
      await pressShortcut(tester, LogicalKeyboardKey.arrowDown, alt: true);
      expect(h.container.read(sectionProvider), Section.navigable[4]);
      await pressShortcut(tester, LogicalKeyboardKey.equal, ctrl: true);
      expect(h.container.read(prefsProvider).textScale, closeTo(1.1, 1e-9));
      await pressShortcut(tester, LogicalKeyboardKey.digit0, ctrl: true);
      expect(h.container.read(prefsProvider).textScale, 1.0);
      await pressShortcut(tester, LogicalKeyboardKey.digit2, ctrl: true, alt: true);
      expect(h.container.read(chartStyleProvider), ChartStyle.south);
      await pressShortcut(tester, LogicalKeyboardKey.keyL, ctrl: true, shift: true);
      expect(h.container.read(prefsProvider).themeMode, ThemeMode.dark);
      await h.finish(tester);
    });
  });

  group('open-chart tabs', () {
    testWidgets('tabs stay open, switch with Ctrl+Tab / Ctrl+number, close with Ctrl+W', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester, name: 'Alpha', path: '/tmp/a.aschart');
      h.tabs.setSection(Section.dashas);
      await h.openRef(tester, name: 'Beta', path: '/tmp/b.aschart');
      expect(h.container.read(tabsProvider).tabs, hasLength(2));
      expect(find.text('Alpha'), findsWidgets);
      expect(find.text('Beta'), findsWidgets);
      // Opening the same file again activates the existing tab.
      h.tabs.open(ChartFile(birth: refBirth, path: '/tmp/a.aschart'));
      await tester.pumpAndSettle();
      expect(h.container.read(tabsProvider).tabs, hasLength(2));
      expect(h.container.read(tabsProvider).active!.title, 'Alpha');
      expect(h.container.read(sectionProvider), Section.dashas); // per-tab section remembered
      await pressShortcut(tester, LogicalKeyboardKey.tab, ctrl: true);
      expect(h.container.read(tabsProvider).active!.title, 'Beta');
      await pressShortcut(tester, LogicalKeyboardKey.digit1, ctrl: true);
      expect(h.container.read(tabsProvider).active!.title, 'Alpha');
      // Both workspaces are mounted (instant switching).
      expect(find.byType(TabWorkspace, skipOffstage: false), findsNWidgets(2));
      await pressShortcut(tester, LogicalKeyboardKey.keyW, ctrl: true);
      expect(h.container.read(tabsProvider).tabs.map((t) => t.title), ['Beta']);
      await h.finish(tester);
    });

    testWidgets('closing an unsaved chart asks first', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester, name: 'Draft', dirty: true);
      final id = h.container.read(tabsProvider).activeId!;
      await tester.tap(find.byKey(Key('tab-close-$id')));
      await tester.pumpAndSettle();
      expect(find.text('Save changes to “Draft”?'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(h.container.read(tabsProvider).tabs, hasLength(1));
      await tester.tap(find.byKey(Key('tab-close-$id')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('discard')));
      await tester.pumpAndSettle();
      expect(h.container.read(tabsProvider).tabs, isEmpty);
      expect(find.byKey(const Key('new-chart')), findsOneWidget); // back to the welcome page
      await h.finish(tester);
    });
  });

  group('welcome flow', () {
    testWidgets('new chart: forgiving date/time entry, keyboard place search, opens a tab', (tester) async {
      final h = Harness(prefs: const Preferences());
      await h.pump(tester);
      await tester.tap(find.byKey(const Key('dismiss-hint')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('first-run-hint')), findsNothing);
      await tester.tap(find.byKey(const Key('new-chart')));
      await tester.pumpAndSettle();

      // Submitting empty shows plain-language messages.
      await tester.tap(find.byKey(const Key('submit')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Please enter the date'), findsOneWidget);
      expect(find.textContaining('Please choose the place from the list'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('name')), 'Asha Rao');
      await tester.enterText(find.byKey(const Key('date')), '15/05/1990');
      await tester.enterText(find.byKey(const Key('time')), '2:30 pm');
      await tester.pumpAndSettle();
      expect(find.textContaining('Tuesday, 15 May 1990 at 14:30:00'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('place')), 'new');
      await tester.pumpAndSettle();
      expect(find.text('Newcastle upon Tyne'), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown); // highlight 2nd option
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp); // back to New Delhi
      await tester.testTextInput.receiveAction(TextInputAction.done); // Enter
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('place-summary')), findsOneWidget);
      expect(find.textContaining('Asia/Kolkata'), findsWidgets);

      await tester.tap(find.byKey(const Key('submit')));
      await tester.pumpAndSettle();
      final tab = h.container.read(tabsProvider).active!;
      expect(tab.doc.birth.date, '1990-05-15');
      expect(tab.doc.birth.time, '14:30:00');
      expect(tab.doc.birth.timezone, 'Asia/Kolkata');
      expect(tab.dirty, isTrue);
      expect(tab.title, 'Asha Rao');
      expect(find.text('Rasi (D1)'), findsOneWidget);
      // the place is remembered for the next chart
      await tester.pump(const Duration(milliseconds: 400));
      expect(h.store.value.lastPlace?['timezone'], 'Asia/Kolkata');
      await h.finish(tester);
    });

    testWidgets('recent charts are listed with their details', (tester) async {
      final h = Harness(recent: ['/charts/Reference Chart 001.aschart']);
      await h.pump(tester);
      expect(find.text('Reference Chart 001'), findsOneWidget);
      expect(find.textContaining('15 May 1990 · 14:30 · New Delhi'), findsOneWidget);
      await h.finish(tester);
    });
  });

  group('preferences', () {
    testWidgets('changes apply live and are saved', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      await pressShortcut(tester, LogicalKeyboardKey.comma, ctrl: true);
      await tester.tap(find.descendant(of: find.byKey(const Key('pref-theme')), matching: find.text('Dark')));
      await tester.pumpAndSettle();
      expect(Theme.of(tester.element(find.byType(AppShell))).brightness, Brightness.dark);
      await tester.tap(find.descendant(of: find.byKey(const Key('pref-style')), matching: find.text('East')));
      await tester.pumpAndSettle();
      expect(h.container.read(chartStyleProvider), ChartStyle.east);
      await tester.tap(find.byKey(const Key('pref-date')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('1990-05-15').last);
      await tester.pumpAndSettle();
      expect(h.container.read(prefsProvider).dateStyle, DateStyle.iso);
      await tester.drag(find.byKey(const Key('pref-scale')), const Offset(300, 0));
      await tester.pumpAndSettle();
      expect(h.container.read(prefsProvider).textScale, Preferences.maxScale);
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(tester.widget<Text>(find.byKey(const Key('topbar-details'))).data, contains('1990-05-15'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(h.store.value.themeMode, ThemeMode.dark);
      expect(h.store.value.chartStyle, ChartStyle.east);
      expect(h.store.value.textScale, Preferences.maxScale);
      await h.finish(tester);
    });

    test('preferences JSON round trip is lenient', () {
      const p = Preferences(chartStyle: ChartStyle.south, themeMode: ThemeMode.dark, textScale: 1.3, dateStyle: DateStyle.dayFirst, libraryFolders: ['/x']);
      final back = Preferences.fromJson(p.toJson());
      expect(back.chartStyle, ChartStyle.south);
      expect(back.themeMode, ThemeMode.dark);
      expect(back.textScale, 1.3);
      expect(back.dateStyle, DateStyle.dayFirst);
      expect(back.libraryFolders, ['/x']);
      final junk = Preferences.fromJson({'chartStyle': 'round', 'textScale': 9, 'libraryFolders': 3});
      expect(junk.chartStyle, ChartStyle.north);
      expect(junk.textScale, Preferences.maxScale);
      expect(junk.libraryFolders, isEmpty);
    });
  });

  group('new screens', () {
    testWidgets('transit timeline: bands, stations and an events table with filters', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      h.tabs.setSection(Section.timeline);
      await tester.pumpAndSettle();
      expect(find.byType(TransitGantt), findsOneWidget);
      expect(find.textContaining('Events ('), findsOneWidget);
      expect(find.textContaining('enters'), findsWidgets);
      final before = find.textContaining('nakshatra').evaluate().length;
      await tester.tap(find.byKey(const Key('timeline-nakshatra')));
      await tester.pumpAndSettle();
      expect(find.textContaining('nakshatra').evaluate().length, greaterThan(before));
      await h.finish(tester);
    });

    testWidgets('dasha timeline graphic with selectable mahadasha and lazy deep levels', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      h.tabs.setSection(Section.dashas);
      await tester.pumpAndSettle();
      expect(find.byType(DashaTimeline), findsOneWidget);
      expect(find.byKey(const Key('dasha-row-1')), findsOneWidget);
      expect(find.byKey(const Key('dasha-row-2')), findsOneWidget);
      // depth 5: level 1-3 eagerly, deeper on demand via dasha.subPeriods
      await tester.tap(find.byKey(const Key('dasha-depth')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Show down to: Prana').last);
      await tester.pumpAndSettle();
      final sent = h.transports.last.sent;
      expect(sent.where((m) => m['method'] == 'dasha.compute').map((m) => (m['params'] as Map)['maxLevel']).toSet(), {3});
      expect(sent.where((m) => m['method'] == 'dasha.subPeriods'), isEmpty);
      await h.finish(tester);
    });

    testWidgets('ashtakavarga shows shodhana and pinda tables from the engine', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      h.tabs.setSection(Section.ashtakavarga);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.byKey(const Key('pinda-card')), 400,
          scrollable: find.descendant(of: find.byType(TabWorkspace), matching: find.byType(Scrollable)).first);
      expect(find.byKey(const Key('shodhana-card')), findsOneWidget);
      expect(find.text('150'), findsOneWidget); // Sun Shodhya Pinda in the fixture
      await h.finish(tester);
    });

    testWidgets('chart database searches and filters saved charts', (tester) async {
      ChartLibraryEntry e(String name, String date, String? g, String place) =>
          ChartLibraryEntry(path: '/c/$name.aschart', file: ChartFile(birth: refBirth.copyWith(name: name, date: date, placeName: place), gender: g), modified: DateTime(2026, 1, 1));
      final h = Harness(library: [e('Asha Rao', '1990-05-15', 'F', 'Pune'), e('Vikram Shah', '1975-02-01', 'M', 'Mumbai'), e('Meera Iyer', '1988-11-30', 'F', 'Chennai')]);
      await h.pump(tester);
      await pressShortcut(tester, LogicalKeyboardKey.keyF, ctrl: true);
      expect(find.text('3 charts'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('library-search')), 'pune');
      await tester.pumpAndSettle();
      expect(find.text('1 of 3 charts match'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('library-search')), '');
      await tester.tap(find.descendant(of: find.byKey(const Key('library-gender')), matching: find.text('Female')));
      await tester.pumpAndSettle();
      expect(find.text('2 of 3 charts match'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('library-from')), '1989');
      await tester.pumpAndSettle();
      expect(find.text('1 of 3 charts match'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('library-to')), '1980');
      await tester.pumpAndSettle();
      expect(find.text('No charts match these filters'), findsOneWidget);
      await h.finish(tester);
    });
  });

  group('engine resilience', () {
    testWidgets('restarts the sidecar automatically after a crash and recomputes', (tester) async {
      final h = Harness();
      await h.pump(tester);
      await h.openRef(tester);
      expect(h.transports, hasLength(1));
      h.transports.first.crash();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.textContaining('stopped unexpectedly'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pumpAndSettle();
      expect(h.transports, hasLength(2));
      expect(h.container.read(engineStatusProvider).phase, EngineRunState.ready);
      expect(find.text('Engine ready'), findsOneWidget);
      expect(find.byType(ErrorPanel), findsNothing);
      expect(h.transports[1].sent.any((m) => m['method'] == 'chart.compute'), isTrue);
      await h.finish(tester);
    });

    testWidgets('gives up after repeated crashes and offers a manual restart', (tester) async {
      final h = Harness();
      await h.pump(tester);
      for (var i = 0; i < 4; i++) {
        h.transports.last.crash();
        await tester.pump(const Duration(milliseconds: 500));
        await tester.pumpAndSettle();
      }
      expect(h.container.read(engineStatusProvider).phase, EngineRunState.failed);
      expect(find.text('Restart engine'), findsOneWidget);
      await tester.tap(find.text('Restart engine'));
      await tester.pumpAndSettle();
      expect(h.container.read(engineStatusProvider).phase, EngineRunState.ready);
      await h.finish(tester);
    });
  });
}
