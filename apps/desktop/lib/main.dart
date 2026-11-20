import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'src/state/preferences.dart';
import 'src/theme.dart';
import 'src/ui/shell.dart';
import 'src/util/format.dart' as fmt;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Preferences are loaded before the first frame so the window opens in the user's theme,
  // text size and last section without a flash.
  PrefsStore store;
  Preferences prefs;
  try {
    final dir = await getApplicationSupportDirectory();
    store = FilePrefsStore(File(p.join(dir.path, 'preferences.json')));
    prefs = await store.load();
  } catch (_) {
    store = MemoryPrefsStore();
    prefs = const Preferences();
  }
  runApp(ProviderScope(
    overrides: [prefsStoreProvider.overrideWithValue(store), initialPrefsProvider.overrideWithValue(prefs)],
    child: const AstroDesktopApp(),
  ));
}

class AstroDesktopApp extends ConsumerWidget {
  const AstroDesktopApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(prefsProvider);
    fmt.dateDisplayPattern = prefs.dateStyle.pattern;
    return MaterialApp(
      title: 'Astro Sushil Desktop',
      debugShowCheckedModeBanner: false,
      theme: buildDesktopTheme(),
      darkTheme: buildDesktopTheme(brightness: Brightness.dark),
      themeMode: prefs.themeMode,
      themeAnimationDuration: const Duration(milliseconds: 200),
      builder: (context, child) {
        final mq = MediaQuery.of(context);
        return MediaQuery(data: mq.copyWith(textScaler: TextScaler.linear(prefs.textScale)), child: child!);
      },
      home: const AppShell(),
    );
  }
}
