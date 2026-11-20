import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// Moon inputs of one person, as returned by the engine (`matching.porutham` / `matching.dashakoota`).
class SouthMatchPersonModel {
  const SouthMatchPersonModel({
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.rashiName,
    required this.rashiLord,
    required this.gana,
    required this.yoniAnimal,
    required this.yoniGender,
    required this.rajju,
    required this.moonLongitude,
  });

  final int nakshatraIndex;
  final String nakshatraName;
  final int? pada;
  final String rashiName;
  final String rashiLord;
  final String gana;
  final String yoniAnimal;
  final String yoniGender;
  final String rajju;
  final double? moonLongitude;

  factory SouthMatchPersonModel.fromJson(JsonMap j) {
    final yoni = asMap(j['yoni']);
    return SouthMatchPersonModel(
      nakshatraIndex: asInt(j['nakshatraIndex']) ?? 0,
      nakshatraName: asStr(j['nakshatraName']),
      pada: asInt(j['pada']),
      rashiName: asStr(j['rashiName']),
      rashiLord: asStr(j['rashiLord']),
      gana: asStr(j['gana']),
      yoniAnimal: asStr(yoni['animal']),
      yoniGender: asStr(yoni['gender']),
      rajju: asStr(j['rajju']),
      moonLongitude: asDouble(j['moonLongitude']),
    );
  }

  List<(String, String)> get items => [
        ('Moon', moonLongitude == null ? '—' : signDms(moonLongitude!)),
        ('Nakshatra', pada == null ? nakshatraName : '$nakshatraName (pada $pada)'),
        ('Rashi', '$rashiName (lord ${planetName(rashiLord)})'),
        ('Gana', titleCase(gana)),
        ('Yoni', '${titleCase(yoniAnimal)} (${titleCase(yoniGender)})'),
        ('Rajju', titleCase(rajju)),
      ];
}

class SouthKootaModel {
  const SouthKootaModel({required this.key, required this.name, required this.matched, required this.grade, required this.dosha, required this.rule, required this.inputs});
  final String key;
  final String name;
  final bool matched;
  final String? grade;
  final bool dosha;
  final String rule;
  final JsonMap inputs;

  factory SouthKootaModel.fromJson(JsonMap j) => SouthKootaModel(
        key: asStr(j['key']),
        name: asStr(j['name']),
        matched: j['matched'] == true,
        grade: j['grade'] is String ? j['grade'] as String : null,
        dosha: j['dosha'] == true,
        rule: asStr(j['rule']),
        inputs: asMap(j['inputs']),
      );

  /// Lookups as "key = value" pairs, in the engine's order.
  String get lookups => inputs.entries.map((e) => '${e.key} = ${_v(e.value)}').join('; ');

  String get result => [matched ? 'Match' : 'No match', if (dosha) 'dosha'].join(' · ');

  static String _v(Object? v) => switch (v) {
        null => '—',
        bool b => b ? 'yes' : 'no',
        String s => s.contains('_') || s == s.toUpperCase() ? titleCase(s) : s,
        _ => '$v',
      };
}

/// One evaluated system (Porutham or Dashakoota).
class SouthMatchingModel {
  const SouthMatchingModel({
    required this.system,
    required this.boy,
    required this.girl,
    required this.kootas,
    required this.matchedCount,
    required this.totalKootas,
    required this.rajjuDosha,
    required this.vedhaDosha,
    required this.provisional,
    required this.source,
    required this.conventionNotes,
  });

  final String system;
  final SouthMatchPersonModel boy;
  final SouthMatchPersonModel girl;
  final List<SouthKootaModel> kootas;
  final int matchedCount;
  final int totalKootas;
  final bool rajjuDosha;
  final bool vedhaDosha;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;

  factory SouthMatchingModel.fromJson(JsonMap j) => SouthMatchingModel(
        system: asStr(j['system']),
        boy: SouthMatchPersonModel.fromJson(asMap(j['boy'])),
        girl: SouthMatchPersonModel.fromJson(asMap(j['girl'])),
        kootas: [for (final k in asMapList(j['kootas'])) SouthKootaModel.fromJson(k)],
        matchedCount: asInt(j['matchedCount']) ?? 0,
        totalKootas: asInt(j['totalKootas']) ?? 10,
        rajjuDosha: j['rajjuDosha'] == true,
        vedhaDosha: j['vedhaDosha'] == true,
        provisional: j['provisional'] == true,
        source: asStr(j['source']),
        conventionNotes: [for (final n in (j['conventionNotes'] is List ? j['conventionNotes'] as List : const [])) asStr(n)],
      );

  String get title => system == 'DASHAKOOTA' ? 'Dashakoota' : 'Porutham (10 poruthams)';

  ExportTable get table => ExportTable(
        title: title,
        subtitle: 'Matched $matchedCount of $totalKootas · Rajju dosha: ${rajjuDosha ? 'yes' : 'no'} · Vedha dosha: ${vedhaDosha ? 'yes' : 'no'}',
        footnote: 'Provisional – pending client review. Source: $source',
        columns: const ['Koota', 'Result', 'Grade', 'Lookups'],
        rows: [
          for (final k in kootas) [k.name, k.result, k.grade == null ? '—' : titleCase(k.grade!), k.lookups],
        ],
      );

  /// Indices of matched rows (for highlighting).
  Set<int> get matchedRows => {for (var i = 0; i < kootas.length; i++) if (kootas[i].matched) i};
}
