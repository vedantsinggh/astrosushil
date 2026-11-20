import '../common/engine_call.dart';

/// Dart views of the engine's chakra results (chakra.sarvatobhadra / chakra.kota / chakra.tripataki).
/// Parsing only; every value is computed by the engine.

class ProvisionalInfo {
  ProvisionalInfo(JsonMap j)
      : provisional = j['provisional'] == true,
        source = asStr(j['source']),
        notes = [for (final n in (j['conventionNotes'] as List? ?? const [])) asStr(n)];
  final bool provisional;
  final String source;
  final List<String> notes;
}

class SbcCell {
  SbcCell(JsonMap j)
      : row = asInt(j['row']) ?? 0,
        col = asInt(j['col']) ?? 0,
        kind = asStr(j['kind']),
        label = asStr(j['label']),
        devanagari = j['devanagari'] as String?,
        direction = asStr(j['direction']),
        weekdays = [for (final w in (j['weekdays'] as List? ?? const [])) asStr(w)],
        natal = [for (final p in (j['natalPlanets'] as List? ?? const [])) asStr(p)],
        transit = [for (final p in (j['transitPlanets'] as List? ?? const [])) asStr(p)];
  final int row, col;
  final String kind, label, direction;
  final String? devanagari;
  final List<String> weekdays, natal, transit;
}

class SbcCellRef {
  SbcCellRef(JsonMap j)
      : row = asInt(j['row']) ?? 0,
        col = asInt(j['col']) ?? 0,
        label = asStr(j['label']),
        devanagari = j['devanagari'] as String?;
  final int row, col;
  final String label;
  final String? devanagari;
  String get display => devanagari == null ? label : '$devanagari ($label)';
}

class SbcVedha {
  SbcVedha(JsonMap j)
      : chart = asStr(j['chart']),
        planet = asStr(j['planet']),
        from = asStr(j['fromNakshatra']),
        direction = asStr(j['direction']),
        effective = j['effectiveByMotion'] == true,
        cells = [for (final c in asMapList(j['cells'])) SbcCellRef(c)];
  final String chart, planet, from, direction;
  final bool effective;
  final List<SbcCellRef> cells;
}

class SbcPlacement {
  SbcPlacement(JsonMap j, this.chart)
      : planet = asStr(j['planet']),
        nakshatra = asStr(j['nakshatraName']),
        pada = asInt(j['pada']),
        retro = j['isRetrograde'] == true,
        longitude = asDouble(j['longitude']) ?? 0,
        row = asInt(j['row']) ?? 0,
        col = asInt(j['col']) ?? 0;
  final String chart, planet, nakshatra;
  final int row, col;
  final int? pada;
  final bool retro;
  final double longitude;
}

class SbcRefHit {
  SbcRefHit(JsonMap j)
      : chart = asStr(j['chart']),
        planet = asStr(j['planet']),
        direction = asStr(j['direction']),
        effective = j['effectiveByMotion'] == true,
        reference = asStr(j['reference']),
        label = asStr(j['label']);
  final String chart, planet, direction, reference, label;
  final bool effective;
}

class SarvatobhadraData {
  SarvatobhadraData(JsonMap j)
      : info = ProvisionalInfo(j),
        cells = [for (final c in asMapList(j['grid'])) SbcCell(c)],
        placements = [
          for (final p in asMapList(asMap(j['natal'])['placements'])) SbcPlacement(p, 'NATAL'),
          for (final p in asMapList(asMap(j['transit'])['placements'])) SbcPlacement(p, 'TRANSIT'),
        ],
        vedhas = [
          for (final v in asMapList(asMap(j['natal'])['vedhas'])) SbcVedha(v),
          for (final v in asMapList(asMap(j['transit'])['vedhas'])) SbcVedha(v),
        ],
        hits = [for (final h in asMapList(j['referenceHits'])) SbcRefHit(h)],
        janma = asStr(asMap(asMap(j['natalReferences'])['janmaNakshatra'])['name']),
        moonRashi = asStr(asMap(asMap(j['natalReferences'])['moonRashi'])['name']),
        lagnaRashi = asStr(asMap(asMap(j['natalReferences'])['lagnaRashi'])['name']),
        hasTransit = j['transit'] is Map;
  final ProvisionalInfo info;
  final List<SbcCell> cells;
  final List<SbcPlacement> placements;
  final List<SbcVedha> vedhas;
  final List<SbcRefHit> hits;
  final String janma, moonRashi, lagnaRashi;
  final bool hasTransit;

  SbcCell? cell(int row, int col) {
    final i = row * 9 + col;
    return i >= 0 && i < cells.length ? cells[i] : null;
  }
}

class KotaSquare {
  KotaSquare(JsonMap j)
      : count = asInt(j['count']) ?? 0,
        nakshatra = asStr(j['nakshatraName']),
        division = asStr(j['division']),
        direction = asStr(j['direction']),
        path = asStr(j['path']),
        depth = asInt(j['depth']) ?? 1;
  final int count, depth;
  final String nakshatra, division, direction, path;
}

class KotaPlacement {
  KotaPlacement(JsonMap j)
      : square = KotaSquare(j),
        chart = asStr(j['chart']),
        planet = asStr(j['planet']),
        retro = j['isRetrograde'] == true,
        movement = asStr(j['movement']),
        isSwami = j['isKotaSwami'] == true,
        isPala = j['isKotaPala'] == true;
  final KotaSquare square;
  final String chart, planet, movement;
  final bool retro, isSwami, isPala;
}

class KotaData {
  KotaData(JsonMap j)
      : info = ProvisionalInfo(j),
        janma = asStr(asMap(j['janmaNakshatra'])['name']),
        janmaPada = asInt(asMap(j['janmaNakshatra'])['pada']),
        swami = asStr(asMap(j['kotaSwami'])['planet']),
        swamiRashi = asStr(asMap(j['kotaSwami'])['moonRashi']),
        pala = asStr(asMap(j['kotaPala'])['planet']),
        palaLetter = asStr(asMap(j['kotaPala'])['letter']),
        squares = [for (final s in asMapList(j['positions'])) KotaSquare(s)],
        placements = [
          for (final p in asMapList(j['natal'])) KotaPlacement(p),
          for (final p in asMapList(asMap(j['transit'])['placements'])) KotaPlacement(p),
        ];
  final ProvisionalInfo info;
  final String janma, swami, swamiRashi, pala, palaLetter;
  final int? janmaPada;
  final List<KotaSquare> squares;
  final List<KotaPlacement> placements;
}

class TripatakiPlacement {
  TripatakiPlacement(JsonMap j)
      : planet = asStr(j['planet']),
        natalRashi = asInt(j['natalRashiIndex']) ?? 0,
        divisor = asInt(j['divisor']) ?? 0,
        direction = asStr(j['direction']),
        count = asInt(j['count']) ?? 0,
        rashi = asStr(j['rashiName']),
        rashiIndex = asInt(j['rashiIndex']) ?? 0,
        house = asInt(j['houseFromVarshaLagna']);
  final String planet, direction, rashi;
  final int natalRashi, divisor, count, rashiIndex;
  final int? house;
}

class TripatakiData {
  TripatakiData(JsonMap j)
      : info = ProvisionalInfo(j),
        targetYear = asInt(j['targetYear']) ?? 0,
        completedYears = asInt(j['completedYears']) ?? 0,
        runningYear = asInt(j['runningYear']) ?? 0,
        solarReturnUtc = asStr(j['solarReturnUtcIso']),
        varshaLagna = asStr(asMap(j['varshaLagna'])['rashiName']),
        placements = [for (final p in asMapList(j['placements'])) TripatakiPlacement(p)];
  final ProvisionalInfo info;
  final int targetYear, completedYears, runningYear;
  final String solarReturnUtc, varshaLagna;
  final List<TripatakiPlacement> placements;
}

/// Sanskrit rashi names by index 1..12 (display only, same order as the engine's RASHIS).
const rashiNamesSa = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
