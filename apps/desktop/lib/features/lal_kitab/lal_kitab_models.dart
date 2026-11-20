import '../../src/charts/chart_data.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// One house of a Lal Kitab chart as returned by the engine (house N always holds fixed sign N).
class LalKitabHouse {
  const LalKitabHouse({required this.house, required this.fixedRashiName, required this.planets});
  final int house;
  final String fixedRashiName;
  final List<String> planets;

  factory LalKitabHouse.fromJson(JsonMap j) => LalKitabHouse(
        house: asInt(j['house']) ?? 0,
        fixedRashiName: asStr(j['fixedRashiName']),
        planets: [for (final p in (j['planets'] is List ? j['planets'] as List : const [])) asStr(p)],
      );
}

/// Drawing data: the Lal Kitab chart is a fixed chart with Mesha in house 1, so each house is
/// drawn in the cell of the sign with the same number (reference sign 1).
ChartData lalKitabChartData(String title, List<LalKitabHouse> houses, {String? subtitle}) => ChartData(
      title: title,
      subtitle: subtitle,
      ascSign: 1,
      bodies: {
        for (final h in houses)
          if (h.planets.isNotEmpty) h.house: [for (final p in h.planets) ChartBody(abbr(p), code: p, detail: '${planetName(p)} · Lal Kitab house ${h.house}')],
      },
    );

class LalKitabPlacement {
  const LalKitabPlacement({required this.planet, required this.house, required this.natalRashiName, required this.retrograde});
  final String planet;
  final int house;
  final String natalRashiName;
  final bool retrograde;
}

/// Result of `lalKitab.chart`.
class LalKitabChartModel {
  const LalKitabChartModel({required this.source, required this.provisional, required this.notes, required this.lagnaName, required this.planets, required this.houses});
  final String source;
  final bool provisional;
  final List<String> notes;
  final String lagnaName;
  final List<LalKitabPlacement> planets;
  final List<LalKitabHouse> houses;

  factory LalKitabChartModel.fromJson(JsonMap j) => LalKitabChartModel(
        source: asStr(j['source']),
        provisional: j['provisional'] == true,
        notes: [for (final n in (j['conventionNotes'] is List ? j['conventionNotes'] as List : const [])) asStr(n)],
        lagnaName: asStr(j['natalLagnaRashiName']),
        planets: [
          for (final p in asMapList(j['planets']))
            LalKitabPlacement(planet: asStr(p['planet']), house: asInt(p['house']) ?? 0, natalRashiName: asStr(p['natalRashiName']), retrograde: p['isRetrograde'] == true),
        ],
        houses: asMapList(j['houses']).map(LalKitabHouse.fromJson).toList(),
      );

  ChartData get chartData => lalKitabChartData('Lal Kitab', houses, subtitle: 'house 1 = Mesha');

  ExportTable get placementTable => ExportTable(
        title: 'Lal Kitab chart placements',
        subtitle: 'Natal lagna $lagnaName',
        columns: const ['Planet', 'Lal Kitab house', 'Natal sign'],
        rows: [for (final p in planets) [planetName(p.planet), '${p.house}', p.natalRashiName + (p.retrograde ? ' (R)' : '')]],
      );
}

class LalKitabMapping {
  const LalKitabMapping(this.natalHouse, this.annualHouse);
  final int natalHouse;
  final int annualHouse;
}

/// Result of `lalKitab.varshphal`.
class LalKitabVarshphalModel {
  const LalKitabVarshphalModel({
    required this.source,
    required this.provisional,
    required this.notes,
    required this.age,
    required this.startsInYear,
    required this.reconciled,
    required this.mapping,
    required this.houses,
    required this.natal,
  });
  final String source;
  final bool provisional;
  final List<String> notes;
  final int age;
  final int startsInYear;
  final bool reconciled;
  final List<LalKitabMapping> mapping;
  final List<LalKitabHouse> houses;
  final LalKitabChartModel natal;

  factory LalKitabVarshphalModel.fromJson(JsonMap j) => LalKitabVarshphalModel(
        source: asStr(j['source']),
        provisional: j['provisional'] == true,
        notes: [for (final n in (j['conventionNotes'] is List ? j['conventionNotes'] as List : const [])) asStr(n)],
        age: asInt(j['age']) ?? 0,
        startsInYear: asInt(j['startsInYear']) ?? 0,
        reconciled: j['tableRowReconciled'] == true,
        mapping: [for (final m in asMapList(j['houseMapping'])) LalKitabMapping(asInt(m['natalHouse']) ?? 0, asInt(m['annualHouse']) ?? 0)],
        houses: asMapList(j['houses']).map(LalKitabHouse.fromJson).toList(),
        natal: LalKitabChartModel.fromJson(asMap(j['natal'])),
      );

  ChartData get chartData => lalKitabChartData('Varshphal year $age', houses, subtitle: 'from $startsInYear');

  /// Natal house -> annual house, with the natal planets that move along that row.
  ExportTable get mappingTable {
    final byNatal = {for (final h in natal.houses) h.house: h.planets};
    return ExportTable(
      title: 'Lal Kitab Varshphal year $age house mapping',
      subtitle: 'Running year $age (begins $startsInYear)',
      columns: const ['Natal house', 'Annual house', 'Planets moving'],
      rows: [
        for (final m in mapping) ['${m.natalHouse}', '${m.annualHouse}', (byNatal[m.natalHouse] ?? const []).map(planetName).join(', ')],
      ],
      footnote: source,
    );
  }
}
