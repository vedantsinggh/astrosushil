/// Request inputs for the engine sidecar protocol (see docs/sidecar-protocol.md).
library;

/// A local civil moment at a place: used for births, transits, prashna and panchang.
class BirthInput {
  const BirthInput({
    this.name,
    required this.date,
    required this.time,
    required this.timezone,
    required this.latitude,
    required this.longitude,
    this.placeName,
  });

  final String? name;

  /// Local civil date, `YYYY-MM-DD`.
  final String date;

  /// Local civil time, `HH:mm` or `HH:mm:ss`.
  final String time;

  /// IANA timezone id, e.g. `Asia/Kolkata`.
  final String timezone;
  final double latitude;
  final double longitude;
  final String? placeName;

  Map<String, Object?> toJson() => {
        if (name != null) 'name': name,
        'date': date,
        'time': time,
        'timezone': timezone,
        'latitude': latitude,
        'longitude': longitude,
        if (placeName != null) 'placeName': placeName,
      };

  factory BirthInput.fromJson(Map<String, Object?> j) => BirthInput(
        name: j['name'] as String?,
        date: j['date'] as String,
        time: j['time'] as String,
        timezone: j['timezone'] as String,
        latitude: (j['latitude'] as num).toDouble(),
        longitude: (j['longitude'] as num).toDouble(),
        placeName: j['placeName'] as String?,
      );

  BirthInput copyWith({String? name, String? date, String? time, String? timezone, double? latitude, double? longitude, String? placeName}) =>
      BirthInput(
        name: name ?? this.name,
        date: date ?? this.date,
        time: time ?? this.time,
        timezone: timezone ?? this.timezone,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        placeName: placeName ?? this.placeName,
      );

  LocationInput get location => LocationInput(latitude: latitude, longitude: longitude, timezone: timezone, placeName: placeName);

  @override
  bool operator ==(Object other) =>
      other is BirthInput &&
      other.name == name &&
      other.date == date &&
      other.time == time &&
      other.timezone == timezone &&
      other.latitude == latitude &&
      other.longitude == longitude &&
      other.placeName == placeName;

  @override
  int get hashCode => Object.hash(name, date, time, timezone, latitude, longitude, placeName);
}

class LocationInput {
  const LocationInput({required this.latitude, required this.longitude, required this.timezone, this.placeName});
  final double latitude;
  final double longitude;
  final String timezone;
  final String? placeName;

  Map<String, Object?> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'timezone': timezone,
        if (placeName != null) 'placeName': placeName,
      };
}

/// Calculation options sent as `params.options` with every engine request (protocol: "Calculation
/// options", ADR-017). Values are the engine's enum names, listed by `engine.info` → `options`.
/// Omitted fields take the engine defaults; the app never interprets them.
class CalcOptions {
  const CalcOptions({this.ayanamsa = defaultAyanamsa, this.nodeType = defaultNodeType});

  static const defaultAyanamsa = 'LAHIRI';
  static const defaultNodeType = 'MEAN_NODE';

  /// The only KP cusp system the engine offers (echoed by `kp.compute` as `cuspSystem`).
  static const defaultKpCuspSystem = 'PLACIDUS';

  final String ayanamsa;
  final String nodeType;

  Map<String, Object?> toJson() => {'ayanamsa': ayanamsa, 'nodeType': nodeType};

  @override
  bool operator ==(Object other) => other is CalcOptions && other.ayanamsa == ayanamsa && other.nodeType == nodeType;

  @override
  int get hashCode => Object.hash(ayanamsa, nodeType);

  @override
  String toString() => 'CalcOptions($ayanamsa, $nodeType)';
}
