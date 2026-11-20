import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Screenshot helper for widget tests: loads real fonts (Roboto + Material Icons from the Flutter
/// SDK, Noto Sans from the system for symbols) so offscreen captures are readable, then writes a
/// PNG of the whole test surface. Only active when SCREENSHOT_DIR is set (dart-define).
const screenshotDir = String.fromEnvironment('SCREENSHOT_DIR');

Future<void> loadRealFonts() async {
  if (screenshotDir.isEmpty) return;
  final sdk = Platform.environment['FLUTTER_ROOT'] ?? '/home/pilot/develop/flutter';
  final mf = '$sdk/bin/cache/artifacts/material_fonts';
  Future<void> load(String family, List<String> files) async {
    final l = FontLoader(family);
    for (final f in files) {
      if (File(f).existsSync()) l.addFont(Future.value(ByteData.sublistView(File(f).readAsBytesSync())));
    }
    await l.load();
  }
  await load('Roboto', ['$mf/Roboto-Regular.ttf', '$mf/Roboto-Medium.ttf', '$mf/Roboto-Bold.ttf']);
  // Text with no family falls back to the test font (Ahem); map it to Roboto for readable captures.
  await load('Ahem', ['$mf/Roboto-Regular.ttf', '$mf/Roboto-Medium.ttf']);
  await load('FlutterTest', ['$mf/Roboto-Regular.ttf', '$mf/Roboto-Medium.ttf']);
  await load('MaterialIcons', ['$mf/MaterialIcons-Regular.otf']);
  for (final fam in ['Noto Sans', 'Noto Sans Symbols', 'Noto Sans Symbols2', 'Noto Sans Devanagari', 'Ubuntu', 'Segoe UI', 'Helvetica Neue', 'Arial']) {
    await load(fam, ['/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf', '/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf']);
  }
}

Future<void> capture(WidgetTester tester, String name) async {
  if (screenshotDir.isEmpty) return;
  await tester.runAsync(() async {
    final view = tester.binding.renderViews.first;
    // ignore: invalid_use_of_protected_member
    final layer = view.layer! as OffsetLayer;
    final size = view.size;
    final image = await layer.toImage(Offset.zero & size, pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    File('$screenshotDir/$name.png').writeAsBytesSync(bytes!.buffer.asUint8List());
  });
}
