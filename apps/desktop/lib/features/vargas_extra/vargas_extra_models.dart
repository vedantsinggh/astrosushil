import '../../src/engine/models.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// Display order of the extra vargas (ADR-016 §6).
const extraVargaCodes = ['D5', 'D6', 'D8', 'D11', 'D81', 'D108', 'D144', 'D150'];

String _bodyLabel(String code) => code == 'Ascendant' ? 'Lagna' : planetName(code);
int _bodyRank(String code) => code == 'Ascendant' ? -1 : (planetOrder.contains(code) ? planetOrder.indexOf(code) : 99);

/// One extra varga as returned by `vargasExtra.compute`: the core VargaChart shape (so the shared
/// [VargaChartModel] and ChartData.fromVarga can draw it) plus the provisional metadata.
class ExtraVargaModel {
  ExtraVargaModel(JsonMap j)
      : chart = VargaChartModel(j),
        provisional = j['provisional'] == true,
        source = asStr(j['source']),
        conventionNotes = [for (final n in (j['conventionNotes'] as List? ?? const [])) asStr(n)],
        nadiamsa = {
          for (final e in asMap(j['placements']).entries)
            if (asInt(asMap(e.value)['nadiamsaNumber']) != null) e.key: asInt(asMap(e.value)['nadiamsaNumber'])!,
        };
  final VargaChartModel chart;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;

  /// D150 only: nadiamsa ordinal (1–150) per body key (incl. 'Ascendant').
  final Map<String, int> nadiamsa;

  ExportTable get table {
    final showN = nadiamsa.isNotEmpty;
    final placements = [...chart.placements]..sort((a, b) => _bodyRank(a.body).compareTo(_bodyRank(b.body)));
    return ExportTable(
      title: '${chart.code} ${chart.name}',
      subtitle: chart.rule,
      columns: ['Body', 'Sign', 'Degree in varga', 'House', if (showN) 'Nadiamsa'],
      rows: [
        ['Lagna', signNames[chart.ascendantRashi - 1], '', '1', if (showN) '${nadiamsa['Ascendant'] ?? ''}'],
        for (final p in placements)
          [
            _bodyLabel(p.body) + (p.retrograde ? ' (R)' : ''),
            p.rashiName,
            p.degree == null ? '' : dms(p.degree!),
            '${p.house ?? ''}',
            if (showN) '${nadiamsa[p.body] ?? ''}',
          ],
      ],
    );
  }
}

class ExtraVargasResult {
  ExtraVargasResult(JsonMap j)
      : vargas = {
          for (final code in extraVargaCodes)
            if (asMap(j['vargas'])[code] is Map) code: ExtraVargaModel(asMap(asMap(j['vargas'])[code])),
        };
  final Map<String, ExtraVargaModel> vargas;
}

class PushkaraBody {
  PushkaraBody(JsonMap j)
      : body = asStr(j['body']),
        rashiName = asStr(j['rashiName']),
        degreeInSign = asDouble(j['degreeInSign']) ?? 0,
        navamsaNumber = asInt(j['navamsaNumber']) ?? 0,
        navamsaSignName = asStr(j['navamsaSignName']),
        inNavamsa = j['inPushkaraNavamsa'] == true,
        bhaga = asInt(j['pushkaraBhaga']) ?? 0,
        distance = asDouble(j['distanceFromBhaga']) ?? 0,
        inBhaga = j['inPushkaraBhaga'] == true;
  final String body;
  final String rashiName;
  final double degreeInSign;
  final int navamsaNumber;
  final String navamsaSignName;
  final bool inNavamsa;
  final int bhaga;
  final double distance;
  final bool inBhaga;
}

class PushkaraResultModel {
  PushkaraResultModel(JsonMap j)
      : bodies = asMapList(j['bodies']).map(PushkaraBody.new).toList(),
        table = asMapList(j['table']),
        provisional = j['provisional'] == true,
        source = asStr(j['source']),
        conventionNotes = [for (final n in (j['conventionNotes'] as List? ?? const [])) asStr(n)];
  final List<PushkaraBody> bodies;
  final List<JsonMap> table;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;

  ExportTable get bodiesTable => ExportTable(
        title: 'Pushkara Navamsha and Pushkara Bhaga',
        columns: const ['Body', 'Sign', 'Degree', 'Navamsa #', 'Navamsa sign', 'Pushkara navamsa', 'Pushkara bhaga', 'From bhaga', 'In bhaga'],
        rows: [
          for (final b in [...bodies]..sort((a, c) => _bodyRank(a.body).compareTo(_bodyRank(c.body))))
            [
              _bodyLabel(b.body),
              b.rashiName,
              dms(b.degreeInSign),
              '${b.navamsaNumber}',
              b.navamsaSignName,
              b.inNavamsa ? 'Yes' : '',
              '${b.bhaga}°',
              '${b.distance >= 0 ? '+' : '-'}${dms(b.distance.abs())}',
              b.inBhaga ? 'Yes' : '',
            ],
        ],
      );

  ExportTable get referenceTable => ExportTable(
        title: 'Pushkara reference table',
        columns: const ['Sign', 'Pushkara navamsas', 'Pushkara bhaga'],
        rows: [
          for (final r in table)
            [
              asStr(r['rashiName']),
              asMapList(r['pushkaraNavamsas'])
                  .map((n) => '#${asInt(n['navamsaNumber'])} ${asStr(n['navamsaSignName'])} (${dms(asDouble(n['fromDegree']) ?? 0, seconds: false)}–${dms(asDouble(n['toDegree']) ?? 0, seconds: false)})')
                  .join(', '),
              '${asInt(r['pushkaraBhaga'])}°',
            ],
        ],
      );
}

class BhriguBinduModel {
  BhriguBinduModel(JsonMap j)
      : longitude = asDouble(j['longitude']) ?? 0,
        rashiName = asStr(j['rashiName']),
        degreeInSign = asDouble(j['degreeInSign']) ?? 0,
        nakshatra = asStr(j['nakshatra']),
        pada = asInt(j['pada']) ?? 0,
        moon = asDouble(j['moonLongitude']) ?? 0,
        rahu = asDouble(j['rahuLongitude']) ?? 0,
        arc = asDouble(j['arcRahuToMoon']) ?? 0,
        shorterArc = asDouble(j['shorterArcLongitude']) ?? 0,
        provisional = j['provisional'] == true,
        source = asStr(j['source']),
        conventionNotes = [for (final n in (j['conventionNotes'] as List? ?? const [])) asStr(n)];
  final double longitude;
  final String rashiName;
  final double degreeInSign;
  final String nakshatra;
  final int pada;
  final double moon;
  final double rahu;
  final double arc;
  final double shorterArc;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;

  ExportTable get table => ExportTable(
        title: 'Bhrigu Bindu',
        columns: const ['Quantity', 'Value'],
        rows: [
          ['Bhrigu Bindu', '${signDms(longitude)} ($rashiName ${dms(degreeInSign)})'],
          ['Nakshatra', '$nakshatra pada $pada'],
          ['Moon', signDms(moon)],
          ['Rahu', signDms(rahu)],
          ['Arc Rahu → Moon', dms(arc)],
          ['Shorter-arc midpoint (alternative)', signDms(shorterArc)],
        ],
      );
}
