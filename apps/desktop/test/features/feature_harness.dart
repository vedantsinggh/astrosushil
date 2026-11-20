import 'package:astro_desktop/src/engine/astro_engine.dart';
import 'package:astro_desktop/src/engine/engine_client.dart';
import 'package:astro_desktop/src/state/providers.dart';
import 'package:astro_desktop/src/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers.dart';

/// Pumps a feature screen inside the app theme with a fake engine answering [handler].
/// Returns the fake transport so tests can inspect the requests sent.
Future<FakeTransport> pumpFeature(WidgetTester tester, Widget screen, Object? Function(String method, Map<String, Object?> params) handler,
    {Size size = const Size(1500, 1000)}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final transport = FakeTransport(handler: handler);
  final engine = AstroEngine(EngineClient(transport));
  await tester.pumpWidget(ProviderScope(
    overrides: [engineProvider.overrideWith((ref) async => engine)],
    child: MaterialApp(theme: buildDesktopTheme(), home: Scaffold(body: screen)),
  ));
  await tester.pumpAndSettle();
  return transport;
}
