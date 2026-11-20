import 'engine_client.dart';
import 'inputs.dart';
import 'models.dart';

/// Typed facade over the sidecar protocol. One method per protocol method.
///
/// Every request carries [options] as `params.options` (ayanamsa, node type), so one sidecar
/// process serves any configuration; see [withOptions].
class AstroEngine {
  AstroEngine(this.client, [this.options = const CalcOptions()]);
  final EngineClient client;

  /// Calculation options sent with every request.
  final CalcOptions options;

  /// The same engine process with other calculation options.
  AstroEngine withOptions(CalcOptions o) => o == options ? this : AstroEngine(client, o);

  Future<T> _call<T>(String method, Map<String, Object?> params, T Function(Map<String, Object?>) decode) =>
      client.callTyped(method, {...params, 'options': options.toJson()}, decode);

  Future<Json> info() => _call('engine.info', const {}, (j) => j);

  Future<ChartResult> chart(BirthInput b) => _call('chart.compute', {'birth': b.toJson()}, ChartResult.new);

  Future<Map<String, VargaChartModel>> vargas(BirthInput b, [List<String>? codes]) => _call(
        'vargas.compute',
        {'birth': b.toJson(), if (codes != null) 'vargas': codes},
        (j) => {
          for (final e in (j['vargas'] as Map<String, Object?>).entries) e.key: VargaChartModel(e.value as Json),
        },
      );

  /// Target date sent with dasha requests. Fixed for the session so the sidecar's dasha cache can
  /// serve lazy sub-period requests for the same tree.
  static final String dashaTargetDate = DateTime.now().toUtc().toIso8601String();

  Future<DashaResultModel> dasha(BirthInput b, String system, {int maxLevel = 3}) => _call(
        'dasha.compute',
        {'birth': b.toJson(), 'system': system, 'maxLevel': maxLevel, 'targetDate': dashaTargetDate},
        DashaResultModel.new,
      );

  /// Children of the dasha node at [path] in the tree computed to [maxLevel] (lazy deep levels).
  Future<DashaSubPeriodsModel> dashaSubPeriods(BirthInput b, String system, List<int> path, {required int maxLevel}) => _call(
        'dasha.subPeriods',
        {'birth': b.toJson(), 'system': system, 'maxLevel': maxLevel, 'targetDate': dashaTargetDate, 'path': path},
        DashaSubPeriodsModel.new,
      );

  /// Ingress / station events between [start] and [end] (at most 3 years), with zone offsets.
  Future<TransitTimelineModel> transitTimeline(DateTime start, DateTime end, {String? timezone}) => _call(
        'transitTimeline.compute',
        {'startIso': start.toUtc().toIso8601String(), 'endIso': end.toUtc().toIso8601String(), if (timezone != null) 'timezone': timezone},
        TransitTimelineModel.new,
      );

  Future<PanchangResultModel> panchang(BirthInput moment) =>
      _call('panchang.compute', {'moment': moment.toJson()}, PanchangResultModel.new);

  Future<AshtakavargaModel> ashtakavarga(BirthInput b) =>
      _call('ashtakavarga.compute', {'birth': b.toJson()}, AshtakavargaModel.new);

  Future<StrengthModel> strength(BirthInput b) => _call('strength.compute', {'birth': b.toJson()}, StrengthModel.new);

  Future<TransitModel> transit(BirthInput? natal, BirthInput moment) => _call(
        'transit.compute',
        {if (natal != null) 'birth': natal.toJson(), 'moment': moment.toJson()},
        TransitModel.new,
      );

  Future<MatchModel> match(BirthInput boy, BirthInput girl) =>
      _call('matchmaking.compute', {'boy': boy.toJson(), 'girl': girl.toJson()}, MatchModel.new);

  Future<KpModel> kp(BirthInput b) => _call('kp.compute', {'birth': b.toJson()}, KpModel.new);

  Future<List<SudarshanaRingModel>> sudarshana(BirthInput b) =>
      _call('sudarshana.compute', {'birth': b.toJson()}, SudarshanaRingModel.listFrom);

  Future<List<EclipseModel>> eclipses(DateTime start, DateTime end) => _call(
        'eclipses.find',
        {'startIso': start.toUtc().toIso8601String(), 'endIso': end.toUtc().toIso8601String()},
        EclipseModel.listFrom,
      );

  /// Local civil date/time (and UTC offset) in [timezone] at [utc] (default now), via the engine.
  Future<({String date, String time, int utcOffsetMinutes})> localTime(String timezone, [DateTime? utc]) => _call(
        'time.local',
        {'timezone': timezone, if (utc != null) 'utcIso': utc.toUtc().toIso8601String()},
        (j) => (date: j['date'] as String, time: j['time'] as String, utcOffsetMinutes: (j['utcOffsetMinutes'] as num).toInt()),
      );

  /// Methods whose results are shown as structured tables generically (yogas, jaimini, special
  /// points, varshaphala, avakhada, chart variants, prashna, transit timeline).
  Future<Json> raw(String method, Map<String, Object?> params) => _call(method, params, (j) => j);
}
