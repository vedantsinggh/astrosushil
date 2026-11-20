// Renders the main screens to PNG files for visual review.
//   SCREENSHOT_DIR=/some/dir flutter test test/screenshots_test.dart
// Skipped when SCREENSHOT_DIR is not set.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:astro_desktop/src/charts/chart_geometry.dart';
import 'package:astro_desktop/src/data/chart_file.dart';
import 'package:astro_desktop/src/data/chart_library.dart';
import 'package:astro_desktop/src/state/providers.dart';
import 'package:astro_desktop/src/ui/sections.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

import 'app_harness.dart';

final _out = Platform.environment['SCREENSHOT_DIR'];

Future<void> _loadFonts() async {
  // flutter_tester lives in <flutter>/bin/cache/artifacts/engine/<platform>/; fonts in artifacts/material_fonts.
  var dir = p.dirname(Platform.resolvedExecutable);
  while (!Directory(p.join(dir, 'material_fonts')).existsSync() && p.dirname(dir) != dir) {
    dir = p.dirname(dir);
  }
  final fonts = p.join(dir, 'material_fonts');
  Future<void> load(String family, List<String> files) async {
    final loader = FontLoader(family);
    for (final f in files) {
      if (File(f).existsSync()) loader.addFont(Future.value(ByteData.sublistView(File(f).readAsBytesSync())));
    }
    await loader.load();
  }

  await load('Roboto', [for (final w in ['Regular', 'Medium', 'Bold', 'Light', 'Black']) p.join(fonts, 'Roboto-$w.ttf')]);
  await load('MaterialIcons', [p.join(fonts, 'MaterialIcons-Regular.otf')]);
  await load('DejaVu Sans', ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']);
  await load('Noto Sans Devanagari', ['/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf']);
}

Future<void> _shot(WidgetTester tester, Key key, String name) async {
  await tester.pumpAndSettle();
  final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(key));
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1.0);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final f = File(p.join(_out!, '$name.png'));
    await f.parent.create(recursive: true);
    await f.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

void main() {
  setUpAll(() async {
    if (_out != null) await _loadFonts();
  });

  for (final size in const [Size(1280, 800), Size(1920, 1080)]) {
    for (final dark in [false, true]) {
      final tag = '${size.width.toInt()}x${size.height.toInt()}-${dark ? 'dark' : 'light'}';
      testWidgets('screenshots $tag', (tester) async {
        ChartLibraryEntry e(String name, String date, String time, String? g, String place) => ChartLibraryEntry(
            path: '/home/astrologer/Astro Sushil Charts/$name.aschart',
            file: ChartFile(birth: refBirth.copyWith(name: name, date: date, time: time, placeName: place), gender: g),
            modified: DateTime(2026, 11, 18, 10, 24));
        final h = Harness(
          prefs: Preferences(themeMode: dark ? ThemeMode.dark : ThemeMode.light),
          recent: const ['/charts/Reference Chart 001.aschart', '/charts/Asha Rao.aschart', '/charts/Vikram Shah.aschart'],
          library: [
            e('Asha Rao', '1990-05-15', '14:30:00', 'F', 'Pune, Maharashtra, India'),
            e('Vikram Shah', '1975-02-01', '06:12:00', 'M', 'Mumbai, Maharashtra, India'),
            e('Meera Iyer', '1988-11-30', '23:05:00', 'F', 'Chennai, Tamil Nadu, India'),
            e('Rohan Mehta', '2001-08-09', '09:40:00', 'M', 'Ahmedabad, Gujarat, India'),
          ],
        );
        const key = Key('shot');
        await h.pump(tester, size: size, boundaryKey: key);
        await _shot(tester, key, '01-welcome-$tag');

        await h.openRef(tester, path: '/charts/Reference Chart 001.aschart');
        await h.openRef(tester, name: 'Asha Rao', path: '/charts/Asha Rao.aschart', dirty: true);
        h.tabs.activateIndex(0);
        await _shot(tester, key, '02-chart-$tag');

        h.tabs.setSection(Section.dashas);
        await _shot(tester, key, '03-dashas-$tag');

        h.tabs.setSection(Section.timeline);
        await _shot(tester, key, '04-transit-timeline-$tag');

        h.tabs.setSection(Section.ashtakavarga);
        await _shot(tester, key, '05-ashtakavarga-$tag');

        h.container.read(prefsProvider.notifier).update((p) => p.copyWith(chartStyle: ChartStyle.south));
        h.tabs.setSection(Section.vargas);
        await _shot(tester, key, '06-vargas-south-$tag');
        h.container.read(prefsProvider.notifier).update((p) => p.copyWith(chartStyle: ChartStyle.north));

        h.tabs.showPage(GlobalPage.library);
        await _shot(tester, key, '07-chart-database-$tag');

        h.tabs.showChart();
        await pressShortcut(tester, LogicalKeyboardKey.comma, ctrl: true);
        await _shot(tester, key, '08-preferences-$tag');
        await tester.tap(find.text('Done'));
        await pressShortcut(tester, LogicalKeyboardKey.keyN, ctrl: true);
        await _shot(tester, key, '09-new-chart-form-$tag');
        await tester.tap(find.text('Cancel'));
        await pressShortcut(tester, LogicalKeyboardKey.f1);
        await _shot(tester, key, '10-shortcuts-$tag');
        await tester.tap(find.text('Close'));
        await tester.pumpAndSettle();

        // Feature sections added for parity (lib/features/*).
        var n = 11;
        for (final sec in const [
          Section.ephemeris, Section.lagnaRising, Section.transitTables, Section.combustion, Section.sadeSati,
          Section.dashasExtra, Section.dashaPravesh, Section.tajika, Section.strengthGraphs, Section.relationships,
          Section.wheel, Section.vargasExtra, Section.chakras, Section.lalKitab, Section.muhurtaWindows,
          Section.panchangMonth, Section.rectification, Section.horoscopePdf, Section.notes, Section.matching,
          Section.kp, Section.bhavaChalit,
        ]) {
          h.tabs.setSection(sec);
          await _shot(tester, key, '${n++}-${sec.name}-$tag');
        }
        await h.finish(tester);
      }, skip: _out == null);
    }
  }
}
