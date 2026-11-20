import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/src/engine/engine_client.dart';

Map<String, Object?> fixture(String name) => (jsonDecode(File('test/fixtures/$name.json').readAsStringSync()) as Map).cast<String, Object?>();

/// In-memory sidecar: answers requests via [handler] (method, params) -> result or throws.
class FakeTransport implements SidecarTransport {
  FakeTransport({this.handler, bool autoReady = true, this.protocolVersion = 1}) {
    if (autoReady) scheduleMicrotask(emitReady);
  }
  final Object? Function(String method, Map<String, Object?> params)? handler;
  final int protocolVersion;
  final _out = StreamController<String>.broadcast();
  final sent = <Map<String, Object?>>[];
  final _exit = Completer<int>();

  void emitReady() => _out.add(jsonEncode({'event': 'ready', 'protocolVersion': protocolVersion, 'engineVersion': '0.1.0', 'sidecarVersion': '0.1.0'}));
  void emit(Map<String, Object?> m) => _out.add(jsonEncode(m));
  void emitRaw(String s) => _out.add(s);
  void crash() {
    _out.close();
    if (!_exit.isCompleted) _exit.complete(1);
  }

  @override
  Stream<String> get lines => _out.stream;

  @override
  void send(String line) {
    final m = (jsonDecode(line) as Map).cast<String, Object?>();
    sent.add(m);
    final h = handler;
    if (h == null) return;
    scheduleMicrotask(() {
      try {
        final r = h(m['method'] as String, ((m['params'] as Map?) ?? {}).cast<String, Object?>());
        emit({'id': m['id'], 'ok': true, 'result': r});
      } on EngineException catch (e) {
        emit({'id': m['id'], 'ok': false, 'error': {'code': e.code, 'message': e.message, if (e.reason != null) 'reason': e.reason}});
      }
    });
  }

  @override
  Future<void> close() async {
    if (!_out.isClosed) await _out.close();
    if (!_exit.isCompleted) _exit.complete(0);
  }

  @override
  Future<int> get exitCode => _exit.future;
}

/// Fake engine answering every protocol method from recorded real-sidecar fixtures.
Object? fixtureHandler(String method, Map<String, Object?> params) => switch (method) {
      'chart.compute' => fixture('chart'),
      'vargas.compute' => fixture('vargas'),
      'dasha.compute' => fixture('dasha'),
      'panchang.compute' => fixture('panchang'),
      'ashtakavarga.compute' => fixture('ashtakavarga'),
      'strength.compute' => fixture('strength'),
      'transit.compute' => fixture('transit'),
      'matchmaking.compute' => fixture('match'),
      'kp.compute' => fixture('kp'),
      'sudarshana.compute' => fixture('sudarshana'),
      'eclipses.find' => fixture('eclipses'),
      'time.local' => fixture('local'),
      'transitTimeline.compute' => fixture('timeline'),
      'dasha.subPeriods' => fixture('dasha_sub'),
      'engine.info' => fixture('engine_info'),
      _ => featureFixture(method, params) ?? {'note': 'not recorded'},
    };

Map<String, Object?> _ff(String name) => fixture('features/$name');

/// Recorded real sidecar output for the feature methods (lib/features/*), reference birth.
Object? featureFixture(String method, Map<String, Object?> params) => switch (method) {
      'chartVariants.compute' => (_ff('horoscope_pdf_birth')['chart_variants']),
      'avakhada.compute' => (_ff('horoscope_pdf_birth')['avakhada']),
      'ephemeris.table' => _ff('tables_ephemeris_table'),
      'ephemeris.positions' => _ff('tables_ephemeris_positions'),
      'ascendant.rising' => _ff('tables_ascendant_rising'),
      'combustion.periods' => _ff('tables_combustion'),
      'transit.tables' => _ff('tables_transit'),
      'relationships.compute' => _ff('tables_relationships'),
      'sadeSati.periods' => _ff('tables_sade_sati'),
      'rectification.sensitivity' => _ff('tables_rectification'),
      'dashaExt.list' => _ff('dashas_sign_list'),
      'dashaExt.sign.compute' => params['system'] == 'DRIG' ? _ff('dashas_sign_drig') : _ff('dashas_sign_sudasa'),
      'dashaExt.sign.subPeriods' => _ff('dashas_sign_sudasa_pd'),
      'dashaExt.patyayini' => _ff('dashas_planetary_patyayini_2026'),
      'tajika.yogas' => _ff('tajika_yogas_2026'),
      'tajika.panchaVargiya' => _ff('tajika_pancha_vargiya_2026'),
      'tajika.tithiPravesha' => _ff('tajika_tithi_pravesha_2026'),
      'chakra.sarvatobhadra' => _ff('chakras_sarvatobhadra'),
      'chakra.kota' => _ff('chakras_kota'),
      'chakra.tripataki' => _ff('chakras_tripataki'),
      'lalKitab.chart' => _ff('lal_kitab_chart'),
      'lalKitab.varshphal' => _ff('lal_kitab_varshphal_21'),
      'vargasExtra.compute' => _ff('vargas_extra_vargas'),
      'pushkara.compute' => _ff('vargas_extra_pushkara'),
      'bhriguBindu.compute' => _ff('vargas_extra_bhrigu'),
      'matching.porutham' => _ff('matching_south_porutham'),
      'matching.dashakoota' => _ff('matching_south_dashakoota'),
      'muhurta.extras' => _ff('muhurta_extras_day_2026_03_03'),
      'muhurta.gandmoolPanchaka' => _ff('muhurta_extras_range_90'),
      'panchang.month' => _ff('panchang_month_2026_01'),
      _ => null,
    };
