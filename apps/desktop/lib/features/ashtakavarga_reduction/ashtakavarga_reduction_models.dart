import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

const _grahas = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];

/// One planet's Bhinnashtakavarga before and after the two Shodhanas, plus its Pindas, all read
/// from `ashtakavarga.compute` (`bav[p].signList`, `shodhana[p]`, `pinda[p]`). Index 0 = Mesha.
class ReductionRow {
  ReductionRow({
    required this.planet,
    required this.bav,
    required this.trikona,
    required this.ekadhipatya,
    this.bavTotal,
    this.trikonaTotal,
    this.ekadhipatyaTotal,
    this.rashiPinda,
    this.grahaPinda,
    this.shodhyaPinda,
  });
  final String planet;
  final List<int> bav, trikona, ekadhipatya;
  final int? bavTotal, trikonaTotal, ekadhipatyaTotal;
  final int? rashiPinda, grahaPinda, shodhyaPinda;

  /// Signs (0-based) whose value changed between [before] and [after] (display highlight only).
  static Set<int> changed(List<int> before, List<int> after) => {
        for (var i = 0; i < before.length && i < after.length; i++)
          if (before[i] != after[i]) i
      };
}

class AshtakavargaReductionData {
  AshtakavargaReductionData(this.rows);

  factory AshtakavargaReductionData.fromJson(JsonMap j) {
    final bav = asMap(j['bav']), sh = asMap(j['shodhana']), pi = asMap(j['pinda']);
    List<int> ints(Object? v) => v is List ? [for (final x in v) asInt(x) ?? 0] : const [];
    final keys = [..._grahas.where(bav.containsKey), ...bav.keys.where((k) => !_grahas.contains(k))];
    return AshtakavargaReductionData([
      for (final p in keys)
        ReductionRow(
          planet: p,
          bav: ints(asMap(bav[p])['signList']),
          bavTotal: asInt(asMap(bav[p])['totalPoints']),
          trikona: ints(asMap(sh[p])['trikonaReduced']),
          trikonaTotal: asInt(asMap(sh[p])['totalTrikonaPoints']),
          ekadhipatya: ints(asMap(sh[p])['ekadhipatyaReduced']),
          ekadhipatyaTotal: asInt(asMap(sh[p])['totalEkadhipatyaPoints']),
          rashiPinda: asInt(asMap(pi[p])['rashiPinda']),
          grahaPinda: asInt(asMap(pi[p])['grahaPinda']),
          shodhyaPinda: asInt(asMap(pi[p])['shodhyaPinda']),
        ),
    ]);
  }

  final List<ReductionRow> rows;

  bool get hasShodhana => rows.any((r) => r.trikona.isNotEmpty);
  bool get hasPinda => rows.any((r) => r.shodhyaPinda != null);

  static const signColumns = signShort;

  static String _n(int? v) => v == null ? '–' : '$v';

  ExportTable planetTable(ReductionRow r) => ExportTable(
        title: '${planetName(r.planet)} BAV reductions',
        columns: ['Stage', ...signColumns, 'Total'],
        rows: [
          ['Bhinnashtakavarga', for (final v in r.bav) '$v', _n(r.bavTotal)],
          if (r.trikona.isNotEmpty) ['After Trikona Shodhana', for (final v in r.trikona) '$v', _n(r.trikonaTotal)],
          if (r.ekadhipatya.isNotEmpty) ['After Ekadhipatya Shodhana', for (final v in r.ekadhipatya) '$v', _n(r.ekadhipatyaTotal)],
        ],
      );

  ExportTable stageTable(String title, List<int> Function(ReductionRow) pick, int? Function(ReductionRow) total) => ExportTable(
        title: title,
        columns: ['Planet', ...signColumns, 'Total'],
        rows: [
          for (final r in rows)
            if (pick(r).isNotEmpty) [planetName(r.planet), for (final v in pick(r)) '$v', _n(total(r))],
        ],
      );

  ExportTable get trikonaTable => stageTable('Trikona Shodhana (all planets)', (r) => r.trikona, (r) => r.trikonaTotal);
  ExportTable get ekadhipatyaTable => stageTable('Ekadhipatya Shodhana (all planets)', (r) => r.ekadhipatya, (r) => r.ekadhipatyaTotal);

  ExportTable get pindaTable => ExportTable(
        title: 'Shodhya Pinda',
        columns: const ['Planet', 'Rashi Pinda', 'Graha Pinda', 'Shodhya Pinda'],
        rows: [
          for (final r in rows) [planetName(r.planet), _n(r.rashiPinda), _n(r.grahaPinda), _n(r.shodhyaPinda)]
        ],
      );

  List<ExportTable> exportTables() => [
        for (final r in rows) planetTable(r),
        if (hasShodhana) trikonaTable,
        if (hasShodhana) ekadhipatyaTable,
        if (hasPinda) pindaTable,
      ];
}
