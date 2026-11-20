import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// The six Shadbala components in the order the engine reports them (BPHS ch. 27).
const shadbalaComponents = ['Sthana', 'Dig', 'Kala', 'Cheshta', 'Naisargika', 'Drik'];

/// Graha display order (Sun..Saturn).
const _grahaOrder = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];

/// One planet's Shadbala as returned by `strength.compute` (`shadbala.summary[]`).
class ShadbalaBar {
  ShadbalaBar(JsonMap j)
      : planet = asStr(j['planet']),
        components = [
          asDouble(asMap(j['sthanaBala'])['total']) ?? 0,
          asDouble(j['digBala']) ?? 0,
          asDouble(asMap(j['kalaBala'])['total']) ?? 0,
          asDouble(j['cheshtaBala']) ?? 0,
          asDouble(j['naisargikaBala']) ?? 0,
          asDouble(j['drikBala']) ?? 0,
        ],
        totalShashtiamsas = asDouble(j['totalShashtiamsas']) ?? 0,
        totalRupas = asDouble(j['totalRupas']) ?? 0,
        requiredRupas = asDouble(j['minimumRequirementRupas']) ?? 0,
        ratio = asDouble(j['ratio']) ?? 0,
        isStrong = j['isStrong'] == true,
        rank = asInt(j['rank']) ?? 0;
  final String planet;

  /// Shashtiamsas per component, in [shadbalaComponents] order.
  final List<double> components;
  final double totalShashtiamsas, totalRupas, requiredRupas, ratio;
  final bool isStrong;
  final int rank;
}

/// One house from `strength.compute` `bhavaBala.houses[]`.
class BhavaBar {
  BhavaBar(JsonMap j)
      : house = asInt(j['houseNumber']) ?? 0,
        sign = asStr(j['sign']),
        lord = asStr(j['lord']),
        shashtiamsas = asDouble(j['totalShashtiamsas']) ?? 0,
        rupas = asDouble(j['totalRupas']) ?? 0,
        rank = asInt(j['rank']) ?? 0;
  final int house;
  final String sign, lord;
  final double shashtiamsas, rupas;
  final int rank;
}

class StrengthGraphData {
  StrengthGraphData({required this.planets, required this.houses});

  factory StrengthGraphData.fromJson(JsonMap j) {
    final planets = asMapList(asMap(j['shadbala'])['summary']).map(ShadbalaBar.new).toList()..sort((a, b) => _rank(a.planet).compareTo(_rank(b.planet)));
    final houses = asMapList(asMap(j['bhavaBala'])['houses']).map(BhavaBar.new).toList()..sort((a, b) => a.house.compareTo(b.house));
    return StrengthGraphData(planets: planets, houses: houses);
  }

  static int _rank(String p) {
    final i = _grahaOrder.indexOf(p);
    return i < 0 ? 99 : i;
  }

  final List<ShadbalaBar> planets;
  final List<BhavaBar> houses;

  ExportTable get shadbalaTable => ExportTable(
        title: 'Shadbala',
        subtitle: 'Components in shashtiamsas; totals in shashtiamsas and rupas',
        columns: ['Planet', ...shadbalaComponents, 'Total', 'Rupas', 'Required', 'Ratio', 'Rank'],
        rows: [
          for (final p in planets)
            [
              planetName(p.planet),
              for (final c in p.components) fixed(c),
              fixed(p.totalShashtiamsas),
              fixed(p.totalRupas),
              fixed(p.requiredRupas),
              fixed(p.ratio),
              '${p.rank}${p.isStrong ? '' : ' (below minimum)'}',
            ],
        ],
      );

  ExportTable get bhavaTable => ExportTable(
        title: 'Bhava Bala',
        columns: const ['House', 'Sign', 'Lord', 'Shashtiamsas', 'Rupas', 'Rank'],
        rows: [
          for (final h in houses) ['${h.house}', h.sign, planetName(h.lord), fixed(h.shashtiamsas), fixed(h.rupas), '${h.rank}']
        ],
      );

  List<ExportTable> exportTables() => [shadbalaTable, bhavaTable];
}
