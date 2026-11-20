import '../../src/charts/chart_data.dart';
import '../../src/engine/models.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// Dart views of the sidecar's `tajika.*` results. Formatting only: every value is the engine's.

bool _b(Object? v) => v == true;
double _d(Object? v) => asDouble(v) ?? 0;
List<String> _sl(Object? v) => v is List ? [for (final e in v) asStr(e)] : const [];

String _sign(Object? rashiIndex) {
  final i = asInt(rashiIndex);
  return i == null || i < 1 || i > 12 ? '—' : signNames[i - 1];
}

class TajikaPairEvidence {
  TajikaPairEvidence(JsonMap j)
      : faster = asStr(j['faster']),
        slower = asStr(j['slower']),
        fasterLongitude = _d(j['fasterLongitude']),
        slowerLongitude = _d(j['slowerLongitude']),
        aspect = asStr(j['aspect']),
        degreeGap = _d(j['degreeGap']),
        allowedOrb = _d(j['allowedOrb']),
        withinOrb = _b(j['withinOrb']),
        fasterRetrograde = _b(j['fasterRetrograde']),
        slowerRetrograde = _b(j['slowerRetrograde']),
        motion = asStr(j['motion']);
  final String faster;
  final String slower;
  final double fasterLongitude;
  final double slowerLongitude;
  final String aspect;
  final double degreeGap;
  final double allowedOrb;
  final bool withinOrb;
  final bool fasterRetrograde;
  final bool slowerRetrograde;
  final String motion;

  String _pos(String p, double lon, bool r) => '${abbr(p)}${r ? ' (R)' : ''} ${signDms(lon)}';
  String get fasterText => _pos(faster, fasterLongitude, fasterRetrograde);
  String get slowerText => _pos(slower, slowerLongitude, slowerRetrograde);
}

class TajikaYogaOccurrence {
  TajikaYogaOccurrence(JsonMap j)
      : planets = _sl(j['planets']),
        roles = {for (final e in asMap(j['roles']).entries) e.key: asStr(e.value)},
        variant = j['variant'] == null ? null : asStr(j['variant']),
        evidence = asMapList(j['evidence']).map(TajikaPairEvidence.new).toList(),
        facts = _sl(j['facts']),
        effective = j['effective'] is bool ? j['effective'] as bool : null;
  final List<String> planets;
  final Map<String, String> roles;
  final String? variant;
  final List<TajikaPairEvidence> evidence;
  final List<String> facts;
  final bool? effective;

  String get rolesText => roles.isEmpty ? planets.map(abbr).join(', ') : roles.entries.map((e) => '${e.key}: ${planetName(e.value)}').join(', ');
}

class TajikaYogaEntry {
  TajikaYogaEntry(JsonMap j)
      : id = asStr(j['id']),
        name = asStr(j['name']),
        alternateNames = _sl(j['alternateNames']),
        present = _b(j['present']),
        occurrences = asMapList(j['occurrences']).map(TajikaYogaOccurrence.new).toList(),
        rule = asStr(j['rule']),
        source = asStr(j['source']);
  final String id;
  final String name;
  final List<String> alternateNames;
  final bool present;
  final List<TajikaYogaOccurrence> occurrences;
  final String rule;
  final String source;

  String get section => RegExp(r'§[\d.]+').firstMatch(source)?.group(0) ?? '';
}

class TajikaPlanetState {
  TajikaPlanetState(JsonMap j)
      : planet = asStr(j['planet']),
        longitude = _d(j['longitude']),
        house = asInt(j['house']) ?? 0,
        retrograde = _b(j['isRetrograde']),
        combust = _b(j['isCombust']),
        exalted = _b(j['isExalted']),
        debilitated = _b(j['isDebilitated']),
        ownSign = _b(j['isOwnSign']),
        signLord = j['signLordRelationship'] == null ? 'own' : titleCase(asStr(j['signLordRelationship'])),
        panchaVargiya = _d(j['panchaVargiyaBala']);
  final String planet;
  final double longitude;
  final int house;
  final bool retrograde;
  final bool combust;
  final bool exalted;
  final bool debilitated;
  final bool ownSign;
  final String signLord;
  final double panchaVargiya;
}

class TajikaYogasModel {
  TajikaYogasModel.fromJson(JsonMap j)
      : targetYear = asInt(j['targetYear']) ?? 0,
        solarReturnUtc = asStr(j['solarReturnUtcIso']),
        solarReturnLocal = asStr(j['solarReturnLocalIso']),
        ascendantRashiIndex = asInt(j['ascendantRashiIndex']) ?? 1,
        planets = asMapList(j['planets']).map(TajikaPlanetState.new).toList(),
        yogas = asMapList(j['yogas']).map(TajikaYogaEntry.new).toList(),
        provisional = _b(j['provisional']),
        source = asStr(j['source']),
        conventionNotes = _sl(j['conventionNotes']);
  final int targetYear;
  final String solarReturnUtc;
  final String solarReturnLocal;
  final int ascendantRashiIndex;
  final List<TajikaPlanetState> planets;
  final List<TajikaYogaEntry> yogas;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;

  ExportTable get summaryTable => ExportTable(
        title: 'Tajika yogas $targetYear',
        subtitle: 'Varshaphala chart, solar return $solarReturnLocal (local)',
        columns: const ['Yoga', 'Section', 'Present', 'Count', 'Planets'],
        rows: [
          for (final y in yogas)
            [
              y.alternateNames.isEmpty ? y.name : '${y.name} (${y.alternateNames.first})',
              y.section,
              y.present ? 'Yes' : 'No',
              '${y.occurrences.length}',
              y.occurrences.map((o) => o.planets.map(abbr).join('–')).join('; '),
            ],
        ],
      );

  ExportTable get evidenceTable => ExportTable(
        title: 'Tajika yoga evidence $targetYear',
        columns: const ['Yoga', 'Roles', 'Variant', 'Faster', 'Slower', 'Aspect', 'Gap', 'Orb', 'Motion', 'Facts'],
        rows: [
          for (final y in yogas)
            for (final o in y.occurrences)
              for (final (i, e) in (o.evidence.isEmpty ? <TajikaPairEvidence?>[null] : o.evidence).indexed)
                [
                  i == 0 ? y.name : '',
                  i == 0 ? o.rolesText : '',
                  i == 0 ? (o.variant == null ? (o.effective == null ? '' : (o.effective! ? 'effective' : 'not effective')) : titleCase(o.variant!)) : '',
                  e?.fasterText ?? '',
                  e?.slowerText ?? '',
                  e == null ? '' : titleCase(e.aspect),
                  e == null ? '' : '${e.degreeGap.toStringAsFixed(2)}°',
                  e == null ? '' : '${e.allowedOrb.toStringAsFixed(1)}°${e.withinOrb ? '' : ' (outside)'}',
                  e == null ? '' : titleCase(e.motion),
                  i == 0 ? o.facts.join(' | ') : '',
                ],
        ],
      );

  ExportTable get planetTable => ExportTable(
        title: 'Planet states $targetYear',
        columns: const ['Planet', 'Position', 'House', 'Flags', 'Sign lord', 'Pancha-vargiya'],
        rows: [
          for (final p in planets)
            [
              planetName(p.planet),
              signDms(p.longitude),
              '${p.house}',
              [if (p.retrograde) 'retrograde', if (p.combust) 'combust', if (p.exalted) 'exalted', if (p.debilitated) 'debilitated', if (p.ownSign) 'own sign'].join(', '),
              p.signLord,
              p.panchaVargiya.toStringAsFixed(2),
            ],
        ],
      );
}

class TajikaBalaComponent {
  TajikaBalaComponent(JsonMap j)
      : lord = asStr(j['lord']),
        relation = asStr(j['relation']),
        score = _d(j['score']);
  final String lord;
  final String relation;
  final double score;
  String get text => '${score.toStringAsFixed(2)} (${abbr(lord)} ${relation.toLowerCase()})';
}

class TajikaPanchaVargiyaPlanet {
  TajikaPanchaVargiyaPlanet(JsonMap j)
      : planet = asStr(j['planet']),
        longitude = _d(j['longitude']),
        kshetra = TajikaBalaComponent(asMap(j['kshetra'])),
        uchcha = _d(asMap(j['uchcha'])['score']),
        hadda = TajikaBalaComponent(asMap(j['hadda'])),
        drekkana = TajikaBalaComponent(asMap(j['drekkana'])),
        navamsha = TajikaBalaComponent(asMap(j['navamsha'])),
        total = _d(j['total']),
        vimshopaka = _d(j['vimshopaka']),
        category = asStr(j['category']);
  final String planet;
  final double longitude;
  final TajikaBalaComponent kshetra;
  final double uchcha;
  final TajikaBalaComponent hadda;
  final TajikaBalaComponent drekkana;
  final TajikaBalaComponent navamsha;
  final double total;
  final double vimshopaka;
  final String category;
}

class TajikaPanchaVargiyaModel {
  TajikaPanchaVargiyaModel.fromJson(JsonMap j)
      : chartKind = asStr(j['chartKind']),
        targetYear = asInt(j['targetYear']),
        planets = asMapList(j['planets']).map(TajikaPanchaVargiyaPlanet.new).toList(),
        provisional = _b(j['provisional']),
        source = asStr(j['source']),
        conventionNotes = _sl(j['conventionNotes']);
  final String chartKind;
  final int? targetYear;
  final List<TajikaPanchaVargiyaPlanet> planets;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;

  ExportTable get table => ExportTable(
        title: 'Pancha-vargiya Bala${targetYear == null ? '' : ' $targetYear'}',
        subtitle: chartKind == 'ANNUAL' ? 'Varshaphala chart' : 'Natal chart',
        columns: const ['Planet', 'Position', 'Kshetra /30', 'Uchcha /20', 'Hadda /15', 'Drekkana /10', 'Navamsha /5', 'Total /80', 'Bala (÷4)', 'Category'],
        rows: [
          for (final p in planets)
            [
              planetName(p.planet),
              signDms(p.longitude),
              p.kshetra.text,
              p.uchcha.toStringAsFixed(2),
              p.hadda.text,
              p.drekkana.text,
              p.navamsha.text,
              p.total.toStringAsFixed(2),
              p.vimshopaka.toStringAsFixed(2),
              titleCase(p.category),
            ],
        ],
      );
}

class TithiPraveshaCandidate {
  TithiPraveshaCandidate(JsonMap j)
      : utcIso = asStr(j['utcIso']),
        sunLongitude = _d(j['sunLongitude']),
        sunMatches = _b(j['sunSignMatchesNatal']),
        daysFromSolarReturn = _d(j['daysFromSolarReturn']);
  final String utcIso;
  final double sunLongitude;
  final bool sunMatches;
  final double daysFromSolarReturn;
}

class TithiPraveshaModel {
  TithiPraveshaModel.fromJson(JsonMap j)
      : targetYear = asInt(j['targetYear']) ?? 0,
        natal = asMap(j['natal']),
        moment = asMap(j['moment']),
        solarReturnUtc = asStr(j['solarReturnUtcIso']),
        candidates = asMapList(j['candidates']).map(TithiPraveshaCandidate.new).toList(),
        rasi = NormalizedChartModel(asMap(j['rasi'])),
        provisional = _b(j['provisional']),
        source = asStr(j['source']),
        conventionNotes = _sl(j['conventionNotes']);
  final int targetYear;
  final JsonMap natal;
  final JsonMap moment;
  final String solarReturnUtc;
  final List<TithiPraveshaCandidate> candidates;
  final NormalizedChartModel rasi;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;

  String get momentLocal => '${asStr(moment['localIso']).replaceFirst('T', ' ')} (${asStr(moment['timezone'])}, ${offsetLabel(asInt(moment['utcOffsetMinutes']) ?? 0)})';
  String get momentUtc => asStr(moment['utcIso']);
  bool get sunSignMatches => _b(moment['sunSignMatchesNatal']);

  List<(String, String)> get facts => [
        ('Moment (local)', momentLocal),
        ('Moment (UTC)', momentUtc),
        ('Natal elongation', '${dms(_d(natal['elongation']))} · tithi ${asInt(natal['tithiIndex']) ?? '—'}'),
        ('Moment elongation', '${dms(_d(moment['elongation']))} · tithi ${asInt(moment['tithiIndex']) ?? '—'}'),
        ('Residual', '${_d(moment['elongationResidual']).toStringAsExponential(2)}°'),
        ('Sun sign', '${_sign(moment['sunRashiIndex'])} (natal ${_sign(natal['sunRashiIndex'])})${sunSignMatches ? '' : ' — differs'}'),
        ('Solar return (UTC)', solarReturnUtc),
      ];

  ExportTable get candidateTable => ExportTable(
        title: 'Tithi Pravesha candidates $targetYear',
        columns: const ['Instant (UTC)', 'Sun', 'Sun in natal sign', 'Days from solar return'],
        rows: [
          for (final c in candidates) [c.utcIso, signDms(c.sunLongitude), c.sunMatches ? 'Yes' : 'No', c.daysFromSolarReturn.toStringAsFixed(2)],
        ],
      );

  ChartData get chartData => ChartData.fromNormalized('Tithi Pravesha $targetYear', rasi);
}
