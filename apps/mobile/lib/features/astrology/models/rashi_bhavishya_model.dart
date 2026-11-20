// Typed models for the daily Rashi Bhavishya (Moon-sign gochara) response of
// `GET /rashi-bhavishya/today`.
//
// Genuine data only: required parts that are missing make [RashiBhavishyaModel.fromJson]
// throw a [FormatException] so the screen shows an error state. No value is
// ever invented on the client.

Map<String, dynamic> _map(Object? raw, String what) {
  if (raw is Map) return Map<String, dynamic>.from(raw);
  throw FormatException('Rashi Bhavishya response is missing $what');
}

String _str(Map<String, dynamic> json, String key, String what) {
  final v = json[key];
  if (v is String && v.trim().isNotEmpty) return v;
  throw FormatException('Rashi Bhavishya response is missing $what.$key');
}

int _int(Map<String, dynamic> json, String key, String what) {
  final v = json[key];
  if (v is num) return v.toInt();
  throw FormatException('Rashi Bhavishya response is missing $what.$key');
}

List<String> _strings(Object? raw) => raw is List ? raw.whereType<String>().toList() : const <String>[];

class RashiInfoModel {
  final int index;
  final String sanskritName;
  final String englishName;
  final String element;
  final String ruler;

  const RashiInfoModel({
    required this.index,
    required this.sanskritName,
    required this.englishName,
    required this.element,
    required this.ruler,
  });

  factory RashiInfoModel.fromJson(Map<String, dynamic> json) {
    final index = _int(json, 'index', 'rashi');
    if (index < 1 || index > 12) throw const FormatException('Rashi Bhavishya response has an invalid rashi index');
    return RashiInfoModel(
      index: index,
      sanskritName: _str(json, 'sanskritName', 'rashi'),
      englishName: _str(json, 'englishName', 'rashi'),
      element: json['element'] as String? ?? '',
      ruler: json['ruler'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'index': index,
        'sanskritName': sanskritName,
        'englishName': englishName,
        'element': element,
        'ruler': ruler,
      };
}

class RashiSignRef {
  final int index;
  final String sanskritName;
  final String englishName;

  const RashiSignRef({required this.index, required this.sanskritName, required this.englishName});

  factory RashiSignRef.fromJson(Map<String, dynamic> json) => RashiSignRef(
        index: _int(json, 'index', 'sign'),
        sanskritName: _str(json, 'sanskritName', 'sign'),
        englishName: _str(json, 'englishName', 'sign'),
      );

  Map<String, dynamic> toJson() => {'index': index, 'sanskritName': sanskritName, 'englishName': englishName};
}

class RashiSignChange {
  final RashiSignRef sign;
  final int house;
  final String classification;
  final String timeIst;
  final String dateIst;

  const RashiSignChange({
    required this.sign,
    required this.house,
    required this.classification,
    required this.timeIst,
    required this.dateIst,
  });

  factory RashiSignChange.fromJson(Map<String, dynamic> json) => RashiSignChange(
        sign: RashiSignRef.fromJson(_map(json['sign'], 'changesTo.sign')),
        house: _int(json, 'house', 'changesTo'),
        classification: _str(json, 'classification', 'changesTo'),
        timeIst: _str(json, 'timeIst', 'changesTo'),
        dateIst: _str(json, 'dateIst', 'changesTo'),
      );

  Map<String, dynamic> toJson() => {
        'sign': sign.toJson(),
        'house': house,
        'classification': classification,
        'timeIst': timeIst,
        'dateIst': dateIst,
      };
}

/// One planet's transit counted from the Moon sign.
class RashiPlanetTransit {
  final String planet;
  final String name;
  final RashiSignRef sign;
  final int house;
  final String houseTheme;

  /// `favourable` or `demanding` (classical gochara table).
  final String classification;
  final List<int> favourableHouses;
  final bool isRetrograde;
  final RashiSignChange? changesTo;

  const RashiPlanetTransit({
    required this.planet,
    required this.name,
    required this.sign,
    required this.house,
    required this.houseTheme,
    required this.classification,
    required this.favourableHouses,
    required this.isRetrograde,
    this.changesTo,
  });

  bool get isFavourable => classification == 'favourable';

  /// Rahu and Ketu always move backwards; that is not a retrograde phase.
  bool get isNode => planet == 'RAHU' || planet == 'KETU';

  factory RashiPlanetTransit.fromJson(Map<String, dynamic> json) {
    final classification = _str(json, 'classification', 'planet');
    if (classification != 'favourable' && classification != 'demanding') {
      throw const FormatException('Rashi Bhavishya response has an unknown classification');
    }
    return RashiPlanetTransit(
      planet: _str(json, 'planet', 'planet'),
      name: _str(json, 'name', 'planet'),
      sign: RashiSignRef.fromJson(_map(json['sign'], 'planet.sign')),
      house: _int(json, 'house', 'planet'),
      houseTheme: json['houseTheme'] as String? ?? '',
      classification: classification,
      favourableHouses: (json['favourableHouses'] as List? ?? const []).whereType<num>().map((n) => n.toInt()).toList(),
      isRetrograde: json['isRetrograde'] == true,
      changesTo: json['changesTo'] is Map ? RashiSignChange.fromJson(Map<String, dynamic>.from(json['changesTo'] as Map)) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'planet': planet,
        'name': name,
        'sign': sign.toJson(),
        'house': house,
        'houseTheme': houseTheme,
        'classification': classification,
        'favourableHouses': favourableHouses,
        'isRetrograde': isRetrograde,
        if (changesTo != null) 'changesTo': changesTo!.toJson(),
      };
}

class RashiPanchangModel {
  final String varaName;
  final String varaEnglish;
  final String tithi;
  final String nakshatra;
  final int nakshatraPada;
  final String yoga;
  final Map<String, dynamic> raw;

  const RashiPanchangModel({
    required this.varaName,
    required this.varaEnglish,
    required this.tithi,
    required this.nakshatra,
    required this.nakshatraPada,
    required this.yoga,
    required this.raw,
  });

  factory RashiPanchangModel.fromJson(Map<String, dynamic> json) {
    final vara = _map(json['vara'], 'panchang.vara');
    final tithi = _map(json['tithi'], 'panchang.tithi');
    final nak = _map(json['nakshatra'], 'panchang.nakshatra');
    final yoga = _map(json['yoga'], 'panchang.yoga');
    return RashiPanchangModel(
      varaName: _str(vara, 'name', 'vara'),
      varaEnglish: _str(vara, 'english', 'vara'),
      tithi: _str(tithi, 'label', 'tithi'),
      nakshatra: _str(nak, 'name', 'nakshatra'),
      nakshatraPada: (nak['pada'] as num?)?.toInt() ?? 0,
      yoga: _str(yoga, 'name', 'yoga'),
      raw: json,
    );
  }

  Map<String, dynamic> toJson() => raw;
}

class RashiSkyEvent {
  final String type;
  final String planet;
  final String planetName;
  final String dateIst;
  final String timeIst;
  final bool withinDay;
  final RashiSignRef? fromSign;
  final RashiSignRef? toSign;
  final RashiSignRef? sign;

  const RashiSkyEvent({
    required this.type,
    required this.planet,
    required this.planetName,
    required this.dateIst,
    required this.timeIst,
    required this.withinDay,
    this.fromSign,
    this.toSign,
    this.sign,
  });

  factory RashiSkyEvent.fromJson(Map<String, dynamic> json) {
    RashiSignRef? ref(String k) => json[k] is Map ? RashiSignRef.fromJson(Map<String, dynamic>.from(json[k] as Map)) : null;
    return RashiSkyEvent(
      type: _str(json, 'type', 'event'),
      planet: _str(json, 'planet', 'event'),
      planetName: _str(json, 'planetName', 'event'),
      dateIst: _str(json, 'dateIst', 'event'),
      timeIst: _str(json, 'timeIst', 'event'),
      withinDay: json['withinDay'] == true,
      fromSign: ref('fromSign'),
      toSign: ref('toSign'),
      sign: ref('sign'),
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'planet': planet,
        'planetName': planetName,
        'dateIst': dateIst,
        'timeIst': timeIst,
        'withinDay': withinDay,
        if (fromSign != null) 'fromSign': fromSign!.toJson(),
        if (toSign != null) 'toSign': toSign!.toJson(),
        if (sign != null) 'sign': sign!.toJson(),
      };
}

class RashiTallyModel {
  final int favourable;
  final int demanding;
  final int total;
  final String method;

  const RashiTallyModel({required this.favourable, required this.demanding, required this.total, required this.method});

  factory RashiTallyModel.fromJson(Map<String, dynamic> json) => RashiTallyModel(
        favourable: _int(json, 'favourable', 'tally'),
        demanding: _int(json, 'demanding', 'tally'),
        total: _int(json, 'total', 'tally'),
        method: json['method'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {'favourable': favourable, 'demanding': demanding, 'total': total, 'method': method};
}

class RashiFactsModel {
  final String sunriseIso;
  final String referenceLocation;
  final RashiPanchangModel panchang;
  final RashiPlanetTransit moon;
  final List<RashiPlanetTransit> planets;
  final List<RashiSkyEvent> events;
  final RashiTallyModel tally;
  final Map<String, dynamic> reference;

  const RashiFactsModel({
    required this.sunriseIso,
    required this.referenceLocation,
    required this.panchang,
    required this.moon,
    required this.planets,
    required this.events,
    required this.tally,
    required this.reference,
  });

  factory RashiFactsModel.fromJson(Map<String, dynamic> json) {
    final reference = _map(json['reference'], 'facts.reference');
    final location = reference['location'] is Map ? Map<String, dynamic>.from(reference['location'] as Map) : const <String, dynamic>{};
    final planetsRaw = json['planets'];
    if (planetsRaw is! List || planetsRaw.isEmpty) throw const FormatException('Rashi Bhavishya response is missing facts.planets');
    return RashiFactsModel(
      sunriseIso: _str(reference, 'sunriseIso', 'reference'),
      referenceLocation: location['name'] as String? ?? '',
      panchang: RashiPanchangModel.fromJson(_map(json['panchang'], 'facts.panchang')),
      moon: RashiPlanetTransit.fromJson(_map(json['moon'], 'facts.moon')),
      planets: planetsRaw.map((p) => RashiPlanetTransit.fromJson(_map(p, 'facts.planets[]'))).toList(),
      events: (json['events'] as List? ?? const []).map((e) => RashiSkyEvent.fromJson(_map(e, 'facts.events[]'))).toList(),
      tally: RashiTallyModel.fromJson(_map(json['tally'], 'facts.tally')),
      reference: reference,
    );
  }

  Map<String, dynamic> toJson() => {
        'reference': reference,
        'panchang': panchang.toJson(),
        'moon': moon.toJson(),
        'planets': planets.map((p) => p.toJson()).toList(),
        'events': events.map((e) => e.toJson()).toList(),
        'tally': tally.toJson(),
      };
}

class RashiNarrativeSection {
  final String id;
  final String title;
  final String lead;
  final List<String> paragraphs;
  final List<String> bullets;
  final String? takeaway;

  const RashiNarrativeSection({
    required this.id,
    required this.title,
    required this.lead,
    required this.paragraphs,
    required this.bullets,
    this.takeaway,
  });

  factory RashiNarrativeSection.fromJson(Map<String, dynamic> json) {
    final paragraphs = _strings(json['paragraphs']);
    if (paragraphs.isEmpty) throw const FormatException('Rashi Bhavishya section has no paragraphs');
    return RashiNarrativeSection(
      id: _str(json, 'id', 'section'),
      title: _str(json, 'title', 'section'),
      lead: json['lead'] as String? ?? '',
      paragraphs: paragraphs,
      bullets: _strings(json['bullets']),
      takeaway: (json['takeaway'] as String?)?.trim().isNotEmpty == true ? json['takeaway'] as String : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'lead': lead,
        'paragraphs': paragraphs,
        'bullets': bullets,
        if (takeaway != null) 'takeaway': takeaway,
      };
}

class RashiBhavishyaPredictionModel {
  final String summary;
  final List<RashiNarrativeSection> sections;
  final String language;

  /// Not part of this API (no classical basis); kept null so older callers never show invented values.
  int? get luckyNumber => null;
  String? get luckyColor => null;

  const RashiBhavishyaPredictionModel({required this.summary, required this.sections, required this.language});

  factory RashiBhavishyaPredictionModel.fromJson(Map<String, dynamic> json) {
    final sectionsRaw = json['sections'];
    if (sectionsRaw is! List || sectionsRaw.isEmpty) throw const FormatException('Rashi Bhavishya response is missing prediction.sections');
    return RashiBhavishyaPredictionModel(
      summary: _str(json, 'summary', 'prediction'),
      sections: sectionsRaw.map((s) => RashiNarrativeSection.fromJson(_map(s, 'prediction.sections[]'))).toList(),
      language: json['language'] as String? ?? 'en',
    );
  }

  Map<String, dynamic> toJson() => {
        'summary': summary,
        'sections': sections.map((s) => s.toJson()).toList(),
        'language': language,
      };
}

class RashiMethodModel {
  final String summary;
  final List<String> sources;
  final String version;

  const RashiMethodModel({required this.summary, required this.sources, required this.version});

  factory RashiMethodModel.fromJson(Map<String, dynamic> json) => RashiMethodModel(
        summary: _str(json, 'summary', 'method'),
        sources: _strings(json['sources']),
        version: json['version'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {'summary': summary, 'sources': sources, 'version': version};
}

class RashiBhavishyaModel {
  /// IST calendar date from the API (yyyy-MM-dd).
  final String date;
  final RashiInfoModel rashi;
  final RashiFactsModel facts;
  final RashiBhavishyaPredictionModel prediction;
  final RashiMethodModel method;
  final String generationProvider;
  final String source;
  final bool isDevelopmentFixture;

  /// `validated-llm` (stored narrative) or `deterministic` (plain wording of the same facts,
  /// served by the backend while the narrative is unavailable).
  final String narrativeSource;

  bool get isDeterministicFallback => narrativeSource == 'deterministic';

  const RashiBhavishyaModel({
    required this.date,
    required this.rashi,
    required this.facts,
    required this.prediction,
    required this.method,
    required this.generationProvider,
    required this.source,
    required this.isDevelopmentFixture,
    this.narrativeSource = 'validated-llm',
  });

  factory RashiBhavishyaModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? Map<String, dynamic>.from(json['data'] as Map) : json;
    final date = data['date'];
    if (date is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date)) {
      throw const FormatException('Rashi Bhavishya response is missing date');
    }
    final generation = data['generation'] is Map ? Map<String, dynamic>.from(data['generation'] as Map) : const <String, dynamic>{};
    return RashiBhavishyaModel(
      date: date,
      rashi: RashiInfoModel.fromJson(_map(data['rashi'], 'rashi')),
      facts: RashiFactsModel.fromJson(_map(data['facts'], 'facts')),
      prediction: RashiBhavishyaPredictionModel.fromJson(_map(data['prediction'], 'prediction')),
      method: RashiMethodModel.fromJson(_map(data['method'], 'method')),
      generationProvider: generation['provider'] as String? ?? '',
      source: data['source'] as String? ?? '',
      // A missing flag is treated as non-genuine content (fail closed).
      isDevelopmentFixture: data['isDevelopmentFixture'] as bool? ?? true,
      narrativeSource: data['narrativeSource'] as String? ?? 'validated-llm',
    );
  }

  Map<String, dynamic> toJson() => {
        'date': date,
        'rashi': rashi.toJson(),
        'facts': facts.toJson(),
        'prediction': prediction.toJson(),
        'method': method.toJson(),
        'generation': {'provider': generationProvider},
        'source': source,
        'isDevelopmentFixture': isDevelopmentFixture,
        'narrativeSource': narrativeSource,
      };
}
