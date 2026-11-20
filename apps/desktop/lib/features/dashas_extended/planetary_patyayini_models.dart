import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// Display name of a Patyayini point ('LAGNA' or a planet code).
String patyayiniPointName(String key) => key == 'LAGNA' ? 'Lagna' : planetName(key);

/// One krisamsa / patyamsa row of `dashaExt.patyayini` (values exactly as computed by the engine).
class PatyayiniRowModel {
  const PatyayiniRowModel({required this.key, required this.order, required this.krishamsha, required this.patyamsha, required this.fraction});
  final String key;
  final int order;
  final double krishamsha;
  final double patyamsha;
  final double fraction;

  factory PatyayiniRowModel.fromJson(JsonMap j) => PatyayiniRowModel(
        key: asStr(j['key']),
        order: asInt(j['order']) ?? 0,
        krishamsha: asDouble(j['krishamsha']) ?? 0,
        patyamsha: asDouble(j['patyamsha']) ?? 0,
        fraction: asDouble(j['fraction']) ?? 0,
      );
}

/// One dasha / antardasha period of `dashaExt.patyayini`.
class PatyayiniPeriodModel {
  const PatyayiniPeriodModel({
    required this.level,
    required this.key,
    required this.days,
    required this.start,
    required this.end,
    required this.utcOffsetMinutes,
    required this.isActive,
    required this.subPeriods,
  });
  final int level;
  final String key;
  final double days;
  final DateTime start;
  final DateTime end;
  final int utcOffsetMinutes;
  final bool isActive;
  final List<PatyayiniPeriodModel> subPeriods;

  factory PatyayiniPeriodModel.fromJson(JsonMap j) => PatyayiniPeriodModel(
        level: asInt(j['level']) ?? 1,
        key: asStr(j['key']),
        days: asDouble(j['days']) ?? 0,
        start: DateTime.parse(asStr(j['startDateIso'])).toUtc(),
        end: DateTime.parse(asStr(j['endDateIso'])).toUtc(),
        utcOffsetMinutes: asInt(j['utcOffsetMinutes']) ?? 0,
        isActive: j['isActive'] == true,
        subPeriods: asMapList(j['subPeriods']).map(PatyayiniPeriodModel.fromJson).toList(),
      );

  String get startLabel => localDateTime(start, utcOffsetMinutes);
  String get endLabel => localDateTime(end, utcOffsetMinutes);
}

/// Result of `dashaExt.patyayini`.
class PatyayiniModel {
  const PatyayiniModel({
    required this.targetYear,
    required this.provisional,
    required this.source,
    required this.notes,
    required this.solarReturn,
    required this.nextSolarReturn,
    required this.utcOffsetMinutes,
    required this.yearLengthDays,
    required this.placeName,
    required this.rows,
    required this.periods,
  });
  final int targetYear;
  final bool provisional;
  final String source;
  final List<String> notes;
  final DateTime solarReturn;
  final DateTime nextSolarReturn;
  final int utcOffsetMinutes;
  final double yearLengthDays;
  final String placeName;
  final List<PatyayiniRowModel> rows;
  final List<PatyayiniPeriodModel> periods;

  factory PatyayiniModel.fromJson(JsonMap j) {
    final loc = asMap(j['annualLocation']);
    return PatyayiniModel(
      targetYear: asInt(j['targetYear']) ?? 0,
      provisional: j['provisional'] == true,
      source: asStr(j['source']),
      notes: [for (final n in (j['conventionNotes'] is List ? j['conventionNotes'] as List : const [])) asStr(n)],
      solarReturn: DateTime.parse(asStr(j['solarReturnUtcIso'])).toUtc(),
      nextSolarReturn: DateTime.parse(asStr(j['nextSolarReturnUtcIso'])).toUtc(),
      utcOffsetMinutes: asInt(j['utcOffsetMinutes']) ?? 0,
      yearLengthDays: asDouble(j['yearLengthDays']) ?? 0,
      placeName: asStr(loc['placeName'], asStr(loc['timezone'])),
      rows: asMapList(j['rows']).map(PatyayiniRowModel.fromJson).toList(),
      periods: asMapList(j['periods']).map(PatyayiniPeriodModel.fromJson).toList(),
    );
  }

  /// Index of the active dasha (engine-marked), or -1.
  int get activeIndex => periods.indexWhere((p) => p.isActive);

  /// Dasha table: one row per point in krisamsa order, joining the engine's rows and periods.
  ExportTable get dashaTable => ExportTable(
        title: 'Patyayini dasha $targetYear-${targetYear + 1}',
        subtitle: 'Tajika year from ${localDateTime(solarReturn, utcOffsetMinutes)} to ${localDateTime(nextSolarReturn, utcOffsetMinutes)}',
        columns: const ['#', 'Dasha of', 'Krisamsa', 'Patyamsa', 'Share', 'Days', 'Starts', 'Ends'],
        rows: [
          for (var i = 0; i < periods.length; i++)
            [
              '${i + 1}',
              patyayiniPointName(periods[i].key),
              i < rows.length ? dms(rows[i].krishamsha, seconds: false) : '',
              i < rows.length ? dms(rows[i].patyamsha, seconds: false) : '',
              i < rows.length ? rows[i].fraction.toStringAsFixed(4) : '',
              periods[i].days.toStringAsFixed(2),
              periods[i].startLabel,
              periods[i].endLabel,
            ],
        ],
        footnote: 'Provisional – pending client review. Source: $source',
      );

  /// Antardasha table of one dasha.
  ExportTable antardashaTable(int index) {
    final p = periods[index];
    return ExportTable(
      title: 'Patyayini antardashas in ${patyayiniPointName(p.key)} dasha ($targetYear)',
      columns: const ['#', 'Antardasha of', 'Days', 'Starts', 'Ends'],
      rows: [
        for (var i = 0; i < p.subPeriods.length; i++)
          [
            '${i + 1}',
            patyayiniPointName(p.subPeriods[i].key),
            p.subPeriods[i].days.toStringAsFixed(2),
            p.subPeriods[i].startLabel,
            p.subPeriods[i].endLabel,
          ],
      ],
    );
  }
}
