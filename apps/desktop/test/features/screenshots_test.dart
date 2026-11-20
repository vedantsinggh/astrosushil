import 'package:astro_desktop/features/combustion_periods/combustion_periods_screen.dart';
import 'package:astro_desktop/features/ephemeris_tables/ephemeris_tools_screen.dart';
import 'package:astro_desktop/features/relationships/relationships_screen.dart';
import 'package:astro_desktop/features/sade_sati/sade_sati_screen.dart';
import 'package:astro_desktop/features/transit_tables/transit_tables_screen.dart';
import 'package:astro_desktop/features/chakras/chakras_screen.dart';
import 'package:astro_desktop/features/chart_wheel/chart_wheel.dart';
import 'package:astro_desktop/features/dasha_pravesh/dasha_pravesh_screen.dart';
import 'package:astro_desktop/features/dasha_timeline/dasha_timeline_screen.dart';
import 'package:astro_desktop/features/dashas_extended/dashas_extended_screen.dart';
import 'package:astro_desktop/features/horoscope_pdf/horoscope_pdf_screen.dart';
import 'package:astro_desktop/features/lal_kitab/lal_kitab_screen.dart';
import 'package:astro_desktop/features/matching_south/matching_south_screen.dart';
import 'package:astro_desktop/features/muhurta_extras/muhurta_extras_screen.dart';
import 'package:astro_desktop/features/panchang_month/panchang_month_screen.dart';
import 'package:astro_desktop/features/rectification/rectification_screen.dart';
import 'package:astro_desktop/features/strength_graph/strength_graph_screen.dart';
import 'package:astro_desktop/features/ashtakavarga_reduction/ashtakavarga_reduction_screen.dart';
import 'package:astro_desktop/features/tajika/tajika_screen.dart';
import 'package:astro_desktop/features/vargas_extra/vargas_extra_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';
import 'screenshot_tool.dart';
import 'tables_test.dart' as tables;

/// Offscreen captures of the feature screens, from recorded real engine output.
/// Run: flutter test test/features/screenshots_test.dart --dart-define=SCREENSHOT_DIR=/abs/dir
void main() {
  final shots = <(String, Widget, Object? Function(String, Map<String, Object?>))>[
    ('ephemeris_table', const EphemerisToolsScreen(initial: tables.jan2026), tables.handler),
    ('ephemeris_positions', const EphemerisToolsScreen(initial: tables.jan2026, initialTab: 1), tables.handler),
    ('lagna_rising', const EphemerisToolsScreen(initial: tables.jan2026, initialTab: 2), tables.handler),
    ('combustion_periods', const CombustionPeriodsScreen(timezone: 'Asia/Kolkata', initialYear: 2026), tables.handler),
    ('transit_tables', const TransitTablesScreen(place: tables.delhi, initialYear: 2026), tables.handler),
    ('relationships', const RelationshipsScreen(birth: tables.delhi), tables.handler),
    ('sade_sati', const SadeSatiScreen(birth: tables.delhi), tables.handler),
  ];
  shots.addAll([
    ('rectification', const RectificationScreen(birth: tables.delhi), tables.handler),
    ('chart_wheel', const ChartWheelScreen(birth: tables.delhi), all),
    ('strength_graph', const StrengthGraphScreen(birth: tables.delhi), all),
    ('ashtakavarga_reduction', const AshtakavargaReductionScreen(birth: tables.delhi), all),
    ('dasha_timeline', DashaTimelineScreen(birth: tables.delhi, now: DateTime.utc(2026, 11, 20)), all),
    ('dasha_pravesh', DashaPraveshScreen(birth: tables.delhi, now: DateTime.utc(2026, 11, 20)), all),
    ('dashas_extended', const DashasExtendedScreen(birth: tables.delhi, initialSystem: 'SUDASA'), all),
    ('tajika', const TajikaScreen(birth: tables.delhi, initialYear: 2026), all),
    ('chakras', const ChakrasScreen(birth: tables.delhi), all),
    ('lal_kitab', const LalKitabScreen(birth: tables.delhi, initialAge: 21), all),
    ('vargas_extra', const VargasExtraScreen(birth: tables.delhi), all),
    ('matching_south', const MatchingSouthScreen(boy: tables.delhi, girl: tables.delhi), all),
    ('muhurta_extras', const MuhurtaExtrasScreen(initial: BirthInput(date: '2026-03-03', time: '06:00:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi, India')), all),
    ('panchang_month', const PanchangMonthScreen(location: LocationInput(latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India'), initialYear: 2026, initialMonth: 1), all),
    ('horoscope_pdf', const HoroscopePdfScreen(birth: tables.delhi), all),
  ]);
  for (final (name, widget, handler) in shots) {
    testWidgets('screenshot $name', (tester) async {
      await loadRealFonts();
      await pumpFeature(tester, widget, handler, size: const Size(1440, 900));
      await capture(tester, name);
    });
  }
}


Map<String, Object?> _hp(String k) => tables.fx('horoscope_pdf_birth')[k]! as Map<String, Object?>;

/// Every recorded fixture by method (real sidecar output for the reference birth).
Object? all(String method, Map<String, Object?> params) => switch (method) {
      'chart.compute' => params.containsKey('birth') && (params['birth'] as Map)['date'] != '1990-05-15' ? tables.fx('dasha_pravesh_chart') : _hp('chart'),
      'vargas.compute' => _hp('vargas'),
      'chartVariants.compute' => _hp('chart_variants'),
      'avakhada.compute' => _hp('avakhada'),
      'dasha.compute' => params['system'] == 'YOGINI' ? tables.fx('dasha_timeline_yogini') : tables.fx('dasha_timeline_vimshottari'),
      'time.local' => tables.fx('dasha_pravesh_time_local'),
      'strength.compute' => tables.fx('strength_graph_strength'),
      'ashtakavarga.compute' => tables.fx('ashtakavarga_reduction_ashtakavarga'),
      'dashaExt.list' => tables.fx('dashas_sign_list'),
      'dashaExt.sign.compute' => params['system'] == 'DRIG' ? tables.fx('dashas_sign_drig') : tables.fx('dashas_sign_sudasa'),
      'dashaExt.sign.subPeriods' => tables.fx('dashas_sign_sudasa_pd'),
      'dashaExt.patyayini' => tables.fx('dashas_planetary_patyayini_2026'),
      'tajika.yogas' => tables.fx('tajika_yogas_2026'),
      'tajika.panchaVargiya' => tables.fx('tajika_pancha_vargiya_2026'),
      'tajika.tithiPravesha' => tables.fx('tajika_tithi_pravesha_2026'),
      'chakra.sarvatobhadra' => tables.fx('chakras_sarvatobhadra'),
      'chakra.kota' => tables.fx('chakras_kota'),
      'chakra.tripataki' => tables.fx('chakras_tripataki'),
      'lalKitab.chart' => tables.fx('lal_kitab_chart'),
      'lalKitab.varshphal' => tables.fx('lal_kitab_varshphal_21'),
      'vargasExtra.compute' => tables.fx('vargas_extra_vargas'),
      'pushkara.compute' => tables.fx('vargas_extra_pushkara'),
      'bhriguBindu.compute' => tables.fx('vargas_extra_bhrigu'),
      'matching.porutham' => tables.fx('matching_south_porutham'),
      'matching.dashakoota' => tables.fx('matching_south_dashakoota'),
      'muhurta.extras' => tables.fx('muhurta_extras_day_2026_03_03'),
      'muhurta.gandmoolPanchaka' => tables.fx('muhurta_extras_range_90'),
      'panchang.month' => tables.fx('panchang_month_2026_01'),
      _ => tables.handler(method, params),
    };
