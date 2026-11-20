/// Typed views over engine sidecar results. These classes only *read* engine output;
/// they never compute astrological values.
library;

typedef Json = Map<String, Object?>;

Json _m(Object? v) => v is Map<String, Object?> ? v : const <String, Object?>{};
List<Object?> _l(Object? v) => v is List<Object?> ? v : const <Object?>[];
double _d(Object? v, [double fallback = 0]) => v is num ? v.toDouble() : fallback;
double? _dn(Object? v) => v is num ? v.toDouble() : null;
int _i(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;
int? _in(Object? v) => v is num ? v.toInt() : null;
String _s(Object? v, [String fallback = '']) => v is String ? v : (v == null ? fallback : '$v');
String? _sn(Object? v) => v is String ? v : null;
bool _b(Object? v) => v == true;
DateTime? _dt(Object? v) => v is String ? DateTime.tryParse(v)?.toUtc() : null;

// ---------------------------------------------------------------------------
// Natal chart
// ---------------------------------------------------------------------------

class AscendantInfo {
  AscendantInfo(Json j)
      : sign = _s(j['sign']),
        rashiIndex = _i(j['rashiIndex'], 1),
        degree = _d(j['degree']),
        absoluteDegree = _d(j['absoluteDegree']),
        nakshatra = _s(j['nakshatra']),
        nakshatraIndex = _i(j['nakshatraIndex'], 1),
        pada = _i(j['pada'], 1),
        lord = _s(j['lord']);
  final String sign;
  final int rashiIndex;
  final double degree;
  final double absoluteDegree;
  final String nakshatra;
  final int nakshatraIndex;
  final int pada;
  final String lord;
}

class PlanetInfo {
  PlanetInfo(Json j)
      : name = _s(j['name']),
        sign = _s(j['sign']),
        rashiIndex = _i(j['rashiIndex'], 1),
        degree = _d(j['degree']),
        absoluteDegree = _d(j['absoluteDegree']),
        house = _i(j['house'], 1),
        nakshatra = _s(j['nakshatra']),
        nakshatraIndex = _i(j['nakshatraIndex'], 1),
        pada = _i(j['pada'], 1),
        nakshatraLord = _s(j['nakshatraLord']),
        retrograde = _b(j['retrograde']),
        combust = _b(j['combust']),
        dignity = _s(j['dignity']),
        lordship = _l(j['lordship']).map((e) => _i(e)).toList(),
        speed = _dn(j['speedLongitude']),
        charaKaraka = _sn(j['charaKaraka']),
        avastha = _sn(_m(j['avastha'])['baladi']);
  final String name;
  final String sign;
  final int rashiIndex;
  final double degree;
  final double absoluteDegree;
  final int house;
  final String nakshatra;
  final int nakshatraIndex;
  final int pada;
  final String nakshatraLord;
  final bool retrograde;
  final bool combust;
  final String dignity;
  final List<int> lordship;
  final double? speed;
  final String? charaKaraka;
  final String? avastha;
}

class HouseInfo {
  HouseInfo(Json j)
      : number = _i(j['number'], 1),
        sign = _s(j['sign']),
        rashiIndex = _i(j['rashiIndex'], 1),
        lord = _s(j['lord']),
        occupants = _l(j['occupants']).map((e) => _s(e)).toList(),
        cuspLongitude = _d(j['cuspLongitude']),
        startLongitude = _dn(j['startLongitude']),
        endLongitude = _dn(j['endLongitude']);
  final int number;
  final String sign;
  final int rashiIndex;
  final String lord;
  final List<String> occupants;
  final double cuspLongitude;

  /// Bhava boundaries (sandhis) where the engine provides them (Bhava Chalit), else null.
  final double? startLongitude;
  final double? endLongitude;
}

/// Engine `NormalizedChart` (D1 or a normalised varga).
class NormalizedChartModel {
  NormalizedChartModel(Json j)
      : ascendant = AscendantInfo(_m(j['ascendant'])),
        planets = _l(j['planets']).map((e) => PlanetInfo(_m(e))).toList(),
        houses = _l(j['houses']).map((e) => HouseInfo(_m(e))).toList();
  final AscendantInfo ascendant;
  final List<PlanetInfo> planets;
  final List<HouseInfo> houses;
}

class PanchangElement {
  PanchangElement(Json j)
      : index = _i(j['index']),
        name = _s(j['name']),
        extra = _sn(j['paksha']) ?? _sn(j['lord']) ?? _sn(j['type']),
        pada = _in(j['pada']),
        completion = _dn(j['completionPercentage']),
        start = _dt(j['startIso']),
        end = _dt(j['endIso']);
  final int index;
  final String name;
  final String? extra;
  final int? pada;
  final double? completion;
  final DateTime? start;
  final DateTime? end;
}

class PanchangInstant {
  PanchangInstant(Json j)
      : tithi = PanchangElement(_m(j['tithi'])),
        vara = PanchangElement({..._m(j['vara']), 'index': _m(j['vara'])['dayIndex']}),
        nakshatra = PanchangElement(_m(j['nakshatra'])),
        yoga = PanchangElement(_m(j['yoga'])),
        karana = PanchangElement(_m(j['karana'])),
        amantaMasa = _sn(_m(j['hinduCalendar'])['amantaMasa']),
        purnimantaMasa = _sn(_m(j['hinduCalendar'])['purnimantaMasa']),
        isAdhika = _b(_m(j['hinduCalendar'])['isAdhika']);
  final PanchangElement tithi;
  final PanchangElement vara;
  final PanchangElement nakshatra;
  final PanchangElement yoga;
  final PanchangElement karana;
  final String? amantaMasa;
  final String? purnimantaMasa;
  final bool isAdhika;
}

/// Result of `chart.compute`.
class ChartResult {
  ChartResult(Json j)
      : utc = _dt(j['utcIso']) ?? DateTime.utc(1970),
        julianDayUT = _d(j['julianDayUT']),
        utcOffsetMinutes = _i(j['timezoneOffsetMinutes']),
        ayanamsa = _d(j['ayanamsa']),
        // `options` is the engine's echo of the request's calculation options (engine 0.2.0);
        // `config` is the configuration actually applied (older engines send only this).
        ayanamsaName = _sn(_m(j['options'])['ayanamsa']) ?? _s(_m(j['config'])['ayanamsa']),
        houseSystem = _s(_m(j['config'])['houseSystem']),
        nodeCalculation = _sn(_m(j['options'])['nodeType']) ?? _s(_m(j['config'])['nodeCalculation']),
        engineVersion = _s(j['engineVersion']),
        isDayBirth = _b(j['isDayBirth']),
        rasi = NormalizedChartModel(_m(j['rasi'])),
        navamsa = NormalizedChartModel(_m(j['navamsa'])),
        panchang = PanchangInstant(_m(j['panchang']));
  final DateTime utc;
  final double julianDayUT;
  final int utcOffsetMinutes;
  final double ayanamsa;
  final String ayanamsaName;
  final String houseSystem;
  final String nodeCalculation;
  final String engineVersion;
  final bool isDayBirth;
  final NormalizedChartModel rasi;
  final NormalizedChartModel navamsa;
  final PanchangInstant panchang;
}

// ---------------------------------------------------------------------------
// Vargas
// ---------------------------------------------------------------------------

class VargaPlacementModel {
  VargaPlacementModel(this.body, Json j)
      : rashiIndex = _i(j['rashiIndex'], 1),
        rashiName = _s(j['rashiName']),
        degree = _dn(j['degreeInVarga']),
        house = _in(j['house']),
        retrograde = _b(j['isRetrograde']);
  final String body;
  final int rashiIndex;
  final String rashiName;
  final double? degree;
  final int? house;
  final bool retrograde;
}

class VargaChartModel {
  VargaChartModel(Json j)
      : code = _s(j['vargaType']),
        name = _s(j['name']),
        division = _i(j['division'], 1),
        rule = _s(j['calculationRule']),
        ascendantRashi = _i(_m(j['ascendant'])['rashiIndex'], 1),
        placements = _m(j['placements'])
            .entries
            .where((e) => e.key != 'Ascendant')
            .map((e) => VargaPlacementModel(e.key, _m(e.value)))
            .toList();
  final String code;
  final String name;
  final int division;
  final String rule;
  final int ascendantRashi;
  final List<VargaPlacementModel> placements;
}

// ---------------------------------------------------------------------------
// Dashas (all systems share a generic period node shape)
// ---------------------------------------------------------------------------

class DashaPeriodNode {
  DashaPeriodNode(Json j, {this.path = const []})
      : level = _i(j['level'], 1),
        lord = _sn(j['lord']),
        signName = _sn(j['signName']),
        yoginiName = _sn(j['yoginiName']),
        start = _dt(j['startDateIso']) ?? DateTime.utc(1970),
        end = _dt(j['endDateIso']) ?? DateTime.utc(1970),
        durationYears = _d(j['durationYears']),
        nominalYears = _d(j['nominalYears']),
        isBirthDasha = _b(j['isBirthDasha']),
        isBeforeBirth = _b(j['isBeforeBirth']),
        children = parseList(_l(j['subPeriods']), path);
  final int level;
  final String? lord;
  final String? signName;
  final String? yoginiName;
  final DateTime start;
  final DateTime end;
  final double durationYears;
  final double nominalYears;
  final bool isBirthDasha;
  final bool isBeforeBirth;
  final List<DashaPeriodNode> children;

  /// 0-based indices into the engine's period lists (used to fetch deeper levels lazily).
  final List<int> path;

  /// Parses an engine period list, recording each node's position in [parent] order.
  static List<DashaPeriodNode> parseList(List<Object?> list, [List<int> parent = const []]) =>
      [for (var i = 0; i < list.length; i++) DashaPeriodNode(_m(list[i]), path: [...parent, i])];

  /// Display label: sign for rashi dashas, yogini name for Yogini, else the planet lord.
  String get label => yoginiName != null ? '$yoginiName (${lord ?? ''})' : (signName ?? lord ?? '?');

  bool contains(DateTime t) => !t.isBefore(start) && t.isBefore(end);
}

class DashaResultModel {
  DashaResultModel(Json j)
      : system = _s(j['system']),
        utcOffsetMinutes = _i(j['utcOffsetMinutes']),
        totalCycleYears = _dn(j['totalCycleYears']),
        isEligible = _m(j['result'])['isEligible'] != false,
        eligibilityReason = _sn(_m(_m(j['result'])['eligibility'])['reason']),
        balanceAtBirthYears = _dn(_m(j['result'])['balanceAtBirthYears']),
        periods = DashaPeriodNode.parseList(_l(_m(j['result'])['mahadashas'] ?? _m(j['result'])['periods'])).where((n) => !n.isBeforeBirth).toList();
  final String system;
  final int utcOffsetMinutes;
  final double? totalCycleYears;
  final bool isEligible;
  final String? eligibilityReason;
  final double? balanceAtBirthYears;
  final List<DashaPeriodNode> periods;
}

/// Result of `dasha.subPeriods` (children of one node, fetched lazily for deep levels).
class DashaSubPeriodsModel {
  DashaSubPeriodsModel(Json j)
      : path = _l(j['path']).map((e) => _i(e)).toList(),
        periods = DashaPeriodNode.parseList(_l(j['periods']), _l(j['path']).map((e) => _i(e)).toList());
  final List<int> path;
  final List<DashaPeriodNode> periods;
}

// ---------------------------------------------------------------------------
// Panchang + day divisions
// ---------------------------------------------------------------------------

class TimedPeriod {
  TimedPeriod(Json j)
      : name = _s(j['name'] ?? j['lord']),
        lord = _sn(j['lord']),
        quality = _sn(j['quality']),
        isDay = j['isDay'] != false,
        start = _dt(j['startIso']) ?? DateTime.utc(1970),
        end = _dt(j['endIso']) ?? DateTime.utc(1970);
  final String name;
  final String? lord;
  final String? quality;
  final bool isDay;
  final DateTime start;
  final DateTime end;
}

class DayDivisionsModel {
  DayDivisionsModel(Json j, {int? offsetMinutes})
      : sunrise = _dt(_m(j['bounds'])['sunriseIso']) ?? DateTime.utc(1970),
        sunset = _dt(_m(j['bounds'])['sunsetIso']) ?? DateTime.utc(1970),
        nextSunrise = _dt(_m(j['bounds'])['nextSunriseIso']) ?? DateTime.utc(1970),
        weekdayLord = _s(_m(j['bounds'])['weekdayLord']),
        horas = _l(j['horas']).map((e) => TimedPeriod(_m(e))).toList(),
        choghadiya = _l(j['choghadiya']).map((e) => TimedPeriod(_m(e))).toList(),
        kaalas = [
          TimedPeriod(_m(j['rahuKaala'])),
          TimedPeriod(_m(j['yamagandaKaala'])),
          TimedPeriod(_m(j['gulikaKaala'])),
          TimedPeriod(_m(j['abhijitMuhurta'])),
        ],
        utcOffsetMinutes = offsetMinutes ?? _i(j['utcOffsetMinutes']);
  final DateTime sunrise;
  final DateTime sunset;
  final DateTime nextSunrise;
  final String weekdayLord;
  final List<TimedPeriod> horas;
  final List<TimedPeriod> choghadiya;
  final List<TimedPeriod> kaalas;
  final int utcOffsetMinutes;
}

class PanchangResultModel {
  PanchangResultModel(Json j)
      : utcOffsetMinutes = _i(j['utcOffsetMinutes']),
        instant = PanchangInstant(_m(j['instant'])),
        transitions = _l(_m(j['daily'])['transitions'])
            .map((e) => _m(e))
            .map((e) => (type: _s(e['type']), name: _s(e['name']), at: _dt(e['timestampIso']) ?? DateTime.utc(1970)))
            .toList(),
        dayDivisions = DayDivisionsModel(_m(j['dayDivisions']), offsetMinutes: _i(j['utcOffsetMinutes']));
  final int utcOffsetMinutes;
  final PanchangInstant instant;
  final List<({String type, String name, DateTime at})> transitions;
  final DayDivisionsModel dayDivisions;
}

// ---------------------------------------------------------------------------
// Ashtakavarga
// ---------------------------------------------------------------------------

class ShodhanaRow {
  ShodhanaRow(this.planet, Json j)
      : trikona = _l(j['trikonaReduced']).map((x) => _i(x)).toList(),
        ekadhipatya = _l(j['ekadhipatyaReduced']).map((x) => _i(x)).toList(),
        trikonaTotal = _in(j['totalTrikonaPoints']),
        ekadhipatyaTotal = _in(j['totalEkadhipatyaPoints']);
  final String planet;
  final List<int> trikona;
  final List<int> ekadhipatya;
  final int? trikonaTotal;
  final int? ekadhipatyaTotal;
}

class PindaRow {
  PindaRow(this.planet, Json j)
      : rashiPinda = _in(j['rashiPinda']),
        grahaPinda = _in(j['grahaPinda']),
        shodhyaPinda = _in(j['shodhyaPinda']);
  final String planet;
  final int? rashiPinda;
  final int? grahaPinda;
  final int? shodhyaPinda;
}

class AshtakavargaModel {
  AshtakavargaModel(Json j)
      : bav = {
          for (final e in _m(j['bav']).entries) e.key: _l(_m(e.value)['signList']).map((x) => _i(x)).toList(),
        },
        prastara = {
          for (final e in _m(j['bav']).entries)
            e.key: {for (final c in _m(_m(e.value)['prastara']).entries) c.key: _l(c.value).map((x) => _i(x)).toList()},
        },
        sav = _l(_m(j['sav'])['signList']).map((x) => _i(x)).toList(),
        shodhana = {for (final e in _m(j['shodhana']).entries) e.key: ShodhanaRow(e.key, _m(e.value))},
        pinda = {for (final e in _m(j['pinda']).entries) e.key: PindaRow(e.key, _m(e.value))};
  final Map<String, List<int>> bav;
  final Map<String, Map<String, List<int>>> prastara;
  final List<int> sav;

  /// Trikona and Ekadhipatya Shodhana as computed by the engine (empty if not returned).
  final Map<String, ShodhanaRow> shodhana;

  /// Rashi, Graha and Shodhya Pinda as computed by the engine (empty if not returned).
  final Map<String, PindaRow> pinda;
}

// ---------------------------------------------------------------------------
// Strength
// ---------------------------------------------------------------------------

class ShadbalaRow {
  ShadbalaRow(Json j)
      : planet = _s(j['planet']),
        sthana = _d(_m(j['sthanaBala'])['total']),
        dig = _d(j['digBala']),
        kala = _d(_m(j['kalaBala'])['total']),
        cheshta = _d(j['cheshtaBala']),
        naisargika = _d(j['naisargikaBala']),
        drik = _d(j['drikBala']),
        total = _d(j['totalShashtiamsas']),
        rupas = _d(j['totalRupas']),
        required = _d(j['minimumRequirementRupas']),
        ratio = _d(j['ratio']),
        isStrong = _b(j['isStrong']),
        rank = _i(j['rank']);
  final String planet;
  final double sthana, dig, kala, cheshta, naisargika, drik, total, rupas, required, ratio;
  final bool isStrong;
  final int rank;
}

class BhavaBalaRow {
  BhavaBalaRow(Json j)
      : house = _i(j['houseNumber']),
        sign = _s(j['sign']),
        lord = _s(j['lord']),
        total = _d(j['totalShashtiamsas']),
        rupas = _d(j['totalRupas']),
        rank = _i(j['rank']);
  final int house;
  final String sign;
  final String lord;
  final double total, rupas;
  final int rank;
}

class IshtaKashtaRow {
  IshtaKashtaRow(Json j)
      : planet = _s(j['planet']),
        ishta = _d(j['ishtaPhala']),
        kashta = _d(j['kashtaPhala']),
        net = _d(j['net']);
  final String planet;
  final double ishta, kashta, net;
}

class VimshopakaRow {
  VimshopakaRow(this.planet, Json j)
      : shad = _d(j['shadvargaScore']),
        sapta = _d(j['saptavargaScore']),
        dasha = _d(j['dashavargaScore']),
        shodasha = _d(j['shodashavargaScore']);
  final String planet;
  final double shad, sapta, dasha, shodasha;
}

class StrengthModel {
  StrengthModel(Json j)
      : shadbala = (_l(_m(j['shadbala'])['summary']).map((e) => ShadbalaRow(_m(e))).toList()),
        bhavaBala = _l(_m(j['bhavaBala'])['houses']).map((e) => BhavaBalaRow(_m(e))).toList(),
        ishtaKashta = _l(j['ishtaKashta']).map((e) => IshtaKashtaRow(_m(e))).toList(),
        vimshopaka = _m(_m(j['vimshopaka'])['planets']).entries.map((e) => VimshopakaRow(e.key, _m(e.value))).toList();
  final List<ShadbalaRow> shadbala;
  final List<BhavaBalaRow> bhavaBala;
  final List<IshtaKashtaRow> ishtaKashta;
  final List<VimshopakaRow> vimshopaka;
}

// ---------------------------------------------------------------------------
// Transits
// ---------------------------------------------------------------------------

class TransitPlanetRow {
  TransitPlanetRow(Json j)
      : planet = _s(j['planet']),
        longitude = _d(j['longitude']),
        rashiIndex = _i(j['rashiIndex'], 1),
        rashiName = _s(j['rashiName']),
        degree = _d(j['degreeInRashi']),
        nakshatra = _s(j['nakshatraName']),
        pada = _i(j['pada'], 1),
        retrograde = _b(j['isRetrograde']),
        house = _in(j['house']);
  final String planet;
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degree;
  final String nakshatra;
  final int pada;
  final bool retrograde;
  final int? house;
}

class TransitToMoonRow {
  TransitToMoonRow(Json j)
      : planet = _s(j['transitPlanet']),
        houseFromMoon = _i(j['houseFromMoon']),
        bav = _in(j['bavScore']),
        favourable = _m(j['vedha'])['isFavourableHouse'] == true,
        obstructed = _m(j['vedha'])['isObstructed'] == true;
  final String planet;
  final int houseFromMoon;
  final int? bav;
  final bool favourable;
  final bool obstructed;
}

class TransitModel {
  TransitModel(Json j)
      : utcOffsetMinutes = _i(j['utcOffsetMinutes']),
        ascendantRashi = _i(_m(_m(j['transitChart'])['ascendant'])['rashiIndex'], 1),
        planets = _m(_m(j['transitChart'])['planets']).values.map((e) => TransitPlanetRow(_m(e))).toList(),
        toMoon = _l(j['transitToMoon']).map((e) => TransitToMoonRow(_m(e))).toList(),
        kakshas = _l(j['gocharaKakshas']).map((e) => _s(_m(e)['description'])).toList();
  final int utcOffsetMinutes;
  final int ascendantRashi;
  final List<TransitPlanetRow> planets;
  final List<TransitToMoonRow> toMoon;
  final List<String> kakshas;
}

/// One event of `transitTimeline.compute` (engine ingress / station events).
class TimelineEvent {
  TimelineEvent(Json j)
      : type = _s(j['eventType']),
        planet = _s(j['planet']),
        at = _dt(j['timestampIso']) ?? DateTime.utc(1970),
        utcOffsetMinutes = _in(j['utcOffsetMinutes']),
        fromName = _sn(_m(j['fromSign'])['name']) ?? _sn(_m(j['fromNakshatra'])['name']),
        toName = _sn(_m(j['toSign'])['name']) ?? _sn(_m(j['toNakshatra'])['name']) ?? _sn(j['rashiName']),
        fromIndex = _in(_m(j['fromSign'])['index']) ?? _in(_m(j['fromNakshatra'])['index']),
        toIndex = _in(_m(j['toSign'])['index']) ?? _in(_m(j['toNakshatra'])['index']) ?? _in(j['rashiIndex']),
        pada = _in(j['pada']),
        longitude = _dn(j['longitude']);
  final String type; // SIGN_INGRESS | NAKSHATRA_INGRESS | RETROGRADE_STATION | DIRECT_STATION
  final String planet;
  final DateTime at;
  final int? utcOffsetMinutes;
  final String? fromName;
  final String? toName;
  final int? fromIndex;
  final int? toIndex;
  final int? pada;
  final double? longitude;

  bool get isSignIngress => type == 'SIGN_INGRESS';
  bool get isNakshatraIngress => type == 'NAKSHATRA_INGRESS';
  bool get isStation => type == 'RETROGRADE_STATION' || type == 'DIRECT_STATION';
}

class TransitTimelineModel {
  TransitTimelineModel(Json j)
      : start = _dt(j['startDateIso']) ?? DateTime.utc(1970),
        end = _dt(j['endDateIso']) ?? DateTime.utc(1970),
        planets = _l(j['planets']).map((e) => _s(e)).toList(),
        events = _l(j['events']).map((e) => TimelineEvent(_m(e))).toList();
  final DateTime start;
  final DateTime end;
  final List<String> planets;
  final List<TimelineEvent> events;
}

// ---------------------------------------------------------------------------
// Matchmaking
// ---------------------------------------------------------------------------

class KootaRow {
  KootaRow(Json j)
      : name = _s(j['name']),
        maxPoints = _d(j['maxPoints']),
        obtained = _d(j['obtainedPoints']),
        description = _s(j['description']);
  final String name;
  final double maxPoints;
  final double obtained;
  final String description;
}

class ManglikSide {
  ManglikSide(Json j)
      : status = _s(j['status']),
        effective = _b(j['effectiveManglik']),
        cancellations = _l(j['cancellationFactors']).map((e) => _s(e)).toList();
  final String status;
  final bool effective;
  final List<String> cancellations;
}

class MatchModel {
  MatchModel(Json j)
      : kootas = _m(_m(j['ashtakoota'])['kootas']).values.map((e) => KootaRow(_m(e))).toList(),
        total = _d(_m(j['ashtakoota'])['totalObtainedPoints']),
        effective = _d(_m(j['ashtakoota'])['totalEffectivePoints']),
        max = _d(_m(j['ashtakoota'])['totalMaxPoints'], 36),
        boyMoon = '${_s(_m(j['personA'])['rashiName'])} / ${_s(_m(j['personA'])['nakshatraName'])} ${_i(_m(j['personA'])['pada'])}',
        girlMoon = '${_s(_m(j['personB'])['rashiName'])} / ${_s(_m(j['personB'])['nakshatraName'])} ${_i(_m(j['personB'])['pada'])}',
        boyManglik = ManglikSide(_m(_m(j['manglikComparison'])['personA'])),
        girlManglik = ManglikSide(_m(_m(j['manglikComparison'])['personB']));
  final List<KootaRow> kootas;
  final double total;
  final double effective;
  final double max;
  final String boyMoon;
  final String girlMoon;
  final ManglikSide boyManglik;
  final ManglikSide girlManglik;
}

// ---------------------------------------------------------------------------
// Eclipses, KP, Sudarshana
// ---------------------------------------------------------------------------

class EclipseModel {
  EclipseModel(Json j)
      : body = _s(j['body']),
        kind = _s(j['kind']),
        peak = _dt(j['peakIso']) ?? DateTime.utc(1970),
        obscuration = _dn(j['obscuration']),
        rashiIndex = _i(j['rashiIndex'], 1),
        nakshatraIndex = _i(j['nakshatraIndex'], 1),
        peakLatitude = _dn(j['peakLatitude']),
        peakLongitude = _dn(j['peakLongitude']);
  final String body;
  final String kind;
  final DateTime peak;
  final double? obscuration;
  final int rashiIndex;
  final int nakshatraIndex;
  final double? peakLatitude;
  final double? peakLongitude;

  static List<EclipseModel> listFrom(Json j) => _l(j['eclipses']).map((e) => EclipseModel(_m(e))).toList();
}

class KpRow {
  KpRow(this.label, Json j)
      : longitude = _d(j['cuspLongitude'] ?? j['longitude']),
        rashiName = _s(j['rashiName']),
        nakshatraName = _s(j['nakshatraName']),
        signLord = _s(j['signLord']),
        starLord = _s(j['starLord']),
        subLord = _s(j['subLord']),
        subSubLord = _s(j['subSubLord']);
  final String label;
  final double longitude;
  final String rashiName, nakshatraName, signLord, starLord, subLord, subSubLord;
}

class KpModel {
  KpModel(Json j)
      : cusps = _l(j['cusps']).map((e) => KpRow('Cusp ${_i(_m(e)['houseNumber'])}', _m(e))).toList(),
        planets = _m(j['planets']).entries.map((e) => KpRow(e.key, _m(e.value))).toList(),
        cuspSystem = _sn(j['cuspSystem']),
        ayanamsaType = _sn(j['ayanamsaType']),
        ayanamsaValue = _dn(j['ayanamsaValue']),
        raw = j;
  final List<KpRow> cusps;

  /// House system of the cusps (engine 0.2.0: `PLACIDUS`); null from older engines.
  final String? cuspSystem;

  /// Ayanamsa the KP chart was cast with (engine enum name and degrees).
  final String? ayanamsaType;
  final double? ayanamsaValue;
  final List<KpRow> planets;
  final Json raw;
}

class SudarshanaRingModel {
  SudarshanaRingModel(Json j)
      : ring = _s(j['ring']),
        referenceRashi = _i(j['referenceRashiIndex'], 1),
        occupantsBySign = {
          for (final h in _l(j['houses']).map(_m)) _i(h['rashiIndex']): _l(h['occupants']).map((e) => _s(e)).toList(),
        };
  final String ring;
  final int referenceRashi;
  final Map<int, List<String>> occupantsBySign;

  static List<SudarshanaRingModel> listFrom(Json j) => _l(j['rings']).map((e) => SudarshanaRingModel(_m(e))).toList();
}
