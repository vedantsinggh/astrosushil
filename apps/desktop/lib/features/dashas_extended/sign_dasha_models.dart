import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// One row of `dashaExt.list` (both the sign and the planetary groups).
class DashaExtSystemEntry {
  const DashaExtSystemEntry({
    required this.group,
    required this.system,
    required this.name,
    required this.implemented,
    required this.provisional,
    required this.label,
    required this.source,
    required this.method,
    required this.notImplementedReason,
  });

  factory DashaExtSystemEntry.fromJson(JsonMap j) => DashaExtSystemEntry(
        group: asStr(j['group']),
        system: asStr(j['system']),
        name: asStr(j['name']),
        implemented: j['implemented'] == true,
        provisional: j['provisional'] == true,
        label: asStr(j['label']),
        source: asStr(j['source']),
        method: j['method'] is String ? j['method'] as String : null,
        notImplementedReason: asStr(j['notImplementedReason']),
      );

  final String group;
  final String system;
  final String name;
  final bool implemented;
  final bool provisional;
  final String label;
  final String source;
  final String? method;
  final String notImplementedReason;

  String get groupLabel => group == 'SIGN' ? 'Sign (rashi) dashas' : 'Planetary dashas';
  String get key => '$group:$system';
}

List<DashaExtSystemEntry> dashaExtEntries(JsonMap j) => [for (final e in asMapList(j['systems'])) DashaExtSystemEntry.fromJson(e)];

/// A dasha period node as returned by the engine (sign dashas carry `signName`, planetary ones `lord`).
class DashaExtPeriod {
  const DashaExtPeriod({
    required this.level,
    required this.label,
    required this.lord,
    required this.start,
    required this.end,
    required this.years,
    required this.isActive,
    required this.isBeforeBirth,
    required this.cycle,
    required this.subPeriods,
  });

  factory DashaExtPeriod.fromJson(JsonMap j) {
    final lord = asStr(j['lord']);
    final sign = asStr(j['signName']);
    final tara = asStr(j['taraName']);
    return DashaExtPeriod(
      level: asInt(j['level']) ?? 1,
      label: sign.isNotEmpty ? sign : (tara.isNotEmpty ? '$tara (${planetName(lord)})' : planetName(lord)),
      lord: lord,
      start: DateTime.parse(asStr(j['startDateIso'])),
      end: DateTime.parse(asStr(j['endDateIso'])),
      years: asDouble(j['nominalYears']) ?? 0,
      isActive: j['isActive'] == true,
      isBeforeBirth: j['isBeforeBirth'] == true,
      cycle: asInt(j['cycle']),
      subPeriods: [for (final s in asMapList(j['subPeriods'])) DashaExtPeriod.fromJson(s)],
    );
  }

  final int level;
  final String label;
  final String lord;
  final DateTime start;
  final DateTime end;
  final double years;
  final bool isActive;
  final bool isBeforeBirth;
  final int? cycle;
  final List<DashaExtPeriod> subPeriods;
}

/// Engine result of `dashaExt.sign.compute` / `dashaExt.planetary.compute` (fields read tolerantly).
class DashaExtTree {
  const DashaExtTree({
    required this.systemName,
    required this.provisional,
    required this.label,
    required this.source,
    required this.notes,
    required this.facts,
    required this.periods,
    required this.currentPath,
    required this.utcOffsetMinutes,
  });

  factory DashaExtTree.fromJson(JsonMap j, {String fallbackName = ''}) {
    final r = asMap(j['result']);
    final cur = asMap(r['currentPeriod']);
    final facts = <(String, String)>[];
    void add(String k, Object? v) {
      final s = asStr(v);
      if (s.isNotEmpty) facts.add((k, s));
    }

    add('Starting sign', r['startingSignName']);
    add('Why', r['startingSignReason']);
    add('Direction', r['directionReason']);
    final sl = asMap(r['sreeLagna']);
    if (sl.isNotEmpty) add('Sree Lagna', '${asStr(sl['signName'])} ${dms(asDouble(sl['degreeInSign']) ?? 0)}');
    if (r['startingLord'] is String) add('First dasha lord', planetName(asStr(r['startingLord'])));
    final bal = asDouble(r['balanceAtBirthYears']);
    if (bal != null) add('Balance at birth', '${bal.toStringAsFixed(4)} years');
    final total = asDouble(r['totalCycleYears']);
    if (total != null) add('First-cycle years', fixed(total, total == total.roundToDouble() ? 0 : 2));
    return DashaExtTree(
      systemName: asStr(r['systemName'], fallbackName),
      provisional: r['provisional'] == true,
      label: asStr(r['provisionalLabel'], asStr(r['label'], 'Provisional – pending client review')),
      source: asStr(r['source']),
      notes: [for (final n in (r['conventionNotes'] is List ? r['conventionNotes'] as List : const [])) asStr(n)],
      facts: facts,
      periods: [for (final p in asMapList(r['mahadashas'])) DashaExtPeriod.fromJson(p)],
      currentPath: asStr(cur['description']),
      utcOffsetMinutes: asInt(j['utcOffsetMinutes']) ?? 0,
    );
  }

  final String systemName;
  final bool provisional;
  final String label;
  final String source;
  final List<String> notes;
  final List<(String, String)> facts;
  final List<DashaExtPeriod> periods;
  final String currentPath;
  final int utcOffsetMinutes;

  int get activeIndex => periods.indexWhere((p) => p.isActive);

  ExportTable periodTable(String title, List<DashaExtPeriod> list, {String subtitle = ''}) => ExportTable(
        title: title,
        subtitle: subtitle,
        columns: const ['#', 'Period', 'Lord', 'Cycle', 'Years', 'Starts', 'Ends'],
        rows: [
          for (var i = 0; i < list.length; i++)
            [
              '${i + 1}',
              list[i].label,
              planetName(list[i].lord),
              list[i].cycle == null ? '' : '${list[i].cycle}',
              list[i].years.toStringAsFixed(list[i].level == 1 ? 2 : 4),
              list[i].isBeforeBirth ? '(before birth)' : localDate(list[i].start.toUtc(), utcOffsetMinutes),
              localDate(list[i].end.toUtc(), utcOffsetMinutes),
            ],
        ],
      );
}
