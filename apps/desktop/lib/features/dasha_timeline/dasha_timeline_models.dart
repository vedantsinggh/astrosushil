import 'package:flutter/material.dart';

import '../../src/engine/inputs.dart';
import '../../src/engine/models.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';

/// The 13 dasha systems the sidecar accepts (engine-sidecar/src/protocol.ts DASHA_SYSTEMS).
const dashaSystemLabels = <String, String>{
  'VIMSHOTTARI': 'Vimshottari',
  'ASHTOTTARI': 'Ashtottari',
  'YOGINI': 'Yogini',
  'KALACHAKRA': 'Kalachakra',
  'CHARA': 'Chara (Jaimini)',
  'NARAYANA': 'Narayana (Jaimini)',
  'STHIRA': 'Sthira',
  'SHOOLA': 'Shoola',
  'DWISAPTATI_SAMA': 'Dwisaptati Sama',
  'SHATABDIKA': 'Shatabdika',
  'CHATURASEETI_SAMA': 'Chaturaseeti Sama',
  'DWADASHOTTARI': 'Dwadashottari',
  'PANCHOTTARI': 'Panchottari',
};

/// `dasha.compute` request with mahadashas and antardashas (two levels).
EngineCall dashaCall(BirthInput birth, String system) => EngineCall('dasha.compute', {'birth': birth.toJson(), 'system': system, 'maxLevel': 2});

/// Short label drawn inside a bar: yogini name, sign or planet abbreviation.
String shortLabel(DashaPeriodNode n) {
  if (n.yoginiName != null) return n.yoginiName!;
  if (n.signName != null) return n.signName!;
  return n.lord == null ? '?' : abbr(n.lord!);
}

/// Long label for tooltips and tables.
String longLabel(DashaPeriodNode n) {
  if (n.yoginiName != null) return '${n.yoginiName} (${n.lord == null ? '' : planetName(n.lord!)})';
  if (n.signName != null) return n.signName!;
  return n.lord == null ? '?' : planetName(n.lord!);
}

/// Display text for a period's dates in the birth place's offset (as reported by the engine).
String periodRange(DashaPeriodNode n, int offsetMinutes) => '${localDate(n.start, offsetMinutes)} – ${localDate(n.end, offsetMinutes)}';

String periodTooltip(DashaPeriodNode n, int offsetMinutes, String levelName) =>
    '${longLabel(n)} $levelName\n${periodRange(n, offsetMinutes)}\n${n.durationYears.toStringAsFixed(2)} years';

/// A stable, theme-aware fill colour per period key (lord / sign / yogini). Pure display.
Color periodColor(DashaPeriodNode n, Brightness b) {
  const keys = [
    'SUN', 'MOON', 'MARS', 'RAHU', 'JUPITER', 'SATURN', 'MERCURY', 'KETU', 'VENUS', //
  ];
  final key = n.yoginiName ?? n.signName ?? n.lord ?? '';
  var i = keys.indexOf(key);
  if (i < 0) i = key.codeUnits.fold<int>(0, (a, c) => a + c);
  final hue = (i * 40.0 + 15) % 360;
  return HSLColor.fromAHSL(1, hue, b == Brightness.dark ? 0.35 : 0.45, b == Brightness.dark ? 0.38 : 0.80).toColor();
}

/// Index of the period containing [t], or null.
int? indexAt(List<DashaPeriodNode> list, DateTime t) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].contains(t)) return i;
  }
  return null;
}
