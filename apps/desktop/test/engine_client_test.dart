
import 'package:astro_desktop/src/engine/astro_engine.dart';
import 'package:astro_desktop/src/engine/engine_client.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

const birth = BirthInput(name: 'Reference Chart 001', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209);

void main() {
  test('waits for ready, then sends NDJSON requests with incrementing ids', () async {
    final t = FakeTransport(handler: (m, p) => {'pong': true});
    final c = EngineClient(t);
    expect((await c.ready)['protocolVersion'], 1);
    expect(await c.call('ping'), {'pong': true});
    await c.call('ping');
    expect(t.sent.map((m) => m['id']), [1, 2]);
    expect(t.sent.first['method'], 'ping');
  });

  test('correlates out-of-order responses by id', () async {
    final t = FakeTransport();
    final c = EngineClient(t);
    final a = c.call('a');
    final b = c.call('b');
    await c.ready;
    await Future<void>.delayed(Duration.zero);
    t.emit({'id': 2, 'ok': true, 'result': 'B'});
    t.emit({'id': 1, 'ok': true, 'result': 'A'});
    expect(await a, 'A');
    expect(await b, 'B');
  });

  test('maps protocol errors to EngineException and ignores junk lines', () async {
    final t = FakeTransport(handler: (m, p) => throw EngineException('INVALID_PARAMS', 'bad date'));
    final c = EngineClient(t);
    t.emitRaw('not json');
    await expectLater(c.call('chart.compute'), throwsA(isA<EngineException>().having((e) => e.code, 'code', 'INVALID_PARAMS')));
  });

  test('rejects an incompatible protocol version', () async {
    final c = EngineClient(FakeTransport(protocolVersion: 99));
    await expectLater(c.ready, throwsA(isA<EngineException>().having((e) => e.code, 'code', 'PROTOCOL_MISMATCH')));
  });

  test('fails pending calls when the sidecar exits', () async {
    final t = FakeTransport();
    final c = EngineClient(t);
    await c.ready;
    final f = c.call('slow');
    await Future<void>.delayed(Duration.zero);
    t.crash();
    await expectLater(f, throwsA(isA<EngineException>().having((e) => e.code, 'code', 'SIDECAR_EXITED')));
    expect(c.isClosed, isTrue);
  });

  test('AstroEngine sends the documented params', () async {
    final t = FakeTransport(handler: fixtureHandler);
    final e = AstroEngine(EngineClient(t));
    await e.chart(birth);
    await e.dasha(birth, 'YOGINI', maxLevel: 2);
    await e.localTime('Asia/Kolkata', DateTime.utc(2024, 6, 21, 6, 30));
    // Every request carries the calculation options (engine defaults unless chosen otherwise).
    expect(t.sent[0]['params'], {'birth': birth.toJson(), 'options': {'ayanamsa': 'LAHIRI', 'nodeType': 'MEAN_NODE'}});
    final dp = t.sent[1]['params'] as Map;
    expect(dp['system'], 'YOGINI');
    expect(dp['maxLevel'], 2);
    expect(t.sent[2]['params'], {'timezone': 'Asia/Kolkata', 'utcIso': '2024-06-21T06:30:00.000Z', 'options': {'ayanamsa': 'LAHIRI', 'nodeType': 'MEAN_NODE'}});
  });

  test('withOptions sends the chosen options on every request and keeps one process', () async {
    final t = FakeTransport(handler: fixtureHandler);
    final base = AstroEngine(EngineClient(t));
    const kp = CalcOptions(ayanamsa: 'KP', nodeType: 'TRUE_NODE');
    final e = base.withOptions(kp);
    expect(e.client, same(base.client));
    expect(base.withOptions(const CalcOptions()), same(base));
    await e.kp(birth);
    await e.raw('vargasExtra.compute', {'birth': birth.toJson()});
    for (final r in t.sent) {
      expect((r['params'] as Map)['options'], {'ayanamsa': 'KP', 'nodeType': 'TRUE_NODE'}, reason: '${r['method']}');
    }
  });

  test('a Placidus-undefined calculation error is recognised by reason or by message', () async {
    final t = FakeTransport(handler: (m, p) => throw EngineException('CALCULATION_ERROR', 'Placidus house cusps are undefined at latitude 69.6500°', reason: 'PLACIDUS_UNDEFINED_AT_LATITUDE'));
    final e = AstroEngine(EngineClient(t));
    await expectLater(e.kp(birth), throwsA(isA<EngineException>().having((x) => x.reason, 'reason', 'PLACIDUS_UNDEFINED_AT_LATITUDE').having((x) => x.isPlacidusUndefined, 'placidus', isTrue)));
    expect(EngineException('CALCULATION_ERROR', 'Placidus house cusps are undefined at latitude 70°').isPlacidusUndefined, isTrue);
    expect(EngineException('CALCULATION_ERROR', 'Ascendant could not be calculated').isPlacidusUndefined, isFalse);
  });

  test('decodes large responses off the UI isolate and still correlates them', () async {
    final big = List.generate(5000, (i) => 'value-$i').join(',');
    final t = FakeTransport(handler: (m, p) => {'big': big});
    final c = EngineClient(t, isolateDecodeThreshold: 1024);
    expect((await c.call('x') as Map)['big'], big);
    expect(c.inFlight.value, 0);
  });

  test('done completes on crash (not disposed) and on dispose', () async {
    final t = FakeTransport();
    final c = EngineClient(t);
    await c.ready;
    t.crash();
    await c.done;
    expect(c.wasDisposed, isFalse);
    final c2 = EngineClient(FakeTransport());
    await c2.ready;
    await c2.dispose();
    await c2.done;
    expect(c2.wasDisposed, isTrue);
  });

  test('dasha.subPeriods and transitTimeline send the documented params', () async {
    final t = FakeTransport(handler: fixtureHandler);
    final e = AstroEngine(EngineClient(t));
    final sub = await e.dashaSubPeriods(birth, 'VIMSHOTTARI', [2, 0, 0], maxLevel: 5);
    expect(sub.periods, isNotEmpty);
    expect(sub.periods.first.path, [2, 0, 0, 0]);
    final tl = await e.transitTimeline(DateTime.utc(2026), DateTime.utc(2026, 7), timezone: 'Asia/Kolkata');
    expect(tl.events.where((x) => x.isSignIngress), isNotEmpty);
    expect(tl.events.first.utcOffsetMinutes, 330);
    final sp = t.sent[0]['params'] as Map;
    expect(sp['path'], [2, 0, 0]);
    expect(sp['maxLevel'], 5);
    expect(sp['targetDate'], AstroEngine.dashaTargetDate);
    expect((t.sent[1]['params'] as Map)['timezone'], 'Asia/Kolkata');
  });
}
