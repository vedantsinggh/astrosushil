import '../engine/models.dart';
import '../util/format.dart';

/// One text item drawn in a chart cell.
class ChartBody {
  const ChartBody(this.text, {this.retrograde = false, this.highlight = false, this.detail, this.code});
  final String text;
  final bool retrograde;
  final bool highlight;

  /// One-line description shown in tooltips and the details dialog (engine values only).
  final String? detail;

  /// Planet code (e.g. `SUN`) or `LAGNA`, if the body is a graha or the ascendant.
  final String? code;
}

/// Engine placements grouped by sign for drawing. Built from engine outputs only.
class ChartData {
  const ChartData({required this.title, required this.ascSign, required this.bodies, this.subtitle});
  final String title;
  final String? subtitle;
  final int ascSign;
  final Map<int, List<ChartBody>> bodies;

  static String _deg(double? d) => d == null ? '' : ' ${d.floor()}°';

  /// Plain-text listing of every cell (for "Copy chart").
  String asText() {
    final b = StringBuffer('$title${subtitle == null ? '' : ' ($subtitle)'}\n');
    for (var sign = 1; sign <= 12; sign++) {
      final items = bodies[sign] ?? const [];
      final house = ((sign - ascSign + 12) % 12) + 1;
      b.writeln('${signNames[sign - 1]} (house $house): ${items.isEmpty ? '—' : items.map((x) => x.detail ?? x.text).join('; ')}');
    }
    return b.toString();
  }

  factory ChartData.fromNormalized(String title, NormalizedChartModel c, {bool showDegrees = true}) {
    final m = <int, List<ChartBody>>{};
    final a = c.ascendant;
    m.putIfAbsent(a.rashiIndex, () => []).add(ChartBody(
          'As${showDegrees ? _deg(a.degree) : ''}',
          highlight: true,
          code: 'LAGNA',
          detail: 'Lagna ${dms(a.degree)} ${a.sign} · ${a.nakshatra} pada ${a.pada}',
        ));
    for (final name in planetOrder) {
      final p = c.planets.where((x) => x.name == name).firstOrNull;
      if (p == null) continue;
      final flags = [if (p.retrograde) 'retrograde', if (p.combust) 'combust', if (p.dignity.isNotEmpty) titleCase(p.dignity).toLowerCase()];
      m.putIfAbsent(p.rashiIndex, () => []).add(ChartBody(
            '${abbr(p.name)}${showDegrees ? _deg(p.degree) : ''}',
            retrograde: p.retrograde,
            code: p.name,
            detail: '${planetName(p.name)} ${dms(p.degree)} ${p.sign} · ${p.nakshatra} pada ${p.pada}${flags.isEmpty ? '' : ' · ${flags.join(', ')}'}',
          ));
    }
    return ChartData(title: title, ascSign: a.rashiIndex, bodies: m);
  }

  factory ChartData.fromVarga(VargaChartModel v, {bool showDegrees = false}) {
    final m = <int, List<ChartBody>>{};
    m.putIfAbsent(v.ascendantRashi, () => []).add(ChartBody('As', highlight: true, code: 'LAGNA', detail: 'Lagna in ${signNames[v.ascendantRashi - 1]}'));
    for (final name in planetOrder) {
      final p = v.placements.where((x) => x.body == name).firstOrNull;
      if (p == null) continue;
      m.putIfAbsent(p.rashiIndex, () => []).add(ChartBody(
            '${abbr(p.body)}${showDegrees ? _deg(p.degree) : ''}',
            retrograde: p.retrograde,
            code: p.body,
            detail: '${planetName(p.body)} in ${p.rashiName}${p.degree == null ? '' : ' ${dms(p.degree!)}'}${p.retrograde ? ' · retrograde' : ''}',
          ));
    }
    return ChartData(title: '${v.code} ${v.name.split(' (').first}', ascSign: v.ascendantRashi, bodies: m);
  }

  factory ChartData.fromTransit(TransitModel t, {int? natalAsc}) {
    final m = <int, List<ChartBody>>{};
    for (final name in planetOrder) {
      final p = t.planets.where((x) => x.planet == name).firstOrNull;
      if (p == null) continue;
      m.putIfAbsent(p.rashiIndex, () => []).add(ChartBody(
            '${abbr(p.planet)}${_deg(p.degree)}',
            retrograde: p.retrograde,
            code: p.planet,
            detail: '${planetName(p.planet)} ${dms(p.degree)} ${p.rashiName} · ${p.nakshatra} pada ${p.pada}${p.retrograde ? ' · retrograde' : ''}',
          ));
    }
    return ChartData(title: 'Gochara', subtitle: natalAsc != null ? 'houses from natal Lagna' : null, ascSign: natalAsc ?? t.ascendantRashi, bodies: m);
  }

  factory ChartData.fromSigns(String title, int refSign, Map<int, List<String>> occupants) => ChartData(
        title: title,
        ascSign: refSign,
        bodies: {for (final e in occupants.entries) e.key: e.value.map((p) => ChartBody(abbr(p), code: p, detail: planetName(p))).toList()},
      );
}
