import 'dart:io';

import 'package:astro_desktop/src/engine/astro_engine.dart';
import 'package:astro_desktop/src/engine/engine_client.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:astro_desktop/src/engine/sidecar_locator.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

void main() {
  group('SidecarLocator', () {
    test('env override wins', () {
      final l = SidecarLocator(environment: {'ASTRO_ENGINE_SIDECAR': '/x/sc'}, resolvedExecutable: '/app/astro_desktop', currentDirectory: '/', fileExists: (_) => false);
      expect(l.locate()!.executable, '/x/sc');
    });
    test('bundled executable next to the app', () {
      final exe = p.join('/opt/astro', 'astro_desktop');
      final want = p.join('/opt/astro', 'engine', SidecarLocator.exeName);
      final l = SidecarLocator(environment: {}, resolvedExecutable: exe, currentDirectory: '/', fileExists: (f) => f == want);
      expect(l.locate()!.executable, want);
    });
    test('dev fallback: finds engine-sidecar sources walking up from cwd', () {
      final l = SidecarLocator(environment: {}, resolvedExecutable: '/nowhere/app', currentDirectory: Directory.current.path);
      final cmd = l.locate();
      expect(cmd, isNotNull);
    });
  });

  // Integration: the real sidecar process, as the app launches it in development.
  final cmd = SidecarLocator(environment: {...Platform.environment}..remove('ASTRO_ENGINE_SIDECAR'), resolvedExecutable: '/nowhere/app').locate();
  test('real sidecar round trip (chart.compute + time.local)', () async {
    final t = await ProcessTransport.start(cmd!.executable, cmd.arguments, workingDirectory: cmd.workingDirectory);
    final engine = AstroEngine(EngineClient(t));
    try {
      const b = BirthInput(date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209);
      final r = await engine.chart(b);
      expect(r.utc, DateTime.utc(1990, 5, 15, 9));
      expect(r.rasi.planets, hasLength(9));
      final lt = await engine.localTime('Asia/Kolkata', DateTime.utc(1990, 5, 15, 9));
      expect((lt.date, lt.time, lt.utcOffsetMinutes), ('1990-05-15', '14:30:00', 330));
      await expectLater(
        engine.chart(b.copyWith(timezone: 'Not/AZone')),
        throwsA(isA<EngineException>().having((e) => e.code, 'code', 'INVALID_PARAMS')),
      );
    } finally {
      await engine.client.dispose();
    }
  }, skip: cmd == null ? 'engine sidecar not available' : false, timeout: const Timeout(Duration(seconds: 60)));
}
