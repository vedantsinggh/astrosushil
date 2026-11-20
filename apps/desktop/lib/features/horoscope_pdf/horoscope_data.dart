import '../../src/engine/inputs.dart';
import '../../src/engine/models.dart';
import '../common/engine_call.dart';

/// Sections of the full horoscope PDF (each can be switched off).
enum HoroscopeSection {
  basics('Birth data, panchanga and Avakhada'),
  charts('D1 Rasi, D9 Navamsa, D10 Dasamsa charts'),
  bhavaChalit('Bhava Chalit (Sripati): chart and bhava madhya / sandhi table'),
  planets('Planet table'),
  houses('House table'),
  vimshottari('Vimshottari mahadashas + antardashas'),
  yogini('Yogini mahadashas'),
  shadbala('Shadbala summary');

  const HoroscopeSection(this.label);
  final String label;
}

/// The sidecar requests the horoscope needs (one per engine method).
class HoroscopeRequests {
  HoroscopeRequests(BirthInput birth)
      : chart = EngineCall('chart.compute', {'birth': birth.toJson()}),
        vargas = EngineCall('vargas.compute', {
          'birth': birth.toJson(),
          'vargas': const ['D9', 'D10'],
        }),
        variants = EngineCall('chartVariants.compute', {'birth': birth.toJson()}),
        avakhada = EngineCall('avakhada.compute', {'birth': birth.toJson()}),
        vimshottari = EngineCall('dasha.compute', {'birth': birth.toJson(), 'system': 'VIMSHOTTARI', 'maxLevel': 2}),
        yogini = EngineCall('dasha.compute', {'birth': birth.toJson(), 'system': 'YOGINI', 'maxLevel': 1}),
        strength = EngineCall('strength.compute', {'birth': birth.toJson()});
  final EngineCall chart, vargas, variants, avakhada, vimshottari, yogini, strength;

  List<EngineCall> get all => [chart, vargas, variants, avakhada, vimshottari, yogini, strength];
}

/// Engine outputs for one birth, read through the shared typed models. No values are computed here.
class HoroscopeData {
  HoroscopeData({
    required this.birth,
    required JsonMap chart,
    required JsonMap vargas,
    required JsonMap variants,
    required JsonMap avakhada,
    required JsonMap vimshottari,
    required JsonMap yogini,
    required JsonMap strength,
  })  : chart = ChartResult(chart),
        d9 = VargaChartModel(asMap(asMap(vargas['vargas'])['D9'])),
        d10 = VargaChartModel(asMap(asMap(vargas['vargas'])['D10'])),
        bhavaSripatiTitle = asStr(asMap(variants['bhavaSripati'])['title']),
        bhavaSripati = NormalizedChartModel(asMap(asMap(variants['bhavaSripati'])['chart'])),
        avakhada = asMap(avakhada['avakhada']),
        vimshottari = DashaResultModel(vimshottari),
        yogini = DashaResultModel(yogini),
        strength = StrengthModel(strength);

  final BirthInput birth;
  final ChartResult chart;
  final VargaChartModel d9;
  final VargaChartModel d10;
  final String bhavaSripatiTitle;
  final NormalizedChartModel bhavaSripati;
  final JsonMap avakhada;
  final DashaResultModel vimshottari;
  final DashaResultModel yogini;
  final StrengthModel strength;
}

/// Avakhada Chakra fields in display order (labels for the engine's keys).
const avakhadaFields = <(String, String)>[
  ('varna', 'Varna'),
  ('vashya', 'Vashya'),
  ('yoni', 'Yoni'),
  ('yoniGender', 'Yoni gender'),
  ('gana', 'Gana'),
  ('nadi', 'Nadi'),
  ('rashi', 'Rashi'),
  ('rashiLord', 'Rashi lord'),
  ('nakshatra', 'Nakshatra'),
  ('nakshatraLord', 'Nakshatra lord'),
  ('pada', 'Pada'),
  ('namakshara', 'Namakshara'),
  ('tatwa', 'Tatwa'),
  ('paya', 'Paya'),
  ('yunja', 'Yunja'),
  ('hansaka', 'Hansaka'),
];
